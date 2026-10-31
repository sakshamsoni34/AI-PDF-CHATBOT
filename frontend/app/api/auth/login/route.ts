import { NextResponse } from "next/server";
import { generateOTP, storeOTP, sendOTPEmail, sendOTPSMS } from "@/lib/otp";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, phone } = body;
    
    const identifier = email || phone;

    if (!identifier) {
      return NextResponse.json(
        { error: "Email or Phone is required" },
        { status: 400 }
      );
    }

    // Generate a new OTP
    const otp = generateOTP();
    
    // Store it
    await storeOTP(identifier, otp);
    
    // Send it via email or SMS
    if (email) {
      await sendOTPEmail(email, otp);
    } else if (phone) {
      await sendOTPSMS(phone, otp);
    }

    // Return indicating OTP is required
    return NextResponse.json({ 
      success: true, 
      requireOtp: true, 
      identifier
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
