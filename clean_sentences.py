
import pandas as pd
def clean_and_split(dataset):
    # Convert to pandas for easier deduplication
    df = pd.read_csv(dataset)
    
    # Remove duplicates based on English and Luganda columns
    initial_count = len(df)
    df = df.drop_duplicates(subset=['English', 'Luganda'])
    final_count = len(df)
    print(f"Removed {initial_count - final_count} duplicates. Final count: {final_count}")
        
    # Split the dataset
    return df.to_csv('new.csv', index=False)
clean_and_split('sentences.csv')