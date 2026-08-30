'use client';

import React, { useEffect, useRef } from 'react';
import { FileRecord } from '@/lib/db';
import { Download, Edit3, FolderInput, Trash2, ExternalLink, Eye } from 'lucide-react';

interface ContextMenuProps {
  x: number;
  y: number;
  file: FileRecord;
  onClose: () => void;
  onDownload: (file: FileRecord) => void;
  onPreview?: (file: FileRecord) => void;
  onRename: (file: FileRecord) => void;
  onMove: (file: FileRecord) => void;
  onDelete: (file: FileRecord) => void;
  onOpenFolder?: (folderId: string) => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  file,
  onClose,
  onDownload,
  onPreview,
  onRename,
  onMove,
  onDelete,
  onOpenFolder,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Constrain menu position within screen bounds
  const adjustedX = Math.max(8, Math.min(x, typeof window !== 'undefined' ? window.innerWidth - 210 : x));
  const adjustedY = Math.max(8, Math.min(y, typeof window !== 'undefined' ? window.innerHeight - 280 : y));

  return (
    <div
      ref={menuRef}
      style={{ top: `${adjustedY}px`, left: `${adjustedX}px` }}
      className="fixed z-50 w-48 sm:w-52 bg-[#0d0d10] border border-zinc-800 rounded-xl shadow-2xl py-1 text-xs sm:text-sm text-zinc-200 select-none animate-in fade-in zoom-in-95 font-mono"
    >
      <div className="px-3 py-2 border-b border-zinc-800/80 text-[11px] font-semibold text-zinc-400 truncate">
        {file.name}
      </div>

      {file.is_folder === 1 && onOpenFolder && (
        <button
          onClick={() => {
            onOpenFolder(file.id);
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-drive-hover text-drive-accent transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Open Folder
        </button>
      )}

      {file.is_folder === 0 && onPreview && (
        <button
          onClick={() => {
            onPreview(file);
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-drive-hover text-drive-text transition-colors"
        >
          <Eye className="w-4 h-4 text-cyan-400" />
          Preview
        </button>
      )}

      {file.is_folder === 0 && (
        <button
          onClick={() => {
            onDownload(file);
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-drive-hover text-drive-text transition-colors"
        >
          <Download className="w-4 h-4 text-emerald-400" />
          Download
        </button>
      )}

      <button
        onClick={() => {
          onRename(file);
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-drive-hover text-drive-text transition-colors"
      >
        <Edit3 className="w-4 h-4 text-blue-400" />
        Rename
      </button>

      <button
        onClick={() => {
          onMove(file);
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-drive-hover text-drive-text transition-colors"
      >
        <FolderInput className="w-4 h-4 text-purple-400" />
        Move to...
      </button>

      <hr className="border-drive-border my-1" />

      <button
        onClick={() => {
          onDelete(file);
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-drive-hover text-rose-400 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
        Delete
      </button>
    </div>
  );
};
