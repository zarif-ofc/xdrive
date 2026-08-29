'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DropZoneOverlay } from '@/components/DropZoneOverlay';
import { ContextMenu } from '@/components/ContextMenu';
import { UploadProgressModal, UploadItem } from '@/components/UploadProgressModal';
import { RenameModal } from '@/components/RenameModal';
import { MoveModal } from '@/components/MoveModal';
import { FilePreviewModal } from '@/components/FilePreviewModal';
import { FileRecord } from '@/lib/db';
import { StorageMetrics } from '@/lib/storage/router';
import { formatBytes } from '@/lib/utils';
import { Plus, File, Search, X, Video, Image as ImageIcon, Music, FileText } from 'lucide-react';

/* Helper to strip extension from filename */
const getDisplayName = (filename: string) => {
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex <= 0) return filename;
  return filename.substring(0, lastDotIndex);
};

/* ─── Flat Minimal File Card (No Extension Shown) ─── */
const FlatFileCard: React.FC<{
  file: FileRecord;
  isSelected: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onPreview: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}> = ({ file, isSelected, onSelect, onPreview, onContextMenu }) => {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const mime = file.mime_type?.toLowerCase() || '';
  const displayName = getDisplayName(file.name);

  let CategoryIcon = File;
  if (mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) CategoryIcon = ImageIcon;
  else if (mime.startsWith('video/') || ['mp4', 'mov', 'mkv', 'webm', 'avi'].includes(ext)) CategoryIcon = Video;
  else if (mime.startsWith('audio/') || ['mp3', 'wav', 'flac', 'm4a', 'ogg'].includes(ext)) CategoryIcon = Music;
  else if (mime.startsWith('text/') || ['txt', 'md', 'json', 'js', 'ts', 'pdf', 'doc'].includes(ext)) CategoryIcon = FileText;

  return (
    <div
      onClick={onSelect}
      onDoubleClick={onPreview}
      onContextMenu={onContextMenu}
      className={`group relative flex flex-col items-center justify-between p-4 rounded-2xl cursor-pointer transition-all duration-150 w-[155px] h-[120px] border select-none ${
        isSelected
          ? 'bg-[#141418] border-white'
          : 'bg-[#0d0d0f] border-zinc-800/80 hover:bg-[#141418] hover:border-zinc-700'
      }`}
    >
      {/* Icon */}
      <div className="my-auto pt-1 flex items-center justify-center">
        <CategoryIcon className="w-8 h-8 text-zinc-400 group-hover:text-white stroke-[1.5] transition-colors" />
      </div>

      {/* Base Name (No Extension) & Size */}
      <div className="w-full text-center">
        <p className="text-xs font-semibold text-zinc-300 group-hover:text-white truncate" title={file.name}>
          {displayName}
        </p>
        <p className="text-[10px] text-zinc-500 font-medium">
          {formatBytes(file.size)}
        </p>
      </div>
    </div>
  );
};

export default function Home() {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  // Modals
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file: FileRecord } | null>(null);
  const [renameTarget, setRenameTarget] = useState<FileRecord | null>(null);
  const [moveTarget, setMoveTarget] = useState<FileRecord | null>(null);
  const [previewTarget, setPreviewTarget] = useState<FileRecord | null>(null);

  // Upload & metrics
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [metrics, setMetrics] = useState<StorageMetrics | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Data fetching
  const loadMetrics = useCallback(async () => {
    try {
      const res = await fetch('/api/storage');
      const data = await res.json();
      if (data.success) setMetrics(data.metrics);
    } catch {}
  }, []);

  const loadFiles = useCallback(async () => {
    try {
      const res = await fetch('/api/files?sort=name_asc');
      const data = await res.json();
      if (data.success) {
        setFiles(data.files);
      }
    } catch {}
  }, []);

  useEffect(() => {
    loadFiles();
    loadMetrics();
  }, [loadFiles, loadMetrics]);

  // Upload handling
  const handleUploadFiles = async (fileList: FileList | File[]) => {
    const fileArray = Array.from(fileList);
    if (fileArray.length === 0) return;

    for (const file of fileArray) {
      const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      setUploads((prev) => [{ id: uploadId, name: file.name, size: file.size, progress: 10, status: 'uploading' }, ...prev]);

      const formData = new FormData();
      formData.append('file', file);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload', true);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.min(90, Math.round((e.loaded / e.total) * 90));
          setUploads((prev) => prev.map((item) => (item.id === uploadId ? { ...item, progress: percent } : item)));
        }
      };
      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300 && data.success && data.file) {
            setUploads((prev) => prev.map((item) => (item.id === uploadId ? { ...item, progress: 100, status: 'completed', provider: data.file.provider } : item)));
            loadFiles();
            loadMetrics();
          } else {
            setUploads((prev) => prev.map((item) => (item.id === uploadId ? { ...item, progress: 100, status: 'error', errorMsg: data.error || 'Upload failed' } : item)));
          }
        } catch {
          setUploads((prev) => prev.map((item) => (item.id === uploadId ? { ...item, progress: 100, status: 'error', errorMsg: 'Parse error' } : item)));
        }
      };
      xhr.onerror = () => {
        setUploads((prev) => prev.map((item) => (item.id === uploadId ? { ...item, progress: 100, status: 'error', errorMsg: 'Network error' } : item)));
      };
      xhr.send(formData);
    }
  };

  const handleDownload = (file: FileRecord) => {
    if (file.is_folder === 1) return;
    const a = document.createElement('a');
    a.href = `/api/download/${file.id}`;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleRename = async (fileId: string, newName: string) => {
    try {
      const res = await fetch(`/api/files/${fileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });
      const data = await res.json();
      if (data.success) loadFiles();
    } catch {}
  };

  const handleMove = async (fileId: string, targetFolderId: string | null) => {
    try {
      const res = await fetch(`/api/files/${fileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentId: targetFolderId }),
      });
      const data = await res.json();
      if (data.success) loadFiles();
    } catch {}
  };

  const handleDelete = async (file: FileRecord) => {
    if (!confirm(`Delete "${file.name}"?`)) return;
    try {
      const res = await fetch(`/api/files/${file.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        loadFiles();
        loadMetrics();
      }
    } catch {}
  };

  // Keyword filtering logic — returns empty array if no search query entered
  const getFilteredFiles = () => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return []; // Hide everything until user types!

    const regularFiles = files.filter((f) => f.is_folder === 0);

    if (['vid', 'video', 'videos'].includes(q)) {
      return regularFiles.filter(
        (f) =>
          f.mime_type?.startsWith('video/') ||
          ['mp4', 'mov', 'mkv', 'webm', 'avi'].some((ext) => f.name.toLowerCase().endsWith('.' + ext))
      );
    }
    if (['img', 'image', 'images', 'photo', 'photos', 'pic', 'pics'].includes(q)) {
      return regularFiles.filter(
        (f) =>
          f.mime_type?.startsWith('image/') ||
          ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].some((ext) => f.name.toLowerCase().endsWith('.' + ext))
      );
    }
    if (['aud', 'audio', 'sound', 'music', 'song', 'songs'].includes(q)) {
      return regularFiles.filter(
        (f) =>
          f.mime_type?.startsWith('audio/') ||
          ['mp3', 'wav', 'flac', 'm4a', 'ogg'].some((ext) => f.name.toLowerCase().endsWith('.' + ext))
      );
    }
    if (['txt', 'text', 'doc', 'docs', 'document', 'documents', 'pdf'].includes(q)) {
      return regularFiles.filter(
        (f) =>
          f.mime_type?.startsWith('text/') ||
          ['txt', 'md', 'json', 'js', 'ts', 'py', 'html', 'css', 'pdf', 'doc', 'docx'].some((ext) =>
            f.name.toLowerCase().endsWith('.' + ext)
          )
      );
    }

    return regularFiles.filter((f) => f.name.toLowerCase().includes(q));
  };

  const isQueryActive = searchQuery.trim().length > 0;
  const filteredFiles = getFilteredFiles();

  const usedPercent = metrics ? Math.min(100, Math.round((metrics.combined.used / metrics.combined.total) * 100)) : 0;
  const usedBytes = metrics?.combined.used || 0;
  const totalBytes = metrics?.combined.total || 0;

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      className="h-screen w-screen bg-[#000000] text-white overflow-hidden flex flex-col select-none"
    >
      <DropZoneOverlay onFilesDropped={handleUploadFiles} />

      <input
        type="file"
        ref={fileInputRef}
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) {
            handleUploadFiles(e.target.files);
            e.target.value = '';
          }
        }}
      />

      {/* ── Top Bar with Upload Button ── */}
      <div className="flex items-center justify-end px-8 pt-6 pb-2 z-10">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-10 h-10 rounded-full bg-[#ff2b38] hover:bg-[#ff3d4a] flex items-center justify-center transition-colors shadow-sm"
          title="Upload file"
        >
          <Plus className="w-5 h-5 text-white stroke-[2.5]" />
        </button>
      </div>

      {/* ── Center Content Area ── */}
      <main
        className="flex-1 overflow-y-auto px-8 pt-20 pb-32 flex flex-col items-center justify-start"
        onClick={() => setSelectedFileId(null)}
      >
        {/* Search Bar Alone */}
        <div className="w-full max-w-xl mb-6">
          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full bg-[#0d0d0f] border border-zinc-800 focus:border-[#ff2b38] text-white placeholder-zinc-600 rounded-2xl py-3.5 pl-12 pr-10 text-base font-medium outline-none transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Uploaded Files Grid - Only shown when user types a search query */}
        {isQueryActive && (
          <div className="w-full max-w-4xl mt-2">
            {filteredFiles.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-zinc-600 text-sm font-medium">
                  No files matching "{searchQuery}"
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-6 justify-center sm:justify-start content-start">
                {filteredFiles.map((file) => (
                  <FlatFileCard
                    key={file.id}
                    file={file}
                    isSelected={selectedFileId === file.id}
                    onSelect={(e) => {
                      e.stopPropagation();
                      setSelectedFileId(file.id);
                    }}
                    onPreview={() => setPreviewTarget(file)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedFileId(file.id);
                      setContextMenu({ x: e.clientX, y: e.clientY, file });
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Flat Bottom Storage Bar ── */}
      <div className="fixed bottom-0 left-0 right-0 flex flex-col items-center gap-1.5 pb-6 pt-8 bg-black/95 pointer-events-none z-20">
        <span className="text-xs font-bold text-zinc-400 tracking-wider uppercase">
          {usedPercent}% used
          <span className="text-zinc-600 ml-2 font-medium text-[10px]">
            {formatBytes(usedBytes)} / {formatBytes(totalBytes)}
          </span>
        </span>
        <div className="w-80 sm:w-[440px] h-1 bg-zinc-900 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#ff2b38] rounded-full transition-all duration-500"
            style={{ width: `${Math.max(usedPercent, 1)}%` }}
          />
        </div>
      </div>

      {/* ── Floating Context Menu & Modals ── */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          file={contextMenu.file}
          onClose={() => setContextMenu(null)}
          onDownload={handleDownload}
          onPreview={(file) => setPreviewTarget(file)}
          onRename={(file) => setRenameTarget(file)}
          onMove={(file) => setMoveTarget(file)}
          onDelete={handleDelete}
        />
      )}

      <FilePreviewModal
        file={previewTarget}
        isOpen={!!previewTarget}
        onClose={() => setPreviewTarget(null)}
        onDownload={handleDownload}
      />

      <UploadProgressModal
        uploads={uploads}
        onDismissUpload={(id) => setUploads((prev) => prev.filter((u) => u.id !== id))}
        onClearCompleted={() => setUploads((prev) => prev.filter((u) => u.status === 'uploading'))}
      />

      <RenameModal
        file={renameTarget}
        isOpen={!!renameTarget}
        onClose={() => setRenameTarget(null)}
        onRename={handleRename}
      />

      <MoveModal
        file={moveTarget}
        availableFolders={[]}
        isOpen={!!moveTarget}
        onClose={() => setMoveTarget(null)}
        onMove={handleMove}
      />
    </div>
  );
}
