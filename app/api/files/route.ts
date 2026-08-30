import { NextRequest, NextResponse } from 'next/server';
import { listFiles, getFolderPath, getStorageStatsFromDb, syncCloudFiles } from '@/lib/db';
import { scanMegaFiles } from '@/lib/storage/mega';
import { scanFilenFiles } from '@/lib/storage/filen';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// We allow up to 60 seconds since an initial auto-sync on cold start could take some time
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

export async function GET(req: NextRequest) {
  try {
    const isVercel = process.env.VERCEL === '1' || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
    
    let debugInfo: any = {};
    // On Vercel the /tmp SQLite DB is wiped on every cold start, so we must
    // re-sync cloud files whenever the database is empty.
    if (isVercel) {
      const stats = getStorageStatsFromDb();
      if (stats.count === 0) {
        console.log('[Xdrive] Cold start detected on Vercel with empty database. Syncing cloud files...');
        try {
          const [megaNodes, filenNodes] = await Promise.all([
            scanMegaWithRetry().catch((err) => {
              console.warn('MEGA auto-sync failed:', err);
              debugInfo.megaError = err.message;
              return [];
            }),
            scanFilenFiles().catch((err) => {
              console.warn('Filen auto-sync failed:', err);
              debugInfo.filenError = err.message;
              return [];
            }),
          ]);

          debugInfo.megaNodesCount = megaNodes.length;
          debugInfo.filenNodesCount = filenNodes.length;

          const allNodes = [...megaNodes, ...filenNodes];
          if (allNodes.length > 0) {
            syncCloudFiles(allNodes);
            console.log(`[Xdrive] Auto-synced ${allNodes.length} cloud files.`);
          }
        } catch (syncErr: any) {
          console.warn('[Xdrive] Failed during auto-sync:', syncErr);
          debugInfo.syncErr = syncErr.message;
        }
      }
    }

    const { searchParams } = new URL(req.url);
    const parentId = searchParams.get('parentId');
    const search = searchParams.get('search') || undefined;
    const sort = searchParams.get('sort') || 'name_asc';

    const allParam = searchParams.get('all') === 'true' || parentId === 'all';
    const files = listFiles(parentId, search, sort, allParam);
    const breadcrumbs = getFolderPath(parentId);

    return NextResponse.json({
      success: true,
      files,
      breadcrumbs,
      currentFolderId: parentId || 'root',
      debug: debugInfo
    });
  } catch (error: any) {
    console.error('[Xdrive] /api/files GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
