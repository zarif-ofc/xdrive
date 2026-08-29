import { NextRequest, NextResponse } from 'next/server';
import { listFiles, getFolderPath } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
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
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
