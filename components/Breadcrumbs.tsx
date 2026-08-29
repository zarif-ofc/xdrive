'use client';

import React from 'react';
import { ChevronRight, HardDrive, Folder } from 'lucide-react';

interface BreadcrumbItem {
  id: string;
  name: string;
}

interface BreadcrumbsProps {
  breadcrumbs: BreadcrumbItem[];
  onNavigateFolder: (folderId: string | null) => void;
  currentFolderId: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  breadcrumbs,
  onNavigateFolder,
  currentFolderId,
}) => {
  return (
    <nav className="flex items-center gap-1 text-sm text-drive-muted py-2 px-1 select-none overflow-x-auto">
      <button
        onClick={() => onNavigateFolder(null)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-drive-hover transition-colors ${
          currentFolderId === 'root' || !currentFolderId ? 'text-white font-semibold bg-drive-surface' : ''
        }`}
      >
        <HardDrive className="w-4 h-4 text-drive-accent" />
        <span>My Drive</span>
      </button>

      {breadcrumbs.map((crumb, idx) => {
        const isLast = idx === breadcrumbs.length - 1;
        return (
          <React.Fragment key={crumb.id}>
            <ChevronRight className="w-4 h-4 text-drive-muted shrink-0" />
            <button
              onClick={() => onNavigateFolder(crumb.id)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-drive-hover transition-colors max-w-[160px] truncate ${
                isLast ? 'text-white font-semibold bg-drive-surface' : ''
              }`}
            >
              <Folder className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
              <span className="truncate">{crumb.name}</span>
            </button>
          </React.Fragment>
        );
      })}
    </nav>
  );
};
