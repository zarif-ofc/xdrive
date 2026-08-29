'use client';

import React, { useEffect, useState } from 'react';
import { UploadCloud } from 'lucide-react';

interface DropZoneOverlayProps {
  onFilesDropped: (files: FileList) => void;
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

    function handleDrop(e: DragEvent) {
      e.preventDefault();
      e.stopPropagation();
      dragCounter = 0;
      setIsDragging(false);

      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        onFilesDropped(e.dataTransfer.files);
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
    <div className="fixed inset-0 z-50 bg-drive-bg/90 backdrop-blur-md flex flex-col items-center justify-center p-8 border-4 border-dashed border-drive-accent animate-in fade-in zoom-in-95 pointer-events-none">
      <div className="w-24 h-24 rounded-full bg-drive-accent/20 flex items-center justify-center text-drive-accent mb-6 animate-bounce">
        <UploadCloud className="w-12 h-12" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">Drop files anywhere to upload</h2>
      <p className="text-sm text-drive-muted max-w-md text-center">
        Smart router will automatically evaluate storage free space, transfer limits, and select optimal cloud provider (MEGA or Filen).
      </p>
    </div>
  );
};
