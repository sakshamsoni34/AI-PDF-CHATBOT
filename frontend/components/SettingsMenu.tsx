import React, { useRef, useEffect, useState } from "react";
import { 
  History, 
  BrainCircuit, 
  UploadCloud, 
  UserCircle, 
  Database, 
  Clock, 
  Sparkles, 
  Link, 
  Sun, 
  CreditCard, 
  Star, 
  FileOutput, 
  MessageSquare, 
  HelpCircle,
  ChevronRight,
  Shield,
  Settings
} from "lucide-react";

interface SettingsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenChatHistory: () => void;
  onOpenProfile: () => void;
  onOpenHelp: () => void;
  onOpenPrivacy: () => void;
  onOpenPreferences?: () => void;
}

export default function SettingsMenu({ 
  isOpen, 
  onClose, 
  onOpenChatHistory, 
  onOpenProfile, 
  onOpenHelp, 
  onOpenPrivacy,
  onOpenPreferences
}: SettingsMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [showHelpSubmenu, setShowHelpSubmenu] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      ref={menuRef}
      className="absolute bottom-16 left-3 w-[280px] bg-black/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 py-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200"
    >
      <div className="flex flex-col text-sm text-gray-800 dark:text-gray-200">
        
        <MenuItem 
          icon={<History size={18} />} 
          label="Chat History" 
          onClick={() => { onClose(); onOpenChatHistory(); }} 
        />
        <MenuItem 
          icon={<Settings size={18} />} 
          label="Preferences" 
          onClick={() => { onClose(); onOpenPreferences?.(); }} 
        />
        <MenuItem 
          icon={<UserCircle size={18} />} 
          label="Profile Settings" 
          onClick={() => { onClose(); onOpenProfile(); }} 
        />
        
        <div className="h-[1px] bg-gray-300 dark:bg-white/10 my-1 mx-2" />
        
        <MenuItem 
          icon={<MessageSquare size={18} />} 
          label="Send Feedback" 
          onClick={() => {
            window.location.href = "mailto:support@aipdfchatbot.com?subject=Feedback for AI PDF Chatbot";
            onClose();
          }}
        />
        
        {/* Help Menu with Submenu functionality */}
        <div className="relative group">
          <button 
            onClick={(e) => { e.stopPropagation(); setShowHelpSubmenu(!showHelpSubmenu); }}
            className="flex items-center justify-between w-full px-4 py-2.5 hover:bg-[#333333] transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <HelpCircle size={18} className="text-gray-600 dark:text-gray-400" />
              <span>Help</span>
            </div>
            <ChevronRight size={16} className={`text-gray-500 dark:text-gray-500 transition-transform ${showHelpSubmenu ? 'rotate-90' : ''}`} />
          </button>
          
          {/* Submenu */}
          {showHelpSubmenu && (
            <div className="absolute left-[100%] bottom-0 ml-2 w-[200px] bg-black/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 py-2">
              <MenuItem 
                icon={<HelpCircle size={18} />} 
                label="Help Centre" 
                onClick={() => { setShowHelpSubmenu(false); onClose(); onOpenHelp(); }}
              />
              <MenuItem 
                icon={<Shield size={18} />} 
                label="Privacy" 
                onClick={() => { setShowHelpSubmenu(false); onClose(); onOpenPrivacy(); }}
              />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

function MenuItem({ icon, label, badge, rightIcon, onClick }: { icon: React.ReactNode, label: string, badge?: string, rightIcon?: React.ReactNode, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="flex items-center justify-between w-full px-4 py-2.5 hover:bg-[#333333] transition-colors text-left group cursor-pointer"
    >
      <div className="flex items-center gap-3">
        <span className="text-gray-600 dark:text-gray-400 group-hover:text-gray-200 transition-colors">{icon}</span>
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {badge && (
          <span className="bg-gray-300 dark:bg-white/10 text-gray-900 dark:text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">
            {badge}
          </span>
        )}
        {rightIcon}
      </div>
    </button>
  );
}
