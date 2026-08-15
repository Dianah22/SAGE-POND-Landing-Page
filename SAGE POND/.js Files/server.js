require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');

const app = express();
app.set('trust proxy', 1); // Trust first proxy (Cloudflare)

const { generalRateLimiter } = require('../../sagepond/src/middleware/rateLimiters');
const routes = require('../../sagepond/src/routes');

const appRoot = typeof process !== 'undefined' && typeof process.cwd === 'function'
    ? process.cwd()
    : '.';
let initial_path = path.resolve(appRoot, 'client');
const port = process.env.PORT || 4000;

// Middleware setup
app.use(express.static(initial_path));
app.use(helmet());
app.use(cookieParser()); // Ensure cookie parser runs first

app.use(generalRateLimiter); // Apply the general rate limiter

app.use(helmet.frameguard({ action: 'deny' }));
app.use(helmet.referrerPolicy({ policy: 'no-referrer' }));
app.use(helmet.hsts({
    maxAge: 31536000,
    includeSubDomains: true,
    preload: false,
}));
app.use(helmet.crossOriginEmbedderPolicy({ policy: 'require-corp' }));
app.use(helmet.xssFilter());
app.use(helmet.ieNoOpen());
app.use(helmet.noSniff());
app.use(bodyParser.json());
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

// Register routes
app.use('/', routes(initial_path));

app.listen(port, () => {
    console.log(`listening on Port ${port}`);
});
