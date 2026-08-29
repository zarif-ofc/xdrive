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
import { Plus, File, Video, Image as ImageIcon, Music, FileText, Terminal as TerminalIcon, Lock, Unlock } from 'lucide-react';

/* Helper to strip extension from filename */
const getDisplayName = (filename: string) => {
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex <= 0) return filename;
  return filename.substring(0, lastDotIndex);
};

/* Cache folder paths created during session */
const folderIdCache = new Map<string, string>();

async function ensureFolderPath(relativePath: string, currentFilesList: FileRecord[]): Promise<string | null> {
  const parts = relativePath.split('/').filter(Boolean);
  if (parts.length <= 1) return null;

  const folderNames = parts.slice(0, -1);
  let parentId: string | null = null;
  const localFiles = [...currentFilesList];
  let currentPathAcc = '';

  for (const folderName of folderNames) {
    currentPathAcc = currentPathAcc ? `${currentPathAcc}/${folderName}` : folderName;

    if (folderIdCache.has(currentPathAcc)) {
      parentId = folderIdCache.get(currentPathAcc)!;
      continue;
    }

    let existingFolder: FileRecord | undefined = localFiles.find(
      (f) =>
        f.is_folder === 1 &&
        f.name.toLowerCase() === folderName.toLowerCase() &&
        (parentId ? f.parent_id === parentId : !f.parent_id || f.parent_id === 'root')
    );

    if (!existingFolder) {
      try {
        const folderRes: Response = await fetch('/api/folders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: folderName, parentId }),
        });
        const folderData: any = await folderRes.json();
        if (folderData.success && folderData.folder) {
          existingFolder = folderData.folder;
          localFiles.push(folderData.folder);
        }
      } catch {}
    }

    if (existingFolder) {
      parentId = existingFolder.id;
      folderIdCache.set(currentPathAcc, existingFolder.id);
    }
  }

  return parentId;
}

/* ─── Terminal Style File List Item ─── */
const TerminalFileListItem: React.FC<{
  file: FileRecord;
  isSelected: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onPreview: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  itemRef?: (node: HTMLDivElement | null) => void;
}> = ({ file, isSelected, onSelect, onMouseEnter, onMouseLeave, onPreview, onContextMenu, itemRef }) => {
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
      ref={itemRef}
      onClick={onSelect}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onDoubleClick={onPreview}
      onContextMenu={onContextMenu}
      className={`group flex items-center justify-between px-4 py-2.5 rounded-lg cursor-pointer transition-all duration-100 font-mono text-xs select-none border ${
        isSelected
          ? 'bg-[#18181c] border-[#ff2b38] text-white shadow-sm'
          : 'bg-[#0a0a0c] border-zinc-900 hover:bg-[#121215] hover:border-zinc-800 text-zinc-300'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <CategoryIcon
          className={`w-4 h-4 shrink-0 transition-colors ${
            isSelected ? 'text-[#ff2b38]' : 'text-zinc-500 group-hover:text-zinc-300'
          }`}
        />
        <span className="font-medium truncate" title={file.name}>
          {displayName}
        </span>
      </div>

      <div className="flex items-center gap-6 text-[11px] shrink-0 text-zinc-500">
        <span className="px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 font-mono text-[10px] uppercase">
          {file.provider}
        </span>
        <span className="w-20 text-right font-mono">{formatBytes(file.size)}</span>
      </div>
    </div>
  );
};

export default function Home() {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [commandInput, setCommandInput] = useState('');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [hoveredFile, setHoveredFile] = useState<FileRecord | null>(null);

  // Authentication State (Starts locked on every visit)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Terminal History Logs
  const [terminalLogs, setTerminalLogs] = useState<{ id: string; type: 'input' | 'output' | 'error'; text: string }[]>([
    { id: 'lock_notice', type: 'error', text: '[LOCKED] Type /pass <password> to unlock Xdrive' },
  ]);

  // Modals
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file: FileRecord } | null>(null);
  const [renameTarget, setRenameTarget] = useState<FileRecord | null>(null);
  const [moveTarget, setMoveTarget] = useState<FileRecord | null>(null);
  const [previewTarget, setPreviewTarget] = useState<FileRecord | null>(null);

  // Upload & metrics
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [metrics, setMetrics] = useState<StorageMetrics | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const terminalInputRef = useRef<HTMLInputElement>(null);
  const selectedItemRef = useRef<HTMLDivElement | null>(null);

  // Data fetching (only runs after authentication)
  const loadMetrics = useCallback(async () => {
    try {
      const res = await fetch('/api/storage');
      const data = await res.json();
      if (data.success) setMetrics(data.metrics);
    } catch {}
  }, []);

  const loadFiles = useCallback(async () => {
    try {
      const res = await fetch('/api/files?all=true&sort=name_asc');
      const data = await res.json();
      if (data.success) {
        setFiles(data.files);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadFiles();
      loadMetrics();
    }
  }, [isAuthenticated, loadFiles, loadMetrics]);

  const addLog = (type: 'input' | 'output' | 'error', text: string) => {
    setTerminalLogs((prev) => [...prev, { id: `log_${Date.now()}_${Math.random()}`, type, text }]);
  };

  // Upload Handling
  const handleUploadFiles = async (fileList: FileList | File[]) => {
    if (!isAuthenticated) {
      addLog('error', '[LOCKED] Authenticate first with /pass <password>');
      return;
    }

    const fileArray = Array.from(fileList).filter((file) => {
      return file && file.name && typeof file.size === 'number';
    });
    if (fileArray.length === 0) return;

    for (const file of fileArray) {
      if (file.size === 0 && !file.type && !file.name.includes('.')) {
        continue;
      }

      const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      setUploads((prev) => [{ id: uploadId, name: file.name, size: file.size, progress: 10, status: 'uploading' }, ...prev]);
      addLog('output', `[UPLOAD] Starting upload: ${file.name}`);

      let targetParentId: string | null = null;
      if (file.webkitRelativePath) {
        try {
          targetParentId = await ensureFolderPath(file.webkitRelativePath, files);
        } catch {}
      }

      const formData = new FormData();
      formData.append('file', file);
      if (targetParentId) {
        formData.append('parentId', targetParentId);
      }

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
            addLog('output', `[SUCCESS] Uploaded "${file.name}" to ${data.file.provider}`);
            loadFiles();
            loadMetrics();
          } else {
            setUploads((prev) => prev.map((item) => (item.id === uploadId ? { ...item, progress: 100, status: 'error', errorMsg: data.error || 'Upload failed' } : item)));
            addLog('error', `[ERROR] Failed uploading "${file.name}": ${data.error || 'Upload failed'}`);
          }
        } catch {
          setUploads((prev) => prev.map((item) => (item.id === uploadId ? { ...item, progress: 100, status: 'error', errorMsg: 'Parse error' } : item)));
          addLog('error', `[ERROR] Parse error uploading "${file.name}"`);
        }
      };
      xhr.onerror = () => {
        setUploads((prev) => prev.map((item) => (item.id === uploadId ? { ...item, progress: 100, status: 'error', errorMsg: 'Upload failed' } : item)));
        addLog('error', `[ERROR] Network error uploading "${file.name}"`);
      };
      xhr.send(formData);
    }
  };

  const handleDownload = (file: FileRecord) => {
    if (!isAuthenticated) return;
    const a = document.createElement('a');
    if (file.is_folder === 1) {
      addLog('output', `[DOWN] Initializing zip archive download for folder "${file.name}"...`);
      a.href = `/api/download/folder/${file.id}`;
      a.download = `${file.name}.zip`;
    } else {
      addLog('output', `[DOWN] Downloading file "${file.name}"...`);
      a.href = `/api/download/${file.id}`;
      a.download = file.name;
    }
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleRename = async (fileId: string, newName: string) => {
    if (!isAuthenticated) return;
    try {
      const res = await fetch(`/api/files/${fileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });
      const data = await res.json();
      if (data.success) {
        addLog('output', `[RENAME] Renamed item to "${newName}"`);
        loadFiles();
      }
    } catch {}
  };

  const handleMove = async (fileId: string, targetFolderId: string | null) => {
    if (!isAuthenticated) return;
    try {
      const res = await fetch(`/api/files/${fileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentId: targetFolderId }),
      });
      const data = await res.json();
      if (data.success) {
        addLog('output', `[MOVE] Moved item successfully`);
        loadFiles();
      }
    } catch {}
  };

  const handleDelete = async (file: FileRecord) => {
    if (!isAuthenticated) return;
    try {
      const res = await fetch(`/api/files/${file.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        addLog('output', `[DELETE] Deleted "${file.name}"`);
        loadFiles();
        loadMetrics();
      }
    } catch {}
  };

  // Helper to get all files in a folder recursively
  const getFilesForFolder = (folderId: string): FileRecord[] => {
    const allFolders = files.filter((f) => f.is_folder === 1);
    const targetFolderIds = new Set<string>([folderId]);

    let expanded = true;
    while (expanded) {
      expanded = false;
      for (const f of allFolders) {
        if (f.parent_id && targetFolderIds.has(f.parent_id) && !targetFolderIds.has(f.id)) {
          targetFolderIds.add(f.id);
          expanded = true;
        }
      }
    }

    return files.filter((f) => f.is_folder === 0 && f.parent_id && targetFolderIds.has(f.parent_id));
  };

  // Execute terminal CLI commands on Enter
  const handleTerminalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawInput = commandInput.trim();
    if (!rawInput) return;

    // Check for Slash Commands (e.g. /pass <pwd>, /all, /down <name>, /del <name>, /help)
    if (rawInput.startsWith('/')) {
      const fullContent = rawInput.substring(1).trim();
      const spaceIndex = fullContent.indexOf(' ');

      let command = fullContent;
      let targetArg = '';

      if (spaceIndex !== -1) {
        command = fullContent.substring(0, spaceIndex).toLowerCase();
        targetArg = fullContent.substring(spaceIndex + 1).trim();
      } else {
        command = fullContent.toLowerCase();
      }

      // Password Authentication Command: /pass <password>
      if (command === 'pass') {
        addLog('input', `xdrive:~$ /pass ${'*'.repeat(targetArg.length || 6)}`);
        try {
          const res = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: targetArg }),
          });
          const data = await res.json();
          if (data.success) {
            setIsAuthenticated(true);
            addLog('output', '[UNLOCKED] Access granted. Welcome to Xdrive CLI v6.9.0');
            setCommandInput('');
          } else {
            addLog('error', `[ERR] Invalid password. Type /pass <password>`);
          }
        } catch {
          addLog('error', `[ERR] Network error verifying password.`);
        }
        return;
      }

      // Block all other commands if not authenticated
      if (!isAuthenticated) {
        addLog('input', `xdrive:~$ ${rawInput}`);
        addLog('error', '[LOCKED] Access restricted. Type /pass <password> to unlock');
        return;
      }

      // Action Commands (/down <target> / /del <target>)
      if (['down', 'download'].includes(command)) {
        addLog('input', `xdrive:~$ ${rawInput}`);
        const targetLower = targetArg.toLowerCase();
        const matchingFolder = files.find(
          (f) => f.is_folder === 1 && (f.name.toLowerCase() === targetLower || f.name.toLowerCase().includes(targetLower))
        );
        const matchingFile = files.find(
          (f) =>
            f.is_folder === 0 &&
            (f.name.toLowerCase() === targetLower ||
              getDisplayName(f.name).toLowerCase() === targetLower ||
              f.name.toLowerCase().includes(targetLower))
        );

        if (matchingFolder) {
          handleDownload(matchingFolder);
        } else if (matchingFile) {
          handleDownload(matchingFile);
        } else {
          addLog('error', `[ERR] No file or folder found matching "${targetArg}"`);
        }
        return;
      }

      if (['del', 'delete', 'remove', 'rm'].includes(command)) {
        addLog('input', `xdrive:~$ ${rawInput}`);
        const targetLower = targetArg.toLowerCase();
        const matchingFolder = files.find(
          (f) => f.is_folder === 1 && (f.name.toLowerCase() === targetLower || f.name.toLowerCase().includes(targetLower))
        );
        const matchingFile = files.find(
          (f) =>
            f.is_folder === 0 &&
            (f.name.toLowerCase() === targetLower ||
              getDisplayName(f.name).toLowerCase() === targetLower ||
              f.name.toLowerCase().includes(targetLower))
        );

        const targetToDelete = matchingFolder || matchingFile;
        if (targetToDelete) {
          await handleDelete(targetToDelete);
        } else {
          addLog('error', `[ERR] No file or folder found matching "${targetArg}"`);
        }
        return;
      }

      if (['help', '?'].includes(command)) {
        addLog('input', `xdrive:~$ ${rawInput}`);
        addLog('output', '── Xdrive Command Prompt Help ──');
        addLog('output', '  /pass <password>      Authenticate terminal session');
        addLog('output', '  /all                  List all uploaded files');
        addLog('output', '  /vid, /img, /aud, /txt Filter files by category');
        addLog('output', '  /foldername           View files inside a folder');
        addLog('output', '  /down <file/folder>   Download file or zip folder');
        addLog('output', '  /del <file/folder>    Delete file or folder');
        addLog('output', '  clear, cls            Clear terminal log screen');
        return;
      }
    }

    if (!isAuthenticated) {
      addLog('input', `xdrive:~$ ${rawInput}`);
      addLog('error', '[LOCKED] Access restricted. Type /pass <password> to unlock');
      return;
    }

    const lower = rawInput.toLowerCase();

    if (['help', '?'].includes(lower)) {
      addLog('input', `xdrive:~$ ${rawInput}`);
      addLog('output', '── Xdrive Command Prompt Help ──');
      addLog('output', '  /pass <password>      Authenticate terminal session');
      addLog('output', '  /all                  List all uploaded files');
      addLog('output', '  /vid, /img, /aud, /txt Filter files by category');
      addLog('output', '  /foldername           View files inside a folder');
      addLog('output', '  /down <file/folder>   Download file or zip folder');
      addLog('output', '  /del <file/folder>    Delete file or folder');
      addLog('output', '  clear, cls            Clear terminal log screen');
      return;
    }

    if (['clear', 'cls'].includes(lower)) {
      setTerminalLogs([]);
      setCommandInput('');
      return;
    }

    const filtered = getFilteredFiles();
    if (filtered.length > 0 && selectedIndex < filtered.length) {
      setPreviewTarget(filtered[selectedIndex]);
    }
  };

  // Search logic — requiring '/' prefix for keywords (/vid, /img, /aud, /txt, /all, /down <name>, /del <name>, or /foldername)
  const getFilteredFiles = () => {
    if (!isAuthenticated) return [];
    const q = commandInput.trim().toLowerCase();
    if (!q) return [];

    const regularFiles = files.filter((f) => f.is_folder === 0);

    if (q.startsWith('/')) {
      const fullContent = q.substring(1).trim();
      const spaceIndex = fullContent.indexOf(' ');

      let command = fullContent;
      let targetArg = '';

      if (spaceIndex !== -1) {
        command = fullContent.substring(0, spaceIndex).toLowerCase();
        targetArg = fullContent.substring(spaceIndex + 1).trim().toLowerCase();
      } else {
        command = fullContent.toLowerCase();
      }

      // Action Commands (/down <target> / /del <target>)
      if (['down', 'download', 'del', 'delete', 'remove', 'rm'].includes(command) && targetArg) {
        const matchingFolder = files.find(
          (f) => f.is_folder === 1 && (f.name.toLowerCase() === targetArg || f.name.toLowerCase().includes(targetArg))
        );

        if (matchingFolder) {
          return getFilesForFolder(matchingFolder.id);
        }

        return regularFiles.filter(
          (f) =>
            f.name.toLowerCase().includes(targetArg) ||
            getDisplayName(f.name).toLowerCase().includes(targetArg)
        );
      }

      // Keyword Category Filters
      if (command === 'all') {
        return regularFiles;
      }
      if (['vid', 'video', 'videos'].includes(command)) {
        return regularFiles.filter(
          (f) =>
            f.mime_type?.startsWith('video/') ||
            ['mp4', 'mov', 'mkv', 'webm', 'avi'].some((ext) => f.name.toLowerCase().endsWith('.' + ext))
        );
      }
      if (['img', 'image', 'images', 'photo', 'photos', 'pic', 'pics'].includes(command)) {
        return regularFiles.filter(
          (f) =>
            f.mime_type?.startsWith('image/') ||
            ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].some((ext) => f.name.toLowerCase().endsWith('.' + ext))
        );
      }
      if (['aud', 'audio', 'sound', 'music', 'song', 'songs'].includes(command)) {
        return regularFiles.filter(
          (f) =>
            f.mime_type?.startsWith('audio/') ||
            ['mp3', 'wav', 'flac', 'm4a', 'ogg'].some((ext) => f.name.toLowerCase().endsWith('.' + ext))
        );
      }
      if (['txt', 'text', 'doc', 'docs', 'document', 'documents', 'pdf'].includes(command)) {
        return regularFiles.filter(
          (f) =>
            f.mime_type?.startsWith('text/') ||
            ['txt', 'md', 'json', 'js', 'ts', 'py', 'html', 'css', 'pdf', 'doc', 'docx'].some((ext) =>
              f.name.toLowerCase().endsWith('.' + ext)
            )
        );
      }

      // Check if /keyword matches a folder name (e.g. /Documents)
      const allFolders = files.filter((f) => f.is_folder === 1);
      const matchingFolders = allFolders.filter(
        (folder) => folder.name.toLowerCase() === command || folder.name.toLowerCase().includes(command)
      );

      if (matchingFolders.length > 0) {
        const targetFolderIds = new Set(matchingFolders.map((f) => f.id));

        let expanded = true;
        while (expanded) {
          expanded = false;
          for (const f of allFolders) {
            if (f.parent_id && targetFolderIds.has(f.parent_id) && !targetFolderIds.has(f.id)) {
              targetFolderIds.add(f.id);
              expanded = true;
            }
          }
        }

        return regularFiles.filter((file) => file.parent_id && targetFolderIds.has(file.parent_id));
      }
    }

    // Default search by filename if no '/' prefix
    return regularFiles.filter((f) => f.name.toLowerCase().includes(q));
  };

  const isQueryActive = isAuthenticated && commandInput.trim().length > 0;
  const filteredFiles = getFilteredFiles();

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [commandInput]);

  // Scroll selected item into view automatically
  useEffect(() => {
    if (selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  const isSpacePeekingRef = useRef<boolean>(false);

  // Spacebar Quick Look peek functionality STRICTLY on hover over a file item
  useEffect(() => {
    const handleWindowKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ' || e.keyCode === 32) {
        // ONLY trigger peek if mouse is currently hovering over a file
        if (hoveredFile && !isSpacePeekingRef.current) {
          e.preventDefault();
          isSpacePeekingRef.current = true;
          setPreviewTarget(hoveredFile);
        }
      }
    };

    const handleWindowKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ' || e.keyCode === 32) {
        if (isSpacePeekingRef.current) {
          e.preventDefault();
          isSpacePeekingRef.current = false;
          setPreviewTarget(null);
        }
      }
    };

    window.addEventListener('keydown', handleWindowKeyDown);
    window.addEventListener('keyup', handleWindowKeyUp);

    return () => {
      window.removeEventListener('keydown', handleWindowKeyDown);
      window.removeEventListener('keyup', handleWindowKeyUp);
    };
  }, [hoveredFile]);

  // Keyboard navigation for Up / Down Arrow keys
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isQueryActive || filteredFiles.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredFiles.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredFiles.length) % filteredFiles.length);
    }
  };

  const usedPercent = metrics ? Math.min(100, Math.round((metrics.combined.used / metrics.combined.total) * 100)) : 0;
  const usedBytes = metrics?.combined.used || 0;
  const totalBytes = metrics?.combined.total || 0;

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      onClick={() => terminalInputRef.current?.focus()}
      className="h-screen w-screen bg-[#000000] text-zinc-300 font-mono overflow-hidden flex flex-col select-none"
    >
      <DropZoneOverlay onFilesDropped={handleUploadFiles} />

      {/* Hidden File Picker Input */}
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

      {/* Hidden Folder Picker Input */}
      <input
        type="file"
        ref={folderInputRef}
        {...({ webkitdirectory: '', directory: '' } as any)}
        className="hidden"
        onChange={(e) => {
          if (e.target.files) {
            handleUploadFiles(e.target.files);
            e.target.value = '';
          }
        }}
      />

      {/* ── Top Bar Header ── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-900 bg-black/80 z-10">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-4 h-4 text-[#ff2b38]" />
          <span className="text-xs font-bold text-white tracking-wide uppercase">XDRIVE PROMPT</span>
          <span className="text-[10px] text-zinc-600 font-medium">v6.9.0</span>
          {isAuthenticated ? (
            <span className="flex items-center gap-1 ml-3 px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 text-[10px]">
              <Unlock className="w-3 h-3" /> UNLOCKED
            </span>
          ) : (
            <span className="flex items-center gap-1 ml-3 px-1.5 py-0.5 rounded bg-red-950/60 border border-red-800/60 text-red-400 text-[10px]">
              <Lock className="w-3 h-3" /> LOCKED
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              if (!isAuthenticated) {
                addLog('error', '[LOCKED] Authenticate first with /pass <password>');
                return;
              }
              const choice = window.prompt('Type "folder" to upload a folder, or press OK to upload files');
              if (choice === null) return;
              if (choice.trim().toLowerCase() === 'folder') {
                folderInputRef.current?.click();
              } else {
                fileInputRef.current?.click();
              }
            }}
            className="w-8 h-8 rounded-full bg-[#ff2b38] hover:bg-[#ff3d4a] flex items-center justify-center transition-colors shadow-sm"
            title="Upload file or folder"
          >
            <Plus className="w-4 h-4 text-white stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* ── Main Terminal Command Prompt Container ── */}
      <main className="flex-1 overflow-y-auto px-6 py-3 flex flex-col items-start justify-start">
        {/* Command Output Logs */}
        {terminalLogs.length > 0 && (
          <div className="w-full max-w-4xl space-y-1.5 mb-2 text-xs font-mono">
            {terminalLogs.map((log) => (
              <div key={log.id} className="leading-relaxed">
                {log.type === 'input' ? (
                  <span className="text-[#ff2b38] font-bold">{log.text}</span>
                ) : log.type === 'error' ? (
                  <span className="text-red-400">{log.text}</span>
                ) : (
                  <span className="text-zinc-400">{log.text}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Live Active Command Prompt Input Line */}
        <form onSubmit={handleTerminalSubmit} className="w-full max-w-4xl flex items-center gap-2 text-sm font-mono mb-2">
          <span className="text-[#ff2b38] font-bold shrink-0">xdrive:~$</span>
          <div className="relative flex-1 flex items-center">
            <input
              ref={terminalInputRef}
              type="text"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={!isAuthenticated ? "Enter pass first.." : ""}
              autoFocus
              className="w-full bg-transparent text-white placeholder-zinc-700 outline-none border-none font-mono text-sm caret-[#ff2b38]"
            />
          </div>
        </form>

        {/* Dynamic File LIST View (Navigable with Arrow Keys / Peek strictly on Hover) */}
        {isQueryActive && (
          <div className="w-full max-w-4xl mt-1 border-t border-zinc-900/80 pt-4">
            <div className="flex items-center justify-between mb-3 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
              <span>Matching Results ({filteredFiles.length})</span>
            </div>

            {filteredFiles.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-zinc-600 text-xs font-mono">
                  [NO MATCHES FOUND FOR "{commandInput}"]
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 w-full">
                {filteredFiles.map((file, idx) => {
                  const isSelected = idx === selectedIndex;
                  return (
                    <TerminalFileListItem
                      key={file.id}
                      file={file}
                      isSelected={isSelected}
                      itemRef={isSelected ? (node) => { selectedItemRef.current = node; } : undefined}
                      onSelect={(e) => {
                        e.stopPropagation();
                        setSelectedIndex(idx);
                      }}
                      onMouseEnter={() => setHoveredFile(file)}
                      onMouseLeave={() => setHoveredFile(null)}
                      onPreview={() => setPreviewTarget(file)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedIndex(idx);
                        setContextMenu({ x: e.clientX, y: e.clientY, file });
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── OLED Terminal Bottom Bar ── */}
      <div className="fixed bottom-0 left-0 right-0 flex flex-col items-center gap-1.5 pb-5 pt-6 bg-black border-t border-zinc-900 pointer-events-none z-20 font-mono">
        <span className="text-[11px] font-bold text-zinc-400 tracking-wider uppercase">
          {usedPercent}% MEMORY USED
          <span className="text-zinc-600 ml-2 font-normal text-[10px]">
            [{formatBytes(usedBytes)} / {formatBytes(totalBytes)}]
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
