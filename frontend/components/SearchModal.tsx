"use client";
import { useState, useMemo } from "react";
import { Search, X, MessageSquare } from "lucide-react";
import { useChat } from "@/context/ChatContext";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const { sessions, switchSession } = useChat();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    return sessions.filter(session => 
      session.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [sessions, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-[100] flex items-start justify-center pt-20 px-4">
      <div 
        className="bg-white dark:bg-[#1a1b23] border border-gray-200 dark:border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-10 duration-200"
      >
        <div className="flex items-center p-4 border-b border-gray-200 dark:border-white/10">
          <Search className="text-gray-600 dark:text-gray-400 mr-3 shrink-0" size={20} />
          <input
            autoFocus
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your chats..."
            className="flex-1 bg-transparent border-none text-gray-900 dark:text-white focus:outline-none placeholder-gray-500 text-lg"
          />
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-300 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400 hover:text-white transition-colors shrink-0"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar p-2">
          {filteredSessions.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-500">
              No chats found matching "{searchQuery}"
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {filteredSessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => {
                    switchSession(session.id);
                    onClose();
                  }}
                  className="w-full text-left p-4 hover:bg-gray-200 dark:hover:bg-white/5 rounded-xl transition-colors flex items-start gap-4 group"
                >
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                    <MessageSquare size={20} />
                  </div>
                  <div>
                    <h3 className="text-gray-900 dark:text-white font-medium text-base mb-1">{session.title}</h3>
                    <p className="text-gray-500 dark:text-gray-500 text-sm">
                      {new Date(session.createdAt).toLocaleDateString()} • {session.messages.length} messages
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
