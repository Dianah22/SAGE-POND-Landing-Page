import {
    createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

import { auth } from "./firebase-config.js";


// ===========================
// SAGE POND SIGNUP JAVASCRIPT
// ===========================


// ===========================
// Send verification email request to backend
// ===========================

async function sendVerificationEmail(name, email) {

    const response = await fetch(
        "http://127.0.0.1:3000/send-verification-email",
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                name: name,
                email: email
            })
        }
    );

    const data = await response.json();

    console.log("Backend response:", data);

    if (!response.ok) {

        throw new Error(
            data.message ||
            "Failed to send verification email."
        );

    }

    return data;
}


// ===========================
// Get form elements
// ===========================

const signupForm =
    document.getElementById("signupForm");

const signupMessage =
    document.getElementById("signupMessage");


// ===========================
// Signup
// ===========================

signupForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        const name =
            document.getElementById("name")
                .value
                .trim();


        const email =
            document.getElementById("email")
                .value
                .trim();


        const password =
            document.getElementById("password")
                .value;


        const confirmPassword =
            document.getElementById("confirmPassword")
                .value;


        // ===========================
        // Check password match
        // ===========================

        if (password !== confirmPassword) {

            signupMessage.textContent =
                "Passwords do not match.";

            signupMessage.style.color =
                "red";

            return;
        }


        // ===========================
        // Check password length
        // ===========================

        if (password.length < 8) {

            signupMessage.textContent =
                "Password must be at least 8 characters.";

            signupMessage.style.color =
                "red";

            return;
        }


        try {

            signupMessage.textContent =
                "Creating your account...";

            signupMessage.style.color =
                "black";


            // ===========================
            // Create Firebase account
            // ===========================

            await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );


            // ===========================
            // Store email for verification page
            // ===========================

            sessionStorage.setItem(
                "signupEmail",
                email
            );


            // ===========================
            // Ask backend to send
            // verification email
            // ===========================

            await sendVerificationEmail(
                name,
                email
            );


            // ===========================
            // Success message
            // ===========================

            signupMessage.textContent =
                "Account created! Verification email sent. Please check your email.";

            signupMessage.style.color =
                "green";


            // ===========================
            // Redirect
            // ===========================

            setTimeout(() => {

                window.location.href =
                    "verify-email.html";

            }, 1500);


        } catch (error) {

            console.error(
                "Signup error:",
                error
            );


            // ===========================
            // Firebase errors
            // ===========================

            if (
                error.code ===
                "auth/email-already-in-use"
            ) {

                signupMessage.textContent =
                    "An account with this email already exists.";

            } else if (
                error.code ===
                "auth/invalid-email"
            ) {

                signupMessage.textContent =
                    "Please enter a valid email address.";

            } else if (
                error.code ===
                "auth/weak-password"
            ) {

                signupMessage.textContent =
                    "The password is too weak.";

            } else {

                signupMessage.textContent =
                    error.message ||
                    "Unable to create account.";

            }


            signupMessage.style.color =
                "red";

        }

    }
);