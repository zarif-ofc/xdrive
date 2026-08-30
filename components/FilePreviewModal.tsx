'use client';

import React, { useState, useEffect } from 'react';
import { FileRecord } from '@/lib/db';
import { Music, Eye, FileText } from 'lucide-react';

interface FilePreviewModalProps {
  file: FileRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload: (file: FileRecord) => void;
}

/* ── Minimal Flat Loader ── */
const PremiumLoader: React.FC<{ fileName?: string }> = ({ fileName }) => (
  <div className="flex flex-col items-center justify-center space-y-3 p-6 select-none font-mono">
    <div className="w-8 h-8 rounded-full border border-zinc-800 border-t-[#ff2b38] animate-spin" />
    {fileName && (
      <span className="text-[11px] text-zinc-500 truncate max-w-[220px]">
        {fileName}
      </span>
    )}
  </div>
);

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  file,
  isOpen,
  onClose,
  onDownload,
}) => {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [textError, setTextError] = useState<string | null>(null);
  const [isMediaLoaded, setIsMediaLoaded] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Reset loading & text states on file change
  useEffect(() => {
    setTextContent(null);
    setTextError(null);
    setIsMediaLoaded(false);

    if (!file || !isOpen) return;

    const fileCategory = getFileCategory(file);
    if (fileCategory === 'text') {
      fetch(`/api/download/${file.id}?inline=1`)
        .then((res) => {
          if (!res.ok) throw new Error('Failed to load text content');
          return res.text();
        })
        .then((text) => {
          setTextContent(text);
          setIsMediaLoaded(true);
        })
        .catch((err) => {
          setTextError(err.message || 'Unable to display file content');
          setIsMediaLoaded(true);
        });
    } else if (fileCategory === 'unsupported') {
      setIsMediaLoaded(true);
    }
  }, [file, isOpen]);

  if (!isOpen || !file) return null;

  const downloadUrl = `/api/download/${file.id}?inline=1`;
  const fileCategory = getFileCategory(file);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-150 select-none overflow-hidden"
    >
      {/* Pure Content Modal (Headerless / Borderless) */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-[92vw] sm:max-w-[85vw] max-h-[85vh] flex items-center justify-center overflow-hidden rounded-2xl"
      >
        {/* Premium Loader Overlay (Shown while media is loading) */}
        {!isMediaLoaded && (
          <div className="flex flex-col items-center justify-center min-w-[260px] min-h-[200px] sm:min-w-[480px] sm:min-h-[320px] bg-[#0a0a0c] border border-zinc-800 rounded-2xl relative overflow-hidden shadow-2xl p-4 sm:p-6">
            {/* Shimmering Skeleton Background */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-800/20 to-transparent animate-shimmer" />

            {/* Skeleton Placeholders for Content */}
            {fileCategory === 'text' ? (
              <div className="w-full space-y-3 opacity-40">
                <div className="h-4 w-1/3 bg-zinc-800 rounded-md animate-pulse" />
                <div className="h-3 w-4/5 bg-zinc-800/60 rounded animate-pulse" />
                <div className="h-3 w-2/3 bg-zinc-800/60 rounded animate-pulse" />
                <div className="h-3 w-3/4 bg-zinc-800/60 rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-zinc-800/60 rounded animate-pulse" />
                <div className="h-3 w-5/6 bg-zinc-800/60 rounded animate-pulse" />
              </div>
            ) : fileCategory === 'pdf' ? (
              <div className="w-full h-full flex flex-col items-center justify-center space-y-4 opacity-40">
                <div className="w-16 h-20 bg-zinc-800 rounded-lg animate-pulse" />
                <div className="h-3 w-32 bg-zinc-800 rounded animate-pulse" />
              </div>
            ) : null}

            {/* Floating Crimson Center Loader */}
            <div className="relative z-10">
              <PremiumLoader fileName={file.name} />
            </div>
          </div>
        )}

        {/* ── Image Item ── */}
        {fileCategory === 'image' && (
          <img
            src={downloadUrl}
            alt={file.name}
            onLoad={() => setIsMediaLoaded(true)}
            onError={() => setIsMediaLoaded(true)}
            className={`max-h-[75vh] sm:max-h-[80vh] max-w-[90vw] sm:max-w-[80vw] w-auto h-auto object-contain rounded-2xl shadow-2xl transition-opacity duration-300 ${
              isMediaLoaded ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'
            }`}
          />
        )}

        {/* ── Audio Item ── */}
        {fileCategory === 'audio' && (
          <div
            className={`flex flex-col items-center justify-center p-4 sm:p-6 bg-[#0a0a0c] border border-zinc-800/90 rounded-2xl max-w-[90vw] sm:max-w-sm w-full shadow-2xl space-y-4 font-mono transition-opacity duration-300 ${
              isMediaLoaded ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'
            }`}
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#ff2b38]/10 border border-[#ff2b38]/30 flex items-center justify-center shadow-inner relative animate-pulse">
              <Music className="w-8 h-8 sm:w-10 sm:h-10 text-[#ff2b38]" />
            </div>
            <audio
              controls
              autoPlay
              src={downloadUrl}
              onCanPlay={() => setIsMediaLoaded(true)}
              onLoadedData={() => setIsMediaLoaded(true)}
              className="w-full focus:outline-none"
            />
          </div>
        )}

        {/* ── Video Item ── */}
        {fileCategory === 'video' && (
          <video
            controls
            autoPlay
            src={downloadUrl}
            onCanPlay={() => setIsMediaLoaded(true)}
            onLoadedData={() => setIsMediaLoaded(true)}
            className={`max-h-[75vh] sm:max-h-[80vh] max-w-[90vw] sm:max-w-[80vw] w-auto h-auto rounded-2xl shadow-2xl border border-zinc-800 bg-black transition-opacity duration-300 ${
              isMediaLoaded ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'
            }`}
          >
            Your browser does not support video playback.
          </video>
        )}

        {/* ── PDF Item ── */}
        {fileCategory === 'pdf' && (
          <iframe
            src={downloadUrl}
            title={file.name}
            onLoad={() => setIsMediaLoaded(true)}
            className={`w-[90vw] sm:w-[80vw] max-w-4xl h-[75vh] sm:h-[80vh] rounded-2xl border border-zinc-800 bg-white transition-opacity duration-300 ${
              isMediaLoaded ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'
            }`}
          />
        )}

        {/* ── Text / Code Item ── */}
        {fileCategory === 'text' && isMediaLoaded && (
          <div
            className="w-[90vw] sm:w-[80vw] max-w-2xl max-h-[75vh] bg-[#0a0a0c] border border-zinc-800 rounded-2xl overflow-auto shadow-2xl p-4 sm:p-6 font-mono text-xs sm:text-sm text-zinc-300 select-text transition-opacity duration-300 animate-in fade-in"
          >
            {textError ? (
              <div className="flex flex-col items-center justify-center text-red-400 p-8 text-center space-y-2 font-mono">
                <FileText className="w-10 h-10 stroke-[1.5]" />
                <p className="text-sm font-semibold">{textError}</p>
              </div>
            ) : (
              <pre className="whitespace-pre-wrap break-words leading-relaxed">{textContent}</pre>
            )}
          </div>
        )}

        {/* ── Fallback / Unsupported Item ── */}
        {fileCategory === 'unsupported' && (
          <div className="flex flex-col items-center justify-center text-center p-6 space-y-3 max-w-xs bg-[#0a0a0c] border border-zinc-800 rounded-2xl font-mono">
            <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
              <Eye className="w-7 h-7 text-zinc-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-400">No inline preview available</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper: Classify file types by MIME type or extension
function getFileCategory(file: FileRecord): 'image' | 'audio' | 'video' | 'pdf' | 'text' | 'unsupported' {
  const mime = file.mime_type?.toLowerCase() || '';
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  if (
    mime.startsWith('image/') ||
    ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif', 'ico'].includes(ext)
  ) {
    return 'image';
  }

  if (
    mime.startsWith('audio/') ||
    ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'wma'].includes(ext)
  ) {
    return 'audio';
  }

  if (
    mime.startsWith('video/') ||
    ['mp4', 'webm', 'mov', 'mkv', 'avi', 'm4v', '3gp'].includes(ext)
  ) {
    return 'video';
  }

  if (mime === 'application/pdf' || ext === 'pdf') {
    return 'pdf';
  }

  if (
    mime.startsWith('text/') ||
    mime === 'application/json' ||
    mime === 'application/javascript' ||
    mime === 'application/xml' ||
    [
      'txt',
      'json',
      'js',
      'ts',
      'tsx',
      'jsx',
      'css',
      'html',
      'md',
      'py',
      'sh',
      'c',
      'cpp',
      'rs',
      'go',
      'java',
      'sql',
      'xml',
      'log',
      'env',
      'yaml',
      'yml',
      'gitignore',
    ].includes(ext)
  ) {
    return 'text';
  }

  return 'unsupported';
}
