// ===========================
// SAGE POND VERIFY EMAIL JS
// ===========================


// ===========================
// Get page elements
// ===========================

const checkVerificationBtn =
    document.getElementById(
        "checkVerification"
    );

const resendEmailBtn =
    document.getElementById(
        "resendEmail"
    );

const message =
    document.getElementById(
        "verifyMessage"
    );


// ===========================
// Get information from URL
// ===========================

const urlParams =
    new URLSearchParams(
        window.location.search
    );

const verified =
    urlParams.get(
        "verified"
    );

const emailFromUrl =
    urlParams.get(
        "email"
    );


// ===========================
// Get signup email
// ===========================

const storedEmail =
    localStorage.getItem(
        "signupEmail"
    );


const email =
    emailFromUrl ||
    storedEmail;


// ===========================
// Show verified state
// ===========================

function showVerifiedMessage() {

    message.textContent =
        "Email verified successfully! You can now log in.";

    message.style.color =
        "green";

    checkVerificationBtn.style.display =
        "none";

    resendEmailBtn.style.display =
        "none";

}


// ===========================
// Check verification status
// ===========================

async function checkVerificationStatus() {

    if (!email) {

        message.textContent =
            "Unable to check email verification status.";

        message.style.color =
            "red";

        return;

    }


    try {

        message.textContent =
            "Checking verification status...";

        message.style.color =
            "";


        const response =
            await fetch(
                "/check-verification?email=" +
                encodeURIComponent(
                    email
                )
            );


        const data =
            await response.json();


        if (
            response.ok &&
            data.success &&
            data.verified
        ) {

            showVerifiedMessage();

            return;

        }


        message.textContent =
            "Please check your email and click the verification link.";

        message.style.color =
            "";


    } catch (error) {

        console.error(
            "Verification status error:",
            error
        );


        message.textContent =
            "Unable to check verification status.";

        message.style.color =
            "red";

    }

}


// ===========================
// Check Verification Button
// ===========================

async function checkVerification() {

    await checkVerificationStatus();

}


// ===========================
// Resend Verification Email
// ===========================

async function resendVerificationEmail() {

    if (!email) {

        message.textContent =
            "Unable to resend the verification email.";

        message.style.color =
            "red";

        return;

    }


    try {

        message.textContent =
            "Resending verification email...";

        message.style.color =
            "";


        const response =
            await fetch(
                "/send-verification-email",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        name:
                            "SAGE POND User",

                        email:
                            email

                    })
                }
            );


        const data =
            await response.json();


        if (
            response.ok &&
            data.success
        ) {

            message.textContent =
                "Verification email sent again. Please check your inbox.";

            message.style.color =
                "green";

        } else {

            message.textContent =
                data.message ||
                "Unable to resend verification email.";

            message.style.color =
                "red";

        }


    } catch (error) {

        console.error(
            "Verification email resend error:",
            error
        );


        message.textContent =
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
    checkVerification
);


resendEmailBtn.addEventListener(
    "click",
    resendVerificationEmail
);


// ===========================
// Check status when page loads
// ===========================

if (
    verified === "true"
) {

    showVerifiedMessage();

} else {

    checkVerificationStatus();

}