const { initializeApp, getApps, getApp } = require('firebase/app');
const { getFirestore } = require('firebase/firestore');
const { getAuth, signInAnonymously } = require('firebase/auth');
const firebaseConfig = require('../../firebase.config');

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

module.exports = {
    getFirebaseApp,
    getDb,
    ensureAnonymousAuth
};
