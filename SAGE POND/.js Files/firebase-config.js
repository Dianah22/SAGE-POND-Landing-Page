// ===========================
// SAGE POND FIREBASE CONFIG
// ===========================


import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";

import {
    getAuth
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";



// Firebase configuration

const firebaseConfig = {

    apiKey: "AIzaSyBPTnFNPyl_GFQsFuJzq-BAHYwMDCG6HLk",

    authDomain: "sage-pond-gen-ai.firebaseapp.com",

    databaseURL: "https://sage-pond-gen-ai-default-rtdb.firebaseio.com",

    projectId: "sage-pond-gen-ai",

    storageBucket: "sage-pond-gen-ai.firebasestorage.app",

    messagingSenderId: "369426724601",

    appId: "1:369426724601:web:9639dfe5c601bfd80c5428",

    measurementId: "G-ZQMGJJ3S5K"

};



// Initialize Firebase

const app =
    initializeApp(firebaseConfig);



// Initialize Authentication

const auth =
    getAuth(app);



// Export auth so other files can use it

export {
    auth
};