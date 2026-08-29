import { NextRequest, NextResponse } from 'next/server';
import { executeStorageUpload, ProviderType } from '@/lib/storage/router';
import { createFileRecord, getFileById } from '@/lib/db';

// Trigger warmup so auth is already in progress before first upload
import '@/lib/storage/warmup';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60; // Max timeout 60 seconds

export async function POST(req: NextRequest) {
  try {
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch (e: any) {
      return NextResponse.json(
        { success: false, error: 'Failed to parse upload payload: ' + (e?.message || 'File size too large') },
        { status: 400 }
      );
    }

    const file = formData.get('file') as File | null;
    const rawParentId = formData.get('parentId') as string | null;
    const requestedProvider = formData.get('provider') as ProviderType | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }

    // Ensure parentId actually exists in DB to prevent FOREIGN KEY constraint failures
    let validParentId: string | null = null;
    if (rawParentId && rawParentId !== 'root') {
      const parentRecord = getFileById(rawParentId);
      if (parentRecord) {
        validParentId = rawParentId;
      }
    }

    const fileName = file.name;
    const fileSize = file.size;
    const mimeType = file.type || 'application/octet-stream';
    const recordId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadResult = await executeStorageUpload(
      buffer,
      fileName,
      fileSize,
      recordId,
      requestedProvider || undefined
    );

    const fileRecord = createFileRecord({
      id: recordId,
      name: fileName,
      size: fileSize,
      mime_type: mimeType,
      provider: uploadResult.provider,
      remote_id: uploadResult.remoteId,
      remote_path: uploadResult.remotePath,
      parent_id: validParentId,
      is_folder: 0,
    });

    return NextResponse.json({
      success: true,
      file: fileRecord,
      message: `File uploaded successfully to ${uploadResult.provider}`,
    });
  } catch (error: any) {
    console.error('Upload API error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Upload failed' }, { status: 500 });
  }
}
