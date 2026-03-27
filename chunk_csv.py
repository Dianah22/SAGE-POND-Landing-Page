import csv
import os
import re
from typing import Tuple
from tqdm import tqdm

def process_chunked_csv_with_regex(
    input_filepath: str, 
    output_directory: str, 
    rows_per_chunk: int = 2000,
    columns_to_keep: Tuple[int, ...] = (0, 1)
) -> None:
    """
    Sequentially reads a large CSV, projects specific column indices, 
    applies lexical substitution using regex for standalone newline markers,
    and writes to chunked output files using bounded memory buffers.
    """
    os.makedirs(output_directory, exist_ok=True)
    
    # Pre-compile the regex pattern to achieve O(1) compilation complexity.
    # The \b anchors ensure matching only occurs at word boundaries, 
    # preventing the modification of substrings (e.g., "UNLIMITED").
    # The (?:...) syntax creates a non-capturing group for the alternatives.
    token_pattern = re.compile(r'\b(?:_NL_|_NL|NL_|NL)\b')
    
    with open(input_filepath, mode='r', encoding='utf-8', newline='') as input_file:
        reader = csv.reader(input_file)
        
        try:
            raw_header = next(reader)
            header = [raw_header[i] for i in columns_to_keep]
        except StopIteration:
            print("Execution halted: The input CSV file is empty.")
            return
        except IndexError as e:
            raise IndexError(f"Column indices {columns_to_keep} exceed the dimensional bounds of the header.") from e

        chunk_index = 1
        current_row_count = 0
        output_file = None
        writer = None

        for raw_row in tqdm(reader, desc="Processing rows"):
            try:
                # 1. Project the required columns
                # 2. Apply the regex substitution map to replace standalone tokens with '\n'
                processed_row = [
                    token_pattern.sub('\n', raw_row[i]) for i in columns_to_keep
                ]
            except IndexError:
                continue 

            if current_row_count == 0:
                output_filename = os.path.join(output_directory, f"chunk_{chunk_index}.csv")
                output_file = open(output_filename, mode='w', encoding='utf-8', newline='')
                # Note: csv.writer will automatically quote fields containing '\n' 
                # to maintain RFC 4180 compliance.
                writer = csv.writer(output_file)
                writer.writerow(header)
            
            writer.writerow(processed_row)
            current_row_count += 1
            
            if current_row_count == rows_per_chunk:
                output_file.close()
                chunk_index += 1
                current_row_count = 0
        
        if output_file is not None and not output_file.closed:
            output_file.close()
            
    print(f"I/O process terminated. Yielded {chunk_index} filtered and formatted chunks in '{output_directory}'.")

# Execution Example:
# process_chunked_csv_with_regex('dataset.csv', './output', rows_per_chunk=2000, columns_to_keep=(0, 2))
process_chunked_csv_with_regex('fineweb_luganda_synthetic.csv','output_chunks',rows_per_chunk=2000,columns_to_keep=(0,1, 2))