"use client";
import { FileText, Search, Sparkles, User, File as FileIcon, LogOut, Download, Trash2, RefreshCw, Copy, Share2, Maximize2, Minimize2, Globe, Clock, GitCompare, AlignLeft } from "lucide-react";
import Image from "next/image";
import ChatInput from "./ChatInput";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/ChatContext";
import { useState, useEffect, useRef } from "react";
import ChatMessage from "./ChatMessage";
import ReactMarkdown from "react-markdown";
import AboutModal from "./AboutModal";
import LogoutModal from "./LogoutModal";
import PdfViewerModal from "./PdfViewerModal";
import { motion, AnimatePresence } from "framer-motion";
import { BACKEND_URL } from "@/lib/config";

export default function ChatArea() {
  const { user, openModal, logout } = useAuth();
  const { currentMessages, addMessage, updateMessage, truncateMessages, saveToFolder, activeDocuments, clearSessionMessages, currentSessionId } = useChat();
  const [inputText, setInputText] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [currentGreetingIndex, setCurrentGreetingIndex] = useState(0);
  const [previewDoc, setPreviewDoc] = useState<{ id: string; name?: string; page?: number } | null>(null);

  const handleSourceClick = (source: any) => {
    let docId = source.doc_id;
    if (!docId && activeDocuments.length > 0) {
      const match = activeDocuments.find((d) => d.name === source.source);
      docId = match ? match.id : activeDocuments[0].id;
    }
    if (docId) {
      const pageNum = typeof source.page === "number" ? source.page : parseInt(source.page, 10) || 1;
      setPreviewDoc({
        id: docId,
        name: source.source || "Document",
        page: pageNum,
      });
    }
  };
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const greetings = [
    "Ready when you are",
    "What do you want to know?",
    "Let's dive into your PDF",
    "Ask me anything about your document",
    "I'm ready to help"
  ];

  useEffect(() => {
    if (currentMessages.length === 0) {
      const interval = setInterval(() => {
        setCurrentGreetingIndex((prev) => (prev + 1) % greetings.length);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [currentMessages.length]);

  // Auto-hide toast after 3 seconds
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  useEffect(() => {
    // Only scroll to the bottom when the user sends a message (isLoading becomes true)
    // This ensures we don't auto-scroll to the bottom of a very long AI response, 
    // allowing the user to start reading from the top.
    if (isLoading) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isLoading]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  const handleChipClick = (text: string) => {
    if (!user) {
      openModal("login");
      return;
    }
    setInputText(text);
  };

  const handleExportChat = () => {
    if (currentMessages.length === 0) return;
    
    let markdownContent = `# Chat Export\n\n`;
    currentMessages.forEach(msg => {
      markdownContent += `**${msg.role === 'user' ? 'You' : 'AI'}**:\n${msg.text}\n\n---\n\n`;
    });
    
    const blob = new Blob([markdownContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-export-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast("Chat exported successfully!");
  };

  const handleClearChat = async () => {
    if (currentSessionId) {
      clearSessionMessages(currentSessionId);
      showToast("Chat cleared!");
      try {
        await fetch(`${BACKEND_URL}/history/${currentSessionId}`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${user?.token || ""}` }
        });
      } catch (err) {
        console.error("Failed to delete chat history on server");
      }
    }
  };

  const handleCopyAll = () => {
    if (currentMessages.length === 0) return;
    const text = currentMessages.map(m => `${m.role === 'user' ? 'You' : 'AI'}: ${m.text}`).join('\n\n');
    navigator.clipboard.writeText(text);
    showToast("Chat copied to clipboard!");
  };

  const handleShare = () => {
    if (currentMessages.length === 0) return;
    const text = currentMessages.map(m => `${m.role === 'user' ? 'You' : 'AI'}: ${m.text}`).join('\n\n');
    if (navigator.share) {
      navigator.share({
        title: 'Chat Export',
        text: text,
      }).catch(console.error);
    } else {
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-share-${Date.now()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("Chat shared as TXT!");
    }
  };

  const handleRegenerateLast = async () => {
    const lastUserMsg = [...currentMessages].reverse().find(m => m.role === 'user');
    if (!lastUserMsg || isLoading) return;
    await handleRegenerateMessage(lastUserMsg.id);
  };

  const handleRegenerateMessage = async (msgId: string) => {
    if (isLoading) return;
    const msgIndex = currentMessages.findIndex(m => m.id === msgId);
    // Find the user message that triggered this bot response
    let userMsg = currentMessages[msgIndex];
    // If it's a bot message, find the preceding user message
    if (userMsg.role === 'bot') {
      const prevUser = currentMessages.slice(0, msgIndex).reverse().find(m => m.role === 'user');
      if (!prevUser) return;
      userMsg = prevUser;
    }
    
    const activeSessionId = currentSessionId || '';
    
    // Create history up to userMsg and then truncate and re-add user message so UI reflects it immediately
    const historyToSend = currentMessages.slice(0, currentMessages.findIndex(m => m.id === userMsg.id));
    truncateMessages(userMsg.id);
    addMessage(userMsg, activeSessionId);
    
    setIsLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token || ''}`
        },
        body: JSON.stringify({
          message: userMsg.text,
          session_id: activeSessionId,
          history: historyToSend,
          active_doc_ids: activeDocuments.map(d => d.id)
        })
      });
      if (res.ok) {
        const data = await res.json();
        const replyData = data.reply;
        let finalReplyText = replyData.response;
        const folderRegex = /<folder\s+name="([^"]+)">[\s\S]*?<\/folder>/gi;
        finalReplyText = finalReplyText.replace(folderRegex, (m: string, name: string) => `\n\n> 📁 **Saved to Folder:** \`${name}\`\n\n`);
        addMessage({ id: Date.now().toString(), role: 'bot', text: finalReplyText, images: replyData.images, sources: replyData.sources }, activeSessionId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!inputText.trim() || isLoading) return;
    
    if (!user) {
      openModal("login");
      return;
    }
    
    const activeSessionId = addMessage({
      id: Date.now().toString(),
      role: "user",
      text: inputText,
    });
    
    setInputText("");
    setIsLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/chat`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user?.token || ""}`
        },
        body: JSON.stringify({ 
          message: inputText,
          session_id: activeSessionId,
          history: currentMessages,
          active_doc_ids: activeDocuments.map(d => d.id)
        })
      });

      if (res.ok) {
        const reader = res.body?.getReader();
        const decoder = new TextDecoder("utf-8");
        if (!reader) throw new Error("No reader available");

        const botMessageId = Date.now().toString();
        addMessage({
          id: botMessageId,
          role: "bot",
          text: "",
          images: [],
          sources: []
        }, activeSessionId);

        let finalReplyText = "";
        let sources = [];
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";
          
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.slice(6);
              if (dataStr === "[DONE]") {
                break;
              }
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.sources) {
                  sources = parsed.sources;
                  updateMessage(botMessageId, { sources: sources });
                }
                if (parsed.text) {
                  finalReplyText += parsed.text;
                  updateMessage(botMessageId, { text: finalReplyText });
                }
                if (parsed.error) {
                  console.error("Stream error:", parsed.error);
                }
              } catch (e) {
                // Ignore parse errors for partial chunks
              }
            }
          }
        }

        // Parse for <folder name="...">...</folder>
        const folderRegex = /<folder\s+name="([^"]+)">([\s\S]*?)<\/folder>/gi;
        let match;
        while ((match = folderRegex.exec(finalReplyText)) !== null) {
          const folderName = match[1];
          const folderContent = match[2];
          saveToFolder(folderName, folderContent.trim());
        }

        // Replace the XML tags with a beautiful UI badge in markdown format
        finalReplyText = finalReplyText.replace(folderRegex, (m: string, name: string) => `\n\n> 📁 **Saved to Folder:** \`${name}\`\n\n`);
        
        updateMessage(botMessageId, { text: finalReplyText });
      } else {
        addMessage({
          id: Date.now().toString(),
          role: "bot",
          text: "Failed to get response from Python server."
        }, activeSessionId);
      }
    } catch (err) {
      console.error(err);
      addMessage({
        id: Date.now().toString(),
        role: "bot",
        text: "Could not connect to Python server. Is it running?"
      }, activeSessionId);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditResend = async (id: string, newText: string) => {
    if (!newText.trim() || isLoading) return;
    
    // Find the index of the message to be edited
    const messageIndex = currentMessages.findIndex(m => m.id === id);
    if (messageIndex === -1) return;
    
    // Get the history exactly as it was right before this message
    const historyToSend = currentMessages.slice(0, messageIndex);
    
    // Truncate the UI history starting from the edited message
    truncateMessages(id);
    
    // Add the new edited message
    const activeSessionId = addMessage({
      id: Date.now().toString(),
      role: "user",
      text: newText,
    });
    
    setIsLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/chat`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user?.token || ""}`
        },
        body: JSON.stringify({ 
          message: newText,
          session_id: activeSessionId,
          history: historyToSend,
          active_doc_ids: activeDocuments.map(d => d.id)
        })
      });

      if (res.ok) {
        const data = await res.json();
        const replyData = data.reply;
        let finalReplyText = replyData.response;

        const folderRegex = /<folder\s+name="([^"]+)">([\s\S]*?)<\/folder>/gi;
        let match;
        while ((match = folderRegex.exec(finalReplyText)) !== null) {
          saveToFolder(match[1], match[2].trim());
        }
        finalReplyText = finalReplyText.replace(folderRegex, (m: string, name: string) => `\n\n> 📁 **Saved to Folder:** \`${name}\`\n\n`);

        addMessage({
          id: Date.now().toString(),
          role: "bot",
          text: finalReplyText,
          sources: replyData.sources
        }, activeSessionId);
      } else {
        addMessage({
          id: Date.now().toString(),
          role: "bot",
          text: "Failed to get response from Python server."
        }, activeSessionId);
      }
    } catch (error) {
      console.error(error);
      addMessage({
        id: Date.now().toString(),
        role: "bot",
        text: "Error connecting to server."
      }, activeSessionId);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateStudyMaterial = async (docId: string, type: string) => {
    if (isLoading) return;
    
    if (!user) {
      openModal("login");
      return;
    }
    
    const typeNames: Record<string, string> = {
      summary: "a Summary",
      quiz: "a Quiz",
      flashcards: "Flashcards",
      action_items: "Action Items",
      study_guide: "a Study Guide",
      glossary: "a Glossary of Terms"
    };

    const docName = activeDocuments.find(d => d.id === docId)?.name || "the document";
    
    const activeSessionId = addMessage({
      id: Date.now().toString(),
      role: "user",
      text: `Generate ${typeNames[type] || "study material"} for ${docName}`,
    });
    
    setIsLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/generate`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user?.token || ""}`
        },
        body: JSON.stringify({ 
          document_id: docId,
          material_type: type
        })
      });

      if (res.ok) {
        const data = await res.json();
        
        addMessage({
          id: Date.now().toString(),
          role: "bot",
          text: data.data,
        }, activeSessionId);
      } else {
        addMessage({
          id: Date.now().toString(),
          role: "bot",
          text: "Failed to generate study material."
        }, activeSessionId);
      }
    } catch (err) {
      console.error(err);
      addMessage({
        id: Date.now().toString(),
        role: "bot",
        text: "Could not connect to server."
      }, activeSessionId);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50 dark:bg-[#000000] relative overflow-hidden">
      
      {/* Centered White Glow Background */}
      <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.06)_0%,_transparent_70%)] rounded-full blur-3xl pointer-events-none z-0"></div>

      <div className="flex-1 flex flex-col h-full relative z-10">
        
        {toastMessage && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-[#282a2c] text-gray-900 dark:text-white px-6 py-3 rounded-full shadow-lg border border-gray-200 dark:border-white/10 animate-in fade-in slide-in-from-top-4 flex items-center gap-2 text-sm">
            <Sparkles size={16} className="text-blue-600 dark:text-blue-400" />
            {toastMessage}
          </div>
        )}

      {/* 3D Globe Background removed */}

      <div className="absolute top-0 right-0 w-full flex justify-end items-center p-6 gap-6 z-[9999] pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-6">

          
          {!user ? (
            <button 
              onClick={() => openModal("login")}
              className="px-6 py-2 text-sm font-medium text-gray-900 dark:text-white bg-[#0a57d0] hover:bg-[#0b63eb] rounded-full transition-colors shadow-sm"
            >
              Sign in
            </button>
          ) : (
            <div className="flex items-center gap-4">
              {currentMessages.length > 0 && (
                <div className="flex items-center gap-1.5 mr-2">
                  <button 
                    type="button"
                    onClick={handleRegenerateLast}
                    className="p-2 rounded-full bg-gray-200 dark:bg-white/5 hover:bg-gray-300 dark:hover:bg-white/10 text-purple-600 dark:text-purple-400 transition-colors border border-white/5 backdrop-blur-md"
                    title="Regenerate last response"
                  >
                    <RefreshCw size={18} />
                  </button>
                  <button 
                    type="button"
                    onClick={handleCopyAll}
                    className="p-2 rounded-full bg-gray-200 dark:bg-white/5 hover:bg-gray-300 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 transition-colors border border-white/5 backdrop-blur-md"
                    title="Copy full chat"
                  >
                    <Copy size={18} />
                  </button>
                  <button 
                    type="button"
                    onClick={handleShare}
                    className="p-2 rounded-full bg-gray-200 dark:bg-white/5 hover:bg-gray-300 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 transition-colors border border-white/5 backdrop-blur-md"
                    title="Share / Download chat"
                  >
                    <Share2 size={18} />
                  </button>
                  <button 
                    type="button"
                    onClick={handleExportChat}
                    className="p-2 rounded-full bg-gray-200 dark:bg-white/5 hover:bg-gray-300 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 transition-colors border border-white/5 backdrop-blur-md"
                    title="Export as Markdown"
                  >
                    <Download size={18} />
                  </button>
                  <button 
                    type="button"
                    onClick={handleClearChat}
                    className="p-2 rounded-full bg-gray-200 dark:bg-white/5 hover:bg-gray-300 dark:hover:bg-white/10 text-red-600 dark:text-red-400 transition-colors border border-white/5 backdrop-blur-md"
                    title="Clear Chat"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              )}
              
            <div className="relative">
              <button 
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="flex items-center justify-center hover:bg-gray-300 dark:hover:bg-white/10 p-1 rounded-full transition-colors backdrop-blur-sm"
                title={user.email} 
              >
                {user.picture ? (
                  <div className="w-9 h-9 relative shrink-0">
                    <Image src={(user as any).picture} unoptimized alt="Profile" fill className="rounded-full shadow-md object-cover" />
                  </div>
                ) : (
                  <div className="bg-blue-600 rounded-full p-1.5 shadow-md w-9 h-9 flex items-center justify-center">
                    <User size={18} className="text-gray-900 dark:text-white" />
                  </div>
                )}
              </button>
              
              {isProfileDropdownOpen && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-black/40 dark:bg-black/60 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-4 py-2 border-b border-gray-200 dark:border-white/10 mb-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Account</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{user.email}</p>
                  </div>
                  <button 
                    onClick={() => {
                      setIsLogoutOpen(true);
                      setIsProfileDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-200 dark:hover:bg-white/5 text-sm text-red-600 dark:text-red-400 flex items-center gap-2 transition-colors"
                  >
                    <LogOut size={16} />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
          )}
        </div>
      </div>

      {currentMessages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-4 w-full max-w-4xl mx-auto z-10 relative">
          <h1 className="text-[36px] md:text-[44px] font-normal text-gray-900 dark:text-white mb-10 text-center tracking-tight h-[60px] flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.span
                key={currentGreetingIndex}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.4 }}
              >
                {greetings[currentGreetingIndex]}
              </motion.span>
            </AnimatePresence>
          </h1>
          
          <div className="w-full mb-8">
            <ChatInput 
              value={inputText} 
              onChange={(e) => setInputText(e.target.value)} 
              onSubmit={handleSubmit} 
              onGenerateStudyMaterial={handleGenerateStudyMaterial}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-4xl px-4">
            <motion.button 
              whileHover={{ scale: 1.03, y: -4 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleChipClick("Summarize this PDF in 3 bullet points")} 
              className="flex flex-col items-start p-5 rounded-[24px] border border-gray-200 dark:border-white/10 hover:border-blue-500/50 bg-gray-200 dark:bg-white/5 hover:bg-blue-500/10 backdrop-blur-xl transition-all duration-300 text-left group shadow-lg hover:shadow-blue-500/20"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-500/20 mb-3 group-hover:scale-110 transition-transform">
                <FileText size={20} className="text-blue-600 dark:text-blue-400" />
              </div>
              <span className="font-semibold text-sm text-gray-800 dark:text-gray-200 mb-1">Summarize this PDF</span>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">Extract the main points from the document</p>
            </motion.button>
            
            <motion.button 
              whileHover={{ scale: 1.03, y: -4 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleChipClick("Find specific data regarding revenue")} 
              className="flex flex-col items-start p-5 rounded-[24px] border border-gray-200 dark:border-white/10 hover:border-emerald-500/50 bg-gray-200 dark:bg-white/5 hover:bg-emerald-500/10 backdrop-blur-xl transition-all duration-300 text-left group shadow-lg hover:shadow-emerald-500/20"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/20 mb-3 group-hover:scale-110 transition-transform">
                <Search size={20} className="text-emerald-400" />
              </div>
              <span className="font-semibold text-sm text-gray-800 dark:text-gray-200 mb-1">Find specific data</span>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">Search for exact figures or quotes</p>
            </motion.button>
            
            <motion.button 
              whileHover={{ scale: 1.03, y: -4 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleChipClick("Explain the complex terms used on page 4")} 
              className="flex flex-col items-start p-5 rounded-[24px] border border-gray-200 dark:border-white/10 hover:border-purple-500/50 bg-gray-200 dark:bg-white/5 hover:bg-purple-500/10 backdrop-blur-xl transition-all duration-300 text-left group shadow-lg hover:shadow-purple-500/20"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-500/20 mb-3 group-hover:scale-110 transition-transform">
                <Sparkles size={20} className="text-purple-600 dark:text-purple-400" />
              </div>
              <span className="font-semibold text-sm text-gray-800 dark:text-gray-200 mb-1">Explain complex terms</span>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">Simplify difficult concepts in the text</p>
            </motion.button>
            
            <motion.button 
              whileHover={{ scale: 1.03, y: -4 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleChipClick("Extract Key Figures and Action Items")} 
              className="flex flex-col items-start p-5 rounded-[24px] border border-gray-200 dark:border-white/10 hover:border-orange-500/50 bg-gray-200 dark:bg-white/5 hover:bg-orange-500/10 backdrop-blur-xl transition-all duration-300 text-left group shadow-lg hover:shadow-orange-500/20"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-500/20 mb-3 group-hover:scale-110 transition-transform">
                <FileIcon size={20} className="text-orange-400" />
              </div>
              <span className="font-semibold text-sm text-gray-800 dark:text-gray-200 mb-1">Extract Key Data</span>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">Identify crucial figures and action items</p>
            </motion.button>

            <motion.button 
              whileHover={{ scale: 1.03, y: -4 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleChipClick("Compare and contrast the key ideas in each document uploaded")} 
              className="flex flex-col items-start p-5 rounded-[24px] border border-gray-200 dark:border-white/10 hover:border-sky-500/50 bg-gray-200 dark:bg-white/5 hover:bg-sky-500/10 backdrop-blur-xl transition-all duration-300 text-left group shadow-lg hover:shadow-sky-500/20"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-sky-500/20 mb-3 group-hover:scale-110 transition-transform">
                <GitCompare size={20} className="text-sky-400" />
              </div>
              <span className="font-semibold text-sm text-gray-800 dark:text-gray-200 mb-1">Compare Documents</span>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">Side-by-side analysis of uploaded PDFs</p>
            </motion.button>

            <motion.button 
              whileHover={{ scale: 1.03, y: -4 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleChipClick("Translate the entire document content to Hindi and summarize it")} 
              className="flex flex-col items-start p-5 rounded-[24px] border border-gray-200 dark:border-white/10 hover:border-rose-500/50 bg-gray-200 dark:bg-white/5 hover:bg-rose-500/10 backdrop-blur-xl transition-all duration-300 text-left group shadow-lg hover:shadow-rose-500/20"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-rose-500/20 mb-3 group-hover:scale-110 transition-transform">
                <Globe size={20} className="text-rose-400" />
              </div>
              <span className="font-semibold text-sm text-gray-800 dark:text-gray-200 mb-1">Translate to Hindi</span>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">Summarize document in Hindi language</p>
            </motion.button>

            <motion.button 
              whileHover={{ scale: 1.03, y: -4 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleChipClick("Build a chronological timeline of all events mentioned in the document")} 
              className="flex flex-col items-start p-5 rounded-[24px] border border-gray-200 dark:border-white/10 hover:border-yellow-500/50 bg-gray-200 dark:bg-white/5 hover:bg-yellow-500/10 backdrop-blur-xl transition-all duration-300 text-left group shadow-lg hover:shadow-yellow-500/20"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-yellow-500/20 mb-3 group-hover:scale-110 transition-transform">
                <Clock size={20} className="text-yellow-400" />
              </div>
              <span className="font-semibold text-sm text-gray-800 dark:text-gray-200 mb-1">Build Timeline</span>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">Extract chronological events from the PDF</p>
            </motion.button>

            <motion.button 
              whileHover={{ scale: 1.03, y: -4 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleChipClick("List all definitions, key terms and their explanations from the document")} 
              className="flex flex-col items-start p-5 rounded-[24px] border border-gray-200 dark:border-white/10 hover:border-teal-500/50 bg-gray-200 dark:bg-white/5 hover:bg-teal-500/10 backdrop-blur-xl transition-all duration-300 text-left group shadow-lg hover:shadow-teal-500/20"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-teal-500/20 mb-3 group-hover:scale-110 transition-transform">
                <AlignLeft size={20} className="text-teal-400" />
              </div>
              <span className="font-semibold text-sm text-gray-800 dark:text-gray-200 mb-1">Build Glossary</span>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">Extract all key terms and definitions</p>
            </motion.button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pt-24 pb-32 px-4 scroll-smooth relative z-10">
          <div className="max-w-3xl mx-auto space-y-8">
            {currentMessages.map((msg) => (
              <ChatMessage key={msg.id} msg={msg} user={user} onEditSubmit={handleEditResend} onRegenerate={handleRegenerateMessage} onSourceClick={handleSourceClick} />
            ))}
            {isLoading && (
              <div className="flex gap-4 justify-start">
                <div className="w-8 h-8 relative flex items-center justify-center shrink-0">
                  <Image src="/logo.png" alt="AI" fill className="object-contain" />
                </div>
                <div className="flex items-center gap-2 px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce"></div>
                    <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {currentMessages.length > 0 && (
        <div className="absolute bottom-0 w-full bg-gradient-to-t from-[#0a0a0b] via-[#0a0a0b]/90 to-transparent pt-10 pb-6 px-4 z-20">
          <div className="max-w-3xl mx-auto">
            <ChatInput 
              value={inputText} 
              onChange={(e) => setInputText(e.target.value)} 
              onSubmit={() => handleSubmit()}
              onGenerateStudyMaterial={handleGenerateStudyMaterial}
            />
            <p className="text-[11px] text-gray-500 dark:text-gray-500 font-medium text-center mt-4">
              Terms and Privacy Policy apply. AI Chatbot is AI and can make mistakes.
            </p>
          </div>
        </div>
      )}

      {previewDoc && (
        <PdfViewerModal
          isOpen={!!previewDoc}
          onClose={() => setPreviewDoc(null)}
          docId={previewDoc.id}
          docName={previewDoc.name}
          initialPage={previewDoc.page || 1}
        />
      )}
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
      <LogoutModal 
        isOpen={isLogoutOpen} 
        onClose={() => setIsLogoutOpen(false)} 
        onConfirm={() => {
          logout();
          setIsLogoutOpen(false);
        }} 
      />
      </div>
    </div>
  );
}
