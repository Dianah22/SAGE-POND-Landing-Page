import {
    createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

import { auth } from "./firebase-config.js";


// ===========================
// SAGE POND SIGNUP JAVASCRIPT
// ===========================


// ===========================
// Send verification email
// ===========================

async function sendVerificationEmail(name, email) {

    const response = await fetch(
        "http://localhost:3000/send-verification-email",
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


    // ===========================
    // Get backend response
    // ===========================

    const responseText =
        await response.text();


    console.log(
        "Backend status:",
        response.status
    );


    console.log(
        "Backend response:",
        responseText
    );


    // ===========================
    // Convert response to JSON
    // ===========================

    let data;

    try {

        data =
            JSON.parse(responseText);

    } catch (error) {

        console.error(
            "Backend did not return valid JSON:",
            responseText
        );

        throw new Error(
            "The server returned an invalid response. Please check the backend terminal."
        );

    }


    // ===========================
    // Check response status
    // ===========================

    if (!response.ok) {

        throw new Error(
            data.message ||
            "Failed to send verification email."
        );

    }


    return data;
}


// ===========================
// Open verification page
// ===========================

function openVerificationPage() {

    const signupEmail =
        localStorage.getItem(
            "signupEmail"
        );

    if (!signupEmail) {

        window.location.href =
            "http://localhost:3000/signup";

        return;

    }

    window.location.href =
        "http://localhost:3000/verify?email=" +
        encodeURIComponent(
            signupEmail
        );

}


// ===========================
// Get form elements
// ===========================

const signupForm =
    document.getElementById(
        "signupForm"
    );


const signupMessage =
    document.getElementById(
        "signupMessage"
    );


// ===========================
// Check form exists
// ===========================

if (signupForm) {

    signupForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            // ===========================
            // Get input values
            // ===========================

            const name =
                document
                    .getElementById("name")
                    .value
                    .trim();


            const email =
                document
                    .getElementById("email")
                    .value
                    .trim()
                    .toLowerCase();


            const password =
                document
                    .getElementById("password")
                    .value;


            const confirmPassword =
                document
                    .getElementById(
                        "confirmPassword"
                    )
                    .value;


            // ===========================
            // Validate name
            // ===========================

            if (!name) {

                signupMessage.textContent =
                    "Please enter your full name.";

                signupMessage.style.color =
                    "red";

                return;

            }


            // ===========================
            // Validate email
            // ===========================

            if (!email) {

                signupMessage.textContent =
                    "Please enter your email address.";

                signupMessage.style.color =
                    "red";

                return;

            }


            // ===========================
            // Validate passwords
            // ===========================

            if (
                password !==
                confirmPassword
            ) {

                signupMessage.textContent =
                    "Passwords do not match.";

                signupMessage.style.color =
                    "red";

                return;

            }


            // ===========================
            // Validate password length
            // ===========================

            if (
                password.length < 8
            ) {

                signupMessage.textContent =
                    "Password must be at least 8 characters.";

                signupMessage.style.color =
                    "red";

                return;

            }


            // ===========================
            // Create account
            // ===========================

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


                console.log(
                    "Firebase account created successfully."
                );


                // ===========================
                // Store signup email in local storage
                // ===========================

                localStorage.setItem(
                    "signupEmail",
                    email
                );


                console.log(
                    "Signup email stored in local storage."
                );


                // ===========================
                // Send verification email
                // ===========================

                signupMessage.textContent =
                    "Account created. Sending verification email...";

                signupMessage.style.color =
                    "black";


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
                // Open verification page
                // ===========================

                setTimeout(
                    () => {

                        openVerificationPage();

                    },
                    1500
                );


            } catch (error) {

                console.error(
                    "Signup error code:",
                    error.code
                );


                console.error(
                    "Signup error message:",
                    error.message
                );


                console.error(
                    "Full signup error:",
                    error
                );


                signupMessage.textContent =
                    error.message ||
                    "Unable to create account. Please check your information and try again.";


                signupMessage.style.color =
                    "red";

            }

        }
    );

}