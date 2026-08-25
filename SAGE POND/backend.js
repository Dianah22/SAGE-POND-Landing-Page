require("dotenv").config();

const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const path = require("path");
const { JSDOM } = require("jsdom");
const createDOMPurify = require("dompurify");
const validation = require("validation");
const mailchecker = require("mailchecker");
const { adminAuth } = require("./firebase-admin");

const { sendVerificationEmail } =
    require("./services/verificationEmail");


// ===========================
// DOMPURIFY
// ===========================

const window = new JSDOM("").window;
const DOMPurify = createDOMPurify(window);


// ===========================
// EXPRESS APP
// ===========================

const app = express();


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
// JSON MIDDLEWARE
// ===========================

app.use(express.json());


// ===========================
// SERVER
// ===========================

const PORT = 3000;


// ===========================
// TEST ROUTE
// ===========================

app.get("/", (req, res) => {

    res.send(
        "SAGE POND backend connection is working!"
    );

});

// ===========================
// HTML PAGE ROUTES
// ===========================

// ===========================
// HTML PAGE ROUTES
// ===========================

app.get("/home", (req, res) => {
    res.sendFile(
        "index.html",
        {
            root: path.join(__dirname, ".html Files")
        }
    );
});

app.get("/login", (req, res) => {
    res.sendFile(
        "Login.html",
        {
            root: path.join(__dirname, ".html Files")
        }
    );
});

app.get("/signup", (req, res) => {
    res.sendFile(
        "SignUp.html",
        {
            root: path.join(__dirname, ".html Files")
        }
    );
});

app.get("/verify", (req, res) => {
    res.sendFile(
        "verify-email.html",
        {
            root: path.join(__dirname, ".html Files")
        }
    );
});
// ===========================
// SEND VERIFICATION EMAIL
// ===========================

app.post(
    "/send-verification-email",
    async (req, res) => {

        const rawName = req.body.name;
        const rawEmail = req.body.email;


        const name = DOMPurify
            .sanitize(String(rawName || ""))
            .trim();

        const email = DOMPurify
            .sanitize(String(rawEmail || ""))
            .trim()
            .toLowerCase();


        // ===========================
        // VALIDATE NAME AND EMAIL
        // ===========================

        if (
            !validation.isType(name, "string") ||
            !validation.isType(email, "string") ||
            !validation.exists(email)
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "A valid email address is required."

            });

        }


        try {

            // ===========================
            // CHECK TEMPORARY EMAIL
            // ===========================

            if (!mailchecker.isValid(email)) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Temporary email addresses are not allowed."

                });

            }


            // ===========================
            // CHECK FIREBASE USER
            // ===========================

            let userRecord;

            try {

                userRecord =
                    await adminAuth.getUserByEmail(email);

            } catch (firebaseError) {

                if (
                    firebaseError.code ===
                    "auth/user-not-found"
                ) {

                    return res.status(404).json({

                        success: false,

                        message:
                            "No SAGE POND account was found with this email."

                    });

                }

                throw firebaseError;
            }


            // ===========================
            // CHECK IF ALREADY VERIFIED
            // ===========================

            if (userRecord.emailVerified) {

                return res.status(400).json({

                    success: false,

                    message:
                        "This email address is already verified."

                });

            }


            // ===========================
            // CREATE VERIFICATION JWT
            // ===========================

            const verificationToken =
                jwt.sign(
                    {
                        uid: userRecord.uid,
                        name: name,
                        email: email
                    },

                    process.env.JWT_SECRET,

                    {
                        expiresIn: "15m"
                    }
                );


            console.log(
                "Verification token generated for:",
                email
            );


            // ===========================
            // SEND VERIFICATION EMAIL
            // ===========================

            await sendVerificationEmail(
                email,
                verificationToken
            );


            // ===========================
            // RESPONSE
            // ===========================

            return res.status(200).json({

                success: true,

                message:
                    "Verification email sent successfully."

            });

        } catch (error) {

            console.error(
                "Error sending verification email:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to send verification email."

            });

        }

    }
);


// ===========================
// VERIFY EMAIL
// ===========================

app.get(
    "/verify-email",
    async (req, res) => {

        const rawToken =
            req.query.token;


        const token =
            DOMPurify.sanitize(
                String(rawToken || "")
            );


        // ===========================
        // CHECK TOKEN
        // ===========================

        if (!token) {

            return res.status(400).send(
                "Verification token is missing."
            );

        }


        try {

            // ===========================
            // VERIFY JWT
            // ===========================

            const decoded =
                jwt.verify(
                    token,
                    process.env.JWT_SECRET
                );


            const {
                uid,
                email
            } = decoded;


            // ===========================
            // CHECK FIREBASE USER
            // ===========================

            const userRecord =
                await adminAuth.getUser(uid);


            // ===========================
            // MAKE SURE EMAIL MATCHES
            // ===========================

            if (
                userRecord.email !== email
            ) {

                return res.status(400).send(
                    "Verification information does not match the account."
                );

            }


            // ===========================
            // MARK EMAIL AS VERIFIED
            // ===========================

            await adminAuth.updateUser(
                uid,
                {
                    emailVerified: true
                }
            );


            console.log(
                "Email verified:",
                email
            );


            // ===========================
            // REDIRECT TO VERIFY PAGE
            // ===========================

            const verificationPage =
                "http://127.0.0.1:5500/SAGE%20POND/.html%20Files/verify-email.html?verified=true";


            return res.redirect(
                verificationPage
            );

        } catch (error) {

            console.error(
                "Email verification failed:",
                error
            );


            if (
                error.name ===
                "TokenExpiredError"
            ) {

                return res.status(400).send(
                    "This verification link has expired. Please request a new verification email."
                );

            }


            if (
                error.name ===
                "JsonWebTokenError"
            ) {

                return res.status(400).send(
                    "This verification link is invalid."
                );

            }


            if (
                error.code ===
                "auth/user-not-found"
            ) {

                return res.status(404).send(
                    "The SAGE POND account could not be found."
                );

            }


            return res.status(400).send(
                "Unable to verify your email."
            );

        }

    }
);


// ===========================
// START SERVER
// ===========================

app.listen(
    PORT,
    () => {

        console.log(
            `SAGE POND backend is running on port ${PORT}`
        );

    }
);

