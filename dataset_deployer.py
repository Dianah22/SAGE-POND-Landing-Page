from datasets import load_dataset,concatenate_datasets
from datasets import Dataset
luganda  = load_dataset('pkyoyetera/luganda_english_dataset')
csv_data = Dataset.from_csv('sentences.csv')
new_dataset = concatenate_datasets([luganda['train'], csv_data]).shuffle(seed=42)
print(new_dataset)
new_dataset.push_to_hub("sagepond/english_luganda")