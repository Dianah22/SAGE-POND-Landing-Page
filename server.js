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

const serviceAccount = require('./sage-pond-gen-ai-firebase-adminsdk-9u1h2-7a16893d3f.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://sage-pond-gen-ai-default-rtdb.firebaseio.com"
    });
}

let initial_path = __dirname 
const port = process.env.PORT || 4000

// Middleware setup
app.use(express.static(initial_path))
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
                "https://www.google.com/recaptcha/api.js",
                "https://cdn.jsdelivr.net/npm/dompurify@3.1.0/dist/purify.min.js",
            ],
            styleSrc: [
                "'self'",
                "https://fonts.googleapis.com/",
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

// Serve chat.html for /app/:chatId route
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

// 404 handler
app.use((req, res) => {
    res.sendFile(path.join(initial_path, '404.html'));
});

app.listen(port, () => {
    console.log(`listening on Port ${port}`);
});
