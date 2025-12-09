from datasets import load_dataset
import csv
import translation_pipeline
dataset = load_dataset("HuggingFaceFW/fineweb", name="sample-10BT", split="train", streaming=True)
with open('fineweb_luganda_translations.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerow(['original_english', 'translated_luganda'])
    for i, record in enumerate(dataset):
        english_text = record['text']
        try:
            translation = translation_pipeline.translate_paragraph(english_text)
            writer.writerow([english_text, translation])
            if i % 10 == 0:
                print(f"Translated {i} documents...", end='\r')
        except Exception as e:
            print(f"Error on doc {i}: {e}")
        if i >= 1000: 
            break