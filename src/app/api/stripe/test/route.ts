import { NextResponse } from 'next/server'

// This endpoint is disabled in production to avoid exposing environment status.
export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({
    hasKey: !!process.env.STRIPE_SECRET_KEY,
  })
}