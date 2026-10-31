"use client";
import { X, Trash2, Shield, HelpCircle, Mail, History, UserCircle, ExternalLink } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/ChatContext";

// Shared Modal Layout Component
function ModalWrapper({ isOpen, onClose, title, icon, children }: { isOpen: boolean, onClose: () => void, title: string, icon: React.ReactNode, children: React.ReactNode }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="relative bg-gray-50 dark:bg-[#1e1f20] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#1e1f20] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
              {icon}
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar text-gray-700 dark:text-gray-300">
          {children}
        </div>
      </div>
    </div>
  );
}


export function ChatHistoryModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { sessions, currentSessionId, switchSession, deleteSession } = useChat();
  const activeSessions = sessions.filter(s => s.messages.length > 0);

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Chat History" icon={<History size={20} />}>
      {activeSessions.length === 0 ? (
        <div className="text-center py-10 text-gray-600 dark:text-gray-400">
          <History size={48} className="mx-auto mb-4 opacity-30" />
          <p>No chat history available.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {activeSessions.map((session) => (
            <div 
              key={session.id} 
              className={`flex items-center justify-between p-3 rounded-xl border ${currentSessionId === session.id ? 'bg-blue-500/10 border-blue-500/30' : 'bg-white dark:bg-[#282a2c] border-white/5 hover:border-white/20'} transition-colors cursor-pointer`}
              onClick={() => { switchSession(session.id); onClose(); }}
            >
              <div className="truncate flex-1 pr-4">
                <p className={`font-medium truncate ${currentSessionId === session.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200'}`}>{session.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{session.messages.length} message{session.messages.length !== 1 && 's'}</p>
              </div>
              
              <button 
                onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                className="p-2 text-gray-500 dark:text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors shrink-0"
                title="Delete Chat"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </ModalWrapper>
  );
}


export function ProfileModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { user, logout } = useAuth();

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Profile Settings" icon={<UserCircle size={20} />}>
      {user ? (
        <div className="flex flex-col items-center">
          <div className="w-24 h-24 relative mb-4">
            <Image src={user.picture || '/default-avatar.png'} unoptimized alt="Profile" fill className="rounded-full object-cover border-4 border-[#282a2c] shadow-lg" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{(user as any).name || user.email.split('@')[0]}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-8">{user.email}</p>
          
          <div className="w-full bg-white dark:bg-[#282a2c] rounded-xl p-4 mb-6 border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Account Type</span>
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded uppercase tracking-wider">Free Plan</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Authentication</span>
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Google OAuth</span>
            </div>
          </div>

          <button 
            onClick={() => { logout(); onClose(); }}
            className="w-full py-3 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 font-medium hover:bg-red-500/20 transition-colors border border-red-500/20"
          >
            Sign Out
          </button>
        </div>
      ) : (
        <div className="text-center py-10 text-gray-600 dark:text-gray-400">
          <UserCircle size={48} className="mx-auto mb-4 opacity-30" />
          <p>You are not signed in.</p>
        </div>
      )}
    </ModalWrapper>
  );
}


export function HelpModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Help Centre" icon={<HelpCircle size={20} />}>
      <div className="space-y-6">
        <section>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">How to use AI PDF Chatbot</h3>
          <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400 mb-4">
            Welcome to your intelligent document assistant! Simply click the microphone or type in the chat box to ask questions. If you have uploaded a PDF, the AI will use it as context.
          </p>
          
          <div className="bg-white dark:bg-[#282a2c] rounded-xl p-4 border border-white/5 space-y-3">
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 font-bold text-sm">1</div>
              <p className="text-sm"><strong>Upload a PDF:</strong> Click the attachment icon in the chat input area to upload a document up to your allowed size limit.</p>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 font-bold text-sm">2</div>
              <p className="text-sm"><strong>Ask Questions:</strong> Ask the AI to summarize, extract data, or explain complex topics found within your document.</p>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 font-bold text-sm">3</div>
              <p className="text-sm"><strong>Save to Folders:</strong> Ask the AI to "create a folder" and save specific responses for later. You can download these folders as Markdown files.</p>
            </div>
          </div>
        </section>

        <section className="border-t border-gray-200 dark:border-white/10 pt-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Need more assistance?</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">If you are encountering errors or need support, feel free to contact us.</p>
          <a 
            href="mailto:support@aipdfchatbot.com?subject=Support Request"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-300 dark:bg-white/10 hover:bg-white/20 transition-colors rounded-lg text-sm font-medium text-gray-900 dark:text-white"
          >
            <Mail size={16} />
            Contact Support
          </a>
        </section>
      </div>
    </ModalWrapper>
  );
}


export function PrivacyModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Privacy Policy" icon={<Shield size={20} />}>
      <div className="space-y-4 text-sm leading-relaxed">
        <p>
          Your privacy and the security of your documents are our highest priority.
        </p>
        
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6 mb-2">1. Data Storage and Processing</h3>
        <p>
          We temporarily process your uploaded PDF documents solely for the purpose of answering your queries. We do not store your documents permanently on our servers after your session expires, unless explicitly requested for features like "Saved Folders".
        </p>

        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6 mb-2">2. AI Training</h3>
        <div className="bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 rounded-lg p-3 my-2">
          <strong>Strictly No Training:</strong> Your private documents and chat histories are <strong>never</strong> used to train our AI models or third-party foundational models.
        </div>
        
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6 mb-2">3. Authentication Data</h3>
        <p>
          We use Google OAuth for secure login. We only access your basic profile information (Name, Email, Profile Picture) to personalize your experience. We do not have access to your Google Drive or other Google services.
        </p>

        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6 mb-2">4. Third-Party Services</h3>
        <p>
          The queries you send, along with necessary document context, may be sent to our AI providers (e.g., Google Gemini) via secure API calls to generate responses. These providers are bound by strict enterprise data agreements not to retain or use this data for training.
        </p>

        <div className="mt-8 pt-4 border-t border-gray-200 dark:border-white/10 text-xs text-gray-500 dark:text-gray-500">
          Last updated: July 2026
        </div>
      </div>
    </ModalWrapper>
  );
}
