import torch
from torch import nn
import torch.optim as optim
from torch.utils.data import Dataset
import torch.nn.functional as F
from torch.distributed import init_process_group,destroy_process_group
from torch.nn.parallel import DistributedDataParallel as DDP
#import sentencepiece as spm
import os
import sentencepiece as spm
from typing import Optional
from typing import Tuple
def set_seed(seed):
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
set_seed(42)
def truncate_sequence_at_first_stop_token(
    sequences: torch.Tensor, stop_tokens: torch.Tensor, fill_value: int = 0
) -> Tuple[torch.Tensor, torch.Tensor]:
    eos_mask = torch.isin(sequences, stop_tokens)
    seq_lens = torch.cumsum(eos_mask, dim=1)
    padding_mask = (seq_lens > 1) | ((seq_lens == 1) & ~eos_mask)
    sequences[padding_mask] = fill_value
    return padding_mask, sequences



tokenizer = spm.SentencePieceProcessor(model_file='unveyl.model')
torch.autograd.set_detect_anomaly(True)
pad_token_id=0

def collate_fn(batch):
    srcs, tgts = zip(*batch)
    # Determine the maximum length for the batch, constrained to 2000
    max_length = min(max(len(src) for src in srcs), 2000)
    # Pad sequences to the max_length
    padded_srcs = [torch.cat([src[:max_length], torch.full((max_length - len(src[:max_length]),), pad_token_id, dtype=torch.long)]) if len(src) < max_length else src[:max_length] for src in srcs]
    padded_tgts = [torch.cat([tgt[:max_length], torch.full((max_length - len(tgt[:max_length]),), pad_token_id, dtype=torch.long)]) if len(tgt) < max_length else tgt[:max_length] for tgt in tgts]
    
    # Stack tensors to create the batch
    batch_srcs = torch.stack(padded_srcs)
    batch_tgts = torch.stack(padded_tgts)
    return batch_srcs, batch_tgts
class Boom(Dataset):
    def __init__(self, data):
        self.data = data

    def __len__(self):
        return len(self.data)

    def __getitem__(self, idx):
        row = self.data[idx]
        input_id = tokenizer.EncodeAsIds(row['input'],add_eos=True) + tokenizer.EncodeAsIds(row['target'],add_eos=True)
        src = torch.tensor(input_id).squeeze(0)
        tgt=torch.tensor(input_id).squeeze(0)[1:]
        return src,tgt

ddp = int(os.environ.get('RANK',-1))!=-1

if ddp:
    init_process_group(backend='nccl')
    ddp_rank = int(os.environ['RANK'])
    ddp_local_rank = int(os.environ['LOCAL_RANK'])
    ddp_world_size = int(os.environ['WORLD_SIZE'])
    device = f'cuda:{ddp_local_rank}'
    torch.cuda.set_device(device)
    master_process = ddp_rank==0
else:
    ddp_rank=0
    dpp_local_rank=0
    ddp_world_size=1
    master_process=True
    device = 'cpu'
n_embd = 768
n_head = 12
n_layer = 12
vocab_size =tokenizer.vocab_size()
context_window=4000
head_size = n_embd//n_head
assert n_embd % n_head==0
num_groups=4

#torchrun --standalone --nproc_per_node=8 unveyl.py
#mcqa =DataLoader(MultipleChoiceDataset(v),batch_size=1)

class FeedFoward(nn.Module):
    def __init__(self, n_embd):
        super().__init__()
        self.fc = nn.Linear(n_embd,4*n_embd)
        self.gelu = nn.GELU()
        self.proj = nn.Linear(4*n_embd,n_embd)
        self.proj.unveyl = 1.0
    def forward(self, x):
        x = self.fc(x)
        x = self.gelu(x)
        x=self.proj(x)
        return x
num_experts=6
top_k = 4
class NoisyTopKRouter(nn.Module):
    def __init__(self):
        super().__init__()
        self.topk_linear = nn.Linear(n_embd,num_experts)
        self.noise_layer = nn.Linear(n_embd, num_experts)
    def forward(self,x):
        #x is the multi head attention output
        logits = self.topk_linear(x)
        noise_logits = self.noise_layer(x)
        #Added Gaussian Noise
        noise = torch.rand_like(logits) * F.softplus(noise_logits)
        noisy_logits = logits + noise
        topk_logits,indicies = noisy_logits.topk(top_k,dim=-1)
        zeros = torch.full_like(noisy_logits,float('-inf'))
        sparse_logits = zeros.scatter(-1,indicies,topk_logits)
        router_output = F.softmax(sparse_logits,dim=-1)
        return router_output,indicies
capacity_factor = 2.5
class SparseMoE(nn.Module):
    def __init__(self):
        super().__init__()
        self.noisytopkrouter = NoisyTopKRouter()
        self.experts = nn.ModuleList([FeedFoward(n_embd) for expert in range(num_experts)])
    def forward(self,x):
        B,S,_ = x.shape
        gating_output,indices = self.noisytopkrouter(x)
        final_output = torch.zeros_like(x)
        flat_size = x.view(-1,x.size(-1))
        flat_gating_output = gating_output.view(-1,gating_output.size(-1))
        tokens_per_batch = B*S*top_k
        expert_capacity = int((int(tokens_per_batch/num_experts)*capacity_factor))
        updates = torch.zeros_like(flat_size)
        for i,expert in enumerate(self.experts):
            expert_mask = (i==indices).any(dim=-1)
            flat_mask = expert_mask.view(-1)
            selected_indicies = torch.nonzero(flat_mask).squeeze(-1)
            limited_indicies = selected_indicies[:expert_capacity] if selected_indicies.numel() > expert_capacity else selected_indicies
            if limited_indicies.numel() >0:
                    expert_input = flat_size[flat_mask]
                    expert_output = expert(expert_input)
                    gating_scores = flat_gating_output[limited_indicies,i].unsqueeze(1)
                    weighted_output = gating_scores*expert_output
                    updates.index_add_(0,limited_indicies,weighted_output)
        final_output += updates.view(B, S, -1)
        return final_output
# Apply local self-attention within each window
    
class CausalSelfAttention(nn.Module):
    def __init__(self):
        super().__init__()
        self.num_groups = num_groups
        self.c_attn = nn.Linear(n_embd, 3 * n_embd)
        self.proj = nn.Linear(n_embd, n_embd)
        self.proj.unveyl = 1.0

    def forward(self, x, past_kv=None):
        B, T, C = x.shape
        q, k, v = self.c_attn(x).split(n_embd, dim=2)

        # Reshape for multi-head attention
        k = k.view(B, T, n_head, C // n_head).transpose(1, 2)  # (B, nh, T, hs)
        q = q.view(B, T, n_head, C // n_head).transpose(1, 2)  # (B, nh, T, hs)
        v = v.view(B, T, n_head, C // n_head).transpose(1, 2)  # (B, nh, T, hs)

        # Use past KV cache if provided
        if past_kv is not None:
            past_k, past_v = past_kv
            k = torch.cat([past_k, k], dim=2)
            v = torch.cat([past_v, v], dim=2)

        # Compute attention
        output = F.scaled_dot_product_attention(q, k, v, dropout_p=0.3, is_causal=True)
        output = output.transpose(1, 2).contiguous().view(B, T, C)
        output = self.proj(output)

        # Return updated KV cache
        return output, (k, v)


class Block(nn.Module):
    def __init__(self, n_embd, n_head):
        super().__init__()
        head_size = n_embd // n_head
        self.sa = CausalSelfAttention()
        self.ffwd = FeedFoward(n_embd)
        self.smoe = SparseMoE()
        self.ln1 = nn.RMSNorm(n_embd)
        self.ln2 = nn.RMSNorm(n_embd)
        self.query_w = nn.Parameter(torch.randn(n_embd)) # The 'wl' from the paper
        self.key_norm = nn.RMSNorm(n_embd) 
    def forward(self, x, history_v, history_k):
        # 1. Calculate weights alpha: phi(wl, ki) = exp(wl.T * RMSNorm(ki))
        # We stack history_k to do a batch dot product with our query_w
        keys = torch.stack(history_k) # [num_prev_layers, n_embd]
        logits = torch.matmul(self.key_norm(keys), self.query_w) # [num_prev_layers]
        alpha = F.softmax(logits, dim=0) # Normalize weights to sum to 1
        
        # 2. Selective Residual: hl = sum(alpha_i * vi)
        values = torch.stack(history_v) # [num_prev_layers, batch, seq, n_embd]
        # Reshape alpha to multiply correctly across batch/seq/dims
        h_l = torch.sum(alpha.view(-1, 1, 1, 1) * values, dim=0)
        
        # 3. Apply your blocks using this "Smart Residual" h_l
        # Note: Pre-norm style uses h_l as the base for the next calc
        attn_out = self.sa(self.ln1(h_l))[0]
        x_mid = h_l + attn_out 
        
        # Usually, the paper applies this logic to each sub-layer or per block
        moe_out = self.smoe(self.ln2(x_mid))
        x_final = x_mid + moe_out
        
        return x_final, x_final
class Unveyl1(nn.Module):
    def __init__(self):
        super().__init__()
        self.tok_emb = nn.Embedding(vocab_size,n_embd,padding_idx=0)
        self.position_embed = nn.Embedding(context_window, n_embd)
        self.blocks = nn.Sequential(*[Block(n_embd, n_head=n_head) for _ in range(n_layer)])
        self.ln_f = nn.RMSNorm(n_embd)  # final layer norm
        self.lm_head = nn.Linear(n_embd, vocab_size)
        self.tok_emb.weight = self.lm_head.weight
        self.get_key = nn.Linear(n_embd, n_embd)
    @torch.autocast(device_type='cuda')
    def forward(self, idx, targets=None):
        B, T = idx.shape
        tok_emb = self.tok_emb(idx)
        pos_emb = self.position_embed(torch.arange(T,device=device)) # (T,C)
        x =tok_emb + pos_emb
        x = self.blocks(x)
        x = self.ln_f(x)
        logits = self.lm_head(x)
        if targets is None:
            loss = None
        else:
            B, T, C = logits.shape
            logits = logits.view(B * T, C)
            targets = targets.view(B * T)
            loss = F.cross_entropy(logits, targets,ignore_index=0)
        return logits, loss
    def generate(self, idx, max_new_tokens):
        for _ in range(max_new_tokens):
            logits = self(idx)[0]
            logits = logits[:, -1, :]
            # Apply softmax and sample
            probs = F.softmax(logits, dim=-1)  # (B, C)
            topk_probs,topk_indicies = probs.topk(100,dim=-1)
            idx_next = torch.multinomial(topk_probs, num_samples=1)  # (B, 1)
            idx_next = torch.gather(topk_indicies,-1,idx_next)
            if idx_next==2:
                break
            idx = torch.cat((idx, idx_next), dim=1)  # (B, T+1)
        return idx
    def config_optimizer(self,weight_decay,lr,device):
        param_dict = {pn:p for pn,p in self.named_parameters()}
        param_dict = {pn:p for pn,p in param_dict.items() if p.requires_grad}
        decay_params = [p for n,p in param_dict.items() if p.dim()>=2]
        nodecay_params = [p for n,p in param_dict.items() if p.dim()<2]
        # Assuming decay_params and nodecay_params are predefined
        optim_groups = [
    {'params': decay_params, 'weight_decay': weight_decay},
    {'params': nodecay_params, 'weight_decay': 0.0}
]

        optimizer = optim.AdamW(optim_groups, lr=lr,fused=True)

        return optimizer
def save_checkpoint(model, optimizer,step, filepath):
    checkpoint = {
        'model_state_dict': model.state_dict(),
        'optimizer_state_dict': optimizer.state_dict(),
        'step':step
    }
    torch.save(checkpoint, filepath)

checkpoints = torch.load('un_comp2.pt',map_location=device)
model = Unveyl1().to(device)
beta = 0.1  # A scaling factor for the loss
def test(model):
    with torch.no_grad():
        model.eval()
        for i in range(2):
            context = torch.tensor(tokenizer.EncodeAsIds("write for me a poem called Love",add_eos=True)).unsqueeze(0).cuda()
            mod = model.generate(context,512).tolist()[0][context.shape[1]:]
            print(tokenizer.decode(mod))
            print()   
model.load_state_dict(checkpoints)
if ddp:
    model = DDP(model,device_ids=[ddp_local_rank],find_unused_parameters=True)
raw_model = model.module if ddp else model
optimizer = raw_model.config_optimizer(weight_decay=0.1,lr=2e-6,device=device)
def train(model,optimizer):
    model.train()
    for epoch in range(3):
        for step, (input_ids,lm_targets) in enumerate(train_data):
            optimizer.zero_grad()
            total_loss = 0.0
            input_ids = input_ids.to(device,non_blocking=True)
            lm_targets = lm_targets.to(device,non_blocking=True)
            logits, loss = model(input_ids,lm_targets)
        # Compute the DPO loss with relative log probabilities
            loss.backward()
            norm=torch.nn.utils.clip_grad_norm_(model.parameters(),1.0)
            optimizer.step()
            scheduler.step()
            #if ddp:
             #   dist.all_reduce(loss,op=dist.ReduceOp.AVG)
            if master_process:
                print(f'step {step} loss {(loss.item()):.4f} {norm:.3f}')
                if step % 500 == 0 and step != 0:
                        test(raw_model)
                        save_checkpoint(raw_model,optimizer,step,'unveylchat.pt')
#train(raw_model,optimizer)
if ddp:
    destroy_process_group()



