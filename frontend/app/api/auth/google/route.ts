import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { BACKEND_URL } from "@/lib/config";


export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { accessToken } = body;

    if (!accessToken) {
      return NextResponse.json(
        { error: "Google access token is required" },
        { status: 400 }
      );
    }

    let email = "";
    let picture = "";
    let name = "";
    
    try {
      // Securely fetch user info from Google using the access token
      const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch user info from Google");
      }

      const payload = await response.json();
      
      if (!payload || !payload.email) {
        throw new Error("Invalid payload from Google");
      }
      
      email = payload.email;
      picture = payload.picture || "";
      name = payload.name || "";
    } catch (verifyError) {
      console.error("Google Token Verification Error:", verifyError);
      return NextResponse.json(
        { error: "Invalid Google credential" },
        { status: 401 }
      );
    }

    // Create a secure session token (JWT)
    const secret = process.env.JWT_SECRET || "saksham_jwt_secret_key_2006";
    const sessionToken = jwt.sign({ email }, secret, { expiresIn: "7d" });

    // Sync with Python backend to create/fetch user in the database
    try {
      await fetch(`${BACKEND_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, name: name }),
      });
    } catch (backendError) {
      console.error("Failed to sync user with backend:", backendError);
      // We can still proceed even if backend sync fails, though it means no user_id will be created yet
    }

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

    return NextResponse.json({ success: true, email, picture, token: sessionToken });
  } catch (error) {
    console.error("Google login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
