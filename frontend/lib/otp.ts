import nodemailer from "nodemailer";
import twilio from "twilio";
import { BACKEND_URL } from "@/lib/config";

// In-memory store for OTPs (fallback for local dev)
// Key: email/phone, Value: { otp, expiresAt }
const globalForOTP = global as unknown as { 
  otpStore: Map<string, { otp: string; expiresAt: number }> 
};

export const otpStore = globalForOTP.otpStore || new Map<string, { otp: string; expiresAt: number }>();

if (process.env.NODE_ENV !== "production") {
  globalForOTP.otpStore = otpStore;
}

const OTP_EXPIRY_MINUTES = 10;

export function generateOTP(): string {
  // Generate a 6-digit OTP
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function storeOTP(email: string, otp: string) {
  const expiresAt = Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000;
  // Local fallback
  otpStore.set(email, { otp, expiresAt });

  // Sync to MySQL database via FastAPI backend for serverless / multi-instance production
  try {
    await fetch(`${BACKEND_URL}/auth/otp/store`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: email, otp, expiresAt }),
    });
  } catch (err) {
    console.warn("Could not sync OTP to backend DB, fallback to memory:", err);
  }
}

export async function verifyStoredOTP(email: string, otp: string): Promise<boolean> {
  // 1. Try persistent database verification
  try {
    const res = await fetch(`${BACKEND_URL}/auth/otp/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: email, otp }),
    });
    if (res.ok) {
      const data = await res.json();
      if (typeof data.valid === "boolean") {
        otpStore.delete(email);
        return data.valid;
      }
    }
  } catch (err) {
    console.warn("Backend DB OTP verification unavailable, fallback to memory:", err);
  }

  // 2. In-memory fallback
  const stored = otpStore.get(email);
  if (!stored) return false;

  if (Date.now() > stored.expiresAt) {
    otpStore.delete(email); // Expired
    return false;
  }

  if (stored.otp === otp) {
    otpStore.delete(email); // OTP used successfully
    return true;
  }

  return false;
}

export async function sendOTPEmail(email: string, otp: string) {
  // In a real app, use env variables for SMTP configuration
  // e.g. process.env.SMTP_HOST
  
  // For now, if no SMTP config is present, just log it.
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    console.warn("⚠️ SMTP credentials not configured. OTP generated but not sent via email:", otp);
    return; // Do not fail, just log so we can see it in terminal for testing
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  const mailOptions = {
    from: `"AI PDF Chatbot" <${user}>`,
    to: email,
    subject: "Your Login OTP",
    text: `Your OTP for login is ${otp}. It is valid for ${OTP_EXPIRY_MINUTES} minutes.`,
    html: `<p>Your OTP for login is <strong>${otp}</strong>.</p><p>It is valid for ${OTP_EXPIRY_MINUTES} minutes.</p>`,
  };

  await transporter.sendMail(mailOptions);
}

export async function sendOTPSMS(phone: string, otp: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.warn(`\n\n⚠️ Twilio credentials missing. Falling back to mock SMS logging.`);
    console.log(`💬 SMS OTP SENT TO ${phone}: ${otp}\n\n`);
    return;
  }

  try {
    const client = twilio(accountSid, authToken);
    
    await client.messages.create({
      body: `Your AI-PDF login OTP is ${otp}. It is valid for ${OTP_EXPIRY_MINUTES} minutes.`,
      from: fromNumber,
      to: phone,
    });
    
    console.log(`✅ Twilio SMS sent successfully to ${phone}`);
  } catch (error) {
    console.error("❌ Failed to send Twilio SMS:", error);
    // Fall back to console logging so development doesn't break
    console.log(`💬 FALLBACK SMS OTP TO ${phone}: ${otp}`);
  }
}
