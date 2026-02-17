import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type Body = { password?: string };


// Simple in-memory rate-limit by IP (best-effort, not guaranteed in serverless).
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;
const ipStats = new Map<string, { count: number; first: number }>();

function getIp(req: Request) {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

export async function POST(req: Request) {
  try {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;

    if (!serviceKey || !supabaseUrl) {
      return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 });
    }

    const ip = getIp(req);
    const now = Date.now();
    const stats = ipStats.get(ip) ?? { count: 0, first: now };
    if (now - stats.first > RATE_LIMIT_WINDOW_MS) {
      stats.count = 0;
      stats.first = now;
    }
    stats.count += 1;
    ipStats.set(ip, stats);
    if (stats.count > RATE_LIMIT_MAX) {
      return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
    }

    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) {
      return NextResponse.json({ error: 'invalid_or_expired_token' }, { status: 401 });
    }

    const body = (await req.json()) as Body;
    const password = body?.password ?? '';
    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'password_too_short' }, { status: 400 });
    }

    // Verify token belongs to a user
    const verifyRes = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: serviceKey,
      },
    });

    if (!verifyRes.ok) {
      return NextResponse.json({ error: 'invalid_or_expired_token' }, { status: 401 });
    }

    const userData = await verifyRes.json();
    const userId = userData?.id;
    if (!userId) {
      return NextResponse.json({ error: 'invalid_or_expired_token' }, { status: 401 });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Use admin API to update password by user id
    const { error } = await adminClient.auth.admin.updateUserById(userId, {
      password,
    });

    if (error) {
      return NextResponse.json({ error: 'update_failed' }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
