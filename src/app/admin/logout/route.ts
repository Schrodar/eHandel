import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  const url = new URL('/', req.url);
  return NextResponse.redirect(url);
}
