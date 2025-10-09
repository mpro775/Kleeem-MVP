import { tryWithTx } from '../../utils/tx.util';

describe('tryWithTx', () => {
  const makeConn = () => {
    const session = {
      withTransaction: jest.fn((fn: any) => fn()),
      endSession: jest.fn().mockResolvedValue(undefined),
    };
    const conn = { startSession: jest.fn().mockResolvedValue(session) } as any;
    return { conn, session };
  };

  it('runs work in a transaction and ends session', async () => {
    const { conn, session } = makeConn();
    const work = jest.fn(() => 'ok');
    const res = await tryWithTx(conn, work as any);
    expect(res).toBe('ok');
    expect(session.withTransaction).toHaveBeenCalled();
    expect(session.endSession).toHaveBeenCalled();
  });

  it('falls back to non-transaction when code 20', async () => {
    const { conn, session } = makeConn();
    (session.withTransaction as jest.Mock).mockRejectedValueOnce({ code: 20 });
    const work = jest.fn(() => 'fallback');
    const res = await tryWithTx(conn, work as any);
    expect(res).toBe('fallback');
  });
});
