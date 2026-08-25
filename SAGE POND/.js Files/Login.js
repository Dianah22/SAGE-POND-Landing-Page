import {
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

import { auth } from "./firebase-config.js";


// ===========================
// SAGE POND LOGIN JAVASCRIPT
// ===========================


// ===========================
// Get form elements
// ===========================

const loginForm =
    document.getElementById("loginForm");

const loginMessage =
    document.getElementById("loginMessage");


// ===========================
// Login
// ===========================

loginForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        const email =
            document.getElementById("email")
                .value
                .trim();

        const password =
            document.getElementById("password")
                .value;


        // ===========================
        // Basic validation
        // ===========================

        if (!email || !password) {

            loginMessage.textContent =
                "Please enter your email and password.";

            loginMessage.style.color =
                "red";

            return;
        }


        try {

            loginMessage.textContent =
                "Logging in...";

            loginMessage.style.color =
                "black";


            // ===========================
            // Firebase Login
            // ===========================

            const userCredential =
                await signInWithEmailAndPassword(
                    auth,
                    email,
                    password
                );


            const user =
                userCredential.user;


            // ===========================
            // Check Firebase verification
            // ===========================

            if (!user.emailVerified) {

                loginMessage.textContent =
                    "Please verify your email before logging in.";

                loginMessage.style.color =
                    "red";

                return;
            }


            // ===========================
            // Login successful
            // ===========================

            loginMessage.textContent =
                "Login successful! Redirecting...";

            loginMessage.style.color =
                "green";


            setTimeout(() => {

                window.location.href =
                    "index.html";

            }, 1500);


        } catch (error) {

            console.error(
                "Login error:",
                error
            );


            // ===========================
            // Firebase errors
            // ===========================

            if (
                error.code ===
                "auth/invalid-credential"
            ) {

                loginMessage.textContent =
                    "Invalid email or password.";

            } else if (
                error.code ===
                "auth/user-not-found"
            ) {

                loginMessage.textContent =
                    "No account was found with this email.";

            } else if (
                error.code ===
                "auth/wrong-password"
            ) {

                loginMessage.textContent =
                    "Incorrect password.";

            } else if (
                error.code ===
                "auth/invalid-email"
            ) {

                loginMessage.textContent =
                    "Please enter a valid email address.";

            } else {

                loginMessage.textContent =
                    error.message ||
                    "Unable to log in.";

            }


            loginMessage.style.color =
                "red";
        }

    }
);

