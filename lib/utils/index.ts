export function formatBytes(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function getFileTypeCategory(mimeType: string, fileName: string): 'folder' | 'image' | 'video' | 'audio' | 'document' | 'code' | 'archive' | 'other' {
  if (mimeType === 'application/x-directory') return 'folder';

  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  if (mimeType.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) {
    return 'image';
  }
  if (mimeType.startsWith('video/') || ['mp4', 'mkv', 'webm', 'mov', 'avi'].includes(ext)) {
    return 'video';
  }
  if (mimeType.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext)) {
    return 'audio';
  }
  if (
    mimeType.includes('pdf') ||
    mimeType.includes('word') ||
    mimeType.includes('text') ||
    ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'csv', 'xlsx'].includes(ext)
  ) {
    return 'document';
  }
  if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'py', 'java', 'cpp', 'rs', 'go'].includes(ext)) {
    return 'code';
  }
  if (['zip', 'tar', 'gz', 'rar', '7z'].includes(ext)) {
    return 'archive';
  }

  return 'other';
}
