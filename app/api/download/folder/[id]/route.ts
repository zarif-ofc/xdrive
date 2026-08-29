import { NextRequest, NextResponse } from 'next/server';
import { getDb, getFileById, FileRecord } from '@/lib/db';
import { executeStorageDownload } from '@/lib/storage/router';
import JSZip from 'jszip';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function streamToBuffer(stream: any): Promise<Buffer> {
  const chunks: any[] = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk: any) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', (err: any) => reject(err));
  });
}

export async function GET(req: NextRequest, context: { params: { id: string } }) {
  try {
    const folderId = context?.params?.id;
    if (!folderId) {
      return NextResponse.json({ success: false, error: 'Folder ID missing' }, { status: 400 });
    }

    const folderRecord = getFileById(folderId);
    if (!folderRecord || folderRecord.is_folder !== 1) {
      return NextResponse.json({ success: false, error: 'Folder not found' }, { status: 404 });
    }

    const db = getDb();
    const allFiles = db.prepare('SELECT * FROM files').all() as FileRecord[];

    const filesToZip: { file: FileRecord; relativePath: string }[] = [];

    function collect(currentFolderId: string, currentPath: string) {
      const children = allFiles.filter((f) => f.parent_id === currentFolderId);
      for (const child of children) {
        const itemPath = `${currentPath}/${child.name}`;
        if (child.is_folder === 1) {
          collect(child.id, itemPath);
        } else {
          filesToZip.push({ file: child, relativePath: itemPath });
        }
      }
    }

    const folderName = folderRecord.name;
    collect(folderId, folderName);

    if (filesToZip.length === 0) {
      return NextResponse.json({ success: false, error: 'Folder is empty' }, { status: 400 });
    }

    const zip = new JSZip();

    for (const { file, relativePath } of filesToZip) {
      try {
        const nodeStream = await executeStorageDownload(file);
        const buffer = await streamToBuffer(nodeStream);
        zip.file(relativePath, buffer);
      } catch (err) {
        console.error(`Failed to include file ${file.name} in ZIP:`, err);
      }
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });

    const safeFolderName = folderName.replace(/[/\\?%*:|"<>]/g, '_');
    const zipFilename = `${safeFolderName}.zip`;
    const encodedFilename = encodeURIComponent(zipFilename);

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`,
        'Content-Length': zipBuffer.length.toString(),
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error: any) {
    console.error('Folder zip download error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Folder download failed' }, { status: 500 });
  }
}
