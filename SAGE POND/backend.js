require("dotenv").config();

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");

const { sendVerificationEmail } = require("./services/verificationEmail");
const { readData, writeData } = require("./services/storage");

const app = express();


// ===========================
// CORS
// ===========================

// ===========================
// CORS
// ===========================

app.use(
    cors({
        origin: true,
        methods: ["GET", "POST", "OPTIONS"],
        allowedHeaders: ["Content-Type"]
    })
);

app.options(/.*/, cors());

// ===========================
// JSON middleware
// ===========================

app.use(express.json());


// ===========================
// Server
// ===========================

const PORT = 3000;

const authData = readData();

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

        authData.verificationTokens = authData.verificationTokens.filter(
    (item) => item.email !== email
);

authData.verificationTokens.push({
    name: name,
    email: email,
    passwordHash: passwordHash,
    salt: salt,
    token: verificationToken,
    expiresAt: expiresAt,
    verified: false
});

writeData(authData);


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

       authData.verificationTokens =
    authData.verificationTokens.filter(
        (item) => item.email !== email
    );

        writeData(authData);
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

    const verificationData =
    authData.verificationTokens.find(
        (item) => item.token === token
    );

const verificationEmail =
    verificationData
        ? verificationData.email
        : null;


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

        authData.verificationTokens =
    authData.verificationTokens.filter(
        (item) => item.email !== verificationEmail
    );

        writeData(authData);

        return res.status(400).send(
            "This verification link has expired."
        );
    }


    // ===========================
    // Check existing account
    // ===========================

   const existingUser =
    authData.users.find(
        (user) => user.email === verificationEmail
    );

if (existingUser) {

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

    authData.users.push({
    name: verificationData.name,
    email: verificationData.email,
    passwordHash: verificationData.passwordHash,
    salt: verificationData.salt
});

writeData(authData);


    console.log(
        "Account created for:",
        verificationEmail
    );


    // ===========================
    // Remove pending signup
    // ===========================

    authData.verificationTokens =
    authData.verificationTokens.filter(
        (item) => item.email !== verificationEmail
    );

writeData(authData);

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

   const user = authData.users.find(
    (item) => item.email === email
);


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