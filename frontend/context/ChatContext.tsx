"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { BACKEND_URL } from "@/lib/config";

export type Message = {
  id: string;
  role: "user" | "bot";
  text: string;
  images?: string[];
  sources?: string[];
  attachedFile?: string;
};

export type ChatSession = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
};

interface ChatContextType {
  sessions: ChatSession[];
  currentSessionId: string | null;
  createNewSession: () => void;
  switchSession: (id: string) => void;
  addMessage: (message: Message, sessionId?: string) => string;
  updateSessionTitle: (id: string, title: string) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  truncateMessages: (id: string) => void;
  deleteSession: (id: string) => void;
  activeDocuments: {id: string, name: string}[];
  setActiveDocuments: React.Dispatch<React.SetStateAction<{id: string, name: string}[]>>;
  currentMessages: Message[];
  folders: Record<string, string[]>;
  setFolders: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  saveToFolder: (folderName: string, content: string) => void;
  deleteFolder: (folderName: string) => void;
  clearSessionMessages: (id: string) => void;
  showTimestamps: boolean;
  setShowTimestamps: React.Dispatch<React.SetStateAction<boolean>>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [folders, setFolders] = useState<Record<string, string[]>>({});
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [activeDocuments, setActiveDocuments] = useState<{id: string, name: string}[]>([]);
  const [showTimestamps, setShowTimestamps] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load initial active documents from localStorage on mount (prevents hydration mismatch)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('active_documents');
      if (stored) {
        setActiveDocuments(JSON.parse(stored));
      }
    } catch {}
  }, []);

  // Load sessions from Supabase when user changes
  useEffect(() => {
    if (user && user.token) {
      // Fetch user's chat sessions from backend database
      fetch(`${BACKEND_URL}/sessions`, {
        headers: { "Authorization": `Bearer ${user.token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.sessions) {
            const mapped = data.sessions.map((s: any) => ({
              id: s.id,
              title: s.title,
              createdAt: s.createdAt,
              messages: []
            }));

            
            // Always show a new chat on login instead of the old one
            const newSessionId = Date.now().toString();
            const newSession = {
              id: newSessionId,
              title: "New Chat",
              createdAt: Date.now(),
              messages: []
            };
            setSessions([newSession, ...mapped]);
            setCurrentSessionId(newSessionId);
            
            // Clear active documents for the new chat
            setActiveDocuments([]);
          }
        })
        .catch(err => console.warn("Failed to load sessions from DB", err));

      // We no longer automatically activate all past documents on login.
      // The Library modal can be used if they need to see past documents.

      fetch(`${BACKEND_URL}/folders`, {
        headers: { "Authorization": `Bearer ${user.token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.folders) {
            setFolders(data.folders);
          }
        }).catch(err => console.warn("Failed to load folders", err));

      const storedFolders = localStorage.getItem(`chat_folders_${user.email}`);
      if (storedFolders) {
        try {
          setFolders(JSON.parse(storedFolders));
        } catch (e) {}
      }
    } else {
      setSessions([]);
      setFolders({});
      setActiveDocuments([]);
      setCurrentSessionId(null);
    }
    setIsLoaded(true);
  }, [user]);

  // Load message history for the active session from Supabase
  useEffect(() => {
    if (user && user.token && currentSessionId) {
      fetch(`${BACKEND_URL}/history/${currentSessionId}`, {
        headers: { "Authorization": `Bearer ${user.token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.messages) {
            setSessions(prev => prev.map(s => {
              if (s.id === currentSessionId) {
                return { ...s, messages: data.messages };
              }
              return s;
            }));
          }
        })
        .catch(err => console.warn("Failed to load session history from DB", err));
    }
  }, [currentSessionId, user]);

  // Save folders and currentSessionId to local storage
  useEffect(() => {
    if (isLoaded && user) {
      localStorage.setItem(`chat_folders_${user.email}`, JSON.stringify(folders));
      if (currentSessionId) {
        localStorage.setItem(`current_session_${user.email}`, currentSessionId);
      } else {
        localStorage.removeItem(`current_session_${user.email}`);
      }
    }
  }, [folders, currentSessionId, user, isLoaded]);

  // Persist activeDocuments to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('active_documents', JSON.stringify(activeDocuments));
    } catch {}
  }, [activeDocuments]);

  const createNewSession = () => {
    // If the current session is already empty, don't create a new one
    const currentSession = sessions.find((s) => s.id === currentSessionId);
    if (currentSession && currentSession.messages.length === 0) {
      return;
    }


    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: "New Chat",
      messages: [],
      createdAt: Date.now(),
    };
    setSessions((prev) => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setActiveDocuments([]);
  };

  const switchSession = (id: string) => {
    setCurrentSessionId(id);
    setActiveDocuments([]);
  };

  const deleteSession = (id: string) => {
    setSessions((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      if (currentSessionId === id) {
        setCurrentSessionId(null);
      }
      return updated;
    });
    
    // Delete from backend DB as well
    if (user && user.token) {
      fetch(`${BACKEND_URL}/history/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${user.token}` }
      }).catch(err => console.warn("Failed to delete session from DB", err));
    }
  };

  const addMessage = (message: Message, sessionId?: string) => {
    const targetSessionId = sessionId || currentSessionId;
    
    // If no active session, implicitly create one
    if (!targetSessionId) {
      const newSessionId = Date.now().toString();
      const newSession: ChatSession = {
        id: newSessionId,
        title: message.role === "user" ? message.text.slice(0, 30) + (message.text.length > 30 ? "..." : "") : "New Chat",
        messages: [message],
        createdAt: Date.now(),
      };
      setSessions((prev) => [newSession, ...prev]);
      setCurrentSessionId(newSessionId);
      return newSessionId;
    }

    setSessions((prev) => 
      prev.map((session) => {
        if (session.id === targetSessionId) {
          // Auto-update title on first user message
          let title = session.title;
          if (session.messages.length === 0 && message.role === "user") {
            title = message.text.slice(0, 30) + (message.text.length > 30 ? "..." : "");
          }
          return {
            ...session,
            title,
            messages: [...session.messages, message]
          };
        }
        return session;
      })
    );
    return targetSessionId;
  };

  const updateSessionTitle = (id: string, title: string) => {
    setSessions((prev) => 
      prev.map((session) => (session.id === id ? { ...session, title } : session))
    );
  };

  const updateMessage = (id: string, updates: Partial<Message>) => {
    setSessions((prev) => 
      prev.map((session) => {
        if (session.id === currentSessionId) {
          return {
            ...session,
            messages: session.messages.map((m) => (m.id === id ? { ...m, ...updates } : m)),
          };
        }
        return session;
      })
    );
  };

  const truncateMessages = (messageId: string) => {
    setSessions((prev) => 
      prev.map((session) => {
        if (session.id === currentSessionId) {
          const index = session.messages.findIndex((m) => m.id === messageId);
          if (index !== -1) {
            return {
              ...session,
              messages: session.messages.slice(0, index),
            };
          }
        }
        return session;
      })
    );
  };

  const clearSessionMessages = (id: string) => {
    setSessions((prev) => 
      prev.map((session) => {
        if (session.id === id) {
          return {
            ...session,
            messages: [],
          };
        }
        return session;
      })
    );
  };

  const currentMessages = sessions.find((s) => s.id === currentSessionId)?.messages || [];

  const saveToFolder = (folderName: string, content: string) => {
    setFolders((prev) => {
      const existing = prev[folderName] || [];
      return { ...prev, [folderName]: [...existing, content] };
    });
    
    // Save to backend API
    fetch(`${BACKEND_URL}/folders`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${user?.token || ""}` 
      },
      body: JSON.stringify({ name: folderName, content })
    }).catch(err => console.error("Failed to save folder to API", err));
  };

  const deleteFolder = (folderName: string) => {
    setFolders((prev) => {
      const newFolders = { ...prev };
      delete newFolders[folderName];
      return newFolders;
    });

    if (user?.token) {
      fetch(`${BACKEND_URL}/folders/${encodeURIComponent(folderName)}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${user.token}` }
      }).catch(err => console.error("Failed to delete folder from API", err));
    }
  };

  return (
    <ChatContext.Provider
      value={{
        sessions,
        currentSessionId,
        createNewSession,
        switchSession,
        addMessage,
        updateSessionTitle,
        updateMessage,
        truncateMessages,
        deleteSession,
        activeDocuments,
        setActiveDocuments,
        currentMessages,
        folders,
        setFolders,
        saveToFolder,
        deleteFolder,
        clearSessionMessages,
        showTimestamps,
        setShowTimestamps,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
