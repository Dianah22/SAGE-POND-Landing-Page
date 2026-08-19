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

            const response =
                await fetch(
                    "http://127.0.0.1:3000/login",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            email: email,
                            password: password
                        })
                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data.message ||
                    "Login failed."
                );
            }


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

            loginMessage.textContent =
                error.message ||
                "Unable to log in.";

            loginMessage.style.color =
                "red";
        }

    }
);