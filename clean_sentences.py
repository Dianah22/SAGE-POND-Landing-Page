
import pandas as pd
def clean_and_split(dataset):
    # Convert to pandas for easier deduplication
    df = pd.read_csv(dataset)
    
    # Remove duplicates based on English and Luganda columns
    initial_count = len(df)
    df = df.drop_duplicates(subset=['English', 'Luganda'])
    final_count = len(df)
    print(f"Removed {initial_count - final_count} duplicates. Final count: {final_count}")
        
    # Remove entries with text length greater than 526
    df = df[df['English'].str.len() <= 526]
    df = df[df['Luganda'].str.len() <= 526]
    # Split the dataset
    return df.to_csv('new3.csv', index=False)
clean_and_split('new2.csv')