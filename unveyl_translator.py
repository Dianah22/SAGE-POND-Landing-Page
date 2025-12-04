import torch
from torch import nn
import torch.nn.functional as F
import sentencepiece as spm
from torch.utils.data import DataLoader, Dataset
from datasets import load_dataset
from huggingface_hub import login
device = 'cuda' if torch.cuda.is_available() else 'cpu'
l = login(token='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')
tokenizer = spm.SentencePieceProcessor(model_file='/mnt/sage/sage/sage/unveyl.model')
print()
data_set = load_dataset("Sunbird/salt",'text-all',split='train')
pad_token_id = 0    
def collate_fn(batch):
    srcs, tgts = zip(*batch)
    # Determine the maximum length for the batch, constrained to 2000
    max_length = min(max(len(src) for src in srcs), 2000)
    # Pad sequences to the max_length
    padded_srcs = [torch.cat([src[:max_length], torch.full((max_length - len(src[:max_length]),), pad_token_id, dtype=torch.long)]) if len(src) < max_length else src[:max_length] for src in srcs]
    padded_tgts = [torch.cat([tgt[:max_length], torch.full((max_length - len(tgt[:max_length]),), pad_token_id, dtype=torch.long)]) if len(tgt) < max_length else tgt[:max_length] for tgt in tgts]
    
    # Stack tensors to create the batch
    batch_srcs = torch.stack(padded_srcs).to(device)
    batch_tgts = torch.stack(padded_tgts).to(device)
    return batch_srcs, batch_tgts

class UnveylDataset(Dataset):
    def __init__(self, data_pairs, tokenizer):
        self.data_pairs = data_pairs
        self.tokenizer = tokenizer

    def __len__(self):
        return len(self.data_pairs)

    def __getitem__(self, idx):
        dat= self.data_pairs[idx]
        src = tokenizer.EncodeAsIds(str(dat['eng_target_text']),add_bos=True,add_eos=True)
        trg = tokenizer.EncodeAsIds(str(dat['lug_text']),add_bos=True,add_eos=True)
        return torch.tensor(src, dtype=torch.long), torch.tensor(trg, dtype=torch.long)
data = DataLoader(UnveylDataset(data_set, tokenizer), batch_size=2, shuffle=True, collate_fn=collate_fn)

class UnveylTranslator(nn.Module):
    def __init__(self,  dropout=0.1):
        super().__init__()
        self.vocab_size = 36000
        self.n_embd = 768
        self.encoder_layers = 16
        self.decoder_layers = 8
        self.dropout = dropout
        self.embedding = nn.Embedding(self.vocab_size, self.n_embd)    
        self.encoder = nn.TransformerEncoder(
            nn.TransformerEncoderLayer(d_model=self.n_embd, nhead=16, dropout=dropout,batch_first=True),
            num_layers=self.encoder_layers
        )
        
        self.decoder = nn.TransformerDecoder(
            nn.TransformerDecoderLayer(d_model=self.n_embd, nhead=16, dropout=
dropout,batch_first=True),
            num_layers=self.decoder_layers
        )
        self.fc_out = nn.Linear(self.n_embd, self.vocab_size)
    def forward(self, src,tgt=None,inference=False):
        B,T = src.size()
        src_emb = self.embedding(src)
        src_enc = self.encoder(src_emb)
        tgt_emb = self.embedding(tgt)
        if inference:
            tgt_mask = nn.Transformer.generate_square_subsequent_mask(tgt.size(0)).to(tgt.device)
            src_dec = self.decoder(tgt_emb,src_enc,tgt_mask=tgt_mask)
            src_out = self.fc_out(src_dec)[:, -1, :]
            return src_out,tgt
        else:
            tgt_mask = nn.Transformer.generate_square_subsequent_mask(tgt.size(1)).to(tgt.device)
            src_dec = self.decoder(tgt_emb,src_enc,tgt_mask=tgt_mask)
            src_out = self.fc_out(src_dec)
            B,T,C = src_out.shape
            src_out = src_out.view(B*T,C)
            tgt = tgt.view(B*T)
            return src_out,tgt
    @torch.no_grad()
    def translate(self, src,tgt=torch.tensor(tokenizer.EncodeAsIds('',add_bos=True),device=device).unsqueeze(0), max_len=50):
        self.eval()
        for _ in range(max_len):
            logits = self(src,tgt,inference=True)[0]
            probs = F.softmax(logits,dim=-1)
            next_token = torch.argmax(probs, dim=-1).unsqueeze(0)
            src = torch.cat((tgt, next_token), dim=1)
            if (next_token == 2).all():
                break
        return src
model = UnveylTranslator().to(device)
optimizer = torch.optim.AdamW(model.parameters(), lr=4e-3,fused=True if device=='cuda' else False)
criterion = nn.CrossEntropyLoss(ignore_index=0)
def test_sentence():
    x = torch.tensor(tokenizer.EncodeAsIds('who are you?',add_eos=True)).unsqueeze(0).to(device)
    output = model.translate(x)
    print(f"Output: {tokenizer.DecodeIds(output.squeeze().tolist())}")
def train_step(model, optimizer, criterion):
    for i in range(5):
        for step,(src,tgt) in enumerate(data):
            model.train()
            optimizer.zero_grad()
            output,tgt = model(src,tgt)
            loss = criterion(output, tgt)
            if step%10==0:
                test_sentence()
            loss.backward()
            optimizer.step()
            print(loss.item())
train_step(model, optimizer, criterion)       