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

const token =
urlParams.get("token");

// ===========================
// Show verification result
// ===========================

if (verified === "true") {


message.textContent =
    "Email verified successfully! You can now log in.";

message.style.color =
    "green";


}

// ===========================
// Check Verification Button
// ===========================

async function verifyEmail() {


try {

    message.textContent =
        "Checking your verification status...";

    message.style.color =
        "";


    if (!token) {

        message.textContent =
            "Please use the verification link sent to your email.";

        message.style.color =
            "red";

        return;
    }


    const response =
        await fetch(
            `/verify-email?token=${encodeURIComponent(token)}`
        );


    if (response.redirected) {

        window.location.href =
            response.url;

        return;
    }


    const data =
        await response.json();


    if (response.ok && data.success) {

        message.textContent =
            "Email verified successfully! You can now log in.";

        message.style.color =
            "green";

    } else {

        message.textContent =
            data.message ||
            "Unable to verify your email.";

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
// Resend verification email
// ===========================

async function resendVerificationEmail() {


const email =
    sessionStorage.getItem("verificationEmail");

const name =
    sessionStorage.getItem("verificationName");


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
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    name: name || "",
                    email: email
                })
            }
        );


    const data =
        await response.json();


    if (response.ok && data.success) {

        message.textContent =
            "Verification email sent again. Please check your inbox.";

        message.style.color =
            "green";

    } else {

        message.textContent =
            "Unable to resend verification email.";

        message.style.color =
            "red";

    }

} catch (error) {

    console.error(
        "Resend verification error:",
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
verifyEmail
);

resendEmailBtn.addEventListener(
"click",
resendVerificationEmail
);
