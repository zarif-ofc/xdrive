'use client';

import React, { useState } from 'react';
import { ProviderType } from '@/lib/storage/router';
import { ProviderBadge } from './ProviderBadge';
import { formatBytes } from '@/lib/utils';
import { X, ChevronDown, ChevronUp, CheckCircle, Loader2, AlertCircle } from 'lucide-react';

export interface UploadItem {
  id: string;
  name: string;
  size: number;
  progress: number; // 0 to 100
  status: 'uploading' | 'completed' | 'error';
  provider?: ProviderType;
  errorMsg?: string;
}

interface UploadProgressModalProps {
  uploads: UploadItem[];
  onDismissUpload: (id: string) => void;
  onClearCompleted: () => void;
}

export const UploadProgressModal: React.FC<UploadProgressModalProps> = ({
  uploads,
  onDismissUpload,
  onClearCompleted,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);

  if (uploads.length === 0) return null;

  const activeCount = uploads.filter((u) => u.status === 'uploading').length;
  const completedCount = uploads.filter((u) => u.status === 'completed').length;

  return (
    <div className="fixed bottom-14 sm:bottom-4 left-3 right-3 sm:left-auto sm:right-4 z-40 sm:w-96 bg-[#0a0a0c] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 font-mono">
      {/* Header Bar */}
      <div className="bg-[#121215] px-4 py-3 flex items-center justify-between border-b border-zinc-800">
        <div className="flex items-center gap-2">
          {activeCount > 0 ? (
            <Loader2 className="w-4 h-4 text-drive-accent animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          )}
          <span className="text-sm font-semibold text-white">
            {activeCount > 0 ? `Uploading ${activeCount} file${activeCount > 1 ? 's' : ''}...` : `${completedCount} upload${completedCount > 1 ? 's' : ''} complete`}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 text-drive-muted hover:text-white rounded-md transition-colors"
          >
            {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            onClick={onClearCompleted}
            className="p-1 text-drive-muted hover:text-white rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Upload Items List */}
      {!isMinimized && (
        <div className="max-h-72 overflow-y-auto divide-y divide-drive-border/50 p-2">
          {uploads.map((item) => (
            <div key={item.id} className="py-2.5 px-2 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-drive-text">
                <span className="font-medium truncate max-w-[180px]" title={item.name}>
                  {item.name}
                </span>
                <span className="text-drive-muted font-mono">{formatBytes(item.size)}</span>
              </div>

              {/* Progress Bar & Status */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 bg-zinc-800/60 h-1.5 rounded-full overflow-hidden relative">
                  <div
                    className={`h-full transition-all duration-300 rounded-full relative overflow-hidden ${
                      item.status === 'completed'
                        ? 'bg-emerald-500'
                        : item.status === 'error'
                        ? 'bg-rose-500'
                        : 'bg-[#ff2b38]'
                    }`}
                    style={{ width: `${item.progress}%` }}
                  >
                    {item.status === 'uploading' && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                    )}
                  </div>
                </div>

                {item.provider && <ProviderBadge provider={item.provider} size="sm" />}

                {item.status === 'completed' && <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                {item.status === 'uploading' && <Loader2 className="w-3.5 h-3.5 text-zinc-400 animate-spin shrink-0" />}
                {item.status === 'error' && <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
              </div>

              {item.errorMsg && <p className="text-[11px] text-rose-400 font-medium">{item.errorMsg}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
