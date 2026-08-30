'use client';

import React, { useState } from 'react';
import { FileRecord } from '@/lib/db';
import { X, FolderInput, HardDrive, Folder, Loader2 } from 'lucide-react';

interface MoveModalProps {
  file: FileRecord | null;
  availableFolders: FileRecord[];
  isOpen: boolean;
  onClose: () => void;
  onMove: (fileId: string, targetFolderId: string | null) => void;
}

export const MoveModal: React.FC<MoveModalProps> = ({
  file,
  availableFolders,
  isOpen,
  onClose,
  onMove,
}) => {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !file) return null;

  // Filter out the file itself (if it's a folder) to prevent moving into itself
  const validFolders = availableFolders.filter((f) => f.id !== file.id && f.is_folder === 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onMove(file.id, selectedFolderId);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#0a0a0c] border border-zinc-800 w-full max-w-[92vw] sm:max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 font-mono">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2 text-white font-semibold text-sm sm:text-base">
            <FolderInput className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
            <span className="truncate max-w-[200px] sm:max-w-[260px]">Move &quot;{file.name}&quot;</span>
          </div>
          <button onClick={onClose} disabled={isSubmitting} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <p className="text-xs text-drive-muted">Select destination folder:</p>

          <div className="max-h-60 overflow-y-auto space-y-1 bg-drive-bg p-2 rounded-xl border border-drive-border">
            {/* Root item */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setSelectedFolderId(null)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedFolderId === null
                  ? 'bg-drive-accentBg text-drive-accent font-semibold'
                  : 'text-drive-text hover:bg-drive-hover'
              }`}
            >
              <HardDrive className="w-4 h-4 text-drive-accent" />
              <span>My Drive (Root)</span>
            </button>

            {validFolders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                disabled={isSubmitting}
                onClick={() => setSelectedFolderId(folder.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedFolderId === folder.id
                    ? 'bg-drive-accentBg text-drive-accent font-semibold'
                    : 'text-drive-text hover:bg-drive-hover'
                }`}
              >
                <Folder className="w-4 h-4 text-yellow-500" />
                <span className="truncate">{folder.name}</span>
              </button>
            ))}

            {validFolders.length === 0 && (
              <div className="py-2 px-3 text-xs text-zinc-600 font-mono italic">
                (No subfolders available)
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-sm font-medium text-drive-muted hover:bg-drive-hover transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-drive-accent text-drive-bg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isSubmitting ? 'Moving...' : 'Move Here'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
