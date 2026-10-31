"use client";
import { X, Download, FolderOpen, Trash2 } from "lucide-react";
import { useChat } from "@/context/ChatContext";
import { useEffect } from "react";
import { BACKEND_URL } from "@/lib/config";

interface FoldersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FoldersModal({ isOpen, onClose }: FoldersModalProps) {
  const { folders, setFolders, deleteFolder } = useChat();

  useEffect(() => {
    if (isOpen) {
      fetch(`${BACKEND_URL}/folders`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.folders) {
            setFolders(data.folders);
          }
        }).catch(err => console.warn("Failed to load folders", err));
    }
  }, [isOpen, setFolders]);

  if (!isOpen) return null;

  const handleDownload = (folderName: string) => {
    const contentArray = folders[folderName];
    if (!contentArray) return;
    
    // Join the array of contents with a separator
    const textContent = contentArray.join("\n\n---\n\n");
    
    // Create a blob and trigger download
    const blob = new Blob([textContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${folderName.replace(/\s+/g, '_')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const folderEntries = Object.entries(folders);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="relative bg-gray-50 dark:bg-[#1e1f20] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#1e1f20] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <FolderOpen size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Your Folders</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Manage and download your saved AI notes</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {folderEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-600 dark:text-gray-400">
              <FolderOpen size={48} className="mb-4 opacity-50" />
              <p>No folders yet.</p>
              <p className="text-sm mt-2 text-center max-w-xs">Ask the AI to "create a folder named X and save these details" to get started!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {folderEntries.map(([name, contents]) => (
                <div key={name} className="bg-white dark:bg-[#282a2c] border border-white/5 rounded-xl p-4 flex flex-col hover:border-blue-500/30 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate pr-2 flex-1">{name}</h3>
                    <span className="text-xs bg-gray-300 dark:bg-white/10 px-2 py-1 rounded-full text-gray-700 dark:text-gray-300 font-medium shrink-0">
                      {contents.length} item{contents.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4 flex-1">
                    {contents[contents.length - 1] || "Empty folder"}
                  </p>
                  <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/5">
                    <button 
                      onClick={() => deleteFolder(name)}
                      className="p-1.5 text-gray-500 dark:text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                      title="Delete Folder"
                    >
                      <Trash2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDownload(name)}
                      className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-300 transition-colors font-medium px-3 py-1.5 hover:bg-blue-500/10 rounded-lg"
                    >
                      <Download size={16} />
                      Download .md
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
