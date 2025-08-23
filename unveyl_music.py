import torch
from torch import nn
import torch.nn.functional as F
from unveyl import Unveyl1
from encodec import EncodecModel
d_model =768
nhead = 8
nlayer=8
class Music(nn.Module):
    def __init__(self):
        super().__init__()
        self.encoder_layers = nn.TransformerEncoderLayer(d_model=d_model,nhead=nhead,batch_first=True)
        self.encoder = nn.TransformerEncoder(self.encoder_layers,nlayer)