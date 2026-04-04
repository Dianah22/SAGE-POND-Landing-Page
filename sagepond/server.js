require('dotenv').config();
const { uid } = require('uid')
const express = require('express')
const path = require('path')
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const app = express()
app.set('trust proxy', 1); // Trust first proxy (Cloudflare)
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const validator = require('validator');
const { initializeApp, getApps, getApp } = require('firebase/app');
const {
    getFirestore,
    collection,
    query,
    where,
    getDocs,
    addDoc,
    serverTimestamp,
    updateDoc
} = require('firebase/firestore');
const { getAuth, signInAnonymously } = require('firebase/auth');
const { Resend } = require('resend');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const needle = require('needle');
const firebaseConfig = require('./firebase.config');
const feedbackData = {};

const getFirebaseApp = () => (getApps().length ? getApp() : initializeApp(firebaseConfig));
const getDb = () => getFirestore(getFirebaseApp());
let anonymousSignInPromise = null;

const ensureAnonymousAuth = async () => {
    const auth = getAuth(getFirebaseApp());
    if (auth.currentUser) {
        return auth.currentUser;
    }

    if (!anonymousSignInPromise) {
        anonymousSignInPromise = signInAnonymously(auth)
            .then((credential) => credential.user)
            .catch((error) => {
                anonymousSignInPromise = null;
                throw error;
            });
    }

    return anonymousSignInPromise;
};

const isWorkersRuntime = () =>
    typeof WebSocketPair !== 'undefined' || Boolean(globalThis.__WORKER_ENV);

const sendWaitlistConfirmationEmail = async (email) => {
    if (!process.env.RESEND_API_KEY) {
        throw new Error('RESEND_API_KEY is not configured');
    }
    if (!process.env.RESEND_FROM) {
        throw new Error('RESEND_FROM is not configured');
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
        from: process.env.RESEND_FROM,
        to: [email],
        subject: 'Welcome to SAGE POND Developer Platform waitlist',
        html: `
                Hello, <br>
Thanks for joining the SAGE POND Developer Platform waitlist.<br>
This means you're among the early group of builders who will get access to the platform as we launch in Q2. <br>
We're currently building the foundation layer for AI in Uganda, and the platform will give you direct access to our APIs without the complexity of managing infrastructure.<br>

What to expect:<br>
* Early access to our APIs (starting with core NLP tooling)<br>
* Updates as we roll out new capabilities<br>
* Opportunities to test features before public release<br>
<br>
Our goal is simple: make it easier for you to build real AI products without worrying about the underlying systems.<br>
We will reach out soon with next steps and access details.<br>
If you're already building something or planning to, feel free to reply and share. We're always interested in what developers are working on.<br>

Best regards,<br>
Caleb Matovu<br>
Founder, SAGE POND<br>
            `,
        idempotencyKey: `waitlist-signup/${email}`
    });

    if (error) {
        throw new Error(error.message);
    }

    return data;
};

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

const appRoot = typeof process !== 'undefined' && typeof process.cwd === 'function'
    ? process.cwd()
    : '.';
let initial_path = path.resolve(appRoot, 'client');
const port = process.env.PORT || 4000

// Middleware setup
app.use(express.static(initial_path));
app.use(helmet());
app.use(cookieParser()); // Ensure cookie parser runs first

// Middleware to parse session and attach user, but not enforce authentication

const passthroughMiddleware = (req, res, next) => next();
const createRateLimiter = (options) =>
    isWorkersRuntime() ? passthroughMiddleware : rateLimit(options);

// General rate limiter - now uses req.user.uid if available, otherwise req.ip
const generalRateLimiter = createRateLimiter({
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
const waitlistLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 1, // limit each IP to 1 request per windowMs
    message: { success: false, message: 'Too many requests from this IP, please try again after an hour.' },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use(generalRateLimiter); // Apply the general rate limiter

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
                "https://challenges.cloudflare.com"
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

const fetch = require('node-fetch'); // Add node-fetch

app.get('/terms', (req, res) => {
    res.sendFile(path.join(initial_path, 'terms.html'));
});
const axios = require('axios');

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
    res.send("Under maintenance")
    // res.sendFile(path.join(initial_path, 'admin.html'))
})
app.get('/app', async (req, res) => {
    res.send("Under maintenance")
    //res.sendFile(path.join(initial_path, 'chat.html'));
});
app.get('/welcome', (req, res) => {
    res.sendFile(path.join(initial_path, 'welcome.html'));
});

// Serve static files for /app/* so CSS/JS load on chat routes
app.use('/app', express.static(initial_path));

// Serve chat.html for /app/:chatId route
//app.use(express.static(initial_path))
app.get('/app/:chatId', (req, res) => {
    res.send("Under maintenance")
    //res.sendFile(path.join(initial_path, 'chat.html'));

});

// Session ping endpoint
app.get('/api/ping-session', (req, res) => {
    res.send("Under maintenance")
    //res.status(200).json({ success: true, user: req.user });
});

// Firebase config route
app.all('/api/firebase-config', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== 'Bearer secure-fetch-key') {
        return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    res.json({ success: true, config: firebaseConfig });
});

app.get('/api/public-config', (req, res) => {
    res.json({
        success: true,
        turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || ''
    });
});

// Transporter logic removed in favor of WorkerMailer in /waitlist route
app.get('/beta', (req, res) => {
    res.sendFile(path.join(initial_path, 'beta.html'));
});
// Beta signup route with strict rate limiting
app.post('/waitlist', waitlistLimiter, async (req, res) => {
    const { email, turnstileToken } = req.body;
    console.log('Beta signup request:', email);
    // Validate email
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

        // Check if email already exists
        const emailDoc = await getDocs(query(signupsCollection, where('email', '==', email)));

        if (!emailDoc.empty) {
            return res.status(400).json({
                success: false,
                message: 'This email is already registered for the beta program.'
            });
        }

        // Store email in Firestore with timestamp
        await addDoc(signupsCollection, {
            email,
            timestamp: serverTimestamp(),
            status: 'pending'
        });

        // Send confirmation email
        await sendWaitlistConfirmationEmail(email);
        void ({

            from: process.env.RESEND_FROM,
            to: { email: email },
            subject: 'Welcome to SAGE POND Developer Platform waitlist',
            html: `
                Hello,
Thanks for joining the SAGE POND Developer Platform waitlist.
This means you’re among the early group of builders who will get access to the platform as we launch in Q2. We’re currently building the foundation layer for AI in Uganda, and the platform will give you direct access to our APIs without the complexity of managing infrastructure.

What to expect:
* Early access to our APIs (starting with core NLP tooling)
* Updates as we roll out new capabilities
* Opportunities to test features before public release

Our goal is simple: make it easier for you to build real AI products without worrying about the underlying systems.
We will reach out soon with next steps and access details.
If you’re already building something or planning to, feel free to reply and share. We’re always interested in what developers are working on.

Best regards,
Caleb Matovu
Founder, SAGE POND
            `
        });


        // Update status in Firestore
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
