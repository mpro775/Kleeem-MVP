// common/guards/throttler-tenant.guard.spec.ts
import { ThrottlerTenantGuard } from './throttler-tenant.guard';

import type { Request } from 'express';

// نُبسّط الحارس الأصلي حتى نستطيع إنشاء نسخة من الحارس بدون متطلبات Nest
jest.mock('@nestjs/throttler', () => ({
  ThrottlerGuard: class {},
}));

type AugmentedRequest = Request & {
  params?: { merchantId?: string; channelId?: string };
  headers: Request['headers'] & {
    'x-merchant-id'?: string | string[];
    'x-channel-id'?: string | string[];
    'cf-connecting-ip'?: string | string[];
    'x-forwarded-for'?: string | string[];
  };
  user?: { sub?: string | number; id?: string | number };
  ips?: string[];
  ip?: string;
  socket?: { remoteAddress?: string };
};

const makeReq = (overrides: Partial<AugmentedRequest> = {}): AugmentedRequest =>
  ({
    params: {},
    headers: {},
    socket: {},
    ...overrides,
  }) as unknown as AugmentedRequest;

describe('ThrottlerTenantGuard#getTracker', () => {
  // يغطي: تفضيل (merchant+channel) ثم merchant ثم user ثم IP، ويغطي مصدر المعرفات من params والرؤوس، ومعالجة userId كرقم/سلسلة.
  let guard: ThrottlerTenantGuard;

  beforeEach(() => {
    // ARRANGE
    guard = new ThrottlerTenantGuard(null as any, null as any, null as any);
  });

  it('returns "m:<merchant>:c:<channel>" when both present (from params)', async () => {
    // ARRANGE
    const req = makeReq({
      params: { merchantId: 'm1', channelId: 'c1' },
    });

    // ACT
    const key = await (guard as any).getTracker(req);

    // ASSERT
    expect(key).toBe('m:m1:c:c1');
  });

  it('uses headers (string) when params missing', async () => {
    // ARRANGE
    const req = makeReq({
      headers: { 'x-merchant-id': 'm2', 'x-channel-id': 'c2' },
    });

    // ACT
    const key = await (guard as any).getTracker(req);

    // ASSERT
    expect(key).toBe('m:m2:c:c2');
  });

  it('uses first element when headers are arrays', async () => {
    // ARRANGE
    const req = makeReq({
      headers: {
        'x-merchant-id': ['m3', 'm3b'],
        'x-channel-id': ['c3', 'c3b'],
      },
    });

    // ACT
    const key = await (guard as any).getTracker(req);

    // ASSERT
    expect(key).toBe('m:m3:c:c3');
  });

  it('falls back to "m:<merchant>" when channel missing', async () => {
    // ARRANGE
    const req = makeReq({ params: { merchantId: 'm4' } });

    // ACT
    const key = await (guard as any).getTracker(req);

    // ASSERT
    expect(key).toBe('m:m4');
  });

  it('falls back to "u:<userId>" when merchant absent and user present (user.sub as string)', async () => {
    // ARRANGE
    const req = makeReq({ user: { sub: 'u1' } });

    // ACT
    const key = await (guard as any).getTracker(req);

    // ASSERT
    expect(key).toBe('u:u1');
  });

  it('normalizes numeric userId (from user.id) to string', async () => {
    // ARRANGE
    const req = makeReq({ user: { id: 123 } });

    // ACT
    const key = await (guard as any).getTracker(req);

    // ASSERT
    expect(key).toBe('u:123');
    expect(typeof key.split(':')[1]).toBe('string');
  });

  it('prefers merchant/channel over user when all exist', async () => {
    // ARRANGE
    const req = makeReq({
      params: { merchantId: 'm5', channelId: 'c5' },
      user: { sub: 'u5' },
    });

    // ACT
    const key = await (guard as any).getTracker(req);

    // ASSERT
    expect(key).toBe('m:m5:c:c5');
  });

  it('prefers merchant over user when only merchant exists', async () => {
    // ARRANGE
    const req = makeReq({
      params: { merchantId: 'm6' },
      user: { sub: 'u6' },
    });

    // ACT
    const key = await (guard as any).getTracker(req);

    // ASSERT
    expect(key).toBe('m:m6');
  });

  it('uses client IP when no merchant/channel/user found', async () => {
    // ARRANGE
    const req = makeReq({ ip: '9.9.9.9' });

    // ACT
    const key = await (guard as any).getTracker(req);

    // ASSERT
    expect(key).toBe('9.9.9.9');
  });
});

describe('ThrottlerTenantGuard#getClientIp (private)', () => {
  // يغطي: مصادر IP المتاحة (req.ips، Cloudflare، X-Forwarded-For، req.ip، socket.remoteAddress، unknown) وترتيب الأولوية.
  let guard: ThrottlerTenantGuard;

  beforeEach(() => {
    // ARRANGE
    guard = new ThrottlerTenantGuard(null as any, null as any, null as any);
  });

  it('returns first of req.ips when trust proxy is enabled', () => {
    // ARRANGE
    const req = makeReq({ ips: ['1.1.1.1', '2.2.2.2'] });

    // ACT
    const ip = (guard as any).getClientIp(req);

    // ASSERT
    expect(ip).toBe('1.1.1.1');
  });

  it('uses Cloudflare cf-connecting-ip when present (string)', () => {
    // ARRANGE
    const req = makeReq({
      headers: { 'cf-connecting-ip': '2.2.2.2' },
    });

    // ACT
    const ip = (guard as any).getClientIp(req);

    // ASSERT
    expect(ip).toBe('2.2.2.2');
  });

  it('uses first element from cf-connecting-ip array', () => {
    // ARRANGE
    const req = makeReq({
      headers: { 'cf-connecting-ip': ['3.3.3.3', '3.3.3.4'] },
    });

    // ACT
    const ip = (guard as any).getClientIp(req);

    // ASSERT
    expect(ip).toBe('3.3.3.3');
  });

  it('parses x-forwarded-for and takes the first value (string with commas)', () => {
    // ARRANGE
    const req = makeReq({
      headers: { 'x-forwarded-for': '4.4.4.4, 5.5.5.5' },
    });

    // ACT
    const ip = (guard as any).getClientIp(req);

    // ASSERT
    expect(ip).toBe('4.4.4.4');
  });

  it('parses x-forwarded-for when provided as array and trims whitespace', () => {
    // ARRANGE
    const req = makeReq({
      headers: { 'x-forwarded-for': [' 6.6.6.6 , 7.7.7.7 '] },
    });

    // ACT
    const ip = (guard as any).getClientIp(req);

    // ASSERT
    expect(ip).toBe('6.6.6.6');
  });

  it('falls back to req.ip if no proxy headers present', () => {
    // ARRANGE
    const req = makeReq({ ip: '8.8.8.8' });

    // ACT
    const ip = (guard as any).getClientIp(req);

    // ASSERT
    expect(ip).toBe('8.8.8.8');
  });

  it('falls back to socket.remoteAddress if req.ip is missing', () => {
    // ARRANGE
    const req = makeReq({ socket: { remoteAddress: '10.0.0.1' } as any });

    // ACT
    const ip = (guard as any).getClientIp(req);

    // ASSERT
    expect(ip).toBe('10.0.0.1');
  });

  it('returns "unknown" when no source is available', () => {
    // ARRANGE
    const req = makeReq();

    // ACT
    const ip = (guard as any).getClientIp(req);

    // ASSERT
    expect(ip).toBe('unknown');
  });
});

describe('ThrottlerTenantGuard#getUserId (private)', () => {
  // يغطي: اختيار sub أولاً ثم id، وتحويل الأرقام إلى نص.
  let guard: ThrottlerTenantGuard;

  beforeEach(() => {
    // ARRANGE
    guard = new ThrottlerTenantGuard(null as any, null as any, null as any);
  });

  it('prefers user.sub when both sub and id exist', () => {
    // ARRANGE
    const req = makeReq({ user: { sub: 'sub-1', id: 'id-1' } });

    // ACT
    const userId = (guard as any).getUserId(req);

    // ASSERT
    expect(userId).toBe('sub-1');
  });

  it('uses user.id when sub is absent', () => {
    // ARRANGE
    const req = makeReq({ user: { id: 'id-2' } });

    // ACT
    const userId = (guard as any).getUserId(req);

    // ASSERT
    expect(userId).toBe('id-2');
  });

  it('converts numeric sub to string', () => {
    // ARRANGE
    const req = makeReq({ user: { sub: 42 } });

    // ACT
    const userId = (guard as any).getUserId(req);

    // ASSERT
    expect(userId).toBe('42');
    expect(typeof userId).toBe('string');
  });

  it('converts numeric id to string', () => {
    // ARRANGE
    const req = makeReq({ user: { id: 99 } });

    // ACT
    const userId = (guard as any).getUserId(req);

    // ASSERT
    expect(userId).toBe('99');
  });

  it('returns undefined when no user present', () => {
    // ARRANGE
    const req = makeReq();

    // ACT
    const userId = (guard as any).getUserId(req);

    // ASSERT
    expect(userId).toBeUndefined();
  });
});

describe('ThrottlerTenantGuard#getMerchantId / getChannelId (private)', () => {
  // يغطي: تفضيل params، ثم الرؤوس، والتعامل مع مصفوفات الرؤوس.
  let guard: ThrottlerTenantGuard;

  beforeEach(() => {
    // ARRANGE
    guard = new ThrottlerTenantGuard(null as any, null as any, null as any);
  });

  it('merchant/channel from params', () => {
    // ARRANGE
    const req = makeReq({ params: { merchantId: 'pm', channelId: 'pc' } });

    // ACT
    const m = (guard as any).getMerchantId(req);
    const c = (guard as any).getChannelId(req);

    // ASSERT
    expect(m).toBe('pm');
    expect(c).toBe('pc');
  });

  it('merchant/channel from headers (string)', () => {
    // ARRANGE
    const req = makeReq({
      headers: { 'x-merchant-id': 'hm', 'x-channel-id': 'hc' },
    });

    // ACT
    const m = (guard as any).getMerchantId(req);
    const c = (guard as any).getChannelId(req);

    // ASSERT
    expect(m).toBe('hm');
    expect(c).toBe('hc');
  });

  it('merchant/channel from headers (array => first element)', () => {
    // ARRANGE
    const req = makeReq({
      headers: { 'x-merchant-id': ['mA', 'mB'], 'x-channel-id': ['cA', 'cB'] },
    });

    // ACT
    const m = (guard as any).getMerchantId(req);
    const c = (guard as any).getChannelId(req);

    // ASSERT
    expect(m).toBe('mA');
    expect(c).toBe('cA');
  });

  it('undefined when not present anywhere', () => {
    // ARRANGE
    const req = makeReq();

    // ACT
    const m = (guard as any).getMerchantId(req);
    const c = (guard as any).getChannelId(req);

    // ASSERT
    expect(m).toBeUndefined();
    expect(c).toBeUndefined();
  });
});

/*
ملخص التغطية في هذه المجموعة:
- getTracker: يغطي جميع فروع الاختيار (merchant+channel، merchant فقط، user، IP).
- getClientIp: يغطي جميع مسارات مصادر الـ IP وفق الأولوية، بما في ذلك مصفوفات الرؤوس والتقسيم والـ fallbacks.
- getUserId/getMerchantId/getChannelId: تغطي مصادر متعددة وأنواع القيم، والتحويل إلى نص عند الحاجة.
*/
