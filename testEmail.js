const nodemailer = require("nodemailer");

async function testEmailConnection() {
  const user = (process.env.EMAIL_USER || "").trim();
  const pass = (process.env.EMAIL_PASS || "").trim();
  const host = process.env.EMAIL_HOST;
  const port = parseInt(process.env.EMAIL_PORT);
  const secure = process.env.EMAIL_SECURE === "true";

  console.log("Testing Gmail Connection...");
  console.log(`Email: ${user}`);
  console.log(`Host: ${host}`);
  console.log(`Port: ${port}`);
  console.log(`Secure: ${secure}`);
  console.log(`Password length: ${pass.length} characters`);
  console.log("---");

  if (!user || !pass) {
    console.error("❌ Missing EMAIL_USER or EMAIL_PASS in .env file");
    return;
  }

  const transporter = nodemailer.createTransport({
    host: host,
    port: port,
    secure: secure,
    auth: {
      user: user,
      pass: pass,
    },
  });

  try {
    await transporter.verify();
    console.log("✅ Email connection successful!");
  } catch (error) {
    console.error("❌ Email connection failed:");
    console.error(error.message);
  }
}

testEmailConnection();
