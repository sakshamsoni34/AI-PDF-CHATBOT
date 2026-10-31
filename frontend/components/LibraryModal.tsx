"use client";
import { X, Library, FileText, Download } from "lucide-react";
import { useChat } from "@/context/ChatContext";
import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";
import { BACKEND_URL } from "@/lib/config";

interface LibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LibraryModal({ isOpen, onClose }: LibraryModalProps) {
  const { activeDocuments, setActiveDocuments } = useChat();
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen && user?.token) {
      fetch(`${BACKEND_URL}/documents`, {
        headers: { "Authorization": `Bearer ${user.token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.documents) {
            setActiveDocuments(data.documents);
          }
        }).catch(err => console.warn("Failed to load documents", err));
    }
  }, [isOpen, setActiveDocuments, user]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div 
        className="bg-white dark:bg-[#1a1b23] border border-gray-200 dark:border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-white/10">
          <div className="flex items-center gap-3">
            <Library className="text-gray-600 dark:text-gray-400" size={24} />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Document Library</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-300 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-5 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {activeDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-white/5 flex items-center justify-center mb-4">
                <FileText className="text-gray-500 dark:text-gray-500" size={32} />
              </div>
              <h3 className="text-gray-900 dark:text-white font-medium mb-2">No documents yet</h3>
              <p className="text-gray-500 dark:text-gray-500 text-sm max-w-[250px]">
                Upload PDFs in the chat area to see them appear in your library.
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {activeDocuments.map((doc, idx) => (
                <div key={doc.id} className="flex items-center justify-between p-4 rounded-xl bg-gray-200 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-white/20 transition-colors">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                      <FileText className="text-red-600 dark:text-red-400" size={20} />
                    </div>
                    <div className="truncate">
                      <h4 className="text-gray-900 dark:text-white font-medium text-sm truncate">{doc.name}</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">PDF Document • Uploaded just now</p>
                    </div>
                  </div>
                  
                  <button className="p-2 rounded-lg hover:bg-gray-300 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400 hover:text-white transition-colors">
                    <Download size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-gray-200 dark:border-white/10 bg-gray-200 dark:bg-white/5 flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-gray-900 dark:text-white rounded-lg transition-colors font-medium text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
