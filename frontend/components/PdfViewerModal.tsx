"use client";
import React, { useState, useEffect, useRef } from "react";
import { 
  X, ChevronLeft, ChevronRight, Download, Maximize2, Minimize2, 
  ZoomIn, ZoomOut, FileText, ExternalLink, RefreshCw, BookOpen, Layers
} from "lucide-react";
import { BACKEND_URL } from "@/lib/config";
import { useAuth } from "@/context/AuthContext";

interface Chunk {
  text: string;
  page: number;
}

interface PdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  docId: string;
  docName?: string;
  initialPage?: number;
}

export default function PdfViewerModal({
  isOpen,
  onClose,
  docId,
  docName = "PDF Document",
  initialPage = 1,
}: PdfViewerModalProps) {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState<number>(initialPage || 1);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [viewMode, setViewMode] = useState<"pdf" | "chunks">("pdf");
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [loadingChunks, setLoadingChunks] = useState<boolean>(false);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [pdfLoadError, setPdfLoadError] = useState<boolean>(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Sync initialPage when it changes
  useEffect(() => {
    if (initialPage && initialPage > 0) {
      setCurrentPage(initialPage);
    }
  }, [initialPage, docId]);

  // Handle ESC key to close modal & Arrow keys for page navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft" && !["input", "textarea"].includes((e.target as HTMLElement).tagName.toLowerCase())) {
        setCurrentPage((prev) => Math.max(1, prev - 1));
      } else if (e.key === "ArrowRight" && !["input", "textarea"].includes((e.target as HTMLElement).tagName.toLowerCase())) {
        setCurrentPage((prev) => prev + 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Fetch document chunks if switching to chunk view or as fallback
  useEffect(() => {
    if (isOpen && docId && (viewMode === "chunks" || pdfLoadError)) {
      setLoadingChunks(true);
      fetch(`${BACKEND_URL}/documents/${docId}/chunks`, {
        headers: user?.token ? { Authorization: `Bearer ${user.token}` } : {},
      })
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch chunks");
          return res.json();
        })
        .then((data) => {
          if (data.success && Array.isArray(data.chunks)) {
            setChunks(data.chunks);
          }
        })
        .catch((err) => {
          console.warn("Could not load document chunks:", err);
        })
        .finally(() => setLoadingChunks(false));
    }
  }, [isOpen, docId, viewMode, pdfLoadError, user?.token]);

  if (!isOpen) return null;

  const pdfUrl = `${BACKEND_URL}/documents/${docId}/file#page=${currentPage}`;
  const rawDownloadUrl = `${BACKEND_URL}/documents/${docId}/file`;

  const pageChunks = chunks.filter((c) => c.page === currentPage);
  const otherChunks = chunks.filter((c) => c.page !== currentPage);

  const maxDetectedPage = chunks.length > 0 ? Math.max(...chunks.map((c) => c.page)) : 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        ref={modalRef}
        className={`relative flex flex-col bg-white dark:bg-[#18191c] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 ${
          isFullScreen
            ? "w-full h-full rounded-none"
            : "w-full max-w-5xl h-[92vh] max-h-[900px]"
        }`}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#1e1f23] shrink-0">
          {/* Document Title & Badge */}
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="p-2 rounded-xl bg-red-500/10 text-red-500 dark:text-red-400 shrink-0">
              <FileText size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white truncate">
                {docName}
              </h2>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium">
                  Page {currentPage}{maxDetectedPage ? ` / ${maxDetectedPage}` : ""}
                </span>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:inline">Citation Viewer</span>
              </div>
            </div>
          </div>

          {/* Controls: Mode Switch, Zoom, Fullscreen, Close */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-200 dark:bg-white/10 rounded-lg p-0.5 text-xs font-medium">
              <button
                onClick={() => setViewMode("pdf")}
                className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                  viewMode === "pdf"
                    ? "bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
                title="View PDF File"
              >
                <BookOpen size={13} />
                <span className="hidden md:inline">PDF</span>
              </button>
              <button
                onClick={() => setViewMode("chunks")}
                className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                  viewMode === "chunks"
                    ? "bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
                title="View Extracted Chunks"
              >
                <Layers size={13} />
                <span className="hidden md:inline">Text Chunks</span>
              </button>
            </div>

            {/* Page Navigation */}
            <div className="flex items-center bg-gray-200 dark:bg-white/10 rounded-lg px-1 py-0.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="p-1 rounded hover:bg-gray-300 dark:hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent text-gray-700 dark:text-gray-300 transition-colors"
                title="Previous Page (Left Arrow)"
              >
                <ChevronLeft size={16} />
              </button>
              <input
                type="number"
                min={1}
                max={maxDetectedPage || 999}
                value={currentPage}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val > 0) setCurrentPage(val);
                }}
                className="w-10 text-center bg-transparent border-none text-xs font-semibold text-gray-900 dark:text-white focus:outline-none"
              />
              <button
                onClick={() => setCurrentPage((p) => p + 1)}
                className="p-1 rounded hover:bg-gray-300 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 transition-colors"
                title="Next Page (Right Arrow)"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Zoom Controls (PDF Mode) */}
            {viewMode === "pdf" && (
              <div className="hidden sm:flex items-center gap-1 bg-gray-200 dark:bg-white/10 rounded-lg px-1 py-0.5">
                <button
                  onClick={() => setZoomLevel((z) => Math.max(50, z - 15))}
                  className="p-1 rounded hover:bg-gray-300 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut size={15} />
                </button>
                <span className="text-[11px] font-mono px-1 text-gray-700 dark:text-gray-300 min-w-[36px] text-center">
                  {zoomLevel}%
                </span>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(200, z + 15))}
                  className="p-1 rounded hover:bg-gray-300 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn size={15} />
                </button>
              </div>
            )}

            {/* Download / Open in New Tab */}
            <a
              href={rawDownloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              download={docName}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              title="Download Original PDF"
            >
              <Download size={16} />
            </a>

            {/* Fullscreen Toggle */}
            <button
              onClick={() => setIsFullScreen((prev) => !prev)}
              className="hidden sm:inline-flex p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              title={isFullScreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              title="Close (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 bg-gray-100 dark:bg-[#121316] overflow-hidden relative">
          {viewMode === "pdf" ? (
            <div className="w-full h-full relative overflow-auto flex items-center justify-center">
              <iframe
                key={`${docId}-${currentPage}`}
                src={pdfUrl}
                title={docName}
                className="w-full h-full border-none transition-transform origin-top"
                style={{
                  transform: zoomLevel !== 100 ? `scale(${zoomLevel / 100})` : undefined,
                  transformOrigin: "top center",
                }}
                onError={() => setPdfLoadError(true)}
              />

              {/* Informational overlay if PDF cannot render */}
              {pdfLoadError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 p-6 text-center text-white">
                  <FileText size={48} className="text-red-400 mb-3" />
                  <h3 className="text-lg font-semibold mb-1">PDF File Preview Unavailable</h3>
                  <p className="text-sm text-gray-300 max-w-md mb-4">
                    The original PDF file was not stored on disk or could not be streamed. You can still inspect the extracted vectorized text chunks for Page {currentPage}.
                  </p>
                  <button
                    onClick={() => {
                      setViewMode("chunks");
                      setPdfLoadError(false);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors"
                  >
                    View Extracted Page Text
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Text Chunks View */
            <div className="w-full h-full overflow-y-auto p-4 sm:p-6 custom-scrollbar">
              <div className="max-w-3xl mx-auto space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-white/10">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-base">
                      Extracted Text for Page {currentPage}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Showing indexed passages from document embedding database
                    </p>
                  </div>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    {pageChunks.length} chunk{pageChunks.length !== 1 ? "s" : ""} on this page
                  </span>
                </div>

                {loadingChunks ? (
                  <div className="flex items-center justify-center py-16 gap-3 text-sm text-gray-500 dark:text-gray-400">
                    <RefreshCw size={18} className="animate-spin text-blue-500" />
                    Loading document chunks...
                  </div>
                ) : pageChunks.length > 0 ? (
                  <div className="space-y-3">
                    {pageChunks.map((chunk, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl bg-white dark:bg-[#1e1f23] border border-blue-500/30 shadow-sm"
                      >
                        <div className="flex items-center justify-between text-xs text-blue-600 dark:text-blue-400 font-semibold mb-2">
                          <span>Chunk #{idx + 1}</span>
                          <span>Page {chunk.page}</span>
                        </div>
                        <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                          {chunk.text}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-white dark:bg-[#1e1f23] rounded-xl border border-gray-200 dark:border-white/10">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No extracted chunks found specifically for Page {currentPage}.
                    </p>
                    {chunks.length > 0 && (
                      <p className="text-xs text-gray-400 mt-2">
                        Total {chunks.length} chunks exist across pages:{" "}
                        {Array.from(new Set(chunks.map((c) => c.page))).sort((a, b) => a - b).join(", ")}
                      </p>
                    )}
                  </div>
                )}

                {/* Other Page Chunks */}
                {otherChunks.length > 0 && (
                  <div className="pt-6">
                    <h4 className="text-xs uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                      Other Indexed Pages ({otherChunks.length} chunks)
                    </h4>
                    <div className="space-y-2">
                      {otherChunks.slice(0, 10).map((chunk, idx) => (
                        <div
                          key={idx}
                          onClick={() => setCurrentPage(chunk.page)}
                          className="p-3 rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/5 hover:border-blue-500/30 transition-all cursor-pointer"
                        >
                          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                            <span>Jump to Page {chunk.page}</span>
                          </div>
                          <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2">
                            {chunk.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

