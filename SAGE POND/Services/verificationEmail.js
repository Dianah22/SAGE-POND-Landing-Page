const nodemailer = require("nodemailer");

// ===========================
// SAGE POND VERIFICATION EMAIL
// ===========================

const transporter = nodemailer.createTransport({

    host: process.env.SMTP_HOST,

    port: Number(process.env.SMTP_PORT),

    secure:
        process.env.SMTP_SECURE === "true",

    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});


// ===========================
// Send verification email
// ===========================

const sendVerificationEmail =
    async (email, verificationToken) => {

        const verificationLink =
            `http://172.20.10.3:3000/verify-email?token=${encodeURIComponent(verificationToken)}`;

        const info =
            await transporter.sendMail({

                from:
                    `"SAGE POND" <${process.env.SMTP_USER}>`,

                to: email,

                subject:
                    "Verify your SAGE POND email",

                text: `
Welcome to SAGE POND.

Thank you for signing up for SAGE POND.

Please verify your email address by visiting:

${verificationLink}

If you did not create a SAGE POND account,
you can ignore this email.

Best regards,
SAGE POND
                `.trim(),

                html: `
                    <h2>Welcome to SAGE POND</h2>

                    <p>
                        Thank you for signing up for SAGE POND.
                    </p>

                    <p>
                        Please verify your email address
                        by clicking the button below:
                    </p>

                    <p>
                        <a href="${verificationLink}">
                            Verify My Email
                        </a>
                    </p>

                    <p>
                        If you did not create a SAGE POND account,
                        you can ignore this email.
                    </p>

                    <p>
                        Best regards,<br>
                        SAGE POND
                    </p>
                `
            });

        console.log(
            "Verification email sent:",
            info.messageId
        );

        return info;
    };


// ===========================
// Export function
// ===========================

module.exports = {
    sendVerificationEmail
};