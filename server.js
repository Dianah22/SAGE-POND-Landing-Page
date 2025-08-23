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
const fs = require('fs').promises;
const jwt = require('jsonwebtoken');
const serviceAccount = require('./sagepond.json');
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
            // Invalid or revoked cookie, treat as unauthenticated
            // console.warn('Session cookie verification failed for parseSession:', error.code);
            req.user = null; 
            // Optionally clear the invalid cookie from the client
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
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// Initialize WhatsApp Client
const whatsappClient = new Client({
    authStrategy: new LocalAuth(), // Use LocalAuth to save session and avoid re-scanning QR code often
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'] // Args for running in restricted environments
    }
});

whatsappClient.on('qr', qr => {
    qrcode.generate(qr, { small: true });
    console.log('QR RECEIVED, scan it with your phone.');
    require('fs').writeFileSync('/app/qr.txt', qr);
});

whatsappClient.on('ready', () => {
    console.log('WhatsApp Client is ready!');
});

const { google } = require('googleapis');

const oAuth2Client = new google.auth.OAuth2(
    "YOUR_GOOGLE_CLIENT_ID",
    "YOUR_GOOGLE_CLIENT_SECRET",
    "http://localhost:4000/auth/google/callback"
);
app.get('/auth/google', (req, res) => {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/calendar.events'],
    });
    res.redirect(authUrl);
});

app.get('/auth/google/callback', async (req, res) => {
    const code = req.query.code;
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    // Store the tokens in the user's session or database
    // For now, I will just log them to the console
    console.log(tokens);
    res.send('Authentication successful! You can now close this tab.');
});

const axios = require('axios');


let sessionCookie = 'aa264cbdf161c11173e106ad2f422e3c224488e2ccecd5b78bb6e4757511d762';

app.use((req, res, next) => {
    sessionCookie = req.cookies.session || 'aa264cbdf161c11173e106ad2f422e3c224488e2ccecd5b78bb6e4757511d762';
    next();
});
/*
async function handleMessage(message) {
    if (message.from !== '256777040263@c.us') {
        if (feedbackData[message.from] && feedbackData[message.from].response && !feedbackData[message.from].selection ) {
            feedbackData[message.from].selection = message.body;
            
            // Store feedback in Firestore
            try {
                await db.collection('feedback').add({
                    from: message.from,
                    prompt: feedbackData[message.from].prompt,
                    response: feedbackData[message.from].response,
                    selection: feedbackData[message.from].selection,
                    timestamp: new Date()
                });
                message.reply('Thank you for the feedback!');
            } catch (error) {
                console.error('Error saving feedback to Firestore:', error);
                message.reply('Sorry, there was an error saving your feedback.');
            } finally {
                delete feedbackData[message.from];
            }
        } else if(feedbackData[message.from] && feedbackData[message.from].isProcessing){
            // If the user is still waiting for a response
            message.reply('Your previous prompt is still being processed, please wait...');
        }
        else {
            const userPrompt = message.body;
            feedbackData[message.from] = {
                prompt: userPrompt,
                isProcessing: true
            };

            if (!userPrompt) {
                return;
            }
            const externalModelUrl = `https://sagepond--uvveyl-unveyl.modal.run/?prompt=${encodeURIComponent(userPrompt)}&apiKey=${sessionCookie}`;

            try {
                const modelResponse = await fetch(externalModelUrl);
                if (!modelResponse.ok) {
                    const errorText = await modelResponse.text();
                    console.error(`External API call failed: ${modelResponse.status} ${errorText}`);
                    message.reply('Failed to get response from model');
                    return;
                }
                const modelData = await modelResponse.json();
                const reply = modelData.response || modelData || 'yooo';

                if (reply.includes('<post_linkedin>')) {
                    const postContent = reply.split('<post_linkedin>')[1].split('</post_linkedin>')[0];
                    await postOnLinkedIn(postContent);
                    message.reply('I have posted on LinkedIn for you.');
                } else if (reply.includes('<remember_message>')) {
                    const reminderContent = reply.split('<remember_message>')[1].split('</remember_message>')[0];
                    sendReminder(message.from, reminderContent);
                    message.reply('I have set a reminder for you.');
                }
            } catch (error) {
                console.error('Error calling external model API:', error);
                message.reply('Internal server error while contacting model');
            }finally {
                if (feedbackData[message.from]) {
                    feedbackData[message.from].isProcessing = false;
                }
            }
        }
    }
}

whatsappClient.on('message', async message => {
    await handleMessage(message);
});



whatsappClient.on('auth_failure', msg => {
    console.error('WHATSAPP AUTHENTICATION FAILURE', msg);
});

whatsappClient.on('disconnected', (reason) => {
    console.log('WhatsApp Client was logged out', reason);
});

whatsappClient.on('loading_screen', (percent, message) => {
    console.log('LOADING SCREEN', percent, message);
});

whatsappClient.on('authenticated', () => {
    console.log('AUTHENTICATED');
});

whatsappClient.initialize().catch(err => console.error('WhatsApp Client Initialization Error:', err));

*/
// Routes
app.get('/', (req, res) => {
    console.log( 1)
    res.sendFile(path.join(initial_path, "index.html"));
});

app.post('/api/unveyl', async (req, res) => {
    const userPrompt = req.body.prompt;

    if (!userPrompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    // Use the API key from environment variables for the external API call
    const apiKey = process.env.apiKey;
    if (!apiKey) {
        console.error('External API key is not configured in .env');
        return res.status(500).json({ error: 'Internal server error: API key not configured.' });
    }

    const externalModelUrl = `https://sagepond--uvveyl-unveyl.modal.run/?prompt=${encodeURIComponent(userPrompt)}&apiKey=${sessionCookie}`;

    try {
        const modelResponse = await fetch(externalModelUrl);
        if (!modelResponse.ok) {
            const errorText = await modelResponse.text();
            console.error(`External API call failed: ${modelResponse.status} ${errorText}`);
            // Avoid sending detailed external errors to the client for security.
            return res.status(502).json({ error: 'Failed to get response from model' });
        }
        const modelData = await modelResponse.json(); 
        res.json({ response: modelData.response || modelData }); 
    } catch (error) {
        console.error('Error calling external model API:', error);
        res.status(500).json({ error: 'Internal server error while contacting model' });
    }
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(initial_path, 'login.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(initial_path, 'signup.html'));
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
app.get('/admin',async (req,res)=>{
    res.sendFile(path.join(initial_path,'admin.html'))
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

// WhatsApp Send Message Endpoint
/*
app.post('/api/whatsapp/send', verifySession, async (req, res) => {
    if (!whatsappClient || typeof whatsappClient.getState !== 'function') {
        return res.status(503).json({ success: false, message: 'WhatsApp client is not initialized yet.' });
    }

    const clientState = await whatsappClient.getState();
    if (clientState !== 'CONNECTED') {
         // Log detailed state for debugging
        console.log(`WhatsApp client not ready. Current state: ${clientState}`);
        return res.status(503).json({ success: false, message: `WhatsApp client not ready. State: ${clientState}` });
    }

    const { number, message } = req.body; // number should be like '1234567890@c.us'

    if (!number || !message) {
        return res.status(400).json({ success: false, message: 'Number and message are required.' });
    }

    // Validate number format (simple check, can be improved)
    if (!/^\d+@c\.us$/.test(number)) {
        return res.status(400).json({ success: false, message: 'Invalid number format. Expected: 1234567890@c.us' });
    }

    try {
        const msg = await whatsappClient.sendMessage(number, message);
        res.json({ success: true, message: 'Message sent successfully.', messageId: msg.id.id });
    } catch (error) {
        console.error('Error sending WhatsApp message:', error);
        res.status(500).json({ success: false, message: 'Failed to send WhatsApp message.', error: error.message });
    }
});
*/

app.listen(port, () => {
    console.log(`listening on Port ${port}`);
});
