'use client';

import React from 'react';
import { FileRecord } from '@/lib/db';
import { FileIcon } from './FileIcon';
import { ProviderBadge } from './ProviderBadge';
import { formatBytes, formatDate } from '@/lib/utils';
import { MoreVertical, Download, Eye } from 'lucide-react';

interface FileGridProps {
  files: FileRecord[];
  selectedFileId: string | null;
  onSelectFile: (fileId: string) => void;
  onOpenFolder: (folderId: string) => void;
  onContextMenu: (e: React.MouseEvent, file: FileRecord) => void;
  onDownload: (file: FileRecord) => void;
  onPreview: (file: FileRecord) => void;
}

// Pixel-perfect continuous SVG Folder Component matching reference image
const RedFolderCard: React.FC<{
  folder: FileRecord;
  isSelected: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}> = ({ folder, isSelected, onSelect, onOpen, onContextMenu }) => {
  return (
    <div
      onClick={onSelect}
      onDoubleClick={onOpen}
      onContextMenu={onContextMenu}
      className="group relative flex flex-col items-center justify-center cursor-pointer select-none transition-transform duration-200 hover:scale-105 active:scale-95 w-full max-w-[210px]"
    >
      <svg
        viewBox="0 0 220 145"
        className={`w-full h-auto drop-shadow-2xl transition-all ${
          isSelected ? 'filter drop-shadow-[0_0_12px_rgba(255,43,56,0.8)]' : ''
        }`}
      >
        {/* Continuous Seamless Red Folder Shape */}
        <path
          d="M 18 20 
             A 14 14 0 0 1 32 6 
             L 72 6 
             A 14 14 0 0 1 85 15 
             L 93 23 
             A 10 10 0 0 0 101 26 
             L 194 26 
             A 16 16 0 0 1 210 42 
             L 210 129 
             A 16 16 0 0 1 194 145 
             L 26 145 
             A 16 16 0 0 1 10 129 
             L 10 34 
             A 14 14 0 0 1 18 20 Z"
          fill="#ff2a38"
          className="group-hover:fill-[#ff3d4a] transition-colors"
        />
        {/* White Folder Title */}
        <text
          x="110"
          y="95"
          textAnchor="middle"
          fill="#ffffff"
          fontWeight="800"
          fontSize="18"
          letterSpacing="0.2"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          {folder.name.length > 15 ? folder.name.substring(0, 13) + '...' : folder.name}
        </text>
      </svg>

      {/* Context Menu Button Overlay */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onContextMenu(e);
        }}
        className="absolute top-8 right-4 p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-black/20 text-white transition-opacity"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
    </div>
  );
};

export const FileGrid: React.FC<FileGridProps> = ({
  files,
  selectedFileId,
  onSelectFile,
  onOpenFolder,
  onContextMenu,
  onDownload,
  onPreview,
}) => {
  const folders = files.filter((f) => f.is_folder === 1);
  const regularFiles = files.filter((f) => f.is_folder === 0);

  return (
    <div className="space-y-8 select-none p-1">
      {/* Folders Section */}
      {folders.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4 px-1">
            <span className="w-2 h-2 rounded-full bg-[#ff2a38]" />
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest">
              Folders ({folders.length})
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {folders.map((folder) => (
              <RedFolderCard
                key={folder.id}
                folder={folder}
                isSelected={selectedFileId === folder.id}
                onSelect={() => onSelectFile(folder.id)}
                onOpen={() => onOpenFolder(folder.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onSelectFile(folder.id);
                  onContextMenu(e, folder);
                }}
              />
            ))}
          </div>
        </section>
      )}

      {/* Files Section */}
      {regularFiles.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4 px-1">
            <span className="w-2 h-2 rounded-full bg-zinc-600" />
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
              Files ({regularFiles.length})
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {regularFiles.map((file) => {
              const isSelected = selectedFileId === file.id;

              return (
                <div
                  key={file.id}
                  onClick={() => onSelectFile(file.id)}
                  onDoubleClick={() => onPreview(file)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    onSelectFile(file.id);
                    onContextMenu(e, file);
                  }}
                  className={`group relative flex flex-col justify-between p-4 rounded-2xl border cursor-pointer transition-all duration-150 h-44 ${
                    isSelected
                      ? 'bg-[#141418] border-[#ff2a38] shadow-lg ring-1 ring-[#ff2a38]'
                      : 'bg-[#0d0d0f] border-zinc-800/80 hover:bg-[#141418] hover:border-zinc-700'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-1 w-full">
                    <ProviderBadge provider={file.provider} size="sm" />
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPreview(file);
                        }}
                        title="Preview file"
                        className="p-1 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-cyan-400 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDownload(file);
                        }}
                        title="Download file"
                        className="p-1 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onContextMenu(e, file);
                        }}
                        className="p-1 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Card Center: Icon */}
                  <div className="flex items-center justify-center my-1 py-1">
                    <FileIcon mimeType={file.mime_type} fileName={file.name} className="w-11 h-11" />
                  </div>

                  {/* Card Footer */}
                  <div className="w-full">
                    <p
                      className="text-xs font-semibold text-white truncate group-hover:text-[#ff2a38] transition-colors mb-0.5"
                      title={file.name}
                    >
                      {file.name}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-zinc-500 font-medium">
                      <span>{formatBytes(file.size)}</span>
                      <span>{formatDate(file.created_at)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
