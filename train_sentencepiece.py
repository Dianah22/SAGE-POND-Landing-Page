"""
Train a joint English–Luganda SentencePiece tokenizer (BPE, 40k vocab)
Dataset: pkyoyetera/luganda_english_dataset
"""

import os
from datasets import load_dataset
import sentencepiece as spm
from tqdm import tqdm
from tokenizers import SentencePieceBPETokenizer

# # ""# -----------------------------
# # # Configuration
# # # -----------------------------
# DATASET_NAME = "pkyoyetera/luganda_english_dataset"
# SPLIT = "train"

# SRC_COL = "English"
# TGT_COL = "Luganda"

# CORPUS_FILE = "spm_mt_corpus.txt"
# MODEL_PREFIX = "luganda_en_spm"

# VOCAB_SIZE = 40000

# # -----------------------------
# # Text normalization (MT-safe)
# # -----------------------------
# def normalize(text: str) -> str:
#     if text is None:
#         return ""
#     text = str(text)
#     text = text.replace("\n", " ")
#     text = " ".join(text.split())
#     return text.strip()

# # -----------------------------
# # Step 1: Download dataset
# # -----------------------------
# print("Loading Hugging Face dataset...")
# dataset = load_dataset(DATASET_NAME, split=SPLIT)

# assert SRC_COL in dataset.column_names, f"Missing column: {SRC_COL}"
# assert TGT_COL in dataset.column_names, f"Missing column: {TGT_COL}"

# print(f"Dataset size: {len(dataset)} sentence pairs")

# # -----------------------------
# # Step 2: Build SentencePiece corpus
# # -----------------------------
# print("Building SentencePiece corpus...")

# with open(CORPUS_FILE, "w", encoding="utf-8") as f:
#     for row in tqdm(dataset, desc="Writing sentences"):
#         src = normalize(row[SRC_COL])
#         tgt = normalize(row[TGT_COL])

#         # Write one sentence per line (joint tokenizer)
#         if src:
#             f.write(src + "\n")
#         if tgt:
#             f.write(tgt + "\n")

# print(f"Corpus written to: {CORPUS_FILE}")

# # -----------------------------
# # Step 3: Train SentencePiece BPE
# # -----------------------------
# print("Training SentencePiece tokenizer...")

# # 1. Initialize the tokenizer
# tokenizer = SentencePieceBPETokenizer()

# # 2. Train on your files
# tokenizer.train(
#     files=["spm_mt_corpus.txt"],
#     vocab_size=40000,
#     min_frequency=1,
#     show_progress=True,
#     special_tokens=["<unk>", "<s>", "</s>", "<pad>", "<mask>"],
#     limit_alphabet=1000  # Limits initial alphabet size
# )

# # # 3. Save the trained tokenizer
# tokenizer.save("tokenizer.json")

# # -----------------------------
# # Step 4: Sanity check
# # -----------------------------
# print("Running sanity check...")

from transformers import NllbTokenizerFast
import os
modern_tokenizer = NllbTokenizerFast(
    tokenizer_file="tokenizer.json",
    src_lang="eng_Latn",
    tgt_lang="lug_Latn",
    bos_token="<s>",
    eos_token="</s>",
    sep_token="</s>",
    pad_token="<pad>",
    unk_token="<unk>"
)

modern_tokenizer.save_pretrained("./modern_luganda_tokenizer")
test_en = "This is a simple test sentence."
test_lg = "Ebigambo bino bya kugerageranya."

print("EN tokens:", sp.encode(test_en,add_special_tokens=True))
print("LG tokens:", sp.encode(test_lg))

print("Done.")
