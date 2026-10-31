"use client";
import {
  Search, Settings, SquarePen, FolderClosed, Image as ImageIcon,
  Menu, X, Pin, PinOff, Download, Edit2, Check, Trash2,
  FileText, Sparkles, BarChart2, MessageSquare, FileStack,
  ChevronDown, ChevronRight
} from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/ChatContext";
import { useState, useRef, useEffect } from "react";
import SettingsMenu from "./SettingsMenu";
import FoldersModal from "./FoldersModal";
import { ChatHistoryModal, ProfileModal, HelpModal, PrivacyModal } from "./SettingsModals";
import SearchModal from "./SearchModal";
import LibraryModal from "./LibraryModal";
import SettingsModal from "./SettingsModal";

export default function Sidebar() {
  const { user } = useAuth();
  const {
    sessions, currentSessionId, createNewSession, switchSession,
    deleteSession, updateSessionTitle, activeDocuments, setActiveDocuments,
  } = useChat();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFoldersOpen, setIsFoldersOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; sessionId: string } | null>(null);
  const [pinnedIds, setPinnedIds] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try { return JSON.parse(localStorage.getItem("pinned_sessions") || "[]"); } catch { return []; }
    }
    return [];
  });
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [isDocsOpen, setIsDocsOpen] = useState(true);
  const [docDropdown, setDocDropdown] = useState<string | null>(null);

  const [isChatHistoryOpen, setIsChatHistoryOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);

  const activeSessions = sessions.filter(s => s.messages.length > 0);
  const pinnedSessions = activeSessions.filter(s => pinnedIds.includes(s.id));
  const unpinnedSessions = activeSessions.filter(s => !pinnedIds.includes(s.id));
  const totalMessages = sessions.reduce((sum, s) => sum + s.messages.length, 0);
  const totalDocs = activeDocuments.length;
  const isShow = isExpanded || isMobileOpen;

  useEffect(() => { localStorage.setItem("pinned_sessions", JSON.stringify(pinnedIds)); }, [pinnedIds]);
  useEffect(() => { if (renamingId) renameInputRef.current?.focus(); }, [renamingId]);

  const togglePin = (id: string) => setPinnedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const startRename = (id: string, title: string) => { setRenamingId(id); setRenameValue(title); setContextMenu(null); };

  const commitRename = () => {
    if (renamingId && renameValue.trim() && updateSessionTitle) updateSessionTitle(renamingId, renameValue.trim());
    setRenamingId(null);
  };

  const exportSession = (id: string) => {
    const session = sessions.find(s => s.id === id);
    if (!session) return;
    let md = "# " + session.title + "\n_Exported: " + new Date().toLocaleString() + "_\n\n---\n\n";
    session.messages.forEach(m => { md += "**" + (m.role === "user" ? "You" : "AI") + ":**\n" + m.text + "\n\n---\n\n"; });
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = session.title.replace(/\s+/g, "-") + ".md";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url); setContextMenu(null);
  };

  const SessionRow = ({ session }: { session: typeof sessions[0] }) => {
    const isPinned = pinnedIds.includes(session.id);
    const isActive = currentSessionId === session.id;
    const isRenaming = renamingId === session.id;
    return (
      <div className={"group/row relative flex items-center rounded-lg transition-all pr-1 " + (isActive ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-gray-200 dark:border-white/10 shadow-sm" : "hover:bg-gray-200 dark:hover:bg-white/5")}>
        {isRenaming ? (
          <div className="flex items-center gap-1 w-full px-2 py-1.5">
            <input ref={renameInputRef} value={renameValue} onChange={e => setRenameValue(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setRenamingId(null); }}
              onBlur={commitRename}
              className="flex-1 bg-gray-300 dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-md px-2 py-0.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 min-w-0" />
            <button onClick={commitRename} className="p-0.5 text-green-600 dark:text-green-400 shrink-0"><Check size={13} /></button>
            <button onClick={() => setRenamingId(null)} className="p-0.5 text-gray-500 dark:text-gray-500 shrink-0"><X size={13} /></button>
          </div>
        ) : (
          <>
            <button onClick={() => { switchSession(session.id); setIsMobileOpen(false); }}
              onDoubleClick={() => startRename(session.id, session.title)}
              onContextMenu={e => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, sessionId: session.id }); }}
              className={"flex-1 py-2 px-3 text-left truncate text-[13px] leading-relaxed min-w-0 " + (isActive ? "text-blue-300" : "text-gray-600 dark:text-gray-400 hover:text-gray-200")}
              title={session.title + " (Double-click to rename)"}>
              {isPinned && <span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-400 mr-1.5 mb-0.5 shrink-0" />}
              {session.title}
            </button>
            <div className="flex items-center gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity shrink-0">
              <button onClick={() => togglePin(session.id)} className={"p-1 rounded transition-colors " + (isPinned ? "text-yellow-400" : "text-gray-600 hover:text-yellow-400")} title={isPinned ? "Unpin" : "Pin"}>
                {isPinned ? <PinOff size={11} /> : <Pin size={11} />}
              </button>
              <button onClick={() => startRename(session.id, session.title)} className="p-1 rounded text-gray-600 hover:text-blue-400 transition-colors" title="Rename"><Edit2 size={11} /></button>
              <button onClick={() => exportSession(session.id)} className="p-1 rounded text-gray-600 hover:text-green-400 transition-colors" title="Export .md"><Download size={11} /></button>
              <button onClick={() => deleteSession(session.id)} className="p-1 rounded text-gray-600 hover:text-red-400 transition-colors" title="Delete"><Trash2 size={11} /></button>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <>
      <button onClick={() => setIsMobileOpen(!isMobileOpen)} className="md:hidden absolute top-4 left-4 z-50 p-2 rounded-full bg-white dark:bg-[#282a2c] text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-white/10">
        {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>
      {isMobileOpen && <div className="md:hidden fixed inset-0 bg-black/40 dark:bg-black/60 z-40 backdrop-blur-sm" onClick={() => setIsMobileOpen(false)} />}

      <div
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => { setIsExpanded(false); setDocDropdown(null); setContextMenu(null); }}
        className={"flex-shrink-0 bg-[#080912]/90 backdrop-blur-xl h-full flex flex-col py-4 border-r border-gray-200 dark:border-white/10 transition-all duration-300 ease-in-out relative z-40 shadow-[10px_0_30px_rgba(0,0,0,0.5)] " + (isShow ? "w-[260px] px-3 items-stretch" : "w-[68px] items-center") + " " + (isMobileOpen ? "fixed left-0 top-0 bottom-0 translate-x-0 !w-[260px] px-3 !items-stretch" : "fixed -translate-x-full md:relative md:translate-x-0")}
      >
        <div className={"flex flex-col gap-1 w-full " + (!isShow ? "items-center" : "")}>
          <div className={"flex items-center gap-3 px-2.5 py-2 mb-2 " + (!isShow ? "justify-center" : "")}>
            <div className="w-8 h-8 relative shrink-0"><Image src="/logo.png" alt="Logo" fill className="object-contain" /></div>
            {isShow && <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 truncate tracking-wide">AI PDF CHATBOT</span>}
          </div>

          <button onClick={() => { createNewSession(); setIsMobileOpen(false); }}
            className={"flex items-center gap-3 p-2.5 rounded-full hover:bg-gray-300 dark:hover:bg-white/10 transition-colors group text-gray-700 dark:text-gray-300 hover:text-white " + (!isShow ? "justify-center" : "")} title="New Chat">
            <SquarePen size={22} className="shrink-0 group-hover:text-blue-400 transition-colors" />
            {isShow && <span className="font-medium truncate">New Chat</span>}
          </button>

          {!isShow && (
            <>
              <button onClick={() => setIsSearchOpen(true)} className="p-2.5 rounded-full hover:bg-gray-300 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400 hover:text-gray-200 mt-1" title="Search"><Search size={22} /></button>
              <button onClick={() => setIsFoldersOpen(true)} className="p-2.5 rounded-full hover:bg-gray-300 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400 hover:text-gray-200" title="Folders"><FolderClosed size={22} /></button>
              <button onClick={() => setIsLibraryOpen(true)} className="p-2.5 rounded-full hover:bg-gray-300 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400 hover:text-gray-200" title="Library"><ImageIcon size={22} /></button>
              <button className="p-2.5 rounded-full hover:bg-gray-300 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400 hover:text-gray-200 relative" title={"Documents " + totalDocs}>
                <FileStack size={22} />
                {totalDocs > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 text-gray-900 dark:text-white text-[8px] flex items-center justify-center">{totalDocs}</span>}
              </button>
              {pinnedSessions.length > 0 && <div className="mt-2 w-4 h-px bg-gray-300 dark:bg-white/10 mx-auto" />}
              {pinnedSessions.map(s => (
                <button key={s.id} onClick={() => switchSession(s.id)} title={s.title}
                  className={"w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold transition-all " + (currentSessionId === s.id ? "bg-blue-500/30 text-blue-300 ring-1 ring-blue-500/50" : "bg-gray-200 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-white/10")}>
                  {s.title.charAt(0).toUpperCase()}
                </button>
              ))}
            </>
          )}

          {isShow && (
            <div className="flex flex-col gap-1 mt-1 overflow-y-auto flex-1 custom-scrollbar pr-0.5" style={{ maxHeight: "calc(100vh - 230px)" }}>
              <button onClick={() => { setIsSearchOpen(true); setIsMobileOpen(false); }} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-300 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400 hover:text-gray-200 transition-colors group">
                <Search size={20} className="shrink-0 group-hover:text-blue-400" /><span className="text-sm font-medium">Search</span>
              </button>
              <button onClick={() => { setIsFoldersOpen(true); setIsMobileOpen(false); }} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-300 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400 hover:text-gray-200 transition-colors group">
                <FolderClosed size={20} className="shrink-0 group-hover:text-blue-400" /><span className="text-sm font-medium">Folders</span>
              </button>
              <button onClick={() => { setIsLibraryOpen(true); setIsMobileOpen(false); }} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-300 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400 hover:text-gray-200 transition-colors group">
                <ImageIcon size={20} className="shrink-0 group-hover:text-blue-400" /><span className="text-sm font-medium">Library</span>
              </button>

              <div className="mt-4">
                <button onClick={() => setIsDocsOpen(o => !o)} className="w-full flex items-center gap-2 px-3 mb-2 text-[11px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-500 hover:text-gray-300 transition-colors">
                  {isDocsOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  <FileStack size={12} /><span>Documents</span>
                  {totalDocs > 0 && <span className="ml-auto bg-green-500/20 text-green-600 dark:text-green-400 text-[10px] rounded-full px-1.5 py-0.5">{totalDocs}</span>}
                </button>
                {isDocsOpen && (
                  <div className="flex flex-col gap-1">
                    {activeDocuments.length === 0 ? (
                      <p className="text-[12px] text-gray-600 px-3 py-1 italic">No documents uploaded yet.</p>
                    ) : activeDocuments.map(doc => (
                      <div key={doc.id} className="group/doc relative flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/5 transition-colors">
                        <div className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                        <span className="text-[12px] text-gray-700 dark:text-gray-300 truncate flex-1">{doc.name}</span>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover/doc:opacity-100 transition-opacity shrink-0">
                          <div className="relative">
                            <button onClick={() => setDocDropdown(docDropdown === doc.id ? null : doc.id)} className="p-1 rounded text-purple-600 dark:text-purple-400 hover:text-purple-300" title="Generate study material"><Sparkles size={11} /></button>
                            {docDropdown === doc.id && (
                              <div className="absolute left-full top-0 ml-1 w-40 bg-gray-50 dark:bg-[#1e1f20] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
                                {["summary","quiz","flashcards","interview","action_items","study_guide","glossary"].map(type => (
                                  <button key={type} onClick={() => { window.dispatchEvent(new CustomEvent("sidebar:generate", { detail: { docId: doc.id, type } })); setDocDropdown(null); }}
                                    className="w-full text-left px-3 py-1.5 text-[12px] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/5 capitalize transition-colors">
                                    {type.replace(/_/g, " ")}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <button onClick={() => setActiveDocuments(prev => prev.filter(d => d.id !== doc.id))} className="p-1 rounded text-gray-600 hover:text-red-400 transition-colors" title="Remove"><X size={11} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {pinnedSessions.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center gap-1.5 px-3 mb-2 text-[11px] uppercase tracking-wider font-semibold text-yellow-500/70">
                    <Pin size={11} /><span>Pinned</span>
                  </div>
                  <div className="flex flex-col gap-0.5">{pinnedSessions.map(s => <SessionRow key={s.id} session={s} />)}</div>
                </div>
              )}

              {unpinnedSessions.length > 0 && (
                <div className="mt-4">
                  <h3 className="px-3 text-[11px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-500 mb-2">Recents</h3>
                  <div className="flex flex-col gap-0.5">{unpinnedSessions.map(s => <SessionRow key={s.id} session={s} />)}</div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className={"mt-auto flex flex-col gap-1 w-full relative pb-1 " + (!isShow ? "items-center" : "")}>
          {isShow && (
            <div className="flex items-center justify-around px-2 py-2 mb-2 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="flex flex-col items-center gap-0.5">
                <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400"><MessageSquare size={12} /><span className="text-[11px] font-bold">{activeSessions.length}</span></div>
                <span className="text-[9px] text-gray-600 uppercase tracking-wide">Chats</span>
              </div>
              <div className="w-px h-6 bg-gray-300 dark:bg-white/10" />
              <div className="flex flex-col items-center gap-0.5">
                <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400"><BarChart2 size={12} /><span className="text-[11px] font-bold">{totalMessages}</span></div>
                <span className="text-[9px] text-gray-600 uppercase tracking-wide">Messages</span>
              </div>
              <div className="w-px h-6 bg-gray-300 dark:bg-white/10" />
              <div className="flex flex-col items-center gap-0.5">
                <div className="flex items-center gap-1 text-green-600 dark:text-green-400"><FileText size={12} /><span className="text-[11px] font-bold">{totalDocs}</span></div>
                <span className="text-[9px] text-gray-600 uppercase tracking-wide">Docs</span>
              </div>
            </div>
          )}
          <button onClick={() => setIsSettingsOpen(true)} className={"flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-200 dark:hover:bg-white/5 transition-colors text-gray-600 dark:text-gray-400 hover:text-gray-200 " + (!isShow ? "rounded-full justify-center" : "")} title="Settings">
            <Settings size={22} className="shrink-0" />
            {isShow && <span className="text-sm font-medium">Settings</span>}
          </button>
          <SettingsMenu isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)}
            onOpenChatHistory={() => setIsChatHistoryOpen(true)} onOpenProfile={() => setIsProfileOpen(true)}
            onOpenHelp={() => setIsHelpOpen(true)} onOpenPrivacy={() => setIsPrivacyOpen(true)}
            onOpenPreferences={() => setIsPreferencesOpen(true)} />
        </div>

        {contextMenu && (
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setContextMenu(null)} onContextMenu={e => { e.preventDefault(); setContextMenu(null); }} />
            <div className="fixed z-[70] bg-[#1e1f2a] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl py-1.5 w-44 animate-in fade-in zoom-in-95 duration-100" style={{ top: contextMenu.y, left: contextMenu.x }}>
              <div className="px-3 py-1 mb-1 border-b border-white/5">
                <p className="text-[10px] text-gray-500 dark:text-gray-500 uppercase tracking-wider font-semibold truncate">{sessions.find(s => s.id === contextMenu.sessionId)?.title?.slice(0,22)}</p>
              </div>
              <button className="w-full text-left px-3 py-2 hover:bg-gray-200 dark:hover:bg-white/5 text-sm text-yellow-400 flex items-center gap-2" onClick={() => { togglePin(contextMenu.sessionId); setContextMenu(null); }}>
                {pinnedIds.includes(contextMenu.sessionId) ? <><PinOff size={14} /> Unpin</> : <><Pin size={14} /> Pin to top</>}
              </button>
              <button className="w-full text-left px-3 py-2 hover:bg-gray-200 dark:hover:bg-white/5 text-sm text-blue-600 dark:text-blue-400 flex items-center gap-2" onClick={() => { const s = sessions.find(x => x.id === contextMenu.sessionId); if (s) startRename(s.id, s.title); }}>
                <Edit2 size={14} /> Rename
              </button>
              <button className="w-full text-left px-3 py-2 hover:bg-gray-200 dark:hover:bg-white/5 text-sm text-green-600 dark:text-green-400 flex items-center gap-2" onClick={() => exportSession(contextMenu.sessionId)}>
                <Download size={14} /> Export .md
              </button>
              <div className="h-px bg-gray-200 dark:bg-white/5 my-1" />
              <button className="w-full text-left px-3 py-2 hover:bg-gray-200 dark:hover:bg-white/5 text-sm text-red-600 dark:text-red-400 flex items-center gap-2" onClick={() => { deleteSession(contextMenu.sessionId); setContextMenu(null); }}>
                <Trash2 size={14} /> Delete Chat
              </button>
            </div>
          </>
        )}
      </div>

      <FoldersModal isOpen={isFoldersOpen} onClose={() => setIsFoldersOpen(false)} />
      <ChatHistoryModal isOpen={isChatHistoryOpen} onClose={() => setIsChatHistoryOpen(false)} />
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      <PrivacyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      <LibraryModal isOpen={isLibraryOpen} onClose={() => setIsLibraryOpen(false)} />
      <SettingsModal isOpen={isPreferencesOpen} onClose={() => setIsPreferencesOpen(false)} />
    </>
  );
}
