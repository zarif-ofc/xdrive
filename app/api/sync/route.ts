import { NextResponse } from 'next/server';
import { scanMegaFiles } from '@/lib/storage/mega';
import { scanFilenFiles } from '@/lib/storage/filen';
import { syncCloudFiles } from '@/lib/db';

export const dynamic = 'force-dynamic';
// We allow 60 seconds because tree walking remote providers can take a bit of time
export const maxDuration = 60;

/**
 * Scans MEGA with a single retry — the first attempt can return 0 nodes
 * because the MEGA SDK tree needs a moment to populate after authentication.
 */
async function scanMegaWithRetry(): Promise<Awaited<ReturnType<typeof scanMegaFiles>>> {
  const firstAttempt = await scanMegaFiles();
  if (firstAttempt.length > 0) return firstAttempt;

  // Tree may not be loaded yet on a cold start — wait briefly and retry once
  await new Promise((r) => setTimeout(r, 3000));
  return scanMegaFiles();
}

export async function POST() {
  try {
    console.log('[Sync] Starting global cloud file synchronization...');

    // Run scans concurrently for speed
    const [megaNodes, filenNodes] = await Promise.all([
      scanMegaWithRetry().catch((err) => {
        console.warn('MEGA scan failed:', err);
        return [];
      }),
      scanFilenFiles().catch((err) => {
        console.warn('Filen scan failed:', err);
        return [];
      }),
    ]);

    const allNodes = [...megaNodes, ...filenNodes];
    
    if (allNodes.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No files found in cloud accounts to sync.',
        syncedCount: 0,
      });
    }

    const syncedCount = syncCloudFiles(allNodes);

    console.log(`[Sync] Successfully synchronized ${syncedCount} files/folders from cloud.`);

    return NextResponse.json({
      success: true,
      message: `Successfully synchronized ${syncedCount} items from MEGA and Filen.`,
      syncedCount,
    });
  } catch (error: any) {
    console.error('[Sync] Error during sync:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
