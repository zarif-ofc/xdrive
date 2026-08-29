'use client';

import React, { useState, useEffect } from 'react';
import { FileRecord } from '@/lib/db';
import { X, Edit3 } from 'lucide-react';

interface RenameModalProps {
  file: FileRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onRename: (fileId: string, newName: string) => void;
}

export const RenameModal: React.FC<RenameModalProps> = ({
  file,
  isOpen,
  onClose,
  onRename,
}) => {
  const [name, setName] = useState('');

  useEffect(() => {
    if (file) {
      setName(file.name);
    }
  }, [file]);

  if (!isOpen || !file) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && name.trim() !== file.name) {
      onRename(file.id, name.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-drive-surface border border-drive-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between px-6 py-4 border-b border-drive-border">
          <div className="flex items-center gap-2 text-white font-semibold">
            <Edit3 className="w-5 h-5 text-blue-400" />
            <span>Rename {file.is_folder === 1 ? 'Folder' : 'File'}</span>
          </div>
          <button onClick={onClose} className="text-drive-muted hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-drive-muted uppercase mb-1.5">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="w-full bg-drive-bg text-white px-4 py-2.5 rounded-xl border border-drive-border focus:border-drive-accent focus:outline-none transition-all text-sm"
            />
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
              disabled={!name.trim() || name.trim() === file.name}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-drive-accent text-drive-bg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
