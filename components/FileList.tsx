'use client';

import React from 'react';
import { FileRecord } from '@/lib/db';
import { FileIcon } from './FileIcon';
import { ProviderBadge } from './ProviderBadge';
import { formatBytes, formatDate } from '@/lib/utils';
import { MoreVertical, Download, Eye } from 'lucide-react';

interface FileListProps {
  files: FileRecord[];
  selectedFileId: string | null;
  onSelectFile: (fileId: string) => void;
  onOpenFolder: (folderId: string) => void;
  onContextMenu: (e: React.MouseEvent, file: FileRecord) => void;
  onDownload: (file: FileRecord) => void;
  onPreview: (file: FileRecord) => void;
}

export const FileList: React.FC<FileListProps> = ({
  files,
  selectedFileId,
  onSelectFile,
  onOpenFolder,
  onContextMenu,
  onDownload,
  onPreview,
}) => {
  if (files.length === 0) {
    return null;
  }

  return (
    <div className="w-full overflow-x-auto select-none p-1">
      <table className="w-full border-collapse text-left text-sm text-drive-text">
        <thead>
          <tr className="border-b border-drive-border text-xs text-drive-muted uppercase tracking-wider">
            <th className="py-3 px-4 font-semibold">Name</th>
            <th className="py-3 px-4 font-semibold">Storage Provider</th>
            <th className="py-3 px-4 font-semibold">Size</th>
            <th className="py-3 px-4 font-semibold">Date Uploaded</th>
            <th className="py-3 px-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-drive-border/40">
          {files.map((file) => {
            const isSelected = selectedFileId === file.id;

            return (
              <tr
                key={file.id}
                onClick={() => onSelectFile(file.id)}
                onDoubleClick={() => {
                  if (file.is_folder === 1) {
                    onOpenFolder(file.id);
                  } else {
                    onPreview(file);
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onSelectFile(file.id);
                  onContextMenu(e, file);
                }}
                className={`group cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-drive-selection text-white font-medium'
                    : 'hover:bg-drive-hover text-drive-text'
                }`}
              >
                {/* Name */}
                <td className="py-3 px-4 flex items-center gap-3 max-w-md truncate">
                  <FileIcon mimeType={file.mime_type} fileName={file.name} className="w-5 h-5 shrink-0" />
                  <span className="truncate font-medium group-hover:text-white" title={file.name}>
                    {file.name}
                  </span>
                </td>

                {/* Storage Provider */}
                <td className="py-3 px-4">
                  {file.is_folder === 0 ? <ProviderBadge provider={file.provider} size="sm" /> : <span className="text-drive-muted text-xs">—</span>}
                </td>

                {/* Size */}
                <td className="py-3 px-4 text-drive-muted text-xs font-mono">
                  {file.is_folder === 1 ? '—' : formatBytes(file.size)}
                </td>

                {/* Date */}
                <td className="py-3 px-4 text-drive-muted text-xs">
                  {formatDate(file.created_at)}
                </td>

                {/* Actions */}
                <td className="py-3 px-2 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {file.is_folder === 0 && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onPreview(file);
                          }}
                          title="Preview"
                          className="p-1 rounded-full hover:bg-drive-hover text-drive-muted hover:text-cyan-400 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDownload(file);
                          }}
                          title="Download"
                          className="p-1 rounded-full hover:bg-drive-hover text-drive-muted hover:text-white transition-colors"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onContextMenu(e, file);
                      }}
                      className="p-1 rounded-full hover:bg-drive-hover text-drive-muted hover:text-white transition-colors"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
