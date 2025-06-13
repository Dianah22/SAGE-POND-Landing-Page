require('dotenv').config();
const {uid} = require('uid')
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
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const fs = require('fs').promises;
const jwt = require('jsonwebtoken');

const serviceAccount = require('./sage-pond-gen-ai-firebase-adminsdk-9u1h2-7a16893d3f.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://sage-pond-gen-ai-default-rtdb.firebaseio.com"
    });
}

// Initialize Firestore
const db = admin.firestore();

let initial_path = __dirname + '/client';
const port = process.env.PORT || 4000

// Middleware setup
app.use(express.static(initial_path));
app.use(helmet());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }))

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
            ],
            imgSrc: ["'self'", "data:"],
            connectSrc: [
                "'self'",
                "https://identitytoolkit.googleapis.com",
                "https://securetoken.googleapis.com",
                "https://firestore.googleapis.com",
                "https://firebase.googleapis.com",
            ],
        },
    })
);

// Authentication middleware
// middleware/isAuthenticated.js
// utils/tokenExtractor.js
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
  const verifySession = async (req, res, next) => {
    const sessionCookie = req.cookies.session || '';
    try {
      const decodedClaims = await admin.auth().verifySessionCookie(sessionCookie, true);
      req.user = decodedClaims;
      next()
    } catch (err) {
      res.status(401).send('Unauthorized');
    }
  };
 
// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(initial_path, "index.html"));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'signup.html'));
});
// Chat routes
app.post('/create-chat', verifySession, (req, res) => {
    try {
        const chatId = uid();
        res.json({ success: true, chatId });
    } catch (error) {
        console.error('Error creating chat:', error);
        res.status(500).json({ success: false, message: 'Error creating chat' });
    }
});
// Utility token verifier (not middleware)
app.get('/app',verifySession, async (req, res) => {
    res.sendFile(path.join(initial_path, 'chat.html'));
});
app.get('/welcome', (req, res) => {
    res.sendFile(path.join(initial_path, 'welcome.html'));
});

// Serve static files for /app/* so CSS/JS load on chat routes
app.use('/app', express.static(initial_path));

// Serve chat.html for /app/:chatId route
//app.use(express.static(initial_path))
app.get('/app/:chatId', verifySession, (req, res) => {

    res.sendFile(path.join(initial_path, 'chat.html'));
});

// Session ping endpoint
app.get('/api/ping-session', verifySession, (req, res) => {
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
                    <img src="/client/images/logo.svg" alt="SAGE POND Logo" style="display: block; margin: 20px auto; width: 50px;">
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

// WhatsApp connection management
let wa = null;
let isConnected = false;

// WhatsApp connection function
async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const { version } = await fetchLatestBaileysVersion();

    wa = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: true,
        defaultQueryTimeoutMs: undefined
    });

    // Handle connection events
    wa.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error instanceof Boom)
                ? lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut
                : true;

            console.log('WhatsApp connection closed due to:', lastDisconnect?.error?.output?.payload?.message);

            if (shouldReconnect) {
                console.log('Reconnecting to WhatsApp...');
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            console.log('WhatsApp connection established!');
            isConnected = true;
        }
    });

    // Save credentials on change
    wa.ev.on('creds.update', saveCreds);

    // Handle incoming messages
    wa.ev.on('messages.upsert', async ({ messages }) => {
        for (const message of messages) {
            if (message.key.fromMe || !message.message) continue;

            const chat = {
                id: message.key.remoteJid,
                pushName: message.pushName,
                message: message.message?.conversation || 
                         message.message?.extendedTextMessage?.text ||
                         message.message?.buttonsResponseMessage?.selectedDisplayText
            };

            try {
                // Get user context from Firestore
                const userRef = db.collection('whatsapp-users').doc(chat.id);
                const userDoc = await userRef.get();
                
                let context = {};
                if (userDoc.exists) {
                    context = userDoc.data();
                } else {
                    // Create new user context
                    await userRef.set({
                        phoneNumber: chat.id,
                        pushName: chat.pushName,
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        lastInteraction: admin.firestore.FieldValue.serverTimestamp(),
                        conversationState: 'initial'
                    });
                }

                // Process message
                await processMessage(chat, context, userRef, wa);

            } catch (error) {
                console.error('Error processing message:', error);
                await wa.sendMessage(chat.id, { text: 'Sorry, I encountered an error. Please try again later.' });
            }
        }
    });
}

// Message processing function
async function processMessage(chat, context, userRef, wa) {
    const text = chat.message.toLowerCase();
    
    // Update last interaction time
    await userRef.update({
        lastInteraction: admin.firestore.FieldValue.serverTimestamp()
    });

    // Basic conversation flow with buttons
    switch(context.conversationState) {
        case 'initial':
            await wa.sendMessage(chat.id, {
                text: '👋 Welcome to SAGE POND! How can I help you today?',
                buttons: [
                    { buttonId: 'services', buttonText: { displayText: '1. Our Services' } },
                    { buttonId: 'beta', buttonText: { displayText: '2. Join Beta' } },
                    { buttonId: 'support', buttonText: { displayText: '3. Contact Support' } }
                ]
            });
            await userRef.update({ conversationState: 'menu' });
            break;

        case 'menu':
            if (text.includes('1') || text.includes('services')) {
                await wa.sendMessage(chat.id, {
                    text: '🌟 SAGE POND offers innovative AI solutions for businesses:\n\n• Custom AI Models\n• Data Analytics\n• Process Automation\n\nWould you like to know more about any specific service?',
                    buttons: [
                        { buttonId: 'ai_models', buttonText: { displayText: 'AI Models' } },
                        { buttonId: 'analytics', buttonText: { displayText: 'Analytics' } },
                        { buttonId: 'automation', buttonText: { displayText: 'Automation' } }
                    ]
                });
                await userRef.update({ conversationState: 'services' });
            } else if (text.includes('2') || text.includes('beta')) {
                await wa.sendMessage(chat.id, { 
                    text: '🚀 To join our beta program, please share your email address.' 
                });
                await userRef.update({ conversationState: 'beta_email' });
            } else if (text.includes('3') || text.includes('support')) {
                await wa.sendMessage(chat.id, { 
                    text: '🤝 Our support team will be with you shortly. In the meantime, please describe your issue.' 
                });
                await userRef.update({ conversationState: 'support' });
            }
            break;

        // Add more states as needed
        default:
            await wa.sendMessage(chat.id, {
                text: '👋 Welcome back! How can I help you today?',
                buttons: [
                    { buttonId: 'services', buttonText: { displayText: '1. Our Services' } },
                    { buttonId: 'beta', buttonText: { displayText: '2. Join Beta' } },
                    { buttonId: 'support', buttonText: { displayText: '3. Contact Support' } }
                ]
            });
            await userRef.update({ conversationState: 'menu' });
    }
}

// Start WhatsApp connection
connectToWhatsApp().catch(err => console.log('WhatsApp connection error:', err));

// Middleware for API authentication
const authenticateAPI = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Check if API key exists in Firestore
        const apiKeyDoc = await db.collection('api-keys').doc(decoded.keyId).get();
        if (!apiKeyDoc.exists) {
            return res.status(401).json({ error: 'Invalid API key' });
        }

        req.apiKey = apiKeyDoc.data();
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// API Routes for WhatsApp bot
app.post('/api/whatsapp/send', authenticateAPI, async (req, res) => {
    try {
        const { to, message, buttons } = req.body;

        if (!to || !message) {
            return res.status(400).json({ error: 'Phone number and message are required' });
        }

        if (!isConnected || !wa) {
            return res.status(503).json({ error: 'WhatsApp service not connected' });
        }

        // Validate phone number format
        const phoneNumber = to.replace(/\D/g, '');
        if (!validator.isMobilePhone(phoneNumber)) {
            return res.status(400).json({ error: 'Invalid phone number' });
        }

        const jid = `${phoneNumber}@s.whatsapp.net`;
        
        // Send message with optional buttons
        let messageContent = { text: message };
        if (buttons && Array.isArray(buttons) && buttons.length > 0) {
            messageContent.buttons = buttons.map((btn, idx) => ({
                buttonId: `btn_${idx}`,
                buttonText: { displayText: btn.text },
                type: 1
            }));
        }

        await wa.sendMessage(jid, messageContent);

        // Log message in Firestore
        await db.collection('whatsapp-messages').add({
            to: jid,
            message,
            buttons: buttons || [],
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            apiKeyId: req.apiKey.id,
            status: 'sent'
        });

        res.json({ success: true, message: 'Message sent successfully' });
    } catch (error) {
        console.error('Error sending WhatsApp message:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// Generate API key endpoint
app.post('/api/keys/generate', verifySession, async (req, res) => {
    try {
        const keyId = uid(16);
        const apiKey = jwt.sign({ keyId }, process.env.JWT_SECRET, { expiresIn: '1y' });

        // Store API key info in Firestore
        await db.collection('api-keys').doc(keyId).set({
            id: keyId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: req.user.uid,
            lastUsed: null
        });

        res.json({ apiKey });
    } catch (error) {
        console.error('Error generating API key:', error);
        res.status(500).json({ error: 'Failed to generate API key' });
    }
});

app.listen(port, () => {
    console.log(`listening on Port ${port}`);
});
