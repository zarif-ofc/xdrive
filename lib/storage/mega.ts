import { Storage } from 'megajs';
import { Readable, PassThrough } from 'stream';

let megaStorageInstance: Storage | null = null;
let megaLoginPromise: Promise<Storage | null> | null = null;

export async function getMegaStorage(): Promise<Storage | null> {
  const email = process.env.MEGA_EMAIL;
  const password = process.env.MEGA_PASSWORD;

  if (!email || !password) {
    return null;
  }

  if (megaStorageInstance) {
    return megaStorageInstance;
  }

  if (megaLoginPromise) {
    return megaLoginPromise;
  }

  megaLoginPromise = (async () => {
    try {
      const storage = new Storage({
        email,
        password,
        autologin: true,
      });

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('MEGA auth timeout (20s)')), 20000);
        storage.ready
          .then(() => {
            clearTimeout(timeout);
            resolve();
          })
          .catch((err) => {
            clearTimeout(timeout);
            reject(err);
          });
      });

      megaStorageInstance = storage;
      return storage;
    } catch (error) {
      console.warn('MEGA login failed or unavailable:', error);
      megaStorageInstance = null;
      return null;
    } finally {
      megaLoginPromise = null;
    }
  })();

  return megaLoginPromise;
}

export interface StorageInfo {
  isAvailable: boolean;
  usedBytes: number;
  totalBytes: number;
  freeBytes: number;
  transferQuotaBytes?: number;
}

export async function getMegaStorageInfo(dbUsedBytes: number = 0): Promise<StorageInfo> {
  const MEGA_TARGET_LIMIT = 18 * 1024 * 1024 * 1024;
  const storage = await getMegaStorage();

  if (!storage) {
    return {
      isAvailable: false,
      usedBytes: dbUsedBytes,
      totalBytes: MEGA_TARGET_LIMIT,
      freeBytes: Math.max(0, MEGA_TARGET_LIMIT - dbUsedBytes),
      transferQuotaBytes: 0,
    };
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({
        isAvailable: true,
        usedBytes: dbUsedBytes,
        totalBytes: MEGA_TARGET_LIMIT,
        freeBytes: Math.max(0, MEGA_TARGET_LIMIT - dbUsedBytes),
        transferQuotaBytes: 5 * 1024 * 1024 * 1024,
      });
    }, 5000);

    storage.getAccountInfo((err, info: any) => {
      clearTimeout(timeout);
      if (err || !info) {
        resolve({
          isAvailable: true,
          usedBytes: dbUsedBytes,
          totalBytes: MEGA_TARGET_LIMIT,
          freeBytes: Math.max(0, MEGA_TARGET_LIMIT - dbUsedBytes),
          transferQuotaBytes: 5 * 1024 * 1024 * 1024,
        });
        return;
      }

      const spaceUsed = info.spaceUsed || dbUsedBytes;
      const spaceTotal = Math.min(info.spaceTotal || MEGA_TARGET_LIMIT, MEGA_TARGET_LIMIT);
      const free = Math.max(0, spaceTotal - spaceUsed);

      const transferQuota =
        info.downloadBandwidthTotal !== undefined && info.downloadBandwidthUsed !== undefined
          ? Math.max(0, info.downloadBandwidthTotal - info.downloadBandwidthUsed)
          : 5 * 1024 * 1024 * 1024;

      resolve({
        isAvailable: true,
        usedBytes: spaceUsed,
        totalBytes: spaceTotal,
        freeBytes: free,
        transferQuotaBytes: transferQuota,
      });
    });
  });
}

export async function uploadToMega(
  buffer: Buffer,
  fileName: string,
  fileSize: number
): Promise<{ remoteId: string; remotePath: string }> {
  const storage = await getMegaStorage();
  if (!storage) {
    throw new Error('MEGA storage service is not logged in or available');
  }

  // megajs exposes stream.complete as a Promise — use it directly
  const uploadStream = storage.root.upload({
    name: fileName,
    size: buffer.length,
  });

  // Write the buffer into the upload stream
  uploadStream.end(buffer);

  // stream.complete is the canonical promise from megajs
  const file: any = await (uploadStream as any).complete;

  return {
    remoteId: file.handle || file.name || String(Date.now()),
    remotePath: file.name,
  };
}

export async function downloadFromMega(remoteId: string, fileName?: string): Promise<Readable> {
  const storage = await getMegaStorage();
  if (!storage) {
    throw new Error('MEGA storage service is not available');
  }

  let targetFile: any = null;

  // 1. Try finding in current tree
  if (fileName) targetFile = storage.find(fileName);
  if (!targetFile && remoteId) targetFile = storage.find(remoteId);

  // 2. If not found, reload tree to pick up recently uploaded files
  if (!targetFile) {
    try {
      await Promise.race([
        storage.reload(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('MEGA reload timeout')), 5000)),
      ]);
    } catch (err) {
      console.warn('MEGA reload warning:', err);
    }

    if (fileName) targetFile = storage.find(fileName);
    if (!targetFile && remoteId) targetFile = storage.find(remoteId);
  }

  // 3. Fallback: deep search root children
  if (!targetFile && storage.root) {
    const findInNode = (node: any): any => {
      if (!node) return null;
      if (node.name === fileName || node.name === remoteId || node.handle === remoteId) {
        return node;
      }
      if (node.children && Array.isArray(node.children)) {
        for (const child of node.children) {
          const found = findInNode(child);
          if (found) return found;
        }
      }
      return null;
    };
    targetFile = findInNode(storage.root);
  }

  if (!targetFile) {
    throw new Error(`File "${fileName || remoteId}" not found in MEGA account`);
  }

  return targetFile.download();
}

export async function deleteFromMega(remoteId: string, fileName?: string): Promise<boolean> {
  try {
    const storage = await getMegaStorage();
    if (!storage) return false;

    let targetFile: any = null;
    if (fileName) targetFile = storage.find(fileName);
    if (!targetFile && remoteId) targetFile = storage.find(remoteId);

    if (targetFile) {
      await targetFile.delete(true);
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Error deleting from MEGA:', err);
    return false;
  }
}

export interface CloudFileNode {
  name: string;
  size: number;
  mime_type: string;
  provider: 'MEGA' | 'FILEN';
  remote_id: string;
  remote_path: string;
  is_folder: number;
  parent_remote_id: string | null;
  timestamp: number;
}

export async function scanMegaFiles(): Promise<CloudFileNode[]> {
  const storage = await getMegaStorage();
  if (!storage) return [];

  try {
    await Promise.race([
      storage.reload(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('MEGA reload timeout')), 10000)),
    ]);
  } catch (err) {
    console.warn('MEGA reload warning during scan:', err);
  }

  const results: CloudFileNode[] = [];
  const rootId = (storage.root as any)?.handle || 'root';

  const walkNode = (node: any, parentRemoteId: string | null) => {
    if (!node) return;

    // Skip root node itself from being added as a file, but process its children
    if (node !== storage.root && node.name) {
      const isFolder = node.directory ? 1 : 0;
      let mimeType = 'application/octet-stream';
      if (isFolder) mimeType = 'application/x-directory';
      else if (node.name.match(/\.(mp4|mkv|webm|avi|mov)$/i)) mimeType = 'video/mp4';
      else if (node.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) mimeType = 'image/jpeg';
      else if (node.name.match(/\.(mp3|wav|ogg|flac)$/i)) mimeType = 'audio/mpeg';

      results.push({
        name: node.name,
        size: node.size || 0,
        mime_type: mimeType,
        provider: 'MEGA',
        remote_id: node.handle || node.name,
        remote_path: node.name,
        is_folder: isFolder,
        parent_remote_id: parentRemoteId,
        timestamp: node.timestamp ? node.timestamp * 1000 : Date.now(),
      });
    }

    if (node.children && Array.isArray(node.children)) {
      const currentRemoteId = node === storage.root ? null : (node.handle || node.name);
      for (const child of node.children) {
        walkNode(child, currentRemoteId);
      }
    }
  };

  if (storage.root) {
    walkNode(storage.root, null);
  }

  return results;
}
