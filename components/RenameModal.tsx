'use client';

import React, { useState, useEffect } from 'react';
import { FileRecord } from '@/lib/db';
import { X, Edit3, Loader2 } from 'lucide-react';

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (file) {
      setName(file.name);
      setIsSubmitting(false);
    }
  }, [file]);

  if (!isOpen || !file) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && name.trim() !== file.name) {
      setIsSubmitting(true);
      await onRename(file.id, name.trim());
      setIsSubmitting(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#0a0a0c] border border-zinc-800 w-full max-w-[92vw] sm:max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 font-mono">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2 text-white font-semibold text-sm sm:text-base">
            <Edit3 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
            <span>Rename {file.is_folder === 1 ? 'Folder' : 'File'}</span>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-drive-muted uppercase mb-1.5">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              disabled={isSubmitting}
              className="w-full bg-drive-bg text-white px-4 py-2.5 rounded-xl border border-drive-border focus:border-drive-accent focus:outline-none transition-all text-sm disabled:opacity-60"
            />
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
              disabled={!name.trim() || name.trim() === file.name || isSubmitting}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-drive-accent text-drive-bg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isSubmitting ? 'Saving...' : 'Save'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
