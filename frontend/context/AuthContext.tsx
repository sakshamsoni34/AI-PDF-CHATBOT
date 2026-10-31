"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { BACKEND_URL } from "@/lib/config";

interface AuthContextType {
  user: { email: string, picture?: string, token?: string } | null;
  login: (userData: { email: string, picture?: string, token?: string }) => void;
  logout: () => void;
  isModalOpen: boolean;
  modalMode: "login" | "signup";
  openModal: (mode: "login" | "signup") => void;
  closeModal: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<{ email: string, picture?: string, token?: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"login" | "signup">("login");

  useEffect(() => {
    const storedUser = localStorage.getItem("auth_user");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser.token) {
          const payload = JSON.parse(atob(parsedUser.token.split(".")[1]));
          if (payload.exp * 1000 < Date.now()) {
            localStorage.removeItem("auth_user");
            return;
          }
        }
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setUser(parsedUser);
      } catch (e) {
        console.error("Failed to parse auth user");
      }
    }
  }, []);

  const login = async (userData: { email: string, picture?: string, token?: string }) => {
    let finalUserData = { ...userData };
    if (!userData.token) {
      try {
        const res = await fetch(`${BACKEND_URL}/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: userData.email, password: "dummy-password" })
        });
        const data = await res.json();
        if (data.token) {
          finalUserData.token = data.token;
        }
      } catch (e) {
        console.warn("Login API failed", e);
      }
    }
    setUser(finalUserData);
    localStorage.setItem("auth_user", JSON.stringify(finalUserData));
  };
  
  const logout = async () => {
    try {
      await fetch(`${BACKEND_URL}/logout`, { method: "POST" });
    } catch (e) {
      console.warn("Logout API failed", e);
    }
    setUser(null);
    localStorage.removeItem("auth_user");
  };
  
  const openModal = (mode: "login" | "signup" = "login") => {
    setModalMode(mode);
    setIsModalOpen(true);
  };
  
  const closeModal = () => setIsModalOpen(false);

  // Use a dummy client ID if no client ID is provided yet, to prevent the Google SDK from crashing the app
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "dummy-client-id.apps.googleusercontent.com";

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <AuthContext.Provider value={{ user, login, logout, isModalOpen, modalMode, openModal, closeModal }}>
        {children}
      </AuthContext.Provider>
    </GoogleOAuthProvider>
  );
};

export const useAuth = () => useContext(AuthContext);
