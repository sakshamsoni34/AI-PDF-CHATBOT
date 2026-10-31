"use client";
import { Plus, Mic, ArrowUp, ChevronDown, Check, X, Sparkles, FileText, BrainCircuit, MessageCircleQuestion, ListChecks, BookOpen, BookText, Languages, Briefcase } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/ChatContext";
import { BACKEND_URL } from "@/lib/config";

interface ChatInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => void;
  onSubmit: () => void;
  onGenerateStudyMaterial: (docId: string, type: string) => void;
}

export default function ChatInput({ value, onChange, onSubmit, onGenerateStudyMaterial }: ChatInputProps) {
  const { user, openModal } = useAuth();
  const { activeDocuments, setActiveDocuments } = useChat();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [value]);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState("Flash");
  const [isUploading, setIsUploading] = useState(false);
  const [apiToast, setApiToast] = useState<string | null>(null);
  const [translateMode, setTranslateMode] = useState(false);
  const recognitionRef = useRef<any>(null);

  const showApiToast = (msg: string) => {
    setApiToast(msg);
    setTimeout(() => setApiToast(null), 3000);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      // @ts-expect-error SpeechRecognition is not standard
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        
        // @ts-expect-error event type is not standard
        recognition.onresult = (event) => {
          let transcript = "";
          for (let i = 0; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          // @ts-expect-error mocking the event object
          onChange({ target: { value: transcript } });
        };
        
        // @ts-expect-error event type is not standard
        recognition.onerror = (event) => {
          console.error("Speech recognition error", event.error);
          if (event.error === 'network') {
            alert("Speech recognition failed: Network error. Your browser might not be able to reach the speech service (some browsers like Brave block this by default, or you might be offline).");
          } else if (event.error === 'not-allowed') {
            alert("Speech recognition failed: Microphone access denied. Please allow microphone permissions in your browser settings.");
          } else {
            alert(`Speech recognition error: ${event.error}`);
          }
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };
        
        recognitionRef.current = recognition;
      }
    }
  }, [onChange]);

  const handlePlusClick = () => {
    if (!user) {
      openModal("login");
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append("files", file);
      });

      setIsUploading(true);
      try {
        const res = await fetch(`${BACKEND_URL}/upload`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${user?.token || ""}`
          },
          body: formData,
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.task_id) {
            // Poll for background task status
            let completed = false;
            while (!completed) {
              await new Promise(r => setTimeout(r, 2000)); // Poll every 2 seconds
              const statusRes = await fetch(`${BACKEND_URL}/upload/status/${data.task_id}`, {
                headers: { "Authorization": `Bearer ${user?.token || ""}` }
              });
              if (statusRes.ok) {
                const statusData = await statusRes.json();
                if (statusData.status === "completed") {
                  setActiveDocuments(prev => [...prev, ...statusData.documents]);
                  completed = true;
                } else if (statusData.status === "failed") {
                  console.error("Background upload failed:", statusData.error);
                  alert(`Upload failed: ${statusData.error}`);
                  completed = true;
                }
                // If "processing", loop continues
              } else {
                console.error("Failed to check upload status");
                completed = true;
              }
            }
          } else if (data.documents) {
            // Fallback just in case
            setActiveDocuments(prev => [...prev, ...data.documents]);
          }
        } else {
          console.error("Failed to upload PDF to Python server.");
        }
      } catch (err) {
        console.error(err);
        console.error("Could not connect to Python server. Is it running?");
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = ""; // Reset input so same files can be selected again
        }
      }
    }
  };

  const toggleMic = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in your browser.");
      return;
    }
    
    const recognition = recognitionRef.current;
    
    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      try {
        recognition.start();
        setIsListening(true);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey && value.trim()) {
      e.preventDefault();
      if (translateMode) {
        // append translate instruction before submitting
        onChange({ target: { value: value + " (Translate your response to Hindi)" } } as any);
        setTimeout(() => { onSubmit(); setTranslateMode(false); }, 50);
      } else {
        onSubmit();
      }
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-2 z-10 relative">
      
      {/* API Toast Notification */}
      {apiToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 px-4 py-2 rounded-full text-sm font-medium z-50 animate-in fade-in slide-in-from-top-4 flex items-center gap-2 shadow-lg backdrop-blur-md">
          <Check size={16} />
          {apiToast}
        </div>
      )}

      {/* Uploaded File Chips */}
      {activeDocuments.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-3 ml-4">
          {activeDocuments.map((doc) => (
            <div key={doc.id} className="relative flex items-center gap-2 bg-white dark:bg-[#282a2c] w-fit px-3 py-1.5 rounded-full border border-gray-200 dark:border-white/10 text-sm text-gray-800 dark:text-gray-200 shadow-sm animate-in fade-in slide-in-from-bottom-2">
              <div className="w-2 h-2 rounded-full bg-green-400"></div>
              <span className="truncate max-w-[200px]">{doc.name}</span>
              
              <button
                onClick={() => setActiveDropdown(activeDropdown === doc.id ? null : doc.id)}
                className="ml-1 text-purple-600 dark:text-purple-400 hover:text-purple-300 transition-colors p-1"
                title="Generate Study Material"
              >
                <Sparkles size={14} />
              </button>
              
              <button 
                onClick={() => setActiveDocuments(prev => prev.filter(d => d.id !== doc.id))}
                className="text-gray-600 dark:text-gray-400 hover:text-white transition-colors p-1"
                title="Remove document"
              >
                <X size={14} />
              </button>

              {/* Study Tools Dropdown */}
              {activeDropdown === doc.id && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-gray-50 dark:bg-[#1e1f20] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
                  <div className="p-1">
                    <button 
                      onClick={() => { onGenerateStudyMaterial(doc.id, "summary"); setActiveDropdown(null); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/5 rounded-lg transition-colors text-left"
                    >
                      <FileText size={14} /> Summary
                    </button>
                    <button 
                      onClick={() => { onGenerateStudyMaterial(doc.id, "quiz"); setActiveDropdown(null); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/5 rounded-lg transition-colors text-left"
                    >
                      <MessageCircleQuestion size={14} /> Quiz
                    </button>
                    <button 
                      onClick={() => { onGenerateStudyMaterial(doc.id, "flashcards"); setActiveDropdown(null); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/5 rounded-lg transition-colors text-left"
                    >
                      <BrainCircuit size={14} /> Flashcards
                    </button>
                    <button 
                      onClick={() => { onGenerateStudyMaterial(doc.id, "action_items"); setActiveDropdown(null); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/5 rounded-lg transition-colors text-left"
                    >
                      <ListChecks size={14} /> Action Items
                    </button>
                    <button 
                      onClick={() => { onGenerateStudyMaterial(doc.id, "interview"); setActiveDropdown(null); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/5 rounded-lg transition-colors text-left"
                    >
                      <Briefcase size={14} /> Interview Prep
                    </button>
                    <button 
                      onClick={() => { onGenerateStudyMaterial(doc.id, "study_guide"); setActiveDropdown(null); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/5 rounded-lg transition-colors text-left"
                    >
                      <BookOpen size={14} /> Study Guide
                    </button>
                    <button 
                      onClick={() => { onGenerateStudyMaterial(doc.id, "glossary"); setActiveDropdown(null); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/5 rounded-lg transition-colors text-left"
                    >
                      <BookText size={14} /> Glossary
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Uploading Indicator */}
      {isUploading && (
        <div className="flex items-center gap-2 mb-3 ml-4 text-sm text-blue-600 dark:text-blue-400 animate-pulse">
          Uploading and analyzing PDF...
        </div>
      )}

      <div className="relative flex items-end bg-[#1a1b23]/40 backdrop-blur-2xl rounded-[24px] px-2 py-2 shadow-lg border border-gray-200 dark:border-white/10 focus-within:border-white/30 transition-all min-h-[56px]">
        
        {/* Hidden file input */}
        <input 
          type="file" 
          accept=".pdf" 
          multiple
          ref={fileInputRef} 
          className="hidden" 
          onChange={handleFileChange}
        />

        {/* Plus Icon (opens file picker) */}
        <button 
          onClick={handlePlusClick}
          className="p-2 rounded-full hover:bg-gray-300 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 transition-colors shrink-0"
        >
          <Plus size={20} />
        </button>
        
        <textarea
          dir="ltr"
          ref={textareaRef}
          value={value}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          placeholder="Ask AI-PDF..."
          className="flex-1 bg-transparent border-none focus:outline-none text-gray-900 dark:text-white px-3 py-2.5 placeholder-gray-400 text-[15px] text-left resize-none overflow-y-auto min-h-[40px] max-h-[200px]"
          rows={1}
        />
        
        <div className="flex items-center gap-1 shrink-0 relative">

          
          {/* Translate Toggle */}
          <button 
            onClick={() => setTranslateMode(t => !t)}
            className={`p-2 rounded-full transition-colors ${
              translateMode ? 'bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/40' : 'hover:bg-gray-300 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400'
            }`}
            title={translateMode ? 'Translate ON — response will be in Hindi' : 'Toggle translate to Hindi'}
          >
            <Languages size={18} />
          </button>

          {/* Mic Button */}
          <button 
            onClick={toggleMic}
            className={`p-2 rounded-full transition-colors ${isListening ? 'bg-white/20 text-gray-900 dark:text-white' : 'hover:bg-gray-300 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300'}`}
          >
            <Mic size={20} />
          </button>
          
          <button 
            onClick={() => {
              if (translateMode) {
                onChange({ target: { value: value + " (Translate your response to Hindi)" } } as any);
                setTimeout(() => { onSubmit(); setTranslateMode(false); }, 50);
              } else {
                onSubmit();
              }
            }}
            disabled={!value.trim()}
            className={`p-2 rounded-full transition-all flex items-center justify-center ${value.trim() ? 'bg-white text-black hover:bg-gray-200' : 'bg-transparent text-white/30'}`}
          >
            <ArrowUp size={20} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
