import { NextRequest, NextResponse } from 'next/server';
import { deleteAllFileRecords } from '@/lib/db';
import { wipeAllFromMega } from '@/lib/storage/mega';
import { wipeAllFromFilen } from '@/lib/storage/filen';
import { wipeAllFromLocal } from '@/lib/storage/local';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { password } = body;

    const accessPassword = process.env.ACCESS_PASSWORD;
    if (!accessPassword || password !== accessPassword) {
      return NextResponse.json(
        { success: false, error: 'Invalid access password' },
        { status: 401 }
      );
    }

    console.log('[Xdrive] Executing /rm -rf: Total purge of all files from MEGA, Filen & local DB...');

    // Clear all records from database & local disk immediately
    deleteAllFileRecords();

    // Wipe remote cloud storage providers simultaneously in parallel
    await Promise.race([
      Promise.allSettled([
        wipeAllFromMega(),
        wipeAllFromFilen(),
        wipeAllFromLocal(),
      ]),
      new Promise((resolve) => setTimeout(resolve, 20000)),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Wiped successfully',
    });
  } catch (error: any) {
    console.error('[Xdrive] Purge error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Wipe failed' },
      { status: 500 }
    );
  }
}
