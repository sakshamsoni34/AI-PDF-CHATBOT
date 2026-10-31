import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { BACKEND_URL } from "@/lib/config";


export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password || password.length < 6) {
      return NextResponse.json(
        { error: "Valid email and password (min 6 chars) are required" },
        { status: 400 }
      );
    }

    // TODO: In a real app, check if user exists, hash password, and save to DB
    // const existingUser = await db.user.findUnique({ where: { email } });
    // if (existingUser) return error;
    // const hashedPassword = await hash(password);
    // await db.user.create({ data: { email, passwordHash: hashedPassword } });

    // Simulated successful registration
    
    // Sync with Python backend to create/fetch user in the database
    try {
      await fetch(`${BACKEND_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email }),
      });
    } catch (backendError) {
      console.error("Failed to sync signup user with backend:", backendError);
    }

    // Create a secure session token (JWT)
    const secret = process.env.JWT_SECRET || "saksham_jwt_secret_key_2006";
    const sessionToken = jwt.sign({ email }, secret, { expiresIn: "7d" });

    // Set secure HTTP-only cookie to automatically log them in
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

    return NextResponse.json({ success: true, email, token: sessionToken });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
