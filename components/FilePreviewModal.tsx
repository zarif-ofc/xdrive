'use client';

import React, { useState, useEffect } from 'react';
import { FileRecord } from '@/lib/db';
import { ProviderBadge } from './ProviderBadge';
import { FileIcon } from './FileIcon';
import { formatBytes, formatDate } from '@/lib/utils';
import { X, Download, Copy, Check, Eye, Music, Video, Image as ImageIcon, FileText, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface FilePreviewModalProps {
  file: FileRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload: (file: FileRecord) => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  file,
  isOpen,
  onClose,
  onDownload,
}) => {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [textLoading, setTextLoading] = useState(false);
  const [textError, setTextError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

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

  // Reset state when file changes
  useEffect(() => {
    setTextContent(null);
    setTextLoading(false);
    setTextError(null);
    setIsCopied(false);
    setZoomLevel(1);

    if (!file || !isOpen) return;

    const fileCategory = getFileCategory(file);
    if (fileCategory === 'text') {
      setTextLoading(true);
      fetch(`/api/download/${file.id}?inline=1`)
        .then((res) => {
          if (!res.ok) throw new Error('Failed to load text content');
          return res.text();
        })
        .then((text) => {
          setTextContent(text);
          setTextLoading(false);
        })
        .catch((err) => {
          setTextError(err.message || 'Unable to display file content');
          setTextLoading(false);
        });
    }
  }, [file, isOpen]);

  if (!isOpen || !file) return null;

  const downloadUrl = `/api/download/${file.id}?inline=1`;
  const fileCategory = getFileCategory(file);

  const handleCopyText = () => {
    if (textContent) {
      navigator.clipboard.writeText(textContent);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Modal Container */}
      <div className="relative w-full max-w-5xl max-h-[90vh] flex flex-col bg-drive-surface border border-drive-border rounded-2xl shadow-2xl overflow-hidden select-none">
        {/* Header */}
        <div className="px-6 py-4 border-b border-drive-border/60 flex items-center justify-between bg-drive-bg/60">
          <div className="flex items-center gap-3 min-w-0">
            <FileIcon mimeType={file.mime_type} fileName={file.name} className="w-7 h-7 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white truncate max-w-md" title={file.name}>
                  {file.name}
                </h3>
                <ProviderBadge provider={file.provider} size="sm" />
              </div>
              <p className="text-xs text-drive-muted flex items-center gap-2">
                <span>{formatBytes(file.size)}</span>
                <span>•</span>
                <span>{formatDate(file.created_at)}</span>
              </p>
            </div>
          </div>

          {/* Action Header Buttons */}
          <div className="flex items-center gap-2">
            {fileCategory === 'text' && textContent && (
              <button
                onClick={handleCopyText}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-drive-surface hover:bg-drive-hover border border-drive-border text-xs font-medium text-drive-text hover:text-white transition-colors"
                title="Copy text content"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-drive-muted" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>
            )}

            {fileCategory === 'image' && (
              <div className="flex items-center gap-1 bg-drive-bg border border-drive-border rounded-lg p-1 mr-2">
                <button
                  onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                  className="p-1 text-drive-muted hover:text-white hover:bg-drive-surface rounded transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs text-drive-muted font-mono px-1">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                  className="p-1 text-drive-muted hover:text-white hover:bg-drive-surface rounded transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setZoomLevel(1)}
                  className="p-1 text-drive-muted hover:text-white hover:bg-drive-surface rounded transition-colors"
                  title="Reset Zoom"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <button
              onClick={() => onDownload(file)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-drive-accent text-drive-bg hover:opacity-90 text-xs font-semibold transition-opacity"
            >
              <Download className="w-4 h-4" />
              Download
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-drive-muted hover:text-white hover:bg-drive-hover transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="flex-1 overflow-auto p-6 flex items-center justify-center min-h-[400px] max-h-[75vh] bg-drive-bg/40">
          {/* Image Preview */}
          {fileCategory === 'image' && (
            <div className="overflow-auto max-w-full max-h-full flex items-center justify-center">
              <img
                src={downloadUrl}
                alt={file.name}
                style={{ transform: `scale(${zoomLevel})` }}
                className="max-h-[65vh] max-w-full object-contain rounded-xl shadow-2xl transition-transform duration-150"
              />
            </div>
          )}

          {/* Audio Preview */}
          {fileCategory === 'audio' && (
            <div className="flex flex-col items-center justify-center p-8 bg-drive-surface border border-drive-border rounded-2xl max-w-lg w-full shadow-2xl space-y-6">
              <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-purple-600/30 to-blue-500/30 border border-purple-500/30 flex items-center justify-center shadow-inner relative animate-pulse">
                <Music className="w-16 h-16 text-purple-400" />
              </div>
              <div className="text-center space-y-1">
                <h4 className="text-lg font-bold text-white max-w-xs truncate">{file.name}</h4>
                <p className="text-xs text-drive-muted font-mono">{formatBytes(file.size)}</p>
              </div>
              <audio
                controls
                src={downloadUrl}
                className="w-full focus:outline-none"
                autoPlay
              />
            </div>
          )}

          {/* Video Preview */}
          {fileCategory === 'video' && (
            <div className="w-full flex items-center justify-center">
              <video
                controls
                src={downloadUrl}
                className="max-h-[68vh] max-w-full rounded-2xl shadow-2xl border border-drive-border bg-black"
                autoPlay
              >
                Your browser does not support the video tag.
              </video>
            </div>
          )}

          {/* PDF Preview */}
          {fileCategory === 'pdf' && (
            <iframe
              src={downloadUrl}
              title={file.name}
              className="w-full h-[70vh] rounded-xl border border-drive-border bg-white"
            />
          )}

          {/* Text / Code Preview */}
          {fileCategory === 'text' && (
            <div className="w-full h-full max-h-[68vh] flex flex-col bg-[#12141c] border border-drive-border rounded-xl overflow-hidden shadow-inner">
              {textLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center text-drive-muted py-12 space-y-3">
                  <div className="w-8 h-8 border-2 border-drive-accent border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-medium">Loading document content...</p>
                </div>
              ) : textError ? (
                <div className="flex-1 flex flex-col items-center justify-center text-rose-400 p-8 text-center space-y-2">
                  <FileText className="w-10 h-10 stroke-[1.5]" />
                  <p className="text-sm font-semibold">{textError}</p>
                </div>
              ) : (
                <div className="flex-1 overflow-auto p-4 font-mono text-xs text-drive-text leading-relaxed select-text">
                  <pre className="whitespace-pre-wrap break-words">{textContent}</pre>
                </div>
              )}
            </div>
          )}

          {/* Fallback / Unsupported Preview */}
          {fileCategory === 'unsupported' && (
            <div className="flex flex-col items-center justify-center text-center p-8 space-y-4 max-w-sm">
              <div className="w-20 h-20 rounded-2xl bg-drive-surface border border-drive-border flex items-center justify-center text-drive-muted shadow-lg">
                <Eye className="w-10 h-10 text-drive-muted" />
              </div>
              <div>
                <h4 className="text-base font-semibold text-white mb-1">No preview available</h4>
                <p className="text-xs text-drive-muted">
                  This file type cannot be previewed directly in the browser. You can download it to view on your device.
                </p>
              </div>
              <button
                onClick={() => onDownload(file)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-drive-accent text-drive-bg hover:opacity-90 text-sm font-semibold transition-opacity"
              >
                <Download className="w-4 h-4" />
                Download File
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper: Classify file types by MIME type or extension
function getFileCategory(file: FileRecord): 'image' | 'audio' | 'video' | 'pdf' | 'text' | 'unsupported' {
  const mime = file.mime_type?.toLowerCase() || '';
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  // Images
  if (
    mime.startsWith('image/') ||
    ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif', 'ico'].includes(ext)
  ) {
    return 'image';
  }

  // Audio
  if (
    mime.startsWith('audio/') ||
    ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'wma'].includes(ext)
  ) {
    return 'audio';
  }

  // Video
  if (
    mime.startsWith('video/') ||
    ['mp4', 'webm', 'mov', 'mkv', 'avi', 'm4v', '3gp'].includes(ext)
  ) {
    return 'video';
  }

  // PDF
  if (mime === 'application/pdf' || ext === 'pdf') {
    return 'pdf';
  }

  // Text / Code
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
