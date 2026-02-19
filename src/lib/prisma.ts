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
  if (base.includes('pgbouncer=true')) return base;
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}pgbouncer=true`;
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
