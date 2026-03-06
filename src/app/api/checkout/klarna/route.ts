import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      error: 'Klarna not enabled yet',
      provider: 'KLARNA',
      code: 'NOT_IMPLEMENTED',
    },
    { status: 501 },
  );
}
