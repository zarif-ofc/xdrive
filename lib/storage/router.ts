import { uploadToMega, downloadFromMega, deleteFromMega } from './mega';
import { uploadToFilen, downloadFromFilen, deleteFromFilen } from './filen';
import { uploadToLocal, downloadFromLocal, deleteFromLocal } from './local';
import { getStorageStatsFromDb, FileRecord } from '../db';
import { Readable } from 'stream';

export type ProviderType = 'MEGA' | 'FILEN' | 'LOCAL';

export interface StorageMetrics {
  mega: {
    used: number;
    total: number;
    free: number;
    targetLimit: number;
    isAvailable: boolean;
    transferQuota: number;
  };
  filen: {
    used: number;
    total: number;
    free: number;
    targetLimit: number;
    isAvailable: boolean;
  };
  combined: {
    used: number;
    total: number;
    free: number;
  };
}

const MEGA_MAX_TARGET = 18 * 1024 * 1024 * 1024;  // 18 GB
const FILEN_MAX_TARGET = 8 * 1024 * 1024 * 1024;  // 8 GB
const MEGA_MIN_TRANSFER_QUOTA = 1 * 1024 * 1024 * 1024;  // 1 GB

/**
 * Returns storage metrics instantly from SQLite — no cloud SDK calls.
 * Availability is determined by whether credentials are configured.
 */
export function getOverallStorageMetrics(): StorageMetrics {
  const dbStats = getStorageStatsFromDb();
  const megaUsed = dbStats.megaUsed;
  const filenUsed = dbStats.filenUsed;
  const megaFree = Math.max(0, MEGA_MAX_TARGET - megaUsed);
  const filenFree = Math.max(0, FILEN_MAX_TARGET - filenUsed);

  return {
    mega: {
      used: megaUsed,
      total: MEGA_MAX_TARGET,
      free: megaFree,
      targetLimit: MEGA_MAX_TARGET,
      isAvailable: !!(process.env.MEGA_EMAIL && process.env.MEGA_PASSWORD),
      transferQuota: 5 * 1024 * 1024 * 1024,
    },
    filen: {
      used: filenUsed,
      total: FILEN_MAX_TARGET,
      free: filenFree,
      targetLimit: FILEN_MAX_TARGET,
      isAvailable: !!(process.env.FILEN_EMAIL && process.env.FILEN_PASSWORD),
    },
    combined: {
      used: megaUsed + filenUsed,
      total: MEGA_MAX_TARGET + FILEN_MAX_TARGET,
      free: megaFree + filenFree,
    },
  };
}

export function determineOptimalStorageProvider(fileSize: number): ProviderType {
  const metrics = getOverallStorageMetrics();

  const megaEligible =
    metrics.mega.isAvailable &&
    metrics.mega.free >= fileSize &&
    metrics.mega.used + fileSize <= MEGA_MAX_TARGET &&
    metrics.mega.transferQuota >= MEGA_MIN_TRANSFER_QUOTA;

  const filenEligible =
    metrics.filen.isAvailable &&
    metrics.filen.free >= fileSize &&
    metrics.filen.used + fileSize <= FILEN_MAX_TARGET;

  if (megaEligible && filenEligible) {
    return metrics.mega.free >= metrics.filen.free ? 'MEGA' : 'FILEN';
  }
  if (megaEligible) return 'MEGA';
  if (filenEligible) return 'FILEN';
  if (metrics.mega.isAvailable) return 'MEGA';
  if (metrics.filen.isAvailable) return 'FILEN';
  return 'LOCAL';
}

export async function executeStorageUpload(
  buffer: Buffer,
  fileName: string,
  fileSize: number,
  recordId: string,
  preferredProvider?: ProviderType
): Promise<{ provider: ProviderType; remoteId: string | null; remotePath: string | null }> {
  const chosenProvider = preferredProvider || determineOptimalStorageProvider(fileSize);

  if (chosenProvider === 'MEGA' || chosenProvider === 'FILEN') {
    // Try MEGA first
    if (chosenProvider === 'MEGA' || (chosenProvider === 'FILEN' && !process.env.FILEN_EMAIL)) {
      if (process.env.MEGA_EMAIL) {
        try {
          const res = await uploadToMega(buffer, fileName, fileSize);
          return { provider: 'MEGA', remoteId: res.remoteId, remotePath: res.remotePath };
        } catch (err: any) {
          console.warn('[Xdrive] MEGA upload failed, trying Filen:', err?.message || err);
        }
      }
    }

    // Try Filen
    if (chosenProvider === 'FILEN' || process.env.FILEN_EMAIL) {
      if (process.env.FILEN_EMAIL) {
        try {
          const filenStream = Readable.from(buffer);
          const res = await uploadToFilen(filenStream, fileName, fileSize);
          return { provider: 'FILEN', remoteId: res.remoteId, remotePath: res.remotePath };
        } catch (err: any) {
          console.warn('[Xdrive] Filen upload failed, falling back to LOCAL:', err?.message || err);
        }
      }
    }

    // If we chose MEGA but it failed, also try MEGA as fallback before LOCAL
    if (chosenProvider === 'FILEN' && process.env.MEGA_EMAIL) {
      try {
        const res = await uploadToMega(buffer, fileName, fileSize);
        return { provider: 'MEGA', remoteId: res.remoteId, remotePath: res.remotePath };
      } catch (err: any) {
        console.warn('[Xdrive] MEGA fallback also failed:', err?.message || err);
      }
    }
  }

  // Final fallback: local disk
  const localStream = Readable.from(buffer);
  const res = await uploadToLocal(localStream, fileName, recordId);
  return { provider: 'LOCAL', remoteId: res.remoteId, remotePath: res.remotePath };
}

export async function executeStorageDownload(fileRecord: FileRecord): Promise<Readable> {
  const { provider, remote_id, remote_path, name } = fileRecord;

  if (provider === 'MEGA') {
    return await downloadFromMega(remote_id || remote_path!, name);
  }

  if (provider === 'FILEN' && remote_path) {
    return await downloadFromFilen(remote_path, name);
  }

  if (provider === 'LOCAL' && remote_path) {
    return await downloadFromLocal(remote_path);
  }

  throw new Error(`File "${name}" (provider: ${provider}) is not available for download`);
}

export async function executeStorageDelete(fileRecord: FileRecord): Promise<boolean> {
  const { provider, remote_id, remote_path, name } = fileRecord;

  try {
    if (provider === 'MEGA' && (remote_id || remote_path)) {
      await deleteFromMega(remote_id || remote_path!, name);
    } else if (provider === 'FILEN' && remote_path) {
      await deleteFromFilen(remote_path);
    } else if (remote_path) {
      await deleteFromLocal(remote_path);
    }
  } catch (err: any) {
    console.warn('[Xdrive] Delete warning:', err?.message || err);
  }

  return true;
}
