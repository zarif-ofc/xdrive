import React from 'react';
import { getFileTypeCategory } from '@/lib/utils';
import {
  Folder,
  Image as ImageIcon,
  Video,
  Music,
  FileText,
  Code,
  Archive,
  File,
} from 'lucide-react';

interface FileIconProps {
  mimeType: string;
  fileName: string;
  className?: string;
}

export const FileIcon: React.FC<FileIconProps> = ({ mimeType, fileName, className = 'w-6 h-6' }) => {
  const category = getFileTypeCategory(mimeType, fileName);

  switch (category) {
    case 'folder':
      return <Folder className={`${className} text-yellow-500 fill-yellow-500/20`} />;
    case 'image':
      return <ImageIcon className={`${className} text-emerald-400`} />;
    case 'video':
      return <Video className={`${className} text-rose-400`} />;
    case 'audio':
      return <Music className={`${className} text-purple-400`} />;
    case 'document':
      return <FileText className={`${className} text-blue-400`} />;
    case 'code':
      return <Code className={`${className} text-amber-400`} />;
    case 'archive':
      return <Archive className={`${className} text-indigo-400`} />;
    default:
      return <File className={`${className} text-drive-muted`} />;
  }
};
