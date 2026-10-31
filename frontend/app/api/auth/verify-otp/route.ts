import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyStoredOTP } from "@/lib/otp";
import jwt from "jsonwebtoken";
import { BACKEND_URL } from "@/lib/config";


export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, phone, otp } = body;

    const identifier = email || phone;

    if (!identifier || !otp) {
      return NextResponse.json(
        { error: "Email or Phone and OTP are required" },
        { status: 400 }
      );
    }

    const isValid = await verifyStoredOTP(identifier, otp);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid or expired OTP" },
        { status: 401 }
      );
    }

    // Sync with Python backend to create/fetch user in the database
    try {
      await fetch(`${BACKEND_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: identifier }),
      });
    } catch (backendError) {
      console.error("Failed to sync OTP user with backend:", backendError);
    }

    // Create a secure session token (JWT)
    const secret = process.env.JWT_SECRET || "saksham_jwt_secret_key_2006";
    const sessionToken = jwt.sign({ email: identifier }, secret, { expiresIn: "7d" });

    // Set secure HTTP-only cookie
    const cookieStore = await cookies();
    cookieStore.set({
      name: "auth_session",
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    });

    return NextResponse.json({ success: true, email: identifier, token: sessionToken });

  } catch (error) {
    console.error("Verify OTP error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
