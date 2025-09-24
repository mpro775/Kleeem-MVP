// src/modules/webhooks/utils/tx.util.ts
import type { ClientSession, Connection } from 'mongoose';

export async function tryWithTx<T>(
  conn: Connection,
  work: (session?: ClientSession) => Promise<T>,
): Promise<T> {
  let session: ClientSession | undefined;
  try {
    session = await conn.startSession();

    return await session.withTransaction(async () => work(session));
  } catch (e) {
    const msg = (e as Error).message || '';
    if (
      (e as { code?: number }).code === 20 ||
      /Transaction numbers are only allowed/i.test(msg)
    ) {
      return work(undefined);
    }
    throw e;
  } finally {
    try {
      await session?.endSession();
    } catch {
      // ignore
    }
  }
}
