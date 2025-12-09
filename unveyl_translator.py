import torch
from torch import nn
import torch.nn.functional as F
import sentencepiece as spm
from torch.utils.data import DataLoader, Dataset
from datasets import load_dataset
from huggingface_hub import login
from torchmetrics.text import BLEUScore  # New Import
import os

l = login(token='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')

# --- Configuration & Setup ---
device = 'cuda' if torch.cuda.is_available() else 'cpu'
if torch.cuda.is_available() and torch.cuda.get_device_capability()[0] >= 8:
    torch.set_float32_matmul_precision('high')

def set_seed(seed):
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)
set_seed(42)

# --- Tokenizer & Data ---
model_path = '/mnt/sage/sage/sage/unveyl.model'
if not os.path.exists(model_path):
    raise FileNotFoundError(f"Model file not found at {model_path}")

tokenizer = spm.SentencePieceProcessor(model_file=model_path)

PAD_ID = tokenizer.pad_id() if tokenizer.pad_id() != -1 else 0
BOS_ID = tokenizer.bos_id() if tokenizer.bos_id() != -1 else 1
EOS_ID = tokenizer.eos_id() if tokenizer.eos_id() != -1 else 2

print("Loading Dataset Splits...")
try:
    dataset_dict = load_dataset("Sunbird/salt", 'text-all')
    train_data = dataset_dict['train']
    dev_data = dataset_dict['dev'] if 'dev' in dataset_dict else dataset_dict['validation']
    test_data = dataset_dict['test']
    print(f"Splits loaded: Train: {len(train_data)}, Dev: {len(dev_data)}, Test: {len(test_data)}")
except Exception as e:
    print(f"Error loading dataset: {e}")
    dummy = [{'eng_target_text': 'Hello world', 'lug_text': 'Ki kati'}] * 100
    train_data, dev_data, test_data = dummy, dummy, dummy

class UnveylDataset(Dataset):
    def __init__(self, data_pairs, tokenizer):
        self.data_pairs = data_pairs
        self.tokenizer = tokenizer

    def __len__(self):
        return len(self.data_pairs)

    def __getitem__(self, idx):
        dat = self.data_pairs[idx]
        src = self.tokenizer.EncodeAsIds(str(dat['eng_target_text']))
        tgt_raw = self.tokenizer.EncodeAsIds(str(dat['lug_text']))
        tgt = [BOS_ID] + tgt_raw + [EOS_ID]
        return torch.tensor(src, dtype=torch.long), torch.tensor(tgt, dtype=torch.long)

def collate_fn(batch):
    srcs, tgts = zip(*batch)
    
    src_lens = [len(s) for s in srcs]
    max_src_len = min(max(src_lens), 2000)
    padded_srcs = torch.nn.utils.rnn.pad_sequence(
        [s[:max_src_len] for s in srcs], batch_first=True, padding_value=PAD_ID
    )
    
    tgt_lens = [len(t) for t in tgts]
    max_tgt_len = min(max(tgt_lens), 2000)
    padded_tgts = torch.nn.utils.rnn.pad_sequence(
        [t[:max_tgt_len] for t in tgts], batch_first=True, padding_value=PAD_ID
    )

    return padded_srcs.to(device), padded_tgts.to(device)

batch_size = 64 if device == 'cuda' else 2
train_loader = DataLoader(UnveylDataset(train_data, tokenizer), batch_size=batch_size, shuffle=True, collate_fn=collate_fn)
dev_loader = DataLoader(UnveylDataset(dev_data, tokenizer), batch_size=batch_size, shuffle=False, collate_fn=collate_fn)
test_loader = DataLoader(UnveylDataset(test_data, tokenizer), batch_size=batch_size, shuffle=False, collate_fn=collate_fn)

# --- Model Architecture ---

class UnveylTranslator(nn.Module):
    def __init__(self, vocab_size=36000, n_embd=64, layers=6, dropout=0.1): 
        super().__init__()
        self.vocab_size = vocab_size
        self.n_embd = n_embd
        self.embedding = nn.Embedding(vocab_size, n_embd, padding_idx=PAD_ID)
        self.position_emb = nn.Embedding(512, n_embd)
        
        self.encoder = nn.TransformerEncoder(
            nn.TransformerEncoderLayer(d_model=n_embd, nhead=4, dropout=dropout, batch_first=True, norm_first=True),
            num_layers=layers
        )
        self.decoder = nn.TransformerDecoder(
            nn.TransformerDecoderLayer(d_model=n_embd, nhead=4, dropout=dropout, batch_first=True, norm_first=True),
            num_layers=layers
        )
        self.fc_out = nn.Linear(n_embd, vocab_size)
        self.dropout = nn.Dropout(dropout)

    def forward(self, src, tgt):
        B, S = src.shape
        _, T = tgt.shape
        
        src_key_padding_mask = (src == PAD_ID)
        tgt_key_padding_mask = (tgt == PAD_ID)
        tgt_mask = nn.Transformer.generate_square_subsequent_mask(T).to(device)
        
        src_emb = self.embedding(src) + self.position_emb(torch.arange(S, device=device))
        tgt_emb = self.embedding(tgt) + self.position_emb(torch.arange(T, device=device))
        
        memory = self.encoder(self.dropout(src_emb), src_key_padding_mask=src_key_padding_mask)
        output = self.decoder(
            self.dropout(tgt_emb), memory, tgt_mask=tgt_mask,
            tgt_key_padding_mask=tgt_key_padding_mask,
            memory_key_padding_mask=src_key_padding_mask
        )
        return self.fc_out(output)

    @torch.no_grad()
    def translate(self, src, max_len=50):
        self.eval()
        if src.dim() == 1:
            src = src.unsqueeze(0)
            
        B, S = src.shape # Get Batch size
        src_mask = (src == PAD_ID)
        src_emb = self.embedding(src) + self.position_emb(torch.arange(S, device=device))
        memory = self.encoder(src_emb, src_key_padding_mask=src_mask)
        
        # Initialize decoder input for the whole batch: [B, 1]
        tgt_indices = torch.full((B, 1), BOS_ID, dtype=torch.long, device=device)
        
        # Keep track of finished sentences (optional optimization, omitted for simplicity)
        for _ in range(max_len):
            T = tgt_indices.size(1)
            tgt_emb = self.embedding(tgt_indices) + self.position_emb(torch.arange(T, device=device))
            tgt_mask = nn.Transformer.generate_square_subsequent_mask(T).to(device)
            
            out = self.decoder(tgt_emb, memory, tgt_mask=tgt_mask)
            logits = self.fc_out(out[:, -1, :]) 
            
            next_token = torch.argmax(logits, dim=-1).unsqueeze(1) # [B, 1]
            tgt_indices = torch.cat([tgt_indices, next_token], dim=1)
            
            # Stop if all sequences have generated EOS (simplified check)
            if (next_token == EOS_ID).all():
                break
                
        return tgt_indices

def init_weights(module):
    if isinstance(module, nn.Linear):
        torch.nn.init.xavier_uniform_(module.weight)
        if module.bias is not None: torch.nn.init.zeros_(module.bias)
    elif isinstance(module, nn.Embedding):
        torch.nn.init.normal_(module.weight, mean=0.0, std=0.02)
    for name, p in module.named_parameters():
        if "fc_out" in name or "linear2" in name: 
            torch.nn.init.normal_(p, mean=0.0, std=0.02 / (2 * 8)**0.5)

# --- Metrics ---
# Initialize BLEU Score
# n_gram=4 is standard. smooth=True helps when n-grams are missing in early training.
bleu_metric = BLEUScore(n_gram=4, smooth=True).to(device)

# --- Training Loop ---

model = UnveylTranslator().to(device)
model.apply(init_weights)
optimizer = torch.optim.AdamW(model.parameters(), lr=1e-3, weight_decay=0.01, fused=True if device=='cuda' else False)
criterion = nn.CrossEntropyLoss(ignore_index=PAD_ID)

def save_model(model):
    torch.save(model.state_dict(), '/mnt/sage/sage/sage/unveyl_translator.pt')
    print("Model saved successfully!")

def test_sentence():
    import random
    model.eval()
    
    # 1. Pick a random index from the test set
    idx = random.randint(0, len(test_data) - 1)
    sample = test_data[idx]
    
    # 2. Get Raw Text
    src_text = sample['eng_target_text']
    ref_text = sample['lug_text']
    
    # 3. Tokenize Source (Prepare for Model)
    src_ids = tokenizer.EncodeAsIds(src_text)
    src_tensor = torch.tensor(src_ids, dtype=torch.long).to(device)
    
    # 4. Generate & Print
    print(f"\n--- Testing (Test Split Index: {idx}) ---")
    print(f"Source (Eng): {src_text}")
    print(f"Target (Lug): {ref_text}") # Show what it SHOULD be
    
    try:
        # Pass to model (translate function handles unsqueezing to batch)
        output_ids = model.translate(src_tensor)
        
        # Decode result
        decoded = tokenizer.DecodeIds(output_ids[0].tolist())
        print(f"Model Output: {decoded}\n")
    except Exception as e:
        print(f"Decoding error: {e}")
        
    model.train()

def evaluate_loss(model, loader):
    model.eval()
    total_loss = 0
    with torch.no_grad():
        for src, tgt in loader:
            decoder_input = tgt[:, :-1]
            targets = tgt[:, 1:]
            with torch.autocast(device_type=device, dtype=torch.float16):
                logits = model(src, decoder_input)
                B, T, C = logits.shape
                loss = criterion(logits.reshape(-1, C), targets.reshape(-1))
            total_loss += loss.item()
    return total_loss / len(loader)

def evaluate_bleu(model, loader):
    model.eval()
    preds = []
    refs = []
    print("Calculating BLEU (Generation)...")
    with torch.no_grad():
        for src, tgt in loader:
            # 1. Generate translation (Autoregressive)
            generated_ids = model.translate(src, max_len=50)
            
            # 2. Decode Predictions
            # Convert tensor to list of lists for decoding
            gen_list = generated_ids.tolist()
            decoded_preds = [tokenizer.DecodeIds(g) for g in gen_list]
            preds.extend(decoded_preds)
            
            # 3. Decode References
            # Remove BOS/EOS/PAD before decoding for cleaner references if needed, 
            # or rely on tokenizer to handle standard IDs.
            ref_list = tgt.tolist()
            decoded_refs = [[tokenizer.DecodeIds(r)] for r in ref_list] # BLEU expects list of lists for refs
            refs.extend(decoded_refs)
            
    # Calculate Score
    score = bleu_metric(preds, refs)
    return score.item()

def train_step():
    model.train()
    epochs = 100
    best_val_loss = float('inf')

    for epoch in range(epochs):
        print(f"\n=== Epoch {epoch + 1} / {epochs} ===")
        
        for step, (src, tgt) in enumerate(train_loader):
            decoder_input = tgt[:, :-1] 
            targets = tgt[:, 1:]        

            optimizer.zero_grad()
            with torch.autocast(device_type=device, dtype=torch.float16):
                logits = model(src, decoder_input) 
                B, T, C = logits.shape
                loss = criterion(logits.reshape(-1, C), targets.reshape(-1))
            
            loss.backward()
            norm = torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            
            if step % 50 == 0:
                print(f'Step {step}, Loss: {loss.item():.4f}, Norm: {norm:.2f}')
            
            if step % 200 == 0 and step != 0:
                test_sentence()
        
        # End of Epoch: Validation
        print("\n--- Validation ---")
        val_loss = evaluate_loss(model, dev_loader)
        
        # Compute BLEU (Heavy operation, done once per epoch)
        val_bleu = evaluate_bleu(model, dev_loader)
        
        print(f"Epoch {epoch+1} Results -> Val Loss: {val_loss:.4f} | BLEU Score: {val_bleu:.4f}")
        
        # Save if loss improves (Standard)
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            save_model(model)
        
        model.train() 

    print("\n--- Final Test Set Evaluation ---")
    test_loss = evaluate_loss(model, test_loader)
    test_bleu = evaluate_bleu(model, test_loader)
    print(f"Final Test -> Loss: {test_loss:.4f} | BLEU: {test_bleu:.4f}")

if __name__ == "__main__":
    train_step()