"use client";
import { X, Sparkles, FileText, BrainCircuit, FolderOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AboutModal({ isOpen, onClose }: AboutModalProps) {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="relative bg-gradient-to-b from-[#1e1f20] to-[#131314] border border-gray-200 dark:border-white/10 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        
        {/* Header Graphic */}
        <div className="relative h-32 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 flex items-center justify-center overflow-hidden shrink-0">
          <div className="w-16 h-16 rounded-2xl bg-gray-300 dark:bg-white/10 border border-gray-300 dark:border-white/20 backdrop-blur-md flex items-center justify-center shadow-lg">
            <Sparkles size={32} className="text-blue-600 dark:text-blue-400" />
          </div>
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-gray-300 dark:hover:bg-white/10 text-gray-900 dark:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 pt-6 relative z-10">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-2">
              Welcome to AI PDF Chatbot
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Your intelligent research assistant for deep document analysis.
            </p>
          </div>

          <div className="space-y-6">
            {/* Feature 1 */}
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="mt-1 p-2 bg-blue-500/10 rounded-lg shrink-0">
                <FileText size={20} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-gray-900 dark:text-white font-medium mb-1">Chat with your PDFs</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  Upload any PDF document and instantly start asking questions. The AI uses advanced Retrieval-Augmented Generation (RAG) to find precise answers.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="mt-1 p-2 bg-purple-500/10 rounded-lg shrink-0">
                <BrainCircuit size={20} className="text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="text-gray-900 dark:text-white font-medium mb-1">Intelligent Synthesis</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  The AI doesn't just copy and paste. It synthesizes complex topics and formats responses beautifully.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="mt-1 p-2 bg-pink-500/10 rounded-lg shrink-0">
                <FolderOpen size={20} className="text-pink-400" />
              </div>
              <div>
                <h3 className="text-gray-900 dark:text-white font-medium mb-1">Study Guide Generation</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  Ask the AI to "save this to a folder" or "create a study guide." It will automatically compile the topic into a structured document.
                </p>
              </div>
            </div>
          </div>
          
          <div className="mt-10 text-center">
            <button 
              onClick={onClose}
              className="px-8 py-2.5 bg-blue-600 hover:bg-blue-500 text-gray-900 dark:text-white rounded-xl text-sm font-medium transition-colors"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
