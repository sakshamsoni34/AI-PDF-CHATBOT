"use client";
import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { X, Apple, Phone, ArrowLeft } from "lucide-react";
import { useGoogleLogin } from "@react-oauth/google";

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export default function AuthModal() {
  const { isModalOpen, closeModal, login, user } = useAuth();
  const [step, setStep] = useState<"email" | "phone" | "otp">("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken: tokenResponse.access_token }),
        });
        const data = await res.json();
        if (res.ok) {
          login({ email: data.email, picture: data.picture, token: data.token });
          closeModal();
        } else {
          setError(data.error || "Google login failed on server");
        }
      } catch (err) {
        console.error("Google Auth Request Failed:", err);
        setError("Network error during Google login.");
      } finally {
        setLoading(false);
      }
    },
    onError: (error) => {
      console.error("Google Login Failed:", error);
      setError("Google authentication failed or was cancelled.");
    }
  });

  if (!isModalOpen) return null;

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok && data.requireOtp) {
        setStep("otp");
      } else {
        setError(data.error || "Failed to send OTP.");
      }
    } catch (error) {
      console.error(error);
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const phoneRegex = /^[+]?[\d\s-]{7,15}$/;
    if (!phoneRegex.test(phone)) {
      setError("Enter a valid phone number");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      const data = await res.json();

      if (res.ok && data.requireOtp) {
        setStep("otp");
      } else {
        setError(data.error || "Failed to send OTP.");
      }
    } catch (error) {
      console.error(error);
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!otp || otp.length !== 6) {
      setError("Enter a valid 6-digit OTP");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email || undefined, phone: phone || undefined, otp }),
      });

      const data = await res.json();

      if (res.ok) {
        login({ email: email || phone, token: data.token });
        closeModal();
      } else {
        setError(data.error || "Invalid OTP.");
      }
    } catch (error) {
      console.error(error);
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setStep("email");
    setEmail("");
    setPhone("");
    setOtp("");
    setError("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="bg-[#1e1f20]/95 backdrop-blur-xl w-full max-w-md rounded-xl p-8 shadow-2xl relative z-10 border border-gray-200 dark:border-white/10">
        <button 
          onClick={() => {
            closeModal();
            setTimeout(resetState, 300);
          }}
          className="absolute top-4 right-4 text-gray-600 dark:text-gray-400 hover:text-white transition-colors p-1"
        >
          <X size={20} />
        </button>

        {step === "otp" && (
          <button 
            onClick={resetState}
            className="absolute top-4 left-4 text-gray-600 dark:text-gray-400 hover:text-white transition-colors p-1"
          >
            <ArrowLeft size={20} />
          </button>
        )}

        <div className="text-center mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
            {step === "email" ? "Sign in to your account" : "Enter Verification Code"}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            {step === "email" 
              ? "You'll get smarter responses and can upload files, images, and more."
              : step === "phone"
                ? "Enter your phone number to receive an OTP."
                : `We sent a code to ${email || phone}`
            }
          </p>
        </div>

        {step === "email" ? (
          <>
            <div className="space-y-3 mb-6">
              <button 
                onClick={() => handleGoogleLogin()} 
                disabled={loading}
                className="flex items-center justify-center gap-3 w-full bg-white dark:bg-[#282a2c] hover:bg-[#383a3c] border border-gray-200 dark:border-white/10 rounded-lg px-4 py-3 transition-colors text-gray-900 dark:text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                <GoogleIcon />
                Continue with Google
              </button>

            </div>

            <div className="relative flex items-center justify-center mb-6">
              <div className="absolute border-t border-gray-200 dark:border-white/10 w-full"></div>
              <span className="bg-gray-50 dark:bg-[#1e1f20] px-3 text-xs text-gray-500 dark:text-gray-500 relative z-10">OR</span>
            </div>

            <form onSubmit={handleEmailSubmit} noValidate className="space-y-4">
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError("");
                  }}
                  className={`w-full bg-white dark:bg-[#282a2c] border ${error ? 'border-red-500' : 'border-gray-200 dark:border-white/10 focus:border-blue-500 focus:ring-blue-500'} rounded-lg px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-1 transition-all placeholder-gray-500 shadow-sm`}
                  placeholder="Email address"
                />
                {error && (
                  <div className="absolute top-[105%] left-0 z-50 animate-in fade-in slide-in-from-top-1">
                    <div className="absolute -top-2 left-6 w-4 h-4 bg-white dark:bg-[#282a2c] transform rotate-45 border-l border-t border-gray-200 dark:border-white/10"></div>
                    <div className="relative bg-white dark:bg-[#282a2c] border border-gray-200 dark:border-white/10 shadow-lg rounded-sm px-3 py-2 flex items-center gap-3">
                      <div className="bg-[#f26522] text-gray-900 dark:text-white font-bold w-5 h-5 flex flex-col items-center justify-center rounded-[2px] text-xs shrink-0">!</div>
                      <span className="text-gray-800 dark:text-gray-200 text-[13px]">{error}</span>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full bg-[#0a57d0] text-gray-900 dark:text-white font-medium rounded-lg px-4 py-3.5 hover:bg-[#0b63eb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {loading ? "Please wait..." : "Continue"}
              </button>
            </form>
          </>
        ) : step === "phone" ? (
          <form onSubmit={handlePhoneSubmit} noValidate className="space-y-4">
            <div className="relative">
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (error) setError("");
                }}
                className={`w-full bg-white dark:bg-[#282a2c] border ${error ? 'border-red-500' : 'border-gray-200 dark:border-white/10 focus:border-blue-500 focus:ring-blue-500'} rounded-lg px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-1 transition-all placeholder-gray-500 shadow-sm`}
                placeholder="Phone number"
              />
              {error && (
                <div className="absolute top-[105%] left-0 z-50 animate-in fade-in slide-in-from-top-1">
                  <div className="absolute -top-2 left-6 w-4 h-4 bg-white dark:bg-[#282a2c] transform rotate-45 border-l border-t border-gray-200 dark:border-white/10"></div>
                  <div className="relative bg-white dark:bg-[#282a2c] border border-gray-200 dark:border-white/10 shadow-lg rounded-sm px-3 py-2 flex items-center gap-3">
                    <div className="bg-[#f26522] text-gray-900 dark:text-white font-bold w-5 h-5 flex flex-col items-center justify-center rounded-[2px] text-xs shrink-0">!</div>
                    <span className="text-gray-800 dark:text-gray-200 text-[13px]">{error}</span>
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !phone}
              className="w-full bg-[#0a57d0] text-gray-900 dark:text-white font-medium rounded-lg px-4 py-3.5 hover:bg-[#0b63eb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {loading ? "Please wait..." : "Continue"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit} noValidate className="space-y-4">
            <div className="relative">
                <input
                  type="text"
                  required
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value);
                    if (error) setError("");
                  }}
                  maxLength={6}
                  className={`w-full bg-white dark:bg-[#282a2c] border ${error ? 'border-red-500' : 'border-gray-200 dark:border-white/10 focus:border-blue-500 focus:ring-blue-500'} rounded-lg px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-1 transition-all placeholder-gray-500 text-center tracking-widest text-xl shadow-sm`}
                  placeholder="000000"
                />
              {error && (
                <div className="absolute top-[105%] left-0 z-50 animate-in fade-in slide-in-from-top-1">
                  <div className="absolute -top-2 left-6 w-4 h-4 bg-white dark:bg-[#282a2c] transform rotate-45 border-l border-t border-gray-200 dark:border-white/10"></div>
                  <div className="relative bg-white dark:bg-[#282a2c] border border-gray-200 dark:border-white/10 shadow-lg rounded-sm px-3 py-2 flex items-center gap-3">
                    <div className="bg-[#f26522] text-gray-900 dark:text-white font-bold w-5 h-5 flex flex-col items-center justify-center rounded-[2px] text-xs shrink-0">!</div>
                    <span className="text-gray-800 dark:text-gray-200 text-[13px]">{error}</span>
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full bg-[#0a57d0] text-gray-900 dark:text-white font-medium rounded-lg px-4 py-3.5 hover:bg-[#0b63eb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {loading ? "Verifying..." : "Verify Code"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
