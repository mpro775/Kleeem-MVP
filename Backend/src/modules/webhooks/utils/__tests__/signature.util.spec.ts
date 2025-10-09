import { verifyMetaSignature } from '../../utils/signature.util';

jest.mock('../../../channels/utils/secrets.util', () => ({
  decryptSecret: jest.fn((enc: string) => (enc === 'enc' ? 'secret' : '')),
}));

describe('verifyMetaSignature', () => {
  const makeReq = (raw: Buffer, sig?: string) =>
    ({
      headers: sig ? { 'x-hub-signature-256': sig } : {},
      rawBody: raw,
    }) as any;

  const makeRepo = (appSecretEnc?: string) => ({
    findDefaultWaCloudWithAppSecret: jest
      .fn()
      .mockResolvedValue(appSecretEnc ? { appSecretEnc } : {}),
  });

  it('returns false on missing/invalid header', async () => {
    const repo = makeRepo('enc');
    const ok = await verifyMetaSignature(
      'm',
      makeReq(Buffer.from('x')),
      repo as any,
    );
    expect(ok).toBe(false);
  });

  it('returns true for valid signature', async () => {
    const raw = Buffer.from('hello');
    // HMAC-SHA256(secret, raw) hex
    const crypto = await import('crypto');
    const hex = crypto.createHmac('sha256', 'secret').update(raw).digest('hex');
    const sig = `sha256=${hex}`;
    const repo = makeRepo('enc');

    const ok = await verifyMetaSignature('m', makeReq(raw, sig), repo as any);
    expect(ok).toBe(true);
  });

  it('returns false when repo has no secret or no rawBody', async () => {
    const repo = makeRepo(undefined);
    const ok = await verifyMetaSignature(
      'm',
      makeReq(Buffer.alloc(0), 'sha256=00'),
      repo as any,
    );
    expect(ok).toBe(false);
  });
});
