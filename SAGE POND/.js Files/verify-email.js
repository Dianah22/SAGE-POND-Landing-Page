import {
    onAuthStateChanged,
    reload,
    sendEmailVerification
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

import { auth } from "./firebase-config.js";


// ===========================
// SAGE POND VERIFY EMAIL JS
// ===========================


// ===========================
// Get page elements
// ===========================

const checkVerificationBtn =
    document.getElementById("checkVerification");

const resendEmailBtn =
    document.getElementById("resendEmail");

const message =
    document.getElementById("verifyMessage");


// ===========================
// Get verification information
// from the URL
// ===========================

const urlParams =
    new URLSearchParams(window.location.search);

const verified =
    urlParams.get("verified");


// ===========================
// Check Firebase authentication
// ===========================

let currentUser = null;


onAuthStateChanged(auth, (user) => {

    currentUser = user;

    if (!user) {

        message.textContent =
            "Please log in to continue.";

        message.style.color =
            "red";

        checkVerificationBtn.disabled =
            true;

        resendEmailBtn.disabled =
            true;

        return;
    }


    // ===========================
    // User is signed in
    // ===========================

    if (user.emailVerified) {

        message.textContent =
            "Email verified successfully! You can now log in.";

        message.style.color =
            "green";

    } else {

        message.textContent =
            "Please verify your email address before continuing.";

        message.style.color =
            "";

    }

});


// ===========================
// Check Verification Button
// ===========================

async function verifyEmail() {

    if (!currentUser) {

        message.textContent =
            "Please log in to continue.";

        message.style.color =
            "red";

        return;
    }


    try {

        message.textContent =
            "Checking your verification status...";

        message.style.color =
            "";


        // ===========================
        // Refresh Firebase user data
        // ===========================

        await reload(currentUser);


        // ===========================
        // Check email verification
        // ===========================

        if (currentUser.emailVerified) {

            message.textContent =
                "Email verified successfully! You can now log in.";

            message.style.color =
                "green";

        } else {

            message.textContent =
                "Your email has not been verified yet. Please click the verification link in your email.";

            message.style.color =
                "red";

        }

    } catch (error) {

        console.error(
            "Verification check error:",
            error
        );

        message.textContent =
            "Unable to check your verification status.";

        message.style.color =
            "red";

    }

}


// ===========================
// Resend Firebase verification email
// ===========================

async function resendVerificationEmail() {

    if (!currentUser) {

        message.textContent =
            "Please log in to continue.";

        message.style.color =
            "red";

        return;
    }


    try {

        message.textContent =
            "Resending verification email...";

        message.style.color =
            "";


        await sendEmailVerification(
            currentUser
        );


        message.textContent =
            "Verification email sent again. Please check your inbox.";

        message.style.color =
            "green";

    } catch (error) {

        console.error(
            "Resend verification error:",
            error
        );

        message.textContent =
            error.message ||
            "Unable to resend verification email.";

        message.style.color =
            "red";

    }

}


// ===========================
// Button events
// ===========================

checkVerificationBtn.addEventListener(
    "click",
    verifyEmail
);


resendEmailBtn.addEventListener(
    "click",
    resendVerificationEmail
);