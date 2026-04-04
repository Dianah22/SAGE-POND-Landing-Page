const getEnv = (key, fallback = '') =>
    typeof process !== 'undefined' && process.env && process.env[key]
        ? process.env[key]
        : fallback;

module.exports = {
    apiKey: getEnv('FIREBASE_API_KEY', 'AIzaSyDyXWSxpBqk7lgomflc_Sl3BCXp8Dvffbg'),
    authDomain: getEnv('FIREBASE_AUTH_DOMAIN', 'sage-pond-gen-ai.firebaseapp.com'),
    projectId: getEnv('FIREBASE_PROJECT_ID', 'sage-pond-gen-ai'),
    storageBucket: getEnv('FIREBASE_STORAGE_BUCKET', 'sage-pond-gen-ai.appspot.com'),
    messagingSenderId: getEnv('FIREBASE_MESSAGING_SENDER_ID', '369426724601'),
    appId: getEnv('FIREBASE_APP_ID', '1:369426724601:web:698e582d4e10ff710c5428'),
    measurementId: getEnv('FIREBASE_MEASUREMENT_ID', 'G-XY1Y3VW550'),
    databaseURL: getEnv('FIREBASE_DATABASE_URL', 'https://sage-pond-gen-ai-default-rtdb.firebaseio.com')
};
