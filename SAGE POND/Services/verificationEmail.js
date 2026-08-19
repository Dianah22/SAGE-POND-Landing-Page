const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const sendVerificationEmail = async (email, verificationToken) => {

   const verificationLink =
    `http://127.0.0.1:3000/verify-email?token=${verificationToken}`;
    const { data, error } = await resend.emails.send({

        from: process.env.RESEND_FROM,

        to: [email],

        subject: "Verify your SAGE POND email",

        html: `
            <h2>Welcome to SAGE POND</h2>

            <p>
                Thank you for signing up for SAGE POND.
            </p>

            <p>
                Please verify your email address by clicking the button below:
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

    if (error) {
        throw new Error(error.message);
    }

    return data;
};

module.exports = {
    sendVerificationEmail
};