// ===========================
// SAGE POND FIREBASE CONFIG
// ===========================


import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";



// Firebase configuration

const firebaseConfig = {

    apiKey: "AIzaSyBLb9cAa01I9CfOSodx6B1tBLlDRsFXxOE",

    authDomain: "sage-pond-a2e7a.firebaseapp.com",

    projectId: "sage-pond-a2e7a",

    storageBucket: "sage-pond-a2e7a.firebasestorage.app",

    messagingSenderId: "515437232888",

    appId: "1:515437232888:web:465f7e7bd03fac0fef710d"

};



// Initialize Firebase

const app = initializeApp(firebaseConfig);



// Initialize Authentication

const auth = getAuth(app);



// Export auth so other files can use it

export { auth };