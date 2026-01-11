#!/usr/bin/env python3
"""
Clean `sentences.csv` by removing any row that contains a null/empty value
in any column. Creates a backup `sentences.backup.csv` before overwriting.
"""
from pathlib import Path
import pandas as pd

INPUT = Path("sentences.csv")
BACKUP = Path("sentences.backup.csv")

if not INPUT.exists():
    print(f"Input file not found: {INPUT}")
    raise SystemExit(1)

# Read everything as string to detect empty-like values consistently
df = pd.read_csv(INPUT, dtype=str)
original_count = len(df)

# Normalize: strip whitespace, replace common text tokens for null with actual NaN
# Then drop any row with NaN in any column
df = df.applymap(lambda x: x.strip() if isinstance(x, str) else x)
null_like = {"null": pd.NA, "none": pd.NA, "nan": pd.NA, "": pd.NA}
# case-insensitive replacement
for token in list(null_like.keys()):
    df = df.replace({token: pd.NA, token.capitalize(): pd.NA, token.upper(): pd.NA})

cleaned = df.dropna(how="any")

# Filter out sentences longer than 600 characters
cleaned = cleaned[
    (cleaned['English'].str.len() <= 600) & 
    (cleaned['Luganda'].str.len() <= 600)
]

cleaned_count = len(cleaned)

# Backup original
INPUT.replace(BACKUP)
# Save cleaned back to `sentences.csv`
cleaned.to_csv(INPUT, index=False, encoding="utf-8")

print(f"Original rows: {original_count}")
print(f"Kept rows: {cleaned_count}")
print(f"Removed rows: {original_count - cleaned_count}")
print(f"Backup saved to: {BACKUP}")
