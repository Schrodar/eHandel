import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

/**
 * Supabase (and any PgBouncer-style pooler) can recycle TCP connections
 * without deallocating PostgreSQL prepared statements, causing:
 *   "prepared statement Sxxx does not exist" (code 26000)
 *
 * Setting pgbouncer=true in the connection URL tells Prisma to use
 * simple (non-prepared) queries, which avoids this entirely.
 * This is safe for both the pooler URL (port 6543) and the direct URL
 * (port 5432) — it only disables server-side statement caching.
 */
function buildDatabaseUrl(): string {
  const base = process.env.DATABASE_URL ?? '';
  if (!base) return base;
  let url = base;
  // Tell Prisma to use simple (non-prepared) queries – required for PgBouncer.
  if (!url.includes('pgbouncer=true')) {
    const sep = url.includes('?') ? '&' : '?';
    url = `${url}${sep}pgbouncer=true`;
  }
  // Kill any idle-in-transaction sessions after 10 s at the DB level.
  // This prevents leaked transactions (e.g. from timed-out Netlify functions)
  // from holding row locks indefinitely.
  if (!url.includes('idle_in_transaction_session_timeout')) {
    url = `${url}&options=${encodeURIComponent('--idle_in_transaction_session_timeout=10000')}` ;
  }
  return url;
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: { url: buildDatabaseUrl() },
    },
    log:
      process.env.NODE_ENV === 'development'
        ? ['error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
