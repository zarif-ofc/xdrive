import { FilenSDK } from '@filen/sdk';
import { Readable, PassThrough } from 'stream';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { StorageInfo } from './mega';

let filenInstance: any = null;
let filenLoginPromise: Promise<any> | null = null;

export async function getFilenStorage(): Promise<any> {
  const email = process.env.FILEN_EMAIL;
  const password = process.env.FILEN_PASSWORD;

  if (!email || !password) {
    return null;
  }

  if (filenInstance) {
    return filenInstance;
  }

  if (filenLoginPromise) {
    return filenLoginPromise;
  }

  filenLoginPromise = (async () => {
    try {
      const sdk = new FilenSDK({
        metadataCache: true,
        connectToSocket: false,
        tmpPath: path.join(os.tmpdir(), 'xdrive-filen-sdk'),
      });

      // Give Filen 30s to authenticate — it can be slow on first run
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Filen login timeout (30s)')), 30000);
        sdk.login({ email, password })
          .then(() => {
            clearTimeout(timeout);
            resolve();
          })
          .catch((err: any) => {
            clearTimeout(timeout);
            reject(err);
          });
      });

      filenInstance = sdk;
      return sdk;
    } catch (error) {
      console.warn('Filen login failed or unavailable:', error);
      filenInstance = null;
      return null;
    } finally {
      filenLoginPromise = null;
    }
  })();

  return filenLoginPromise;
}

/**
 * Ensures the /Xdrive folder exists on Filen, creating it if not.
 */
async function ensureXdriveFolder(sdk: any): Promise<void> {
  try {
    await sdk.fs().mkdir({ path: '/Xdrive' });
  } catch (err: any) {
    // Ignore "already exists" type errors
    const msg = err?.message?.toLowerCase() || '';
    if (!msg.includes('exist') && !msg.includes('already') && err?.code !== 'folder_exists') {
      console.warn('Could not ensure /Xdrive folder on Filen:', msg);
    }
  }
}

export async function getFilenStorageInfo(dbUsedBytes: number = 0): Promise<StorageInfo> {
  const FILEN_TARGET_LIMIT = 8 * 1024 * 1024 * 1024;
  const sdk = await getFilenStorage();

  if (!sdk) {
    return {
      isAvailable: false,
      usedBytes: dbUsedBytes,
      totalBytes: FILEN_TARGET_LIMIT,
      freeBytes: Math.max(0, FILEN_TARGET_LIMIT - dbUsedBytes),
    };
  }

  try {
    const user: any = await Promise.race([
      sdk.user(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Filen user info timeout')), 5000)
      ),
    ]);

    if (user && user.maxStorage && user.usedStorage !== undefined) {
      const spaceUsed = Math.max(user.usedStorage, dbUsedBytes);
      const spaceTotal = Math.min(user.maxStorage, FILEN_TARGET_LIMIT);
      return {
        isAvailable: true,
        usedBytes: spaceUsed,
        totalBytes: spaceTotal,
        freeBytes: Math.max(0, spaceTotal - spaceUsed),
      };
    }
  } catch (err) {
    console.warn('Failed to fetch Filen storage details:', err);
  }

  return {
    isAvailable: true,
    usedBytes: dbUsedBytes,
    totalBytes: FILEN_TARGET_LIMIT,
    freeBytes: Math.max(0, FILEN_TARGET_LIMIT - dbUsedBytes),
  };
}

export async function uploadToFilen(
  stream: Readable | PassThrough,
  fileName: string,
  fileSize: number
): Promise<{ remoteId: string; remotePath: string }> {
  const sdk = await getFilenStorage();

  if (!sdk) {
    throw new Error('Filen storage service is not logged in or available');
  }

  // Ensure the /Xdrive folder exists before uploading
  await ensureXdriveFolder(sdk);

  const tmpDir = path.join(os.tmpdir(), 'xdrive-uploads');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  const tmpFilePath = path.join(tmpDir, `${Date.now()}_${fileName}`);
  const writeStream = fs.createWriteStream(tmpFilePath);

  // Write stream to temp file
  await new Promise<void>((resolve, reject) => {
    stream.pipe(writeStream);
    writeStream.on('finish', () => resolve());
    writeStream.on('error', reject);
    stream.on('error', reject);
  });

  try {
    const remotePath = `/Xdrive/${fileName}`;

    // Allow 5 minutes for large file uploads
    const result: any = await Promise.race([
      sdk.fs().upload({ path: '/Xdrive', source: tmpFilePath }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Filen upload timeout (300s)')), 300000)
      ),
    ]);

    return {
      remoteId: result?.uuid || remotePath,
      remotePath,
    };
  } finally {
    try {
      if (fs.existsSync(tmpFilePath)) fs.unlinkSync(tmpFilePath);
    } catch {}
  }
}

export async function downloadFromFilen(remotePath: string, fileName?: string): Promise<Readable> {
  const sdk = await getFilenStorage();
  if (!sdk) {
    throw new Error('Filen storage service is not available');
  }

  const tmpDir = path.join(os.tmpdir(), 'xdrive-downloads');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  const tmpFilePath = path.join(tmpDir, `${Date.now()}_${fileName || 'download'}`);

  // Allow 5 minutes for large downloads
  await Promise.race([
    sdk.fs().download({ path: remotePath, destination: tmpFilePath }),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Filen download timeout (300s)')), 300000)
    ),
  ]);

  const readStream = fs.createReadStream(tmpFilePath);
  readStream.on('close', () => {
    try {
      if (fs.existsSync(tmpFilePath)) fs.unlinkSync(tmpFilePath);
    } catch {}
  });

  return readStream;
}

export async function deleteFromFilen(remotePath: string): Promise<boolean> {
  try {
    const sdk = await getFilenStorage();
    if (!sdk) return false;

    await sdk.fs().rm({ path: remotePath });
    return true;
  } catch (err) {
    console.warn('Error deleting from Filen:', err);
    return false;
  }
}
