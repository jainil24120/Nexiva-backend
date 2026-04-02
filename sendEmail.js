const axios = require("axios");

/**
 * Send an email using Brevo (Sendinblue) API
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML email body
 */
const sendEmail = async ({ to, subject, html }) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || "nexiva33@gmail.com";
  const senderName = process.env.BREVO_SENDER_NAME || "NEXIVA";

  if (!apiKey) {
    console.warn("BREVO_API_KEY not set. Email not sent.");
    console.log(`[EMAIL] To: ${to}, Subject: ${subject}`);
    return true; // Return true in dev so the flow continues
  }

  try {
    await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: { name: senderName, email: senderEmail },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      },
      {
        headers: {
          "api-key": apiKey,
          "Content-Type": "application/json",
        },
      }
    );
    return true;
  } catch (err) {
    console.error("Email send error:", err.response?.data || err.message);
    throw new Error("Failed to send email");
  }
};

module.exports = sendEmail;
