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

const token =
    urlParams.get("token");

const verified =
    urlParams.get("verified");


// ===========================
// Show verified message
// ===========================

if (verified === "true") {

    message.textContent =
        "Email verified successfully! You can now create your account.";

    message.style.color = "green";
}


// ===========================
// Verify email
// ===========================

async function verifyEmail() {

    if (verified === "true") {

        message.textContent =
            "Email already verified. You can now create your account.";

        message.style.color = "green";

        return;
    }


    if (!token) {

        message.textContent =
            "Verification token is missing.";

        message.style.color = "red";

        return;
    }


    try {

        message.textContent =
            "Verifying your email...";

        message.style.color = "";


        const response = await fetch(
            `http://127.0.0.1:3000/verify-email?token=${encodeURIComponent(token)}`
        );


        const data =
            await response.text();


        if (!response.ok) {

            throw new Error(data);

        }


        message.textContent =
            data;

        message.style.color =
            "green";


    } catch (error) {

        console.error(
            "Email verification error:",
            error
        );

        message.textContent =
            error.message ||
            "Unable to verify your email.";

        message.style.color =
            "red";

    }

}


// ===========================
// Resend verification email
// ===========================

async function resendVerificationEmail() {

    message.textContent =
        "Resending verification email...";

    message.style.color = "";


    const email =
        sessionStorage.getItem("signupEmail");


    if (!email) {

        message.textContent =
            "Your signup email could not be found.";

        message.style.color =
            "red";

        return;
    }


    try {

        const response = await fetch(
            "http://127.0.0.1:3000/send-verification-email",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    email: email
                })
            }
        );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.message ||
                "Failed to resend verification email."
            );

        }


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