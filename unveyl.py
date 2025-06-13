import torch
from torch import nn
import torch.optim as optim
from torch.utils.data import Dataset,DataLoader,DistributedSampler,WeightedRandomSampler
import torch.nn.functional as F
from torch.distributed import init_process_group,destroy_process_group
from torch.nn.parallel import DistributedDataParallel as DDP
#import sentencepiece as spm
import os
from datasets import load_dataset,concatenate_datasets
from typing import Optional
from typing import Tuple
torch.backends.cuda.matmul.allow_tf32 = True  
torch.set_float32_matmul_precision('high')
def set_seed(seed):
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
set_seed(42)
class DPOLoss(nn.Module):

    def __init__(
        self,
        beta: float = 0.1,
        label_smoothing: float = 0.0,
    ):
        super().__init__()
        self.beta = beta
        self.label_smoothing = label_smoothing

    def forward(
        self,
        policy_chosen_logps: torch.Tensor,
        policy_rejected_logps: torch.Tensor,
        reference_chosen_logps: torch.Tensor,
        reference_rejected_logps: torch.Tensor,
    ) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        """
        Compute the DPO loss for a batch of policy and reference model log probabilities.

        Args:
            policy_chosen_logps (torch.Tensor): Log probabilities of the policy model
                for the chosen responses. Shape: (batch_size)
            policy_rejected_logps (torch.Tensor): Log probabilities of the policy model
                for the rejected responses. Shape: (batch_size)
            reference_chosen_logps (torch.Tensor): Log probabilities of the reference model
                for the chosen responses. Shape: (batch_size)
            reference_rejected_logps (torch.Tensor): Log probabilities of the reference model
                for the rejected responses. Shape: (batch_size)
                """
        pi_logratios = policy_chosen_logps - policy_rejected_logps
        ref_logratios = reference_chosen_logps - reference_rejected_logps

        logits = pi_logratios - ref_logratios

        # The beta is a temperature parameter for the DPO loss, typically something in the range of 0.1 to 0.5.
        # We ignore the reference model as beta -> 0. The label_smoothing parameter encodes our uncertainty about the labels and
        # calculates a conservative DPO loss.
        losses = (
            -F.logsigmoid(self.beta * logits) * (1 - self.label_smoothing)
            - F.logsigmoid(-self.beta * logits) * self.label_smoothing
        )

        chosen_rewards = (
            self.beta * (policy_chosen_logps - reference_chosen_logps).detach()
        )
        rejected_rewards = (
            self.beta * (policy_rejected_logps - reference_rejected_logps).detach()
        )

        return losses, chosen_rewards, rejected_rewards
def truncate_sequence_at_first_stop_token(
    sequences: torch.Tensor, stop_tokens: torch.Tensor, fill_value: int = 0
) -> Tuple[torch.Tensor, torch.Tensor]:
    eos_mask = torch.isin(sequences, stop_tokens)
    seq_lens = torch.cumsum(eos_mask, dim=1)
    padding_mask = (seq_lens > 1) | ((seq_lens == 1) & ~eos_mask)
    sequences[padding_mask] = fill_value
    return padding_mask, sequences



def logits_to_logprobs(
    logits: torch.Tensor, sequences: torch.Tensor, temperature: float = 1.0
) -> torch.Tensor:
    """
    Converts logits corresponding to a generated sequence to logprobs over the generated tokens.

    Args:
        logits (torch.Tensor): The logits tensor of shape [b, response_length, vocab_size].
        sequences (torch.Tensor): The corresponding tokens of shape [b, response_length].
        temperature (float): The temperature to scale the logits. Default 1.0
    Returns:
        torch.Tensor: The log probabilities corresponding to each token in ``sequences``. Shape [b, response_length].
    """
    return torch.gather(
        F.log_softmax(logits / temperature, dim=-1),
        2,
        sequences.unsqueeze(-1),
    ).squeeze(-1)

def masked_mean(
    x: torch.Tensor, mask: torch.Tensor, dim: Optional[int] = None
) -> torch.Tensor:
    """
    Compute mean of tensor with masked values. Taken from https://github.com/huggingface/trl/blob/main/trl/core.py

    Args:
        x (torch.Tensor): The input tensor.
        mask (torch.Tensor): The bool mask tensor, where True indicates the corresponding value in ``x``
            should participate in the mean calculation.
        dim (Optional[int]): The axis to calculate the mean over. Default None.

    Returns:
        torch.Tensor: The mean tensor.
    """
    return (x * mask).sum(dim=dim) / mask.sum(dim=dim)

def get_batch_log_probs(
    logits: torch.FloatTensor,
    labels: torch.LongTensor,
    label_pad_token_id: int = -100,
    return_average_logprobs: bool = False,
) -> torch.FloatTensor:
    """
    Calculate log probabilities based on provided logits and labels.

    Args:
        logits (torch.FloatTensor): direct logits output of the model of shape (b, s, v)
        labels (torch.LongTensor): ground-truth labels to compute log probs with, shape (b, s).
            Label tokens with a value of label_pad_token_id are ignored.
    Returns:
        Calculated log probs of shape (b, )
    """
    if logits.shape[:-1] != labels.shape:
        raise ValueError(
            "Logits (batch and sequence length dim) and labels must have the same shape."
        )

    labels = labels[:, 1:].clone()
    logits = logits[:, :-1, :]
    loss_mask = labels != label_pad_token_id

    labels[labels == label_pad_token_id] = 0
    # take log-likelihood of the labels given our model
    per_token_log_probs = logits_to_logprobs(logits, labels, temperature=1.0)

    if return_average_logprobs:
        return masked_mean(per_token_log_probs, loss_mask, dim=-1)
    else:
        return (per_token_log_probs * loss_mask).sum(-1)


def truncate_sequence_for_logprobs(
    query_response_logits: torch.Tensor, context_length: int
) -> torch.Tensor:
    """
    Truncates logits generated over a sequence for estimating logprobs over the tokens in the sequence.
    This assumes the sequence is of the (query, response) format with length (context_length + response_length)
    Args:
        query_response_logits (torch.Tensor): The logits tensor of shape [b, context_length + response_length, vocab_size].
        context_length (int): The length of the context.

    Returns:
        torch.Tensor: The truncated logits for the response with shape [b, response_length, vocab_size]."""
    return query_response_logits[:, context_length - 1 : -1]
source_weights = {
    "dolly": 1.0,
    "general": 1.0,
    "self_knowledge": 5.0,  # upweight this
    "self_instruct": 1.0,
    "everythinglm": 1.0,
    "coedit": 1.0,
    "openbookqa_main_promptsource": 1.0,
    "poems": 1.0,
    "wizard": 1.0,
    "guardian_authorship_cross_topic_7_promptsource": 1.0,
    "mwsc_promptsource": 1.0,
    "ambig_qa_light_promptsource": 1.0,
    "ai2_arc_ARC-Challenge_promptsource": 1.0,
    "prompter-natural-instructions": 1.0,
    "Human-Like-DPO-Dataset": 1.0,
}
def add_source(dataset, source_name):
    return dataset.map(lambda x: {"source": source_name})

weights = [source_weights[ex['source']] for ex in data]
sampler = WeightedRandomSampler(weights, num_samples=len(weights), replacement=True)

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
    sampler = DistributedSampler(Boom(data))
    train_data = DataLoader(Boom(combine),sampler=sampler,batch_size=32,collate_fn=collate_fn,pin_memory=True)
else:
    ddp_rank=0
    dpp_local_rank=0
    ddp_world_size=1
    master_process=True
    device = 'cuda'
    train_data = DataLoader(Boom(combine),batch_size=10,collate_fn=collate_fn,pin_memory=True)
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
        self.ln1 = nn.LayerNorm(n_embd)
        self.ln2 = nn.LayerNorm(n_embd)
    def forward(self, x):
        x = x + self.sa(self.ln1(x))[0]
        x = x + self.smoe(self.ln2(x))
        return x
class Unveyl1(nn.Module):
    def __init__(self):
        super().__init__()
        self.tok_emb = nn.Embedding(vocab_size,n_embd,padding_idx=0)
        self.position_embed = nn.Embedding(context_window, n_embd)
        self.blocks = nn.Sequential(*[Block(n_embd, n_head=n_head) for _ in range(n_layer)])
        self.ln_f = nn.LayerNorm(n_embd)  # final layer norm
        self.lm_head = nn.Linear(n_embd, vocab_size)
        self.tok_emb.weight = self.lm_head.weight
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

checkpoints = torch.load('unveylchat.pt',map_location=device)
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
model.load_state_dict(checkpoints['model_state_dict'])
if ddp:
    model = DDP(model,device_ids=[ddp_local_rank],find_unused_parameters=True)
raw_model = model.module if ddp else model
optimizer = raw_model.config_optimizer(weight_decay=0.1,lr=2e-6,device=device)
optimizer.load_state_dict(checkpoints['optimizer_state_dict'])
scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=len(train_data), eta_min=2e-6)

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
train(raw_model,optimizer)
if ddp:
    destroy_process_group()



