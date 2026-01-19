import pandas as pd
import nltk
from nltk.tokenize import sent_tokenize
import re
from pathlib import Path

# Download required NLTK data (only needed first time)
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')


def extract_sentences_english(text):
    """Extract sentences from English text using NLTK."""
    if pd.isna(text) or text == '':
        return []
    return sent_tokenize(text)


def extract_sentences_luganda(text):
    """Extract sentences from Luganda text using regex (simple approach)."""
    if pd.isna(text) or text == '':
        return []
    
    # Split by common sentence endings: . ! ?
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    # Filter out empty strings and re-add punctuation if lost
    sentences = [s.strip() for s in sentences if s.strip()]
    return sentences


def extract_and_expand_sentences(input_csv, output_csv):
    """
    Read CSV with paragraph data, extract sentences, and create new CSV with sentence-level data.
    
    Args:
        input_csv: Path to input CSV file with 'English' and 'Luganda' columns
        output_csv: Path to output CSV file
    """
    
    # Read the input CSV
    df = pd.read_csv(input_csv)
    # Store all extracted sentences
    all_sentences = []
    
    # Process each row
    for idx, row in df.iterrows():
        english_text = row['original_english']
        luganda_text = row['synthetic_luganda']
        
        # Extract sentences from both columns
        english_sentences = extract_sentences_english(english_text)
        luganda_sentences = extract_sentences_luganda(luganda_text)
        
        # Zip sentences together (use zip_longest if lengths differ)
        from itertools import zip_longest
        for eng_sent, lug_sent in zip_longest(english_sentences, luganda_sentences, fillvalue=''):
            all_sentences.append({
                'English': eng_sent,
                'Luganda': lug_sent
            })
    
    # Create new dataframe and save to CSV
    output_df = pd.DataFrame(all_sentences)
    output_df.to_csv(output_csv, index=False, encoding='utf-8')
    
    print(f"✓ Processed {len(df)} paragraph rows")
    print(f"✓ Extracted {len(output_df)} sentence rows")
    print(f"✓ Output saved to: {output_csv}")


if __name__ == "__main__":
    # Define input and output file paths
    input_file = "content.csv"  # Change this to your input CSV filename
    output_file = "fineweb_l_test.csv"
    
    # Check if input file exists
    if not Path(input_file).exists():
        print(f"Error: {input_file} not found")
        print("Please provide a CSV file with 'English' and 'Luganda' columns")
    else:
        extract_and_expand_sentences(input_file, output_file)