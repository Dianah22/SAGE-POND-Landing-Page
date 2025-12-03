import torch
from torch import nn
import torch.nn.functional as F
import sentencepiece as spm
from torch.utils.data import DataLoader, Dataset
from datasets import load_dataset
tokenizer = spm.SentencePieceProcessor(model_file='unveyl.model')
data_set = load_dataset("Sunbird/salt",'text-all',split='train')
print(tokenizer.EncodeAsIds(data_set['lug_text'][0]))
pad_token_id = 0    
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

class UnveylDataset(Dataset):
    def __init__(self, data_pairs, tokenizer):
        self.data_pairs = data_pairs
        self.tokenizer = tokenizer

    def __len__(self):
        return len(self.data_pairs)

    def __getitem__(self, idx):
        dat= self.data_pairs[idx]
        src = tokenizer.EncodeAsIds(dat['eng_text'])
        trg = tokenizer.EncodeAsIds(dat['lug_text'])
        src_ids = self.tokenizer.EncodeAsIds(src)
        trg_ids = self.tokenizer.EncodeAsIds(trg)
        return torch.tensor(src_ids, dtype=torch.long), torch.tensor(trg_ids, dtype=torch.long)
data = DataLoader(UnveylDataset(data_set, tokenizer), batch_size=96, shuffle=True, collate_fn=collate_fn)

class UnveylTranslator(nn.Module):
    def __init__(self, num_layers=12, dropout=0.1):
        super().__init__()
        self.vocab_size = 36000
        self.n_embd = 768
        self.num_layers = num_layers
        self.dropout = dropout
        self.embedding = nn.Embedding(self.vocab_size, self.n_embd)    
        self.encoder = nn.TransformerEncoder(
            nn.TransformerEncoderLayer(d_model=self.n_embd, nhead=24, dropout=dropout,batch_first=True),
            num_layers=num_layers
        )
        self.decoder = nn.TransformerDecoder(
            nn.TransformerDecoderLayer(d_model=self.n_embd, nhead=16, dropout=
dropout,batch_first=True),
            num_layers=num_layers
        )
        self.fc_out = nn.Linear(self.n_embd, self.vocab_size)

    def forward(self, src):
        src_emb = self.embedding(src)
        src_enc = self.encoder(src_emb)
        src_dec = self.decoder(src_enc)
        src_out = self.fc_out(src_dec)
        return src_out
    
    def translate(self, src, max_len=50, start_token=1, end_token=2):
        self.eval()
        src_emb = self.embedding(src)
        src_enc = self.encoder(src_emb)
        batch_size = src.size(0)
        outputs = torch.ones(batch_size, 1).long().to(src.device) * start_token
        for _ in range(max_len):
            out_emb = self.embedding(outputs)
            out_dec = self.decoder(out_emb, src_enc)
            out_logits = self.fc_out(out_dec)
            next_token = out_logits[:, -1, :].argmax(dim=-1, keepdim=True)
            outputs = torch.cat((outputs, next_token), dim=1)
            if (next_token == end_token).all():
                break
        return outputs
model = UnveylTranslator()
print(sum(p.numel() for p in model.parameters())/1e6, "Million Parameters")
import sys;sys.exit()
optimizer = torch.optim.AdamW(model.parameters(), lr=0.001)
criterion = nn.CrossEntropyLoss(ignore_index=0)
def train_step(model, optimizer, criterion, src, trg):
    model.train()
    optimizer.zero_grad()
    output = model(src)
    output = output.view(-1, model.output_dim)
    trg = trg.view(-1)
    loss = criterion(output, trg)
    loss.backward()
    optimizer.step()
    return loss.item()