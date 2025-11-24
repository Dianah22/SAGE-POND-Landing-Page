import torch
from torch import nn
import torch.nn.functional as F
class UnveylTranslator(nn.Module):
    def __init__(self, input_dim, hidden_dim, output_dim, num_layers=2, dropout=0.1):
        super(UnveylTranslator, self).__init__()
        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        self.output_dim = output_dim
        self.num_layers = num_layers
        self.dropout = dropout
        self.embedding = nn.Embedding(input_dim, hidden_dim)    
        self.encoder = nn.TransformerEncoder(
            nn.TransformerEncoderLayer(d_model=hidden_dim, nhead=16, dropout=dropout,batch_first=True),
            num_layers=num_layers
        )
        self.decoder = nn.TransformerDecoder(
            nn.TransformerDecoderLayer(d_model=hidden_dim, nhead=8, dropout=
dropout,batch_first=True),
            num_layers=num_layers
        )
        self.fc_out = nn.Linear(hidden_dim, output_dim)

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
model = UnveylTranslator(input_dim=1000, hidden_dim=512, output_dim=1000)
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