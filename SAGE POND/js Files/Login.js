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
            // Generic Login Error
            // ===========================

            loginMessage.textContent =
                "Email or password is incorrect.";

            loginMessage.style.color =
                "red";

        }

    }
);