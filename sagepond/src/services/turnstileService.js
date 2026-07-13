const fetch = require('node-fetch');

const verifyTurnstileToken = async (token, remoteip) => {
    if (!process.env.TURNSTILE_SECRET_KEY) {
        throw new Error('TURNSTILE_SECRET_KEY is not configured');
    }

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            secret: process.env.TURNSTILE_SECRET_KEY,
            response: token,
            remoteip: remoteip || ''
        })
    });

    return response.json();
};

module.exports = {
    verifyTurnstileToken
};
