'use client';

import React, { useEffect, useState } from 'react';
import { UploadCloud } from 'lucide-react';

interface DropZoneOverlayProps {
  onFilesDropped: (files: File[]) => void;
}

// Recursively traverse directory entries from HTML5 drag and drop
async function extractFilesFromDataTransfer(dataTransfer: DataTransfer): Promise<File[]> {
  const files: File[] = [];
  const items = Array.from(dataTransfer.items || []);

  async function traverseEntry(entry: any, path: string = '') {
    if (!entry) return;
    if (entry.isFile) {
      return new Promise<void>((resolve) => {
        entry.file(
          (file: File) => {
            const relPath = path ? `${path}/${file.name}` : file.name;
            try {
              Object.defineProperty(file, 'webkitRelativePath', {
                value: relPath,
                writable: true,
                configurable: true,
              });
            } catch {}
            files.push(file);
            resolve();
          },
          () => resolve()
        );
      });
    } else if (entry.isDirectory) {
      const dirReader = entry.createReader();
      const readEntries = (): Promise<any[]> => {
        return new Promise((resolve) => {
          dirReader.readEntries(
            (entries: any[]) => resolve(entries),
            () => resolve([])
          );
        });
      };

      let entries = await readEntries();
      while (entries && entries.length > 0) {
        const dirPath = path ? `${path}/${entry.name}` : entry.name;
        for (const childEntry of entries) {
          await traverseEntry(childEntry, dirPath);
        }
        entries = await readEntries();
      }
    }
  }

  for (const item of items) {
    if (item.webkitGetAsEntry) {
      const entry = item.webkitGetAsEntry();
      if (entry) {
        await traverseEntry(entry);
        continue;
      }
    }
    if (item.kind === 'file') {
      const file = item.getAsFile();
      if (file) files.push(file);
    }
  }

  // Fallback to dataTransfer.files if items API yielded nothing
  if (files.length === 0 && dataTransfer.files && dataTransfer.files.length > 0) {
    return Array.from(dataTransfer.files);
  }

  return files;
}

export const DropZoneOverlay: React.FC<DropZoneOverlayProps> = ({ onFilesDropped }) => {
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    let dragCounter = 0;

    function handleDragEnter(e: DragEvent) {
      e.preventDefault();
      e.stopPropagation();
      dragCounter++;
      if (e.dataTransfer && e.dataTransfer.types.includes('Files')) {
        setIsDragging(true);
      }
    }

    function handleDragLeave(e: DragEvent) {
      e.preventDefault();
      e.stopPropagation();
      dragCounter--;
      if (dragCounter === 0) {
        setIsDragging(false);
      }
    }

    function handleDragOver(e: DragEvent) {
      e.preventDefault();
      e.stopPropagation();
    }

    async function handleDrop(e: DragEvent) {
      e.preventDefault();
      e.stopPropagation();
      dragCounter = 0;
      setIsDragging(false);

      if (e.dataTransfer) {
        const extractedFiles = await extractFilesFromDataTransfer(e.dataTransfer);
        if (extractedFiles.length > 0) {
          onFilesDropped(extractedFiles);
        }
      }
    }

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [onFilesDropped]);

  if (!isDragging) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-8 border-4 border-dashed border-[#ff2b38] animate-in fade-in zoom-in-95 pointer-events-none">
      <div className="w-24 h-24 rounded-full bg-[#ff2b38]/20 flex items-center justify-center text-[#ff2b38] mb-6 animate-bounce">
        <UploadCloud className="w-12 h-12" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">Drop files or folders anywhere to upload</h2>
      <p className="text-sm text-zinc-400 max-w-md text-center">
        Folder structures are automatically preserved for smart searching.
      </p>
    </div>
  );
};
