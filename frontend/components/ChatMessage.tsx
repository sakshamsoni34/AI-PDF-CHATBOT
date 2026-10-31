import { FileText, File as FileIcon, User, Edit2, Check, X, Copy, ThumbsUp, ThumbsDown, RefreshCw, Volume2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import Image from "next/image";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { useChat } from "@/context/ChatContext";
import { BACKEND_URL } from "@/lib/config";

interface ChatMessageProps {
  msg: any;
  user: any;
  onEditSubmit?: (id: string, text: string) => void;
  onRegenerate?: (msgId: string) => void;
  onSourceClick?: (source: any) => void;
}

const ChatMessage = React.memo(({ msg, user, onEditSubmit, onRegenerate, onSourceClick }: ChatMessageProps) => {
  const { showTimestamps } = useChat();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(msg.text);
  const [isCopied, setIsCopied] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);

  const handleFeedback = (type: "up" | "down") => {
    const nextVal = feedback === type ? null : type;
    setFeedback(nextVal);
    if (nextVal && user?.token) {
      fetch(`${BACKEND_URL}/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user.token}`
        },
        body: JSON.stringify({
          message_id: msg.id,
          rating: type === "up" ? 1 : -1
        })
      }).catch(err => console.warn("Failed to send feedback", err));
    }
  };
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSave = () => {
    if (editValue.trim() && onEditSubmit) {
      onEditSubmit(msg.id, editValue);
    }
    setIsEditing(false);
  };

  const handleReadAloud = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(msg.text.replace(/[#*`>_~]/g, "").trim());
    utterance.rate = 1;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-4 group ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
    >
      {msg.role === 'bot' && (
        <div className="w-8 h-8 relative flex items-center justify-center shrink-0">
          <Image src="/logo.png" alt="AI" fill sizes="32px" className="object-contain" />
        </div>
      )}
      
      <div className={`flex flex-col gap-2 w-full max-w-[92%] sm:max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
        
        {msg.role === 'bot' && msg.images && msg.images.length > 0 && (
          <div className={`grid gap-2 mb-2 w-full ${msg.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} rounded-xl overflow-hidden`}>
            {msg.images.length >= 1 && (
              <div className={`relative ${msg.images.length > 1 ? 'row-span-2' : ''} h-full min-h-[150px]`}>
                <Image src={msg.images[0]} alt="Result" fill className={`object-cover rounded-lg ${msg.images.length > 1 ? 'aspect-square' : 'aspect-video'}`} />
              </div>
            )}
            {msg.images.length >= 2 && (
              <div className="flex flex-col gap-2">
                <div className="relative w-full h-full min-h-[100px]">
                  <Image src={msg.images[1]} alt="Result" fill className="object-cover rounded-lg aspect-video" />
                </div>
                {msg.images.length >= 3 && (
                  <div className="relative w-full h-full min-h-[100px]">
                    <Image src={msg.images[2]} alt="Result" fill className="object-cover rounded-lg aspect-video" />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className={`px-3.5 py-3 sm:px-5 sm:py-4 rounded-[20px] sm:rounded-[24px] w-full shadow-lg transition-all ${msg.role === 'user' ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white w-fit shadow-indigo-900/20 border border-indigo-500/30' : 'bg-white dark:bg-zinc-900/90 backdrop-blur-xl border border-gray-200 dark:border-white/10 text-gray-900 dark:text-gray-100 shadow-xl relative overflow-hidden'}`}>
          {msg.role === 'bot' && (
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
          )}
          {msg.role === 'user' ? (
            <div className="flex flex-col gap-1.5">
              {msg.attachedFile && (
                <div className="flex items-center gap-3 bg-gray-100 dark:bg-black/40 p-2.5 rounded-xl border border-white/5 w-fit backdrop-blur-sm shadow-sm mb-1">
                  <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                    <FileText size={18} className="text-red-600 dark:text-red-400" />
                  </div>
                  <div className="flex flex-col justify-center">
                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[200px] leading-tight">{msg.attachedFile}</span>
                    <span className="text-[10px] text-gray-600 dark:text-gray-400 uppercase tracking-widest font-bold mt-1">PDF Document</span>
                  </div>
                </div>
              )}
              <div className="relative group/text w-full">
                {isEditing ? (
                  <div className="flex flex-col gap-2 w-full mt-1">
                    <textarea 
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSave();
                        }
                      }}
                      className="w-full bg-gray-100 dark:bg-black/40 border border-gray-300 dark:border-white/20 rounded-lg p-2 text-[15px] text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 min-h-[80px] resize-none"
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <button onClick={() => { setIsEditing(false); setEditValue(msg.text); }} className="p-1.5 hover:bg-gray-300 dark:hover:bg-white/10 rounded-md text-gray-700 dark:text-gray-300 transition-colors">
                        <X size={16} />
                      </button>
                      <button onClick={handleSave} className="p-1.5 bg-blue-600 hover:bg-blue-500 rounded-md text-gray-900 dark:text-white transition-colors">
                        <Check size={16} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <span className="text-[15px] pr-8 block">{msg.text}</span>
                    <button 
                      onClick={() => setIsEditing(true)} 
                      className="absolute -top-1 -right-2 p-1.5 text-gray-600 dark:text-gray-400 hover:text-white opacity-0 group-hover/text:opacity-100 transition-opacity rounded-md hover:bg-gray-300 dark:hover:bg-white/10"
                      title="Edit query inline"
                    >
                      <Edit2 size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="prose prose-sm md:prose-base dark:prose-invert prose-indigo max-w-none prose-p:leading-relaxed prose-pre:bg-zinc-800/80 prose-pre:border prose-pre:border-zinc-700">
              <ReactMarkdown>{msg.text}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Bot message persistent action bar */}
        {msg.role === 'bot' && (
          <div className="flex items-center gap-0.5 px-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button onClick={handleCopy} className="p-1.5 rounded-md text-gray-500 dark:text-gray-500 hover:text-gray-200 hover:bg-gray-300 dark:hover:bg-white/10 transition-all" title="Copy response">
              {isCopied ? <Check size={13} className="text-green-600 dark:text-green-400" /> : <Copy size={13} />}
            </button>
            <button
              onClick={() => handleFeedback("up")}
              className={`p-1.5 rounded-md transition-all ${feedback === "up" ? "text-green-600 dark:text-green-400 bg-green-500/15" : "text-gray-500 dark:text-gray-500 hover:text-green-400 hover:bg-gray-300 dark:hover:bg-white/10"}`}
              title="Helpful"
            >
              <ThumbsUp size={13} />
            </button>
            <button
              onClick={() => handleFeedback("down")}
              className={`p-1.5 rounded-md transition-all ${feedback === "down" ? "text-red-600 dark:text-red-400 bg-red-500/15" : "text-gray-500 dark:text-gray-500 hover:text-red-400 hover:bg-gray-300 dark:hover:bg-white/10"}`}
              title="Not helpful"
            >
              <ThumbsDown size={13} />
            </button>
            <button
              onClick={handleReadAloud}
              className={`p-1.5 rounded-md transition-all ${isSpeaking ? "text-blue-600 dark:text-blue-400 bg-blue-500/15 animate-pulse" : "text-gray-500 dark:text-gray-500 hover:text-blue-400 hover:bg-gray-300 dark:hover:bg-white/10"}`}
              title={isSpeaking ? "Stop reading" : "Read aloud"}
            >
              <Volume2 size={13} />
            </button>
            {onRegenerate && (
              <button
                onClick={() => onRegenerate(msg.id)}
                className="p-1.5 rounded-md text-gray-500 dark:text-gray-500 hover:text-purple-400 hover:bg-gray-300 dark:hover:bg-white/10 transition-all"
                title="Regenerate response"
              >
                <RefreshCw size={13} />
              </button>
            )}
          </div>
        )}
        
        {msg.role === 'bot' && msg.sources && msg.sources.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2 px-4">
            {msg.sources.map((sourceItem: any, idx: number) => {
              const displayText = typeof sourceItem === 'string' 
                ? sourceItem 
                : `${sourceItem.source || 'Document'}${sourceItem.page ? ` (Page ${sourceItem.page})` : ''}`;
              
              return (
                <div key={idx} onClick={() => onSourceClick && onSourceClick(sourceItem)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/30 backdrop-blur-md border border-white/5 text-xs text-gray-700 dark:text-gray-300 shadow-sm cursor-pointer hover:bg-blue-500/20 hover:border-blue-500/40 transition-colors" title="Click to view PDF citation">
                  <FileIcon size={12} className="text-blue-600 dark:text-blue-400" />
                  {displayText}
                </div>
              );
            })}
          </div>
        )}

        {showTimestamps && (
          <div className={`px-2 mt-1 text-[10px] text-gray-500 dark:text-gray-500 uppercase tracking-wider font-semibold ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>

      {msg.role === 'user' && (
        user?.picture ? (
          <div className="w-8 h-8 relative shrink-0">
             <Image src={user.picture} alt="Profile" fill className="rounded-full shadow-md object-cover" unoptimized />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0">
            <User size={16} className="text-gray-700 dark:text-gray-300" />
          </div>
        )
      )}
    </motion.div>
  );
});

export default ChatMessage;

