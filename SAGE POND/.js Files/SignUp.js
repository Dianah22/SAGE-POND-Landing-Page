// ===========================
// SAGE POND SIGNUP JAVASCRIPT
// ===========================


// ===========================
// Send verification email request to backend
// ===========================

async function sendVerificationEmail(name, email, password) {

    try {

        const response = await fetch(
            "http://127.0.0.1:3000/send-verification-email",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    name: name,
                    email: email,
                    password: password
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

    } catch (error) {

        console.error(
            "Error sending verification email request:",
            error
        );

        throw error;
    }
}

// ===========================
// Get form elements
// ===========================

const signupForm = document.getElementById("signupForm");
const signupMessage = document.getElementById("signupMessage");


// ===========================
// Signup function
// ===========================

signupForm.addEventListener("submit", async function(event) {

    event.preventDefault();

    const name = document.getElementById("name").value.trim();

    const email = document.getElementById("email").value.trim();

    const password = document.getElementById("password").value;

    const confirmPassword =
        document.getElementById("confirmPassword").value;


    // ===========================
    // Check password match
    // ===========================

    if (password !== confirmPassword) {

        signupMessage.textContent =
            "Passwords do not match.";

        signupMessage.style.color = "red";

        return;
    }


    // ===========================
    // Check password length
    // ===========================

    if (password.length < 8) {

        signupMessage.textContent =
            "Password must be at least 8 characters.";

        signupMessage.style.color = "red";

        return;
    }


    try {

        // ===========================
        // Send verification request
        // to Node.js backend
        // ===========================

        sessionStorage.setItem("signupEmail", email);

        await sendVerificationEmail(
    name,
    email,
    password
);


        // ===========================
        // Show success message
        // ===========================

        signupMessage.textContent =
            "Verification email sent! Please check your email.";

        signupMessage.style.color = "green";


        // ===========================
        // Redirect to verification page
        // ===========================

        setTimeout(() => {

            window.location.href = "verify-email.html";

        }, 1500);


    } catch (error) {

        console.error(error);

        signupMessage.textContent =
            error.message;

        signupMessage.style.color = "red";

    }

});

