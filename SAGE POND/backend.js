require("dotenv").config();

const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const path = require("path");
const { JSDOM } = require("jsdom");
const createDOMPurify = require("dompurify");
const mailchecker = require("mailchecker");

const { adminAuth } = require("./firebase-admin");

const {
    sendVerificationEmail
} = require("./services/verificationEmail");


// ===========================
// DOMPurify setup
// ===========================

const window = new JSDOM("").window;
const DOMPurify = createDOMPurify(window);


// ===========================
// Express app
// ===========================

const app = express();


// ===========================
// Folder paths
// ===========================

const htmlFolder = path.join(__dirname, "html Files");
const cssFolder = path.join(__dirname, "css Files");
const jsFolder = path.join(__dirname, "js Files");
const imagesFolder = path.join(__dirname, "images");


// ===========================
// Static CSS files
// ===========================

app.use("/css", express.static(cssFolder));


// ===========================
// Static JavaScript files
// ===========================

app.use("/js", express.static(jsFolder));


// ===========================
// Static image files
// ===========================

app.use(
    "/images",
    express.static(
        imagesFolder
    )
);


// ===========================
// CORS
// ===========================

app.use(
    cors({
        origin: true,
        methods: [
            "GET",
            "POST",
            "OPTIONS"
        ],
        allowedHeaders: [
            "Content-Type"
        ]
    })
);


// ===========================
// OPTIONS requests
// ===========================

app.options(
    /.*/,
    cors()
);


// ===========================
// Body parsers
// ===========================

app.use(
    express.json()
);

app.use(
    express.urlencoded({
        extended: true
    })
);


// ===========================
// Signup email middleware
// ===========================

function requireSignupEmail(
    req,
    res,
    next
) {

    const rawEmail =
        req.query?.email;

    const email =
        DOMPurify
            .sanitize(
                String(
                    rawEmail || ""
                )
            )
            .trim()
            .toLowerCase();

    if (!email) {

        return res.redirect(
            "/signup"
        );

    }

    req.query.email = email;

    next();
}

// ===========================
// Port
// ===========================

const PORT = 3000;


// ===========================
// Backend test
// ===========================

app.get(
    "/api/test",
    (req, res) => {

        res.json({
            success: true,
            message:
                "SAGE POND backend is working."
        });

    }
);


// ===========================
// Root
// ===========================

app.get("/", (req, res) => {
    res.redirect("/index.html");
});

// ===========================
// index.html
// ===========================

app.get("/index.html", (req, res) => {
    res.sendFile(path.join(htmlFolder, "index.html"));
});

// ===========================
// Login page GET
// ===========================

app.get("/login", (req, res) => {

    const loginPage =
        path.join(
            htmlFolder,
            "Login.html"
        );

    res.sendFile(loginPage);

});

// ===========================
// Signup page
// ===========================

app.get("/signup", (req, res) => {

    const signupPage =
        path.join(
            htmlFolder,
            "SignUp.html"
        );

    res.sendFile(signupPage);

});

// ===========================
// Verify page GET
// ===========================

app.get(
    "/verify",
    requireSignupEmail,
    (req, res, next) => {

        const verifyPage =
            path.resolve(
                __dirname,
                "html Files",
                "verify-email.html"
            );

        console.log(
            "Serving verification page for:",
            req.query.email
        );

        res.sendFile(
            verifyPage,
            (error) => {

                if (error) {

                    console.error(
                        "Error serving verification page:",
                        error
                    );

                    if (res.headersSent) {
                        return next(error);
                    }

                    return res.status(
                        error.statusCode || 500
                    ).send(
                        "Unable to load verification page."
                    );

                }

            }
        );

    }
);
// ===========================
// Send verification email
// ===========================

app.post(
    "/send-verification-email",
    async (req, res) => {

        const rawName =
            req.body?.name;

        const rawEmail =
            req.body?.email;


        // ===========================
        // Sanitize name
        // ===========================

        const name =
            DOMPurify
                .sanitize(
                    String(
                        rawName || ""
                    )
                )
                .trim();


        // ===========================
        // Sanitize email
        // ===========================

        const email =
            DOMPurify
                .sanitize(
                    String(
                        rawEmail || ""
                    )
                )
                .trim()
                .toLowerCase();


        // ===========================
        // Validate input
        // ===========================

        if (!name || !email) {

            return res.status(400).json({
                success: false,
                message:
                    "A valid email address is required."
            });

        }


        try {

            // ===========================
            // Check temporary email
            // ===========================

            if (
                !mailchecker.isValid(
                    email
                )
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Temporary email addresses are not allowed."
                });

            }


            // ===========================
            // Find Firebase user
            // ===========================

            let userRecord;


            try {

                userRecord =
                    await adminAuth.getUserByEmail(
                        email
                    );

            } catch (firebaseError) {

                if (
                    firebaseError.code ===
                    "auth/user-not-found"
                ) {

                   return res.status(404).json({
                    success: false,
                    message: "Unable to process verification request."
                    });
                }


                throw firebaseError;

            }


            // ===========================
            // Check email verification
            // ===========================

            if (
                userRecord.emailVerified
            ) {

                return res.status(400).json({
                success: false,
                message: "Unable to process verification request."
                });
            }


            // ===========================
            // Generate JWT token
            // ===========================

            const verificationToken =
                jwt.sign(
                    {
                        uid:
                            userRecord.uid,

                        name:
                            name,

                        email:
                            email
                    },

                    process.env.JWT_SECRET,

                    {
                        expiresIn:
                            "15m"
                    }
                );


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
            // Success response
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
// Check email verification status
// ===========================

app.get(
    "/check-verification",
    async (req, res) => {

        const rawEmail =
            req.query.email;


        const email =
            DOMPurify
                .sanitize(
                    String(
                        rawEmail || ""
                    )
                )
                .trim()
                .toLowerCase();


        // ===========================
        // Check email
        // ===========================

        if (!email) {

            return res.status(400).json({
                success: false,
                message:
                    "Email address is required."
            });

        }


        try {

            // ===========================
            // Find Firebase user
            // ===========================

            const userRecord =
                await adminAuth.getUserByEmail(
                    email
                );


            // ===========================
            // Return verification status
            // ===========================

            return res.status(200).json({

                success: true,

                verified:
                    userRecord.emailVerified

            });


        } catch (error) {

            console.error(
                "Error checking email verification:",
                error
            );


            return res.status(500).json({
                success: false,
                message:
                    "Unable to check email verification status."
            });

        }

    }
);

// ===========================
// Verify email
// ===========================

app.post("/verify-email", async (req, res) => {

       const rawToken =
    req.body?.token;


        const token =
            DOMPurify.sanitize(
                String(
                    rawToken || ""
                )
            );


        // ===========================
        // Check token
        // ===========================

        if (!token) {

            return res.status(400).send(
                "Unable to verify your email."
            );

        }


        try {

            // ===========================
            // Verify token
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
            // Get Firebase user
            // ===========================

            const userRecord =
                await adminAuth.getUser(
                    uid
                );


            // ===========================
            // Check email
            // ===========================

            if (
                userRecord.email !==
                email
            ) {

                return res.status(400).send(
                   "Unable to verify your email."
                );

            }


            // ===========================
            // Mark email verified
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
            // Redirect
            // ===========================

            return res.redirect(
                "/verify?email=" +
                encodeURIComponent(
                    email
                ) +
                "&verified=true"
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
                    "Unable to verify your email."
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
                    "Unable to verify your email."
                );

            }


            return res.status(400).send(
                "Unable to verify your email."
            );

        }

    }
);


// ===========================
// Start server
// ===========================

app.listen(
    PORT,
    () => {

        console.log(
            `SAGE POND backend is running on port ${PORT}`
        );

    }
);