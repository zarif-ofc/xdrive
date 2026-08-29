import { NextRequest, NextResponse } from 'next/server';
import { listFiles, getFolderPath, getStorageStatsFromDb, syncCloudFiles } from '@/lib/db';
import { scanMegaFiles } from '@/lib/storage/mega';
import { scanFilenFiles } from '@/lib/storage/filen';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// We allow up to 60 seconds since an initial auto-sync on cold start could take some time
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    const isVercel = process.env.VERCEL === '1' || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
    
    // Auto-sync mechanism for Vercel ephemeral /tmp database
    if (isVercel) {
      const stats = getStorageStatsFromDb();
      if (stats.count === 0) {
        console.log('[Xdrive] Cold start detected on Vercel with empty database. Syncing cloud files...');
        try {
          const [megaNodes, filenNodes] = await Promise.all([
            scanMegaFiles().catch((err) => {
              console.warn('MEGA auto-sync failed:', err);
              return [];
            }),
            scanFilenFiles().catch((err) => {
              console.warn('Filen auto-sync failed:', err);
              return [];
            }),
          ]);

          const allNodes = [...megaNodes, ...filenNodes];
          if (allNodes.length > 0) {
            syncCloudFiles(allNodes);
            console.log(`[Xdrive] Auto-synced ${allNodes.length} cloud files.`);
          }
        } catch (syncErr) {
          console.warn('[Xdrive] Failed during auto-sync:', syncErr);
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
    });
  } catch (error: any) {
    console.error('[Xdrive] /api/files GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
