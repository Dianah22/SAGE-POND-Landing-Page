import torch
import sentencepiece as spm
import nltk
from huggingface_hub import login
from unveyl_translator import UnveylTranslator

nltk.download('punkt_tab')
device = 'cuda' if torch.cuda.is_available() else 'cpu'
model_path = '/mnt/sage/sage/sage/unveyl.model'
tokenizer = spm.SentencePieceProcessor(model_file=model_path)

model = UnveylTranslator().to(device)
model.load_state_dict(torch.load('/mnt/sage/sage/sage/unveyl_translator.pt'))
model.eval()

# --- The Paragraph Translator Function ---
def translate_paragraph(text, batch_size=32):
    """
    1. Splits paragraph into sentences.
    2. Batches them (for GPU speed).
    3. Translates.
    4. Merges back into a paragraph.
    """
    if not text or len(text.strip()) == 0:
        return ""

    # 1. Intelligent Sentence Splitting
    sentences = nltk.sent_tokenize(text)
    
    translated_sentences = []
    
    # 2. Process in Batches (to avoid OOM on long articles)
    for i in range(0, len(sentences), batch_size):
        batch_text = sentences[i : i + batch_size]
        
        # Prepare Batch Tensors
        batch_ids = []
        for sent in batch_text:
            encoded = tokenizer.EncodeAsIds(sent)
            batch_ids.append(torch.tensor(encoded, dtype=torch.long))
        
        # Pad the batch
        padded_src = torch.nn.utils.rnn.pad_sequence(
            batch_ids, batch_first=True, padding_value=0 # 0 is PAD_ID
        ).to(device)
        
        # 3. Inference
        with torch.no_grad():
            # Use your model's translate function
            # Note: Ensure your translate() function handles the batch shape correctly
            output_ids = model.translate(padded_src)
        
        # Decode and clean
        for j in range(output_ids.size(0)):
            # Convert to list and remove BOS/EOS/PAD
            ids = output_ids[j].tolist()
            decoded_sent = tokenizer.DecodeIds(ids)
            translated_sentences.append(decoded_sent)

    # 4. Merge
    # Luganda uses spaces between sentences, similar to English
    return " ".join(translated_sentences)

# --- Example Usage on FineWeb Data ---

sample_fineweb_paragraph = """
Artificial intelligence is transforming agriculture in Africa. 
Farmers are using new tools to predict weather patterns. 
This helps them plant crops at the right time.
"""

print("--- Original ---")
print(sample_fineweb_paragraph)

print("\n--- Translated ---")
luganda_paragraph = translate_paragraph(sample_fineweb_paragraph)
print(luganda_paragraph)
