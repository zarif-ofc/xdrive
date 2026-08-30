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
import { Plus, File, Video, Image as ImageIcon, Music, FileText, Terminal as TerminalIcon, Loader2, Folder } from 'lucide-react';

/* Helper to strip extension from filename */
const getDisplayName = (filename: string) => {
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex <= 0) return filename;
  return filename.substring(0, lastDotIndex);
};

/* Cache folder paths created during session */
const folderIdCache = new Map<string, string>();
const folderCreationPromises = new Map<string, Promise<string | null>>();

async function ensureFolderPath(relativePath: string, currentFilesList: FileRecord[]): Promise<string | null> {
  const parts = relativePath.split('/').filter(Boolean);
  if (parts.length <= 1) return null;

  const folderNames = parts.slice(0, -1);
  let parentId: string | null = null;
  let currentPathAcc = '';

  for (const folderName of folderNames) {
    currentPathAcc = currentPathAcc ? `${currentPathAcc}/${folderName}` : folderName;

    if (folderIdCache.has(currentPathAcc)) {
      parentId = folderIdCache.get(currentPathAcc)!;
      continue;
    }

    if (folderCreationPromises.has(currentPathAcc)) {
      parentId = await folderCreationPromises.get(currentPathAcc)!;
      continue;
    }

    const currentParentId = parentId;
    const creationPromise = (async () => {
      let existingFolder: FileRecord | undefined = currentFilesList.find(
        (f) =>
          f.is_folder === 1 &&
          f.name.toLowerCase() === folderName.toLowerCase() &&
          (currentParentId ? f.parent_id === currentParentId : !f.parent_id || f.parent_id === 'root')
      );

      if (!existingFolder) {
        try {
          const folderRes: Response = await fetch('/api/folders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: folderName, parentId: currentParentId }),
          });
          const folderData: any = await folderRes.json();
          if (folderData.success && folderData.folder) {
            existingFolder = folderData.folder;
            currentFilesList.push(folderData.folder);
          }
        } catch {}
      }

      if (existingFolder) {
        folderIdCache.set(currentPathAcc, existingFolder.id);
        return existingFolder.id;
      }
      return null;
    })();

    folderCreationPromises.set(currentPathAcc, creationPromise);
    parentId = await creationPromise;
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
      className={`group flex items-center justify-between px-3.5 sm:px-5 py-2.5 sm:py-3.5 rounded-xl cursor-pointer transition-colors duration-150 font-mono text-xs sm:text-sm select-none border gap-2.5 sm:gap-4 ${
        isSelected
          ? 'bg-[#151518] border-zinc-700 text-white shadow-sm'
          : 'bg-[#08080a] border-zinc-900 hover:bg-[#101014] hover:border-zinc-800 text-zinc-300'
      }`}
    >
      <div className="flex items-center gap-2.5 sm:gap-4 min-w-0 flex-1">
        <CategoryIcon
          className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 transition-colors duration-150 ${
            isSelected ? 'text-[#ff2b38]' : 'text-zinc-500 group-hover:text-zinc-300'
          }`}
        />
        <span className="font-medium truncate text-xs sm:text-sm tracking-tight" title={file.name}>
          {displayName}
        </span>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-6 text-[10px] sm:text-xs shrink-0 text-zinc-500">
        <span className="px-1.5 sm:px-2 py-0.5 rounded bg-zinc-900/90 border border-zinc-800/60 text-zinc-400 font-mono text-[9px] sm:text-xs uppercase font-medium">
          {file.provider}
        </span>
        <span className="w-16 sm:w-24 text-right font-mono text-[10px] sm:text-xs text-zinc-400">{formatBytes(file.size)}</span>
      </div>
    </div>
  );
};

/* ─── Terminal Style File List Item Skeleton ─── */
const TerminalFileListSkeleton: React.FC = () => (
  <div className="flex flex-col gap-1.5 sm:gap-2 w-full select-none">
    {[1, 2, 3, 4, 5].map((i) => (
      <div
        key={i}
        className="group flex items-center justify-between px-3.5 sm:px-5 py-2.5 sm:py-3.5 rounded-xl border border-zinc-900/80 bg-[#08080a] relative overflow-hidden gap-2.5 sm:gap-4"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-800/15 to-transparent animate-shimmer" />
        <div className="flex items-center gap-2.5 sm:gap-4 min-w-0 flex-1">
          <div className="w-4 h-4 sm:w-5 sm:h-5 rounded bg-zinc-850 animate-pulse shrink-0" />
          <div
            className="h-3.5 sm:h-4 bg-zinc-850/80 rounded animate-pulse"
            style={{ width: `${35 + ((i * 17) % 35)}%` }}
          />
        </div>
        <div className="flex items-center gap-2.5 sm:gap-6 shrink-0">
          <div className="w-10 sm:w-14 h-4 sm:h-5 rounded bg-zinc-900 animate-pulse" />
          <div className="w-12 sm:w-16 h-3.5 sm:h-4 rounded bg-zinc-850/60 animate-pulse" />
        </div>
      </div>
    ))}
  </div>
);

export default function Home() {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [commandInput, setCommandInput] = useState('');
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [isNavigatingFiles, setIsNavigatingFiles] = useState<boolean>(false);
  const [hoveredFile, setHoveredFile] = useState<FileRecord | null>(null);

  // Async Loading States
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // rm -rf Confirmation State
  const [isAwaitingRmRfPass, setIsAwaitingRmRfPass] = useState<boolean>(false);

  // Authentication State (Starts locked on every visit)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Terminal History Logs
  const [terminalLogs, setTerminalLogs] = useState<{ id: string; type: 'input' | 'output' | 'error'; text: string }[]>([]);

  // Modals & Menus
  const [isUploadMenuOpen, setIsUploadMenuOpen] = useState<boolean>(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file: FileRecord } | null>(null);
  const [renameTarget, setRenameTarget] = useState<FileRecord | null>(null);
  const [moveTarget, setMoveTarget] = useState<FileRecord | null>(null);
  const [previewTarget, setPreviewTarget] = useState<FileRecord | null>(null);

  // Upload & metrics
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [metrics, setMetrics] = useState<StorageMetrics | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const uploadMenuRef = useRef<HTMLDivElement>(null);
  const terminalInputRef = useRef<HTMLInputElement>(null);
  const selectedItemRef = useRef<HTMLDivElement | null>(null);
  const mainContainerRef = useRef<HTMLElement>(null);

  // Close upload menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (uploadMenuRef.current && !uploadMenuRef.current.contains(event.target as Node)) {
        setIsUploadMenuOpen(false);
      }
    }
    if (isUploadMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUploadMenuOpen]);

  // Data fetching (only runs after authentication)
  const loadMetrics = useCallback(async () => {
    try {
      const res = await fetch('/api/storage');
      const data = await res.json();
      if (data.success) setMetrics(data.metrics);
    } catch {}
  }, []);

  const loadFiles = useCallback(async () => {
    setIsLoadingFiles(true);
    try {
      const res = await fetch('/api/files?all=true&sort=name_asc');
      const data = await res.json();
      if (data.success && Array.isArray(data.files)) {
        setFiles((prev) => {
          const newFilesMap = new Map<string, FileRecord>(data.files.map((f: FileRecord) => [f.id, f]));
          prev.forEach((f) => {
            if (!newFilesMap.has(f.id)) {
              newFilesMap.set(f.id, f);
            }
          });
          return Array.from(newFilesMap.values());
        });
      }
    } catch {} finally {
      setIsLoadingFiles(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadFiles();
      loadMetrics();
      
      // Automatically run a background cloud sync to pull in any pre-existing MEGA/Filen files
      setIsSyncing(true);
      fetch('/api/sync', { method: 'POST' })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.syncedCount > 0) {
            loadFiles();
            loadMetrics();
          }
        })
        .catch(() => {})
        .finally(() => setIsSyncing(false));
    }
  }, [isAuthenticated, loadFiles, loadMetrics]);

  // Check localStorage for saved device authentication on mount
  useEffect(() => {
    try {
      const savedPass = localStorage.getItem('xdrive_auth_pass');
      if (savedPass) {
        fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: savedPass }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              setIsAuthenticated(true);
            } else {
              localStorage.removeItem('xdrive_auth_pass');
            }
          })
          .catch(() => {});
      }
    } catch {}
  }, []);

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
        let data: any = null;
        try {
          data = JSON.parse(xhr.responseText);
        } catch {}

        if (xhr.status >= 200 && xhr.status < 300 && data && data.success && data.file) {
          setUploads((prev) => prev.map((item) => (item.id === uploadId ? { ...item, progress: 100, status: 'completed', provider: data.file.provider } : item)));
          addLog('output', `[SUCCESS] Uploaded "${file.name}" to ${data.file.provider}`);
          setFiles((prev) => {
            if (prev.some((f) => f.id === data.file.id)) return prev;
            return [...prev, data.file];
          });
          loadFiles();
          loadMetrics();
        } else {
          const isVercelLimit = xhr.status === 413 || (file.size > 4.4 * 1024 * 1024 && xhr.status >= 400);
          const errMsg = data?.error || (isVercelLimit ? 'File exceeds Vercel 4.5MB Serverless limit' : `Upload failed (${xhr.status})`);
          setUploads((prev) => prev.map((item) => (item.id === uploadId ? { ...item, progress: 100, status: 'error', errorMsg: errMsg } : item)));
          addLog('error', `[ERROR] Failed uploading "${file.name}": ${errMsg}`);
        }
      };
      xhr.onerror = () => {
        setUploads((prev) => prev.map((item) => (item.id === uploadId ? { ...item, progress: 100, status: 'error', errorMsg: 'Network error' } : item)));
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

    // Handle password confirmation for /rm -rf wipe command
    if (isAwaitingRmRfPass) {
      addLog('input', `xdrive:~$ ${'*'.repeat(rawInput.length)}`);
      addLog('output', '[WIPING] Authenticating & purging all files from MEGA, Filen & Database...');
      setCommandInput('');
      setIsAwaitingRmRfPass(false);
      setIsSyncing(true);
      try {
        const res = await fetch('/api/wipe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: rawInput }),
        });
        const data = await res.json();
        if (data.success) {
          addLog('output', 'Wiped successfully');
          setFiles([]);
          loadMetrics();
        } else {
          addLog('error', `[ERR] Wipe cancelled: ${data.error || 'Invalid password'}`);
        }
      } catch (err: any) {
        addLog('error', `[ERR] Wipe error: ${err.message}`);
      } finally {
        setIsSyncing(false);
      }
      return;
    }

    // Check for Slash Commands (e.g. /pass <pwd>, /all, /down <name>, /del <name>, /rm -rf, /help)
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

      // /rm -rf Total Purge Command
      if (rawInput === '/rm -rf' || rawInput.startsWith('/rm -rf ') || (command === 'rm' && targetArg.startsWith('-rf'))) {
        addLog('input', `xdrive:~$ ${rawInput}`);
        const inlinePass = rawInput.startsWith('/rm -rf ')
          ? rawInput.substring(8).trim()
          : targetArg.startsWith('-rf ')
          ? targetArg.substring(4).trim()
          : '';

        if (inlinePass) {
          addLog('output', '[WIPING] Authenticating & purging all files from MEGA, Filen & Database...');
          setCommandInput('');
          setIsSyncing(true);
          try {
            const res = await fetch('/api/wipe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ password: inlinePass }),
            });
            const data = await res.json();
            if (data.success) {
              addLog('output', 'Wiped successfully');
              setFiles([]);
              loadMetrics();
            } else {
              addLog('error', `[ERR] Wipe cancelled: ${data.error || 'Invalid password'}`);
            }
          } catch (err: any) {
            addLog('error', `[ERR] Wipe error: ${err.message}`);
          } finally {
            setIsSyncing(false);
          }
          return;
        }

        // Ask for access pass
        addLog('error', '[WARNING] This will PERMANENTLY DELETE every single file & folder from MEGA & Filen.');
        addLog('output', 'Enter access password to confirm /rm -rf:');
        setIsAwaitingRmRfPass(true);
        setCommandInput('');
        return;
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
            try {
              localStorage.setItem('xdrive_auth_pass', targetArg);
            } catch {}
            setIsAuthenticated(true);
            addLog('output', '[UNLOCKED] Access granted. Remembered on this device.');
            setCommandInput('');
          } else {
            addLog('error', `[ERR] Invalid password. Type /pass <password>`);
          }
        } catch {
          addLog('error', `[ERR] Network error verifying password.`);
        }
        return;
      }

      // Logout / Lock Command: /lock or /logout
      if (['lock', 'logout'].includes(command)) {
        addLog('input', `xdrive:~$ ${rawInput}`);
        try {
          localStorage.removeItem('xdrive_auth_pass');
        } catch {}
        setIsAuthenticated(false);
        setCommandInput('');
        addLog('error', '[LOCKED] Device logged out. Type /pass <password> to unlock');
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

      if (command === 'sync') {
        addLog('input', `xdrive:~$ ${rawInput}`);
        addLog('output', '[SYNC] Starting global synchronization from MEGA & Filen...');
        setCommandInput('');
        setIsSyncing(true);
        try {
          const res = await fetch('/api/sync', { method: 'POST' });
          const data = await res.json();
          if (data.success) {
            addLog('output', `[SUCCESS] ${data.message}`);
            loadFiles();
            loadMetrics();
          } else {
            addLog('error', `[ERR] Sync failed: ${data.error}`);
          }
        } catch (err: any) {
          addLog('error', `[ERR] Sync failed: ${err.message}`);
        } finally {
          setIsSyncing(false);
        }
        return;
      }

      if (['help', '?'].includes(command)) {
        addLog('input', `xdrive:~$ ${rawInput}`);
        addLog('output', '── Xdrive Command Prompt Help ──');
        addLog('output', '  /pass <password>      Authenticate terminal session');
        addLog('output', '  /all                  List all uploaded files (MEGA, Filen, Local)');
        addLog('output', '  /vid, /img, /aud, /txt Filter files by category');
        addLog('output', '  /mega, /filen, /local Filter files by storage provider');
        addLog('output', '  /foldername           View files inside a folder');
        addLog('output', '  /down <file/folder>   Download file or zip folder');
        addLog('output', '  /del <file/folder>    Delete file or folder');
        addLog('output', '  /rm -rf               Purge all files from MEGA, Filen & Database');
        addLog('output', '  /sync                 Sync pre-existing files from cloud providers');
        addLog('output', '  /lock, /logout        Lock device and end session');
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
      addLog('output', '  /all                  List all uploaded files (MEGA, Filen, Local)');
      addLog('output', '  /vid, /img, /aud, /txt Filter files by category');
      addLog('output', '  /mega, /filen, /local Filter files by storage provider');
      addLog('output', '  /foldername           View files inside a folder');
      addLog('output', '  /down <file/folder>   Download file or zip folder');
      addLog('output', '  /del <file/folder>    Delete file or folder');
      addLog('output', '  /sync                 Sync pre-existing files from cloud providers');
      addLog('output', '  clear, cls            Clear terminal log screen');
      return;
    }

    if (['clear', 'cls'].includes(lower)) {
      setTerminalLogs([]);
      setCommandInput('');
      return;
    }

    const filtered = getFilteredFiles();
    if (isNavigatingFiles && filtered.length > 0 && selectedIndex >= 0 && selectedIndex < filtered.length) {
      setPreviewTarget(filtered[selectedIndex]);
    }
  };

  // Search logic — requiring '/' prefix for keywords (/vid, /img, /aud, /txt, /all, /down <name>, /del <name>, or /foldername)
  const getFilteredFiles = () => {
    if (!isAuthenticated) return [];
    const q = commandInput.trim().toLowerCase();
    if (!q) return [];

    const regularFiles = files.filter((f) => Number(f.is_folder) === 0 || !f.is_folder);

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

      // Provider Filters
      if (command === 'mega') {
        return regularFiles.filter((f) => f.provider === 'MEGA');
      }
      if (command === 'filen') {
        return regularFiles.filter((f) => f.provider === 'FILEN');
      }
      if (command === 'local') {
        return regularFiles.filter((f) => f.provider === 'LOCAL');
      }

      // Check if /keyword matches a folder name (e.g. /Documents)
      const allFolders = files.filter((f) => Number(f.is_folder) === 1);
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

        const folderFiles = regularFiles.filter((file) => file.parent_id && targetFolderIds.has(file.parent_id));
        const nameMatches = regularFiles.filter((f) => f.name.toLowerCase().includes(command));
        return Array.from(new Set([...folderFiles, ...nameMatches]));
      }
    }

    // Default search by filename, display name, or provider
    return regularFiles.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.provider.toLowerCase().includes(q) ||
        getDisplayName(f.name).toLowerCase().includes(q)
    );
  };

  const isQueryActive = isAuthenticated && commandInput.trim().length > 0;
  const filteredFiles = getFilteredFiles();

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(-1);
    setIsNavigatingFiles(false);
  }, [commandInput]);

  // Scroll selected item into view strictly within the main scroll container
  useEffect(() => {
    if (isNavigatingFiles && selectedItemRef.current && mainContainerRef.current) {
      if (selectedIndex === 0) {
        mainContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      const container = mainContainerRef.current;
      const element = selectedItemRef.current;
      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();

      const relativeTop = elementRect.top - containerRect.top;
      const relativeBottom = elementRect.bottom - containerRect.top;

      if (relativeTop < 20) {
        container.scrollBy({ top: relativeTop - 30, behavior: 'smooth' });
      } else if (relativeBottom > container.clientHeight - 90) {
        container.scrollBy({ top: relativeBottom - container.clientHeight + 100, behavior: 'smooth' });
      }
    } else if (!isNavigatingFiles && mainContainerRef.current && selectedIndex === -1) {
      mainContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [selectedIndex, isNavigatingFiles]);

  const isSpacePeekingRef = useRef<boolean>(false);

  // Spacebar Quick Look peek functionality ONLY active when cursor is NOT visible (isNavigatingFiles === true)
  useEffect(() => {
    const handleWindowKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ' || e.keyCode === 32) {
        // Strict guard: if cursor is visible (!isNavigatingFiles), peek is disabled
        if (!isNavigatingFiles) return;

        const target = selectedIndex >= 0 && selectedIndex < filteredFiles.length ? filteredFiles[selectedIndex] : null;
        if (target && !isSpacePeekingRef.current) {
          e.preventDefault();
          isSpacePeekingRef.current = true;
          setPreviewTarget(target);
        }
        return;
      }

      // If ArrowUp is pressed while hovering/navigating on top file -> return to cursor
      if (e.key === 'ArrowUp' && (selectedIndex === 0 || (hoveredFile && filteredFiles[0]?.id === hoveredFile.id))) {
        e.preventDefault();
        setIsNavigatingFiles(false);
        setSelectedIndex(-1);
        setHoveredFile(null);
        terminalInputRef.current?.focus();
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
  }, [isNavigatingFiles, selectedIndex, filteredFiles, hoveredFile]);

  // Keyboard navigation for Up / Down Arrow keys
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isQueryActive || filteredFiles.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isNavigatingFiles) {
        setIsNavigatingFiles(true);
        setSelectedIndex(0);
      } else {
        setSelectedIndex((prev) => Math.min(prev + 1, filteredFiles.length - 1));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (isNavigatingFiles) {
        if (selectedIndex > 0) {
          setSelectedIndex((prev) => prev - 1);
        } else {
          // Reached top file and pressed Up -> return to command prompt input with cursor visible
          setIsNavigatingFiles(false);
          setSelectedIndex(-1);
          setHoveredFile(null);
          terminalInputRef.current?.focus();
        }
      } else {
        setIsNavigatingFiles(false);
        setSelectedIndex(-1);
        setHoveredFile(null);
        terminalInputRef.current?.focus();
      }
    } else if (e.key === ' ' || e.code === 'Space') {
      // If cursor is off (navigating files), intercept space for peeking
      if (isNavigatingFiles) {
        e.preventDefault();
        const target = selectedIndex >= 0 && selectedIndex < filteredFiles.length ? filteredFiles[selectedIndex] : null;
        if (target && !isSpacePeekingRef.current) {
          isSpacePeekingRef.current = true;
          setPreviewTarget(target);
        }
      }
      // If cursor is visible, do not preventDefault - space works for normal typing
    } else if (e.key === 'Enter') {
      if (isNavigatingFiles && selectedIndex >= 0 && selectedIndex < filteredFiles.length) {
        e.preventDefault();
        setPreviewTarget(filteredFiles[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      if (isNavigatingFiles) {
        e.preventDefault();
        setIsNavigatingFiles(false);
        setSelectedIndex(-1);
      }
    }
  };

  const usedPercent = metrics ? Math.min(100, Math.round((metrics.combined.used / metrics.combined.total) * 100)) : 0;
  const usedBytes = metrics?.combined.used || 0;
  const totalBytes = metrics?.combined.total || 0;

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      onClick={() => {
        setIsNavigatingFiles(false);
        setSelectedIndex(-1);
        terminalInputRef.current?.focus();
      }}
      className="h-screen w-full bg-[#000000] text-zinc-300 font-mono overflow-hidden flex flex-col select-none"
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

      {/* ── Top Bar Header (Permanently pinned at top) ── */}
      <header className="sticky top-0 z-30 shrink-0 flex items-center justify-between px-4 sm:px-8 py-3 sm:py-5 border-b border-zinc-900 bg-black">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <TerminalIcon className="w-4 h-4 sm:w-5 sm:h-5 text-[#ff2b38] shrink-0" />
          <span className="text-xs sm:text-base font-bold text-white tracking-wide uppercase truncate">XDRIVE PROMPT</span>
          <span className="text-[10px] sm:text-xs text-zinc-600 font-medium shrink-0">v6.9.0</span>
          {(isSyncing || isLoadingFiles) && (
            <Loader2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-zinc-500 animate-spin shrink-0" />
          )}
        </div>

        <div ref={uploadMenuRef} className="relative flex items-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!isAuthenticated) {
                addLog('error', '[LOCKED] Authenticate first with /pass <password>');
                return;
              }
              setIsUploadMenuOpen((prev) => !prev);
            }}
            className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-200 shadow-sm ${
              isUploadMenuOpen
                ? 'bg-zinc-800 text-white rotate-45'
                : 'bg-[#ff2b38] hover:bg-[#ff3d4a] text-white'
            }`}
            title="Upload options"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-white stroke-[2.5]" />
          </button>

          {/* Upload Choice Dropdown Menu */}
          {isUploadMenuOpen && (
            <div className="absolute right-0 top-10 sm:top-12 w-44 sm:w-48 bg-[#0d0d10] border border-zinc-800 rounded-xl shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 text-xs sm:text-sm font-mono overflow-hidden">
              <button
                onClick={() => {
                  setIsUploadMenuOpen(false);
                  fileInputRef.current?.click();
                }}
                className="w-full flex items-center gap-2.5 sm:gap-3 px-3 sm:px-3.5 py-2.5 text-zinc-300 hover:text-white hover:bg-[#18181c] transition-colors text-left"
              >
                <File className="w-4 h-4 text-[#ff2b38] shrink-0" />
                <span>Upload Files</span>
              </button>
              <button
                onClick={() => {
                  setIsUploadMenuOpen(false);
                  folderInputRef.current?.click();
                }}
                className="w-full flex items-center gap-2.5 sm:gap-3 px-3 sm:px-3.5 py-2.5 text-zinc-300 hover:text-white hover:bg-[#18181c] transition-colors border-t border-zinc-900/80 text-left"
              >
                <Folder className="w-4 h-4 text-yellow-500 shrink-0" />
                <span>Upload Folder</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── Main Terminal Command Prompt Container ── */}
      <main ref={mainContainerRef} className="flex-1 overflow-y-auto px-4 sm:px-8 py-3.5 sm:py-5 pb-24 sm:pb-32 flex flex-col items-start justify-start">
        {/* Command Output Logs */}
        {terminalLogs.length > 0 && (
          <div className="w-full max-w-5xl space-y-1.5 sm:space-y-2 mb-2 sm:mb-3 text-xs sm:text-sm font-mono">
            {terminalLogs.map((log) => (
              <div key={log.id} className="leading-relaxed break-words">
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
        <form onSubmit={handleTerminalSubmit} className="w-full max-w-5xl flex items-center gap-2 sm:gap-3 text-sm sm:text-lg font-mono mb-3 sm:mb-4">
          <span className="text-[#ff2b38] font-bold shrink-0 text-sm sm:text-lg">xdrive:~$</span>
          <div className="relative flex-1 flex items-center min-w-0">
            <input
              ref={terminalInputRef}
              type="text"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isAwaitingRmRfPass
                  ? "Enter access password..."
                  : !isAuthenticated
                  ? "Enter pass first.."
                  : ""
              }
              autoFocus
              className={`w-full bg-transparent text-white placeholder-zinc-700 outline-none border-none font-mono text-sm sm:text-lg ${
                isNavigatingFiles ? 'caret-transparent' : 'caret-[#ff2b38]'
              }`}
            />
          </div>
        </form>

        {/* Dynamic File LIST View (Navigable with Arrow Keys / Peek strictly on Hover) */}
        {isQueryActive && (
          <div className="w-full max-w-5xl mt-1 sm:mt-2 border-t border-zinc-900/80 pt-3 sm:pt-4">
            <div className="flex items-center justify-between mb-3 text-xs font-mono text-zinc-500 uppercase tracking-wider">
              <span>Results ({filteredFiles.length})</span>
              {(isLoadingFiles || isSyncing) && (
                <div className="flex items-center gap-1.5 text-zinc-500 font-mono text-[11px]">
                  <Loader2 className="w-3 h-3 animate-spin text-zinc-400" />
                  <span>Scanning...</span>
                </div>
              )}
            </div>

            {isLoadingFiles && filteredFiles.length === 0 ? (
              <div className="w-full">
                <TerminalFileListSkeleton />
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-zinc-600 text-xs font-mono">
                  No matching files
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 sm:gap-2 w-full">
                {filteredFiles.map((file, idx) => {
                  const isSelected = isNavigatingFiles && idx === selectedIndex;
                  return (
                    <TerminalFileListItem
                      key={file.id}
                      file={file}
                      isSelected={isSelected}
                      itemRef={isSelected ? (node) => { selectedItemRef.current = node; } : undefined}
                      onSelect={(e) => {
                        e.stopPropagation();
                        setIsNavigatingFiles(true);
                        setSelectedIndex(idx);
                      }}
                      onMouseEnter={() => {
                        setHoveredFile(file);
                        setIsNavigatingFiles(true);
                        setSelectedIndex(idx);
                      }}
                      onMouseLeave={() => setHoveredFile(null)}
                      onPreview={() => setPreviewTarget(file)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsNavigatingFiles(true);
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
      <div className="fixed bottom-0 left-0 right-0 flex flex-col items-center gap-1.5 sm:gap-2 pb-3 sm:pb-6 pt-2.5 sm:pt-6 bg-black border-t border-zinc-900 pointer-events-none z-20 font-mono">
        {metrics === null ? (
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-24 sm:w-28 h-3 sm:h-3.5 bg-zinc-850 rounded animate-pulse relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-700/20 to-transparent animate-shimmer" />
            </div>
            <div className="w-16 sm:w-20 h-2.5 sm:h-3 bg-zinc-900 rounded animate-pulse" />
          </div>
        ) : (
          <span className="text-[10px] sm:text-sm font-bold text-zinc-300 tracking-wider uppercase">
            {usedPercent}% MEMORY USED
            <span className="text-zinc-500 ml-1.5 sm:ml-2 font-normal text-[9px] sm:text-xs">
              [{formatBytes(usedBytes)} / {formatBytes(totalBytes)}]
            </span>
          </span>
        )}
        <div className="w-[80vw] max-w-xs sm:max-w-[560px] h-1.5 bg-zinc-900 rounded-full overflow-hidden relative">
          <div
            className="h-full bg-[#ff2b38] rounded-full transition-all duration-500 relative overflow-hidden"
            style={{ width: `${Math.max(usedPercent, 1)}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          </div>
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
