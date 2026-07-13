const rateLimit = require('express-rate-limit');

const isWorkersRuntime = () =>
    typeof WebSocketPair !== 'undefined' || Boolean(globalThis.__WORKER_ENV);

const passthroughMiddleware = (req, res, next) => next();

const createRateLimiter = (options) =>
    isWorkersRuntime() ? passthroughMiddleware : rateLimit(options);

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

module.exports = {
    generalRateLimiter,
    waitlistLimiter,
    isWorkersRuntime
};
