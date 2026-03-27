import sentencepiece as spm
tokenizer = spm.SentencePieceProcessor(model_file='unveyl.model')
x = tokenizer.EncodeAsIds(['a','b','c','d','e','f'])
y = tokenizer.EncodeAsIds('a  b  c  d  e  f')
print('x',x)
print('y',y)
