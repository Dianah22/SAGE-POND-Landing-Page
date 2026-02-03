from datasets import load_dataset,concatenate_datasets
from datasets import Dataset, concatenate_datasets, DatasetDict
import pandas as pd
luganda  = load_dataset('pkyoyetera/luganda_english_dataset')
csv_data = Dataset.from_csv('new3.csv')
raw_dataset = concatenate_datasets([luganda['train'], csv_data])

def clean_and_split(dataset):
    # Convert to pandas for easier deduplication
    df = dataset.to_pandas()
    
    # Remove duplicates based on English and Luganda columns
    initial_count = len(df)
    df = df.drop_duplicates(subset=['English', 'Luganda'])
    final_count = len(df)
    print(f"Removed {initial_count - final_count} duplicates. Final count: {final_count}")
    
    # Convert back to Dataset
    cleaned_dataset = Dataset.from_pandas(df).remove_columns(['__index_level_0__'])
    
    # Split the dataset
    return cleaned_dataset.train_test_split(test_size=0.1, seed=42)

final_dataset = clean_and_split(raw_dataset)
print(final_dataset)
final_dataset.push_to_hub("sagepond/english_luganda")