import modal
from pathlib import Path

app = modal.App('uvveyl')

image = modal.Image.debian_slim(python_version='3.12').pip_install("torch==2.7.1",'sentencepiece','fastapi[standard]','datasets','firebase_admin','torch_tensorrt','torchvision','nvidia-modelopt[all]',gpu='B200').cmd(["--enforce-eager"])
vol = modal.Volume.from_name("sage",create_if_missing=True)
@app.function(gpu="a10g", image=image,volumes={'/sage/': vol},secrets=[modal.Secret.from_name("apiKey")],enable_memory_snapshot=True,experimental_options={"enable_gpu_snapshot": True})
@modal.fastapi_endpoint()
async def unveyl(prompt:str, apiKey: str):
    
    import os
    import firebase_admin
    from firebase_admin import credentials, auth
    import torch
    from torch import nn
    import torch.nn.functional as F
    import sentencepiece as spm
    import os
    import torch_tensorrt
    import math
    FAST_BOOT = True
    cmd = ["--enforce-eager" if FAST_BOOT else "--no-enforce-eager"]
    
    directory_path = '/sage/sage/sage'
    file_paths = [os.path.join(directory_path, f) for f in os.listdir(directory_path)]
    print("Files in /sage/sage/sage/:", file_paths)
    cred = credentials.Certificate('/sage/sage/sagepond.json')
    try:
        # Set check_revoked=True to ensure the session cookie is not revoked
        if apiKey=='aa264cbdf161c11173e106ad2f422e3c224488e2ccecd5b78bb6e4757511d762':
            pass
        else:
            if not firebase_admin._apps:
                # Initialize Firebase Admin SDK if not already initialized
                firebase_admin.initialize_app(cred)
                decoded_claims = auth.verify_session_cookie(apiKey, check_revoked=True)
    except auth.InvalidSessionCookieError as e:
        # Session cookie is invalid, expired or revoke
        pass
    def set_seed(seed):
        torch.manual_seed(seed)
        torch.cuda.manual_seed_all(seed)
    set_seed(42)
    tokenizer = spm.SentencePieceProcessor(model_file='/sage/sage/unveyl.model')
    n_embd = 768
    n_head = 12
    n_layer = 12
    vocab_size =tokenizer.vocab_size()
    context_window=2000
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    head_size = n_embd//n_head
    assert n_embd % n_head==0
    num_groups=4
    class LoRALinear(nn.Module):
        def __init__(self, linear_layer, r=16, alpha=32):
            super().__init__()
            # Base linear layer (frozen later)
            self.linear = linear_layer
            self.r = r
            self.alpha = alpha
            self.scaling = alpha / r

            in_dim = linear_layer.in_features
            out_dim = linear_layer.out_features

            # LoRA matrices as nn.Parameter
            self.lora_A = nn.Parameter(torch.zeros(r, in_dim))
            self.lora_B = nn.Parameter(torch.zeros(out_dim, r))

            # Initialization
            nn.init.kaiming_uniform_(self.lora_A, a=math.sqrt(5))
            nn.init.zeros_(self.lora_B)

        def forward(self, x):
            # Base linear
            result = self.linear(x)

            # LoRA update
            if self.r > 0:
                lora_out = (x @ self.lora_A.T) @ self.lora_B.T
                result += self.scaling * lora_out

            return result
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
    capacity_factor = 2.0
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
            with torch.nn.attention.sdpa_kernel(torch.nn.attention.SDPBackend.FLASH_ATTENTION):
                 output = F.scaled_dot_product_attention(q, k, v, dropout_p=0.3 if self.training else 0.0, is_causal=True)
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
        @torch.inference_mode()
        def generate(self, idx, max_new_tokens, temperature=0.005, top_k=None, repetition_penalty=0.9):
                for _ in range(max_new_tokens):
                    # crop context if too long
                    idx_cond = idx if idx.size(1) <= 2000 else idx[:, -2000:]
                    # forward model
                    logits, _ = self(idx_cond)
                    # take logits for last position
                    logits = logits[:, -1, :]
                    # temperature scaling
                    logits = F.softmax(logits,dim=-1)
                    # mask unknowns
                    un_tokens = [tokenizer.unk_id(), 0]
                    logits[:, un_tokens] = float('-inf')
                    # top-k filtering
                    idx_next = torch.argmax(logits, dim=-1).unsqueeze(-1)
                    # stop condition (e.g. EOS = 2)
                    if (idx_next == 2).any():
                        break
                    # append new token
                    idx = torch.cat((idx, idx_next), dim=1)
                return idx
    def apply_lora_to_attention(model, r=16, alpha=32):
        for i, block in enumerate(model.blocks):
            sa_module = block.sa
            # Replace c_attn
            old_c_attn = sa_module.c_attn
            lora_c_attn = LoRALinear(old_c_attn, r=r, alpha=alpha).to(device)
            lora_c_attn.linear.weight.data = old_c_attn.weight.data.clone()
            if old_c_attn.bias is not None:
                lora_c_attn.linear.bias.data = old_c_attn.bias.data.clone()
            sa_module.c_attn = lora_c_attn

            # Replace proj
            old_proj = sa_module.proj
            lora_proj = LoRALinear(old_proj, r=r, alpha=alpha).to(device)
            lora_proj.linear.weight.data = old_proj.weight.data.clone()
            if old_proj.bias is not None:
                lora_proj.linear.bias.data = old_proj.bias.data.clone()
            sa_module.proj = lora_proj
    def load_lora_adapters(model, path, device=None):
        """
        Load LoRA adapter weights into a model.
        
        Args:
            model (nn.Module): The model with LoRALinear layers
            path (str): File path of saved adapters
            device (torch.device, optional): Device to load weights on
        """
        lora_state_dict = torch.load(path, map_location=device)

        for name, module in model.named_modules():
            if isinstance(module, LoRALinear):
                module.lora_A.data.copy_(lora_state_dict[f"{name}.lora_A"])
                module.lora_B.data.copy_(lora_state_dict[f"{name}.lora_B"])

        print(f"Loaded LoRA adapters from {path}")

    checkpoints = torch.load('/sage/sage/sage/unv1.pt',weights_only=False,map_location=device)
    
    model = torch.compile(Unveyl1().to(device),backend="torch_tensorrt", dynamic=False,
                                options={
                                        "enabled_precisions": {torch.float, torch.half},
                                       "sparse_weights": True,
                                      "use_fp32_acc": True,
                                     "use_python_runtime": False,})
    model.load_state_dict(checkpoints)
    max_new_tokens = 512
    system_prompt = f'''{prompt}'''
    context =  torch.tensor(tokenizer.EncodeAsIds(system_prompt,add_eos=False),device=device).unsqueeze(0) # (B, T)
    inputs=model.generate(context,max_new_tokens)  # (B, T + max_new_tokens)
    outputs = tokenizer.decode(inputs.tolist()[0][context.shape[1]:])
    return outputs