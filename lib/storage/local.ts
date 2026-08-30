import fs from 'fs';
import path from 'path';
import { Readable, PassThrough } from 'stream';

const isVercel = process.env.VERCEL === '1' || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
const LOCAL_STORAGE_DIR = isVercel ? path.join('/tmp', '.xdrive_storage') : path.join(process.cwd(), '.xdrive_storage');

if (!fs.existsSync(LOCAL_STORAGE_DIR)) {
  fs.mkdirSync(LOCAL_STORAGE_DIR, { recursive: true });
}

export async function uploadToLocal(
  stream: Readable | PassThrough,
  fileName: string,
  id: string
): Promise<{ remoteId: string; remotePath: string }> {
  const filePath = path.join(LOCAL_STORAGE_DIR, `${id}_${fileName}`);
  const writeStream = fs.createWriteStream(filePath);

  return new Promise((resolve, reject) => {
    stream.pipe(writeStream);
    writeStream.on('finish', () => {
      resolve({
        remoteId: id,
        remotePath: filePath,
      });
    });
    writeStream.on('error', reject);
  });
}

export async function downloadFromLocal(remotePath: string): Promise<Readable> {
  if (!fs.existsSync(remotePath)) {
    throw new Error('Local file not found');
  }
  return fs.createReadStream(remotePath);
}

export async function deleteFromLocal(remotePath: string): Promise<boolean> {
  try {
    if (fs.existsSync(remotePath)) {
      fs.unlinkSync(remotePath);
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Error deleting local file:', err);
    return false;
  }
}

export async function wipeAllFromLocal(): Promise<void> {
  try {
    if (fs.existsSync(LOCAL_STORAGE_DIR)) {
      const files = fs.readdirSync(LOCAL_STORAGE_DIR);
      for (const file of files) {
        try {
          fs.unlinkSync(path.join(LOCAL_STORAGE_DIR, file));
        } catch {}
      }
    }
  } catch {}
}
