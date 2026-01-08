"""
Train a joint English–Luganda SentencePiece tokenizer (BPE, 40k vocab)
Dataset: pkyoyetera/luganda_english_dataset
"""

import os
from datasets import load_dataset
import sentencepiece as spm
from tqdm import tqdm

# -----------------------------
# Configuration
# -----------------------------
DATASET_NAME = "pkyoyetera/luganda_english_dataset"
SPLIT = "train"

SRC_COL = "English"
TGT_COL = "Luganda"

CORPUS_FILE = "spm_mt_corpus.txt"
MODEL_PREFIX = "luganda_en_spm"

VOCAB_SIZE = 40000

# -----------------------------
# Text normalization (MT-safe)
# -----------------------------
def normalize(text: str) -> str:
    if text is None:
        return ""
    text = str(text)
    text = text.replace("\n", " ")
    text = " ".join(text.split())
    return text.strip()

# -----------------------------
# Step 1: Download dataset
# -----------------------------
print("Loading Hugging Face dataset...")
dataset = load_dataset(DATASET_NAME, split=SPLIT)

assert SRC_COL in dataset.column_names, f"Missing column: {SRC_COL}"
assert TGT_COL in dataset.column_names, f"Missing column: {TGT_COL}"

print(f"Dataset size: {len(dataset)} sentence pairs")

# -----------------------------
# Step 2: Build SentencePiece corpus
# -----------------------------
print("Building SentencePiece corpus...")

with open(CORPUS_FILE, "w", encoding="utf-8") as f:
    for row in tqdm(dataset, desc="Writing sentences"):
        src = normalize(row[SRC_COL])
        tgt = normalize(row[TGT_COL])

        # Write one sentence per line (joint tokenizer)
        if src:
            f.write(src + "\n")
        if tgt:
            f.write(tgt + "\n")

print(f"Corpus written to: {CORPUS_FILE}")

# -----------------------------
# Step 3: Train SentencePiece BPE
# -----------------------------
print("Training SentencePiece tokenizer...")

spm.SentencePieceTrainer.train(
    input=CORPUS_FILE,
    model_prefix=MODEL_PREFIX,
    vocab_size=VOCAB_SIZE,
    model_type="bpe",

    # MT best practices
    character_coverage=1.0,
    byte_fallback=True,
    split_by_whitespace=False,
    shuffle_input_sentence=True,

    # Transformer-friendly IDs
    unk_id=0,
    bos_id=1,
    eos_id=2,
    pad_id=3,
)

print("Training complete.")
print(f"Generated files:")
print(f"  {MODEL_PREFIX}.model")
print(f"  {MODEL_PREFIX}.vocab")

# -----------------------------
# Step 4: Sanity check
# -----------------------------
print("Running sanity check...")

sp = spm.SentencePieceProcessor()
sp.load(f"{MODEL_PREFIX}.model")

test_en = "This is a simple test sentence."
test_lg = "Ebigambo bino bya kugerageranya."

print("EN tokens:", sp.encode(test_en, out_type=str))
print("LG tokens:", sp.encode(test_lg, out_type=str))

print("Done.")
