/**
 * POST /api/admin/outbox/process?limit=20
 *
 * Manually triggers the outbox processor — useful for:
 *   • retrying events that failed on the first attempt
 *   • dev/staging testing
 *   • monitoring via cron / health checks
 *
 * Query params:
 *   limit (optional, default 20) – max events to process this run
 *
 * Auth: protected by middleware.ts (/api/admin prefix requires admin session).
 *
 * Response 200:
 *   { ok: true, processed: number, failed: number, skipped: number }
 */

import { NextRequest, NextResponse } from 'next/server';
import { processOutbox } from '@/lib/outbox/processor';
import { assertSameOrigin } from '@/lib/security/origin';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const csrfReject = assertSameOrigin(req);
  if (csrfReject) return csrfReject;

  const { searchParams } = new URL(req.url);
  const limitRaw = searchParams.get('limit');
  const limit = limitRaw ? Math.min(Math.max(1, parseInt(limitRaw, 10)), 100) : 20;

  try {
    const result = await processOutbox({ limit });
    console.log(
      `[AdminOutbox] Manual run: processed=${result.processed} failed=${result.failed} skipped=${result.skipped}`,
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[AdminOutbox] processOutbox threw unexpectedly:', err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
