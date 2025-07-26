const axios = require('axios');

class BatchManager {
    constructor(timeoutMs = 2000, maxBatchSize = 12) {
        this.batch = [];
        this.timeoutMs = timeoutMs;
        this.maxBatchSize = maxBatchSize;
        this.timeoutId = null;
    }

    async addPrompt(prompt, apiKey) {
        this.batch.push({ prompt, apiKey });

        if (this.batch.length >= this.maxBatchSize) {
            await this.processBatch();
        } else {
            if (this.timeoutId) clearTimeout(this.timeoutId);
            this.timeoutId = setTimeout(async () => {
                await this.processBatch();
                this.timeoutId = null;
            }, this.timeoutMs);
        }
    }

    async processBatch() {
        if (this.batch.length === 0) return;
        const currentBatch = [...this.batch];
        this.batch = [];

        try {
            const response = await axios.get('https://sagepond--uvveyl-unveyl.modal.run/', {
                messages: currentBatch,
                apiKey: 'aa264cbdf161c11173e106ad2f422e3c224488e2ccecd5b78bb6e4757511d762'
            });
            console.log('Batch response:', response.data);
            return response.data;
        } catch (error) {
            console.error('Batch processing error:', error);
            throw error;
        }
    }
}