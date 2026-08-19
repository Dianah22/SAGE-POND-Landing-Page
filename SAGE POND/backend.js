require("dotenv").config();

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");

const { sendVerificationEmail } = require("./services/verificationEmail");

const app = express();


// ===========================
// CORS
// ===========================

app.use(
    cors({
        origin: [
            "http://127.0.0.1:5500",
            "http://localhost:5500",
            "http://127.0.0.1:3000",
            "https://localhost:3000"
        ],
        methods: ["GET", "POST"],
        allowedHeaders: ["Content-Type"]
    })
);


// ===========================
// JSON middleware
// ===========================

app.use(express.json());


// ===========================
// Server
// ===========================

const PORT = 3000;


// ===========================
// Temporary storage
// ===========================

const verificationTokens = new Map();
const users = new Map();


// ===========================
// Test route
// ===========================

app.get("/", (req, res) => {
    res.send("SAGE POND backend connection is working!");
});


// ===========================
// Send verification email
// ===========================

app.post("/send-verification-email", async (req, res) => {

    const { name, email, password } = req.body;

    // ===========================
    // Validate input
    // ===========================

    if (!name || !email || !password) {
        return res.status(400).json({
            success: false,
            message: "Name, email, and password are required."
        });
    }

    try {

        // ===========================
        // Generate salt
        // ===========================

        const salt = crypto
            .randomBytes(16)
            .toString("hex");


        // ===========================
        // Hash password
        // ===========================

        const passwordHash = crypto
            .scryptSync(password, salt, 64)
            .toString("hex");


        // ===========================
        // Generate verification token
        // ===========================

        const verificationToken = crypto
            .randomBytes(32)
            .toString("hex");


        // ===========================
        // Token expiration
        // 15 minutes
        // ===========================

        const expiresAt =
            Date.now() + (15 * 60 * 1000);


        // ===========================
        // Store pending signup
        // ===========================

        verificationTokens.set(email, {
            name: name,
            email: email,
            passwordHash: passwordHash,
            salt: salt,
            token: verificationToken,
            expiresAt: expiresAt,
            verified: false
        });


        console.log(
            "Verification token generated for:",
            email
        );


        // ===========================
        // Send verification email
        // ===========================

        await sendVerificationEmail(
            email,
            verificationToken
        );


        // ===========================
        // Response
        // ===========================

        return res.status(200).json({
            success: true,
            message: "Verification email sent successfully."
        });

    } catch (error) {

        console.error(
            "Error sending verification email:",
            error
        );

        // Remove pending signup if email failed
        verificationTokens.delete(email);

        return res.status(500).json({
            success: false,
            message: "Failed to send verification email."
        });
    }
});


// ===========================
// Verify email
// ===========================

app.get("/verify-email", (req, res) => {

    const token = req.query.token;


    // ===========================
    // Check token
    // ===========================

    if (!token) {
        return res.status(400).send(
            "Verification token is missing."
        );
    }


    // ===========================
    // Find matching signup
    // ===========================

    let verificationEmail = null;
    let verificationData = null;

    for (const [email, data] of verificationTokens.entries()) {

        if (data.token === token) {
            verificationEmail = email;
            verificationData = data;
            break;
        }
    }


    // ===========================
    // Invalid token
    // ===========================

    if (!verificationData) {
        return res.status(400).send(
            "Invalid verification link."
        );
    }


    // ===========================
    // Check expiration
    // ===========================

    if (Date.now() > verificationData.expiresAt) {

        verificationTokens.delete(
            verificationEmail
        );

        return res.status(400).send(
            "This verification link has expired."
        );
    }


    // ===========================
    // Check existing account
    // ===========================

    if (users.has(verificationEmail)) {

        const loginPage =
            "http://127.0.0.1:5500/SAGE%20POND/.html%20Files/Login.html";

        return res.redirect(loginPage);
    }


    // ===========================
    // Mark email as verified
    // ===========================

    verificationData.verified = true;


    // ===========================
    // Create account
    // ===========================

    users.set(verificationEmail, {
        name: verificationData.name,
        email: verificationData.email,
        passwordHash: verificationData.passwordHash,
        salt: verificationData.salt
    });


    console.log(
        "Account created for:",
        verificationEmail
    );


    // ===========================
    // Remove pending signup
    // ===========================

    verificationTokens.delete(
        verificationEmail
    );


    // ===========================
    // Redirect to verification page
    // ===========================

    const verificationPage =
        "http://127.0.0.1:5500/SAGE%20POND/.html%20Files/verify-email.html?verified=true";


    return res.redirect(
        verificationPage
    );
});

// ===========================
// Login
// ===========================

app.post("/login", (req, res) => {

    const { email, password } = req.body;


    // ===========================
    // Validate input
    // ===========================

    if (!email || !password) {

        return res.status(400).json({
            success: false,
            message: "Email and password are required."
        });

    }


    // ===========================
    // Find user
    // ===========================

    const user = users.get(email);


    if (!user) {

        return res.status(401).json({
            success: false,
            message: "Invalid email or password."
        });

    }


    // ===========================
    // Hash entered password
    // using saved salt
    // ===========================

    const enteredPasswordHash =
        crypto
            .scryptSync(
                password,
                user.salt,
                64
            )
            .toString("hex");


    // ===========================
    // Compare passwords
    // ===========================

    if (enteredPasswordHash !== user.passwordHash) {

        return res.status(401).json({
            success: false,
            message: "Invalid email or password."
        });

    }


    // ===========================
    // Login successful
    // ===========================

    console.log(
        "Login successful:",
        email
    );


    return res.status(200).json({
        success: true,
        message: "Login successful."
    });

});


// ===========================
// Start server
// ===========================

app.listen(PORT, () => {

    console.log(
        `SAGE POND backend is running on port ${PORT}`
    );

});