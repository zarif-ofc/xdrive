import { NextResponse } from 'next/server';
import { getOverallStorageMetrics } from '@/lib/storage/router';

// Trigger background warmup when this route module loads
import '@/lib/storage/warmup';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    // Fully synchronous — reads only from SQLite, returns in < 5ms
    const metrics = getOverallStorageMetrics();
    return NextResponse.json({ success: true, metrics });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
