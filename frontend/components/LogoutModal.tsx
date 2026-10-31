"use client";
import React from "react";
import { useAuth } from "@/context/AuthContext";
import { Info, User } from "lucide-react";

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function LogoutModal({ isOpen, onClose, onConfirm }: LogoutModalProps) {
  const { user } = useAuth();

  if (!isOpen || !user) return null;

  // Extract name from email if no name is provided
  let displayName = "User";
  if (user.email) {
    const namePart = user.email.split('@')[0];
    const match = namePart.match(/^[a-zA-Z]+/);
    const firstName = match ? match[0] : namePart;
    displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1f1f1f] w-full max-w-[400px] rounded-[24px] p-8 border border-white/5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-6 tracking-tight">
          Are you sure you<br />want to log out?
        </h2>

        <div className="bg-[#2a2a2a] rounded-2xl p-4 mb-4 border border-white/5 flex items-center gap-4">
          <div className="shrink-0">
            {/* @ts-ignore */}
            {user.picture ? (
              <img src={(user as any).picture} referrerPolicy="no-referrer" alt="Profile" className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-[#3a3a3a] flex items-center justify-center text-lg font-medium text-gray-900 dark:text-white">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-gray-900 dark:text-white font-semibold text-[15px] truncate">{displayName}</span>
            <span className="text-gray-600 dark:text-gray-400 text-sm truncate">{user.email}</span>
          </div>
        </div>

        <div className="bg-[#2a2a2a] rounded-xl p-4 mb-8 flex items-center gap-3 border border-white/5">
          <Info size={18} className="text-gray-600 dark:text-gray-400 shrink-0" />
          <p className="text-gray-700 dark:text-gray-300 text-sm font-medium">This will also log you out of AI-PDF.</p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={onConfirm}
            className="w-full bg-white text-black font-semibold rounded-full py-3.5 hover:bg-gray-200 transition-colors"
          >
            Log out
          </button>
          <button
            onClick={onClose}
            className="w-full bg-transparent text-gray-900 dark:text-white font-semibold rounded-full py-3.5 border border-gray-300 dark:border-white/20 hover:bg-gray-200 dark:hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
