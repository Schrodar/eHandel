/**
 * src/lib/outbox/processor.ts
 *
 * Outbox processor – fetches unprocessed OrderEvents, locks them with a
 * lease, runs the appropriate handler, and marks them as processedAt.
 *
 * Locking strategy: Lease locking (option B)
 *   1. updateMany WHERE processedAt IS NULL
 *              AND (lockedAt IS NULL OR lockedAt < now - LEASE_DURATION_MS)
 *      SET lockedAt = now, lockedBy = instanceId
 *   2. Read back the rows we just locked (lockedBy = instanceId AND processedAt IS NULL).
 *   3. For each: run handler → set processedAt = now.
 *   4. On error: increment attempts, set lastError, clear lock so another instance can retry.
 *
 * This is safe under concurrent calls: only the instance that wins the
 * updateMany will process a given event. The lease ensures recovery after
 * process crashes.
 */

import { OrderEventType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { processOrderPaidEvent, processOrderShippedEvent } from './handlers';

/** Lease duration in milliseconds. Events locked > this ago are available for retry. */
const LEASE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

/** Maximum number of attempts before an event is considered dead */
const MAX_ATTEMPTS = 5;

export type ProcessOutboxResult = {
  processed: number;
  failed: number;
  skipped: number;
};

export async function processOutbox({
  limit = 20,
  lockedBy = `worker-${process.pid}`,
}: {
  limit?: number;
  lockedBy?: string;
} = {}): Promise<ProcessOutboxResult> {
  console.log(`[Outbox] OUTBOX PROCESS START limit=${limit} lockedBy=${lockedBy}`);

  const leaseExpiry = new Date(Date.now() - LEASE_DURATION_MS);
  const now = new Date();

  // 1. Acquire lease on up to `limit` unprocessed events
  const { count: locked } = await prisma.orderEvent.updateMany({
    where: {
      processedAt: null,
      attempts: { lt: MAX_ATTEMPTS },
      OR: [
        { lockedAt: null },
        { lockedAt: { lt: leaseExpiry } },
      ],
    },
    data: {
      lockedAt: now,
      lockedBy,
    },
  });

  if (locked === 0) {
    console.log('[Outbox] No events to process');
    return { processed: 0, failed: 0, skipped: 0 };
  }

  // 2. Fetch the rows we just locked
  const events = await prisma.orderEvent.findMany({
    where: {
      processedAt: null,
      lockedBy,
      lockedAt: now, // exact match – only rows we just locked right now
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });

  let processed = 0;
  let failed = 0;
  let skipped = 0;

  for (const event of events) {
    console.log(`[Outbox] OUTBOX LOCK ACQUIRED eventId=${event.id} type=${event.type} orderId=${event.orderId}`);

    try {
      // Dispatch to handler
      switch (event.type) {
        case OrderEventType.ORDER_PAID:
          await processOrderPaidEvent(event);
          break;
        case OrderEventType.ORDER_SHIPPED:
          await processOrderShippedEvent(event);
          break;
        default:
          console.warn(`[Outbox] Unknown event type: ${event.type} – skipping`);
          skipped++;
          // Release lock without incrementing attempts
          await prisma.orderEvent.update({
            where: { id: event.id },
            data: { lockedAt: null, lockedBy: null },
          });
          continue;
      }

      // Mark as processed
      await prisma.orderEvent.update({
        where: { id: event.id },
        data: {
          processedAt: new Date(),
          lockedAt: null,
          lockedBy: null,
          lastError: null,
        },
      });

      console.log(`[Outbox] EVENT PROCESSED eventId=${event.id} processedAt=${new Date().toISOString()}`);
      processed++;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const newAttempts = event.attempts + 1;

      await prisma.orderEvent.update({
        where: { id: event.id },
        data: {
          attempts: newAttempts,
          lastError: errMsg,
          lockedAt: null, // release lock so next run can retry
          lockedBy: null,
        },
      });

      console.error(
        `[Outbox] EVENT FAILED eventId=${event.id} attempts=${newAttempts} lastError=${errMsg}`,
      );
      failed++;
    }
  }

  console.log(`[Outbox] OUTBOX PROCESS DONE processed=${processed} failed=${failed} skipped=${skipped}`);
  return { processed, failed, skipped };
}
