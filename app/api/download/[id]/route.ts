import { NextRequest, NextResponse } from 'next/server';
import { getFileById } from '@/lib/db';
import { executeStorageDownload } from '@/lib/storage/router';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest, context: { params: { id: string } }) {
  try {
    const fileId = context?.params?.id;
    if (!fileId) {
      return NextResponse.json({ success: false, error: 'File ID missing' }, { status: 400 });
    }

    const fileRecord = getFileById(fileId);

    if (!fileRecord || fileRecord.is_folder === 1) {
      return NextResponse.json({ success: false, error: 'File not found' }, { status: 404 });
    }

    // Check if inline disposition requested for file preview
    const isInline = req.nextUrl.searchParams.get('inline') === '1';

    const nodeStream = await executeStorageDownload(fileRecord);

    const webStream = new ReadableStream({
      start(controller) {
        nodeStream.on('data', (chunk) => controller.enqueue(chunk));
        nodeStream.on('end', () => controller.close());
        nodeStream.on('error', (err) => controller.error(err));
      },
      cancel() {
        nodeStream.destroy();
      },
    });

    const encodedFilename = encodeURIComponent(fileRecord.name);
    const dispositionType = isInline ? 'inline' : 'attachment';

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        'Content-Type': fileRecord.mime_type || 'application/octet-stream',
        'Content-Disposition': `${dispositionType}; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`,
        'Content-Length': fileRecord.size.toString(),
        'Cache-Control': isInline ? 'public, max-age=3600' : 'no-cache',
      },
    });
  } catch (error: any) {
    console.error('Download error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Download failed' }, { status: 500 });
  }
}
