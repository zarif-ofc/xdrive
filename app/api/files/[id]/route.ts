import { NextRequest, NextResponse } from 'next/server';
import { getFileById, updateFileRecord, deleteFileRecord } from '@/lib/db';
import { executeStorageDelete } from '@/lib/storage/router';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function DELETE(req: NextRequest, context: { params: { id: string } }) {
  try {
    const fileId = context?.params?.id;
    if (!fileId) {
      return NextResponse.json({ success: false, error: 'File ID missing' }, { status: 400 });
    }

    const fileRecord = getFileById(fileId);

    if (!fileRecord) {
      return NextResponse.json({ success: false, error: 'File or folder not found' }, { status: 404 });
    }

    if (fileRecord.is_folder === 0) {
      await executeStorageDelete(fileRecord);
    }

    deleteFileRecord(fileId);

    return NextResponse.json({ success: true, message: 'Deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: { params: { id: string } }) {
  try {
    const fileId = context?.params?.id;
    if (!fileId) {
      return NextResponse.json({ success: false, error: 'File ID missing' }, { status: 400 });
    }

    const body = await req.json();
    const { name, parentId } = body;

    const existing = getFileById(fileId);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'File or folder not found' }, { status: 404 });
    }

    const updated = updateFileRecord(fileId, {
      name: name !== undefined ? name.trim() : undefined,
      parent_id: parentId !== undefined ? (parentId === 'root' ? null : parentId) : undefined,
    });

    return NextResponse.json({ success: true, file: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
