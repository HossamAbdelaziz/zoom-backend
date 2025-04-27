// zoom-backend/index.js

require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const nodemailer = require("nodemailer");

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors({
  origin: ["http://localhost:3000", "https://asmaagad.com"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());

/* ======================================
 ✅ Step 1: Get Zoom Access Token
====================================== */
async function getZoomAccessToken() {
  const credentials = Buffer.from(`${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`).toString("base64");

  try {
    const response = await axios.post(
      "https://zoom.us/oauth/token",
      `grant_type=account_credentials&account_id=${process.env.ZOOM_ACCOUNT_ID}`,
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    return response.data.access_token;
  } catch (error) {
    console.error("❌ Failed to get Zoom access token:", error.response?.data || error.message);
    throw error;
  }
}

/* ======================================
 ✅ Step 2: Email Utility using Nodemailer
====================================== */
async function sendZoomLinkEmail({ to, name, zoomLink, topic, startTime, timezone }) {
  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE, // e.g. gmail
    auth: {
      user: process.env.EMAIL_USER,      // your email address
      pass: process.env.EMAIL_PASS,      // app password
    },
  });

  const mailOptions = {
    from: `"Coach Asmaa" <${process.env.EMAIL_USER}>`,
    to,
    subject: `Zoom Link for Your Session: ${topic}`,
    html: `
      <div style="font-family:Arial,sans-serif;padding:20px;border:1px solid #eee;border-radius:10px;max-width:600px;margin:auto">
        <h2 style="color:#4CAF50;">🌟 Hello ${name},</h2>
        <p>You're booked for a coaching session titled <strong>${topic}</strong>.</p>
        <p><strong>Date & Time:</strong> ${new Date(startTime).toLocaleString("en-US", { timeZone: timezone })} (${timezone})</p>
        <p><strong>Zoom Link:</strong> <a href="${zoomLink}" target="_blank">${zoomLink}</a></p>
        <p style="margin-top:30px;">See you soon!<br/><strong>Coach Asmaa</strong></p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("📧 Email sent successfully to", to);
  } catch (err) {
    console.error("❌ Failed to send email:", err.message);
  }
}

/* ======================================
 ✅ Step 3: Create Zoom Meeting + Send Email
====================================== */
app.post("/api/zoom/create-meeting", async (req, res) => {
  try {
    const accessToken = await getZoomAccessToken();

    const {
      topic,
      start_time,
      duration,
      timezone,
      userEmail,
      userName
    } = req.body;

    const zoomResponse = await axios.post(
      "https://api.zoom.us/v2/users/me/meetings",
      {
        topic,
        type: 2, // Scheduled meeting
        start_time,
        duration,
        timezone,
        settings: {
          join_before_host: false,               // allow user to join before host
          approval_type: 2,                     // ✅ No registration required
          registration_type: 1,                 // remove extra forms
          enforce_login: false,
          meeting_authentication: false,
          waiting_room: true,                   // optional: use waiting room
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const zoomData = zoomResponse.data;

    // ✅ Auto-send email to client with Zoom link
    if (userEmail && userName) {
      await sendZoomLinkEmail({
        to: userEmail,
        name: userName,
        zoomLink: zoomData.join_url,
        topic,
        startTime: start_time,
        timezone,
      });
    }

    res.json(zoomData); // Return Zoom meeting details to frontend
  } catch (error) {
    console.error("❌ Error creating Zoom meeting:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to create Zoom meeting" });
  }
});

/* ======================================
 ✅ Start Express Server
====================================== */
app.listen(PORT, () => {
  console.log(`🚀 Zoom backend running at http://localhost:${PORT}`);
});
