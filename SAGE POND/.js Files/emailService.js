const { Resend } = require('resend');

const sendWaitlistConfirmationEmail = async (email) => {
    if (!process.env.RESEND_API_KEY) {
        throw new Error('RESEND_API_KEY is not configured');
    }
    if (!process.env.RESEND_FROM) {
        throw new Error('RESEND_FROM is not configured');
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
        from: process.env.RESEND_FROM,
        to: [email],
        subject: 'Welcome to SAGE POND Developer Platform waitlist',
        html: `
                 Hello, <br>
 Thanks for joining the SAGE POND Developer Platform waitlist.<br>
 This means you're among the early group of builders who will get access to the platform as we launch in Q2. <br>
 We're currently building the foundation layer for AI in Uganda, and the platform will give you direct access to our APIs without the complexity of managing infrastructure.<br>
 
 What to expect:<br>
 * Early access to our APIs (starting with core NLP tooling)<br>
 * Updates as we roll out new capabilities<br>
 * Opportunities to test features before public release<br>
 <br>
 Our goal is simple: make it easier for you to build real AI products without worrying about the underlying systems.<br>
 We will reach out soon with next steps and access details.<br>
 If you're already building something or planning to, feel free to reply and share. We're always interested in what developers are working on.<br>
 
 Best regards,<br>
 Caleb Matovu<br>
 Founder, SAGE POND<br>
             `,
        idempotencyKey: `waitlist-signup/${email}`
    });

    if (error) {
        throw new Error(error.message);
    }

    return data;
};

module.exports = {
    sendWaitlistConfirmationEmail
};
