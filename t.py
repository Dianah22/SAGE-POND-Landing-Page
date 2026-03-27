import pandas as pd
from deep_translator import GoogleTranslator
import argparse
import time
import os

def translate_csv(input_file, output_file, test_mode=False, batch_size=300):
    print(f"Reading {input_file}...")
    try:
        df = pd.read_csv(input_file)
    except Exception as e:
        print(f"Error reading input file: {e}")
        return

    translator = GoogleTranslator(source='english', target='luganda')

    print("Starting translation...")
    total_rows = len(df)
    batch_data = [] # List to hold dictionaries of processed rows
    
    # Initialize output file with headers
    # We write the header first, then append data
    with open(output_file, 'w', encoding='utf-8', newline='') as f:
        f.write("English,Luganda\n")
    
    start_time = time.time()
    xy=0
    for index, row in df.iterrows():
        xy+=1
        if xy>30007:  # Skip first 6900 rows
            original_text = row['English']
            translation = ""
            try:
                # Basic rate limit handling: retry once if fail
                try:
                    translation = translator.translate(str(original_text))
                except Exception:
                    time.sleep(1) # Wait a bit before retry
                    translation = translator.translate(str(original_text))
            except Exception as e:
                print(f"Error translating row {index}: {e}")
                translation = "" # Keep empty on failure

            # Add to batch
            batch_data.append({'English': original_text, 'Luganda': str(translation)})

        # Check if batch is full
            if len(batch_data) >= batch_size:
                print(f"Saving batch of {len(batch_data)} rows (Processed {index + 1}/{total_rows})...")
                batch_df = pd.DataFrame(batch_data)
                batch_df.to_csv(output_file, mode='a', header=False, index=False, encoding='utf-8')
                batch_data = [] # Clear batch

            # Print progress 
            if index % 10 == 0:
                elapsed = time.time() - start_time
                print(f"Processed {index + 1}/{total_rows} ({elapsed:.2f}s)")
        else:
            continue   
        # Small delay
        if not test_mode:
            time.sleep(0.2) 

    # Save remaining rows in the batch
    if batch_data:
        print(f"Saving final batch of {len(batch_data)} rows...")
        batch_df = pd.DataFrame(batch_data)
        batch_df.to_csv(output_file, mode='a', header=False, index=False, encoding='utf-8')
    
    print(f"Done! Saved to {output_file}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Translate CSV English column to Luganda.')
    parser.add_argument('--test', action='store_true', help='Run on first 5 rows for testing')
    args = parser.parse_args()

    input_csv = 'new3.csv'
    output_csv = 'translated_new.csv'
    
    if not os.path.exists(input_csv):
        print(f"Input file {input_csv} does not exist.")
    else:
        translate_csv(input_csv, output_csv, args.test)
