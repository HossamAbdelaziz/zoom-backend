// zoom-backend/emailService.js
const transporter = require("./mailer");

async function sendZoomLinkEmail(to, userName, zoomLink, sessionTime) {
    const mailOptions = {
        from: `"Coach Asmaa" <${process.env.EMAIL_USER}>`,
        to,
        subject: "📅 Your Zoom Session is Confirmed!",
        html: `
      <h2>Hi ${userName},</h2>
      <p>Your session has been confirmed! 🎉</p>
      <p><strong>Session Date & Time:</strong> ${sessionTime}</p>
      <p><strong>Zoom Link:</strong> <a href="${zoomLink}" target="_blank">${zoomLink}</a></p>
      <br />
      <p>Looking forward to seeing you soon!</p>
      <p>– Coach Asmaa</p>
    `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log("✅ Email sent to", to);
    } catch (error) {
        console.error("❌ Failed to send email:", error);
    }
}

module.exports = sendZoomLinkEmail;
