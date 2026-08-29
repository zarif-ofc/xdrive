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

/* ── Premium OLED Crimson Dual Spinner Loader ── */
const PremiumLoader: React.FC = () => (
  <div className="flex flex-col items-center justify-center space-y-3.5 p-6 select-none">
    <div className="relative w-12 h-12 flex items-center justify-center">
      {/* Outer Crimson Spinning Ring */}
      <div className="absolute inset-0 rounded-full border-2 border-t-[#ff2b38] border-r-transparent border-b-[#ff2b38]/40 border-l-transparent animate-spin duration-700" />
      {/* Inner Fast White Ring */}
      <div className="absolute inset-2 rounded-full border-2 border-t-white border-r-transparent border-b-transparent border-l-transparent animate-spin duration-500" />
      {/* Center Glowing Dot */}
      <div className="w-2.5 h-2.5 rounded-full bg-[#ff2b38] shadow-[0_0_12px_#ff2b38] animate-pulse" />
    </div>
    <span className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase animate-pulse">
      Loading...
    </span>
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150 select-none"
    >
      {/* Pure Content Modal (Headerless / Borderless) */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center overflow-hidden"
      >
        {/* Premium Loader Overlay (Shown while media is loading) */}
        {!isMediaLoaded && (
          <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/60 backdrop-blur-sm rounded-2xl">
            <PremiumLoader />
          </div>
        )}

        {/* ── Image Item ── */}
        {fileCategory === 'image' && (
          <img
            src={downloadUrl}
            alt={file.name}
            onLoad={() => setIsMediaLoaded(true)}
            onError={() => setIsMediaLoaded(true)}
            className={`max-h-[85vh] max-w-[85vw] object-contain rounded-2xl shadow-2xl transition-opacity duration-300 ${
              isMediaLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )}

        {/* ── Audio Item ── */}
        {fileCategory === 'audio' && (
          <div
            className={`flex flex-col items-center justify-center p-8 bg-[#0a0a0c] border border-zinc-800/90 rounded-2xl max-w-md w-full shadow-2xl space-y-6 font-mono transition-opacity duration-300 ${
              isMediaLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="w-24 h-24 rounded-full bg-[#ff2b38]/10 border border-[#ff2b38]/30 flex items-center justify-center shadow-inner relative animate-pulse">
              <Music className="w-12 h-12 text-[#ff2b38]" />
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
            className={`max-h-[85vh] max-w-[85vw] rounded-2xl shadow-2xl border border-zinc-800 bg-black transition-opacity duration-300 ${
              isMediaLoaded ? 'opacity-100' : 'opacity-0'
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
            className={`w-[80vw] h-[85vh] rounded-2xl border border-zinc-800 bg-white transition-opacity duration-300 ${
              isMediaLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )}

        {/* ── Text / Code Item ── */}
        {fileCategory === 'text' && (
          <div
            className={`w-[80vw] max-w-3xl max-h-[80vh] bg-[#0a0a0c] border border-zinc-800 rounded-2xl overflow-auto shadow-2xl p-6 font-mono text-xs text-zinc-300 select-text transition-opacity duration-300 ${
              isMediaLoaded ? 'opacity-100' : 'opacity-0'
            }`}
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
          <div className="flex flex-col items-center justify-center text-center p-8 space-y-4 max-w-sm bg-[#0a0a0c] border border-zinc-800 rounded-2xl font-mono">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
              <Eye className="w-8 h-8 text-zinc-400" />
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
