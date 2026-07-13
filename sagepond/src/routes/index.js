const express = require('express');
const router = express.Router();
const path = require('path');
const { uid } = require('uid');
const needle = require('needle');
const validator = require('validator');
const {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    serverTimestamp,
    updateDoc
} = require('firebase/firestore');

const { ensureAnonymousAuth, getDb } = require('../config/firebase');
const { sendWaitlistConfirmationEmail } = require('../services/emailService');
const { verifyTurnstileToken } = require('../services/turnstileService');
const { waitlistLimiter } = require('../middleware/rateLimiters');
const firebaseConfig = require('../../firebase.config');

module.exports = function(initial_path) {
    router.get('/terms', (req, res) => {
        res.sendFile(path.join(initial_path, 'terms.html'));
    });

    router.get('/', (req, res) => {
        res.sendFile(path.join(initial_path, "index.html"));
    });

    router.post('/api/unveyl', async (req, res) => {
        const userPrompt = req.body.prompt;
        if (!userPrompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }
        try {
            needle('get', `https://sagepond--uvveyl-unveyl.modal.run/?prompt=${encodeURIComponent(userPrompt)}&apiKey=${req.cookies.session}`)
                .then((response) => {
                    res.json({ response: response.body });
                })
                .catch((err) => {
                    console.log(err);
                });
        } catch (error) {
            console.error('Unveyl API error:', error);
        }
    });

    router.get('/login', (req, res) => {
        res.sendFile(path.join(initial_path, 'login.html'));
    });

    router.get('/signup', (req, res) => {
        res.send('currently not avialable');
    });

    router.post('/create-chat', (req, res) => {
        try {
            const chatId = uid();
            res.json({ success: true, chatId });
        } catch (error) {
            console.error('Error creating chat:', error);
            res.status(500).json({ success: false, message: 'Error creating chat' });
        }
    });

    router.get('/admin', async (req, res) => {
        res.send("Under maintenance");
    });

    router.get('/app', async (req, res) => {
        res.send("Under maintenance");
    });

    router.get('/welcome', (req, res) => {
        res.sendFile(path.join(initial_path, 'welcome.html'));
    });

    // Serve static files for /app/* so CSS/JS load on chat routes
    router.use('/app', express.static(initial_path));

    router.get('/app/:chatId', (req, res) => {
        res.send("Under maintenance");
    });

    router.get('/api/ping-session', (req, res) => {
        res.send("Under maintenance");
    });

    router.all('/api/firebase-config', (req, res) => {
        const authHeader = req.headers.authorization;
        if (!authHeader || authHeader !== 'Bearer secure-fetch-key') {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }
        res.json({ success: true, config: firebaseConfig });
    });

    router.get('/api/public-config', (req, res) => {
        res.json({
            success: true,
            turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || ''
        });
    });

    router.get('/beta', (req, res) => {
        res.sendFile(path.join(initial_path, 'beta.html'));
    });

    router.post('/waitlist', waitlistLimiter, async (req, res) => {
        const { email, turnstileToken } = req.body;
        console.log('Beta signup request:', email);

        if (!email || !validator.isEmail(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email address.'
            });
        }
        if (!turnstileToken) {
            return res.status(400).json({
                success: false,
                message: 'Turnstile verification is required.'
            });
        }

        try {
            const turnstileResult = await verifyTurnstileToken(turnstileToken, req.ip);
            if (!turnstileResult.success) {
                return res.status(400).json({
                    success: false,
                    message: 'Turnstile verification failed.'
                });
            }

            await ensureAnonymousAuth();
            const db = getDb();
            const signupsCollection = collection(db, 'beta-signups');

            const emailDoc = await getDocs(query(signupsCollection, where('email', '==', email)));
            if (!emailDoc.empty) {
                return res.status(400).json({
                    success: false,
                    message: 'This email is already registered for the beta program.'
                });
            }

            await addDoc(signupsCollection, {
                email,
                timestamp: serverTimestamp(),
                status: 'pending'
            });

            await sendWaitlistConfirmationEmail(email);

            const pendingSignupDocs = await getDocs(query(signupsCollection, where('email', '==', email)));
            for (const signupDoc of pendingSignupDocs.docs) {
                await updateDoc(signupDoc.ref, { status: 'confirmed' });
            }

            res.json({
                success: true,
                message: 'Successfully registered for beta program.'
            });
        } catch (error) {
            console.error('Beta signup error:', error);
            res.status(500).json({
                success: false,
                message: 'An error occurred while processing your request.'
            });
        }
    });

    router.get('/privacy-policy', (req, res) => {
        res.sendFile(path.join(initial_path, 'privacy-policy.html'));
    });

    router.use((req, res) => {
        res.sendFile(path.join(initial_path, '404.html'));
    });

    return router;
};
