import { NextResponse } from 'next/server';
import { scanMegaFiles } from '@/lib/storage/mega';
import { scanFilenFiles } from '@/lib/storage/filen';
import { syncCloudFiles } from '@/lib/db';

export const dynamic = 'force-dynamic';
// We allow 60 seconds because tree walking remote providers can take a bit of time
export const maxDuration = 60;

export async function POST() {
  try {
    console.log('[Sync] Starting global cloud file synchronization...');

    // Run scans concurrently for speed
    const [megaNodes, filenNodes] = await Promise.all([
      scanMegaFiles().catch((err) => {
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
