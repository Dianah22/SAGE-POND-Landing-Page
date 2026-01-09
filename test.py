import torch
from torch.utils.data import Dataset
from datasets import load_dataset
from transformers import (
    M2M100Config,
NllbTokenizerFast,
    M2M100ForConditionalGeneration,
    PreTrainedTokenizerFast,
    Seq2SeqTrainer,
    Seq2SeqTrainingArguments,
    DataCollatorForSeq2Seq,
)

# =========================================================
# Global performance switches
# =========================================================
torch.backends.cuda.matmul.allow_tf32 = True
torch.backends.cudnn.allow_tf32 = True
torch.set_float32_matmul_precision (' high ')# Enable Flash Attention via SDPA (PyTorch 2.x)
torch.backends.cuda.enable_flash_sdp(True)
torch.backends.cuda.enable_mem_efficient_sdp(True)
torch.backends.cuda.enable_math_sdp(False)

# =========================================================
# Tokenizer (SentencePiece -> HF)
# =========================================================
tokenizer = NllbTokenizerFast.from_pretrained("/modern_luganda_tokenizer")
# =========================================================
# Model configuration
# =========================================================
config = M2M100Config(
    vocab_size=tokenizer.vocab_size,
    max_position_embeddings=512,

    encoder_layers=6,
    decoder_layers=6,
    encoder_attention_heads=8,
    decoder_attention_heads=8,

    d_model=512,
    encoder_ffn_dim=2048,
    decoder_ffn_dim=2048,

    dropout=0.1,
    attention_dropout=0.1,
    pad_token_id=tokenizer.pad_token_id,
    bos_token_id=tokenizer.bos_token_id,
    eos_token_id=tokenizer.eos_token_id,
)

model = M2M100ForConditionalGeneration(config)

# =========================================================
# torch.compile (AFTER model creation, BEFORE trainer)
# =========================================================
model = torch.compile(
    model
)

# =========================================================
# PyTorch Dataset (tensor-only, pin-ready)
# =========================================================
class TranslationDataset(Dataset):
    def __init__(self, hf_ds, tokenizer, src_col, tgt_col, max_len=256):
        self.ds = hf_ds
        self.tok = tokenizer
        self.src = src_col
        self.tgt = tgt_col
        self.max_len = max_len

    def __len__(self):
        return len(self.ds)

    def __getitem__(self, idx):
        src_text = self.ds[idx][self.src]
        tgt_text = self.ds[idx][self.tgt]

        src = self.tok(
            src_text,
            max_length=self.max_len,
            truncation=True,
            add_special_tokens=True,
        )

        tgt = self.tok(
            tgt_text,
            max_length=self.max_len,
            truncation=True,
            add_special_tokens=True,
        )

        return {
            "input_ids": src["input_ids"],
            "attention_mask": src["attention_mask"],
            "labels": tgt["input_ids"],
        }

# =========================================================
# Dataset
# =========================================================
dataset = load_dataset("pkyoyetera/luganda_english_dataset", split="train")

train_dataset = TranslationDataset(
    dataset,
    tokenizer,
    src_col="English",
    tgt_col="Luganda",
)

# =========================================================
# Data collator
# =========================================================
data_collator = DataCollatorForSeq2Seq(
    tokenizer=tokenizer,
    model=model,
    padding=True,
)

# =========================================================
# Training arguments
# =========================================================
training_args = Seq2SeqTrainingArguments(
    output_dir="./mt_lg_en",

    per_device_train_batch_size=32,
    gradient_accumulation_steps=2,

    learning_rate=5e-4,
    num_train_epochs=10,
    warmup_steps=500,

    fp16=True,
    logging_steps=100,
    save_steps=1000,
    save_total_limit=2,

    dataloader_pin_memory=True,
    report_to="none",

    predict_with_generate=True,
)

# =========================================================
# Trainer with explicit non_blocking transfers
# =========================================================
class NonBlockingTrainer(Seq2SeqTrainer):
    def _prepare_inputs(self, inputs):
        device = self.args.device
        for k, v in inputs.items():
            if isinstance(v, torch.Tensor):
                inputs[k] = v.to(device, non_blocking=True)
        return inputs

trainer = NonBlockingTrainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    tokenizer=tokenizer,
)

# =========================================================
# Train
# =========================================================
trainer.train()
