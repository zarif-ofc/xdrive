import { NextRequest, NextResponse } from 'next/server';
import { createFileRecord } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, parentId } = body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ success: false, error: 'Folder name is required' }, { status: 400 });
    }

    const folderId = `folder_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const folderRecord = createFileRecord({
      id: folderId,
      name: name.trim(),
      size: 0,
      mime_type: 'application/x-directory',
      provider: 'LOCAL',
      remote_id: null,
      remote_path: null,
      parent_id: parentId || null,
      is_folder: 1,
    });

    return NextResponse.json({ success: true, folder: folderRecord });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
