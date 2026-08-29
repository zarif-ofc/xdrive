'use client';

import React, { useState } from 'react';
import { FileRecord } from '@/lib/db';
import { X, FolderInput, HardDrive, Folder } from 'lucide-react';

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

  if (!isOpen || !file) return null;

  // Filter out the file itself (if it's a folder) to prevent moving into itself
  const validFolders = availableFolders.filter((f) => f.id !== file.id && f.is_folder === 1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onMove(file.id, selectedFolderId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-drive-surface border border-drive-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between px-6 py-4 border-b border-drive-border">
          <div className="flex items-center gap-2 text-white font-semibold">
            <FolderInput className="w-5 h-5 text-purple-400" />
            <span>Move &quot;{file.name}&quot;</span>
          </div>
          <button onClick={onClose} className="text-drive-muted hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-drive-muted">Select destination folder:</p>

          <div className="max-h-60 overflow-y-auto space-y-1 bg-drive-bg p-2 rounded-xl border border-drive-border">
            {/* Root item */}
            <button
              type="button"
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
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-drive-muted hover:bg-drive-hover transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-drive-accent text-drive-bg hover:opacity-90 transition-opacity"
            >
              Move Here
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
