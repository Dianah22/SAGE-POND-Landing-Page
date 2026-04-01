require('dotenv').config();
const { uid } = require('uid')
const express = require('express')
const path = require('path')
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const app = express()
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const validator = require('validator');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const serviceAccount = require('./sagepond.json');
const needle = require('needle');
// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://sage-pond-gen-ai-default-rtdb.firebaseio.com"
    });
}

// Initialize Firestore
const db = admin.firestore();
const feedbackData = {};

let initial_path = __dirname + '/client';
const port = process.env.PORT || 4000

// Middleware setup
app.use(express.static(initial_path));
app.use(helmet());
app.use(cookieParser()); // Ensure cookie parser runs first

// Middleware to parse session and attach user, but not enforce authentication
const parseSession = async (req, res, next) => {
    const sessionCookie = req.cookies.session || '';
    if (sessionCookie) {
        try {
            const decodedClaims = await admin.auth().verifySessionCookie(sessionCookie, true); // true checks for revocation
            req.user = decodedClaims;
        } catch (error) {
            req.user = null;

            // res.clearCookie('session'); 
        }
    } else {
        req.user = null;
    }
    next();
};
app.use(parseSession); // This will populate req.user if a valid session cookie exists

// General rate limiter - now uses req.user.uid if available, otherwise req.ip
const generalRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each key (user ID or IP) to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        if (req.user && req.user.uid) {
            return req.user.uid; // Use Firebase UID if user is authenticated
        }
        return req.ip; // Fallback to IP address for unauthenticated users
    },
    skip: (req, res) => {
        // Example: don't rate limit static assets (though express.static usually handles these first)
        if (req.path.startsWith('/css') || req.path.startsWith('/js') || req.path.startsWith('/images') || req.path.startsWith('/gsap-public')) {
            return true;
        }
        return false;
    }
});
app.use(generalRateLimiter); // Apply the rate limiter

// The verifySession middleware (which enforces authentication) is applied to specific routes later.

app.use(helmet.frameguard({ action: 'deny' }))
app.use(helmet.referrerPolicy({ policy: 'no-referrer' }))
app.use(helmet.hsts({
    maxAge: 31536000,
    includeSubDomains: true,
    preload: false,
}));
app.use(helmet.crossOriginEmbedderPolicy({ policy: 'require-corp' }));
app.use(helmet.xssFilter())
app.use(helmet.ieNoOpen());
app.use(helmet.noSniff())
app.use(bodyParser.json())
app.use(cookieParser());

app.use(
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'",
                "https://cdn.jsdelivr.net/npm/dompurify@3.1.0/dist/purify.min.js",
            ],
            styleSrc: [
                "'self'",
                "https://cdn.jsdelivr.net/npm/dompurify@3.1.0/dist/purify.min.js",
                "https://fonts.googleapis.com",
                "https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css",
                "'unsafe-inline'"
            ],
            imgSrc: ["'self'", "data:"],
            connectSrc: [
                "'self'",
                "https://sagepond--uvveyl-unveyl.modal.run",
                "https://identitytoolkit.googleapis.com",
                "https://securetoken.googleapis.com",
                "https://firestore.googleapis.com",
                "https://firebase.googleapis.com",
            ],
        },
    })
);
app.post('/api/verify-token', async (req, res) => {
    const idToken = req.body.token;
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
    try {
        const sessionCookie = await admin.auth().createSessionCookie(idToken, { expiresIn });

        const options = {
            maxAge: expiresIn,
            httpOnly: true,
            secure: false,
            sameSite: 'Lax', // Set to 'None' for cross-site cookies  
        };
        res.cookie('session', sessionCookie, options);
        res.status(200).json({ success: true });
        // Redirect to /app after successful login     
    } catch (err) {
        res.status(401).json({ success: false, message: err });
    }
});

const fetch = require('node-fetch'); // Add node-fetch

app.get('/terms', (req, res) => {
    res.sendFile(path.join(initial_path, 'terms.html'));
});
const axios = require('axios');


let sessionCookie = 'aa264cbdf161c11173e106ad2f422e3c224488e2ccecd5b78bb6e4757511d762';

app.use((req, res, next) => {
    sessionCookie = req.cookies.session || 'aa264cbdf161c11173e106ad2f422e3c224488e2ccecd5b78bb6e4757511d762';
    next();
});
// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(initial_path, "index.html"));
});

app.post('/api/unveyl', async (req, res) => {
    const userPrompt = req.body.prompt;
    if (!userPrompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }
    try {
        const modelResponse = needle('get', `https://sagepond--uvveyl-unveyl.modal.run/?prompt=${encodeURIComponent(userPrompt)}&apiKey=${req.cookies.session}`)
            .then((response) => {
                res.json({ response: response.body });
            })
            .catch((err) => {
                console.log(err)
            })

    } catch (error) {
    }
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(initial_path, 'login.html'));
});

app.get('/signup', (req, res) => {
    res.send('currently not avialable')
    //res.sendFile(path.join(initial_path, 'signup.html'));
});
// Chat routes
app.post('/create-chat', (req, res) => {
    try {
        const chatId = uid();
        res.json({ success: true, chatId });
    } catch (error) {
        console.error('Error creating chat:', error);
        res.status(500).json({ success: false, message: 'Error creating chat' });
    }
});
// Utility token verifier (not middleware)
app.get('/admin', async (req, res) => {
    res.sendFile(path.join(initial_path, 'admin.html'))
})
app.get('/app', async (req, res) => {

    res.sendFile(path.join(initial_path, 'chat.html'));
});
app.get('/welcome', (req, res) => {
    res.sendFile(path.join(initial_path, 'welcome.html'));
});

// Serve static files for /app/* so CSS/JS load on chat routes
app.use('/app', express.static(initial_path));

// Serve chat.html for /app/:chatId route
//app.use(express.static(initial_path))
app.get('/app/:chatId', (req, res) => {

    res.sendFile(path.join(initial_path, 'chat.html'));

});
app.get('/extract-feedback', parseSession, (req, res) => {
    res.sendFile(path.join(initial_path, 'extract.html'))
});
// Session ping endpoint
app.get('/api/ping-session', (req, res) => {
    res.status(200).json({ success: true, user: req.user });
});

// Firebase config route
app.all('/api/firebase-config', (req, res) => {
    const firebaseConfig = {
        apiKey: "AIzaSyDyXWSxpBqk7lgomflc_Sl3BCXp8Dvffbg",
        authDomain: "sage-pond-gen-ai.firebaseapp.com",
        projectId: "sage-pond-gen-ai",
        storageBucket: "sage-pond-gen-ai.appspot.com",
        messagingSenderId: "369426724601",
        appId: "1:369426724601:web:698e582d4e10ff710c5428",
        measurementId: "G-XY1Y3VW550"
    };

    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== 'Bearer secure-fetch-key') {
        return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    res.json({ success: true, config: firebaseConfig });
});

// Configure Nodemailer with Zoho SMTP
const transporter = nodemailer.createTransport({
    host: 'smtp.zoho.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.ZOHO_EMAIL,
        pass: process.env.ZOHO_PASSWORD
    }
});
app.get('/beta', (req, res) => {
    res.sendFile(path.join(initial_path, 'beta.html'));
});
// Beta signup route
app.post('/beta-signup', async (req, res) => {
    const { email } = req.body;
    console.log('Beta signup request:', email);
    // Validate email
    if (!email || !validator.isEmail(email)) {
        return res.status(400).json({
            success: false,
            message: 'Please provide a valid email address.'
        });
    }

    try {
        // Check if email already exists
        const emailDoc = await db.collection('beta-signups')
            .where('email', '==', email)
            .get();

        if (!emailDoc.empty) {
            return res.status(400).json({
                success: false,
                message: 'This email is already registered for the beta program.'
            });
        }

        // Store email in Firestore with timestamp
        await db.collection('beta-signups').add({
            email,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            status: 'pending'
        });

        // Send confirmation email
        const mailOptions = {
            from: process.env.ZOHO_EMAIL,
            to: email,
            subject: 'Welcome to Unveyl Beta Program',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <img src="../images/logo.svg" alt="SAGE POND Logo" style="display: block; margin: 20px auto; width: 50px;">
                    <h1 style="color: black; text-align: center;">Welcome to SAGE POND Beta!</h1>
                    <p>Thank you for joining our beta program. We're excited to have you on board!</p>
                    <p>We'll keep you updated about:</p>
                    <ul>
                        <li>Early access to new features</li>
                        <li>Exclusive beta tester feedback sessions</li>
                        <li>Official launch updates</li>
                    </ul>
                    <p>Stay tuned for more information coming your way soon.</p>
                    <p style="color: #666;">Best regards,<br>Caleb,CEO & FOUNDER,SAGE POND</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);

        // Update status in Firestore
        await db.collection('beta-signups')
            .where('email', '==', email)
            .get()
            .then((querySnapshot) => {
                querySnapshot.forEach((doc) => {
                    doc.ref.update({ status: 'confirmed' });
                });
            });

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

// Privacy policy route
app.get('/privacy-policy', (req, res) => {
    res.sendFile(path.join(initial_path, 'privacy-policy.html'));
});

// 404 handler
app.use((req, res) => {
    res.sendFile(path.join(initial_path, '404.html'));
});

// 1. Configuration

app.listen(port, () => {
    console.log(`listening on Port ${port}`);
});
