import { WaitlistController } from '../waitlist.controller';

describe('WaitlistController', () => {
  it('passes IP and UA metadata to service', async () => {
    const service = {
      create: jest.fn().mockResolvedValue({ id: '1', createdAt: new Date() }),
    } as any;
    const ctrl = new WaitlistController(service);
    const req = {
      headers: { 'x-forwarded-for': '1.1.1.1', 'user-agent': 'UA' },
      socket: { remoteAddress: '2.2.2.2' },
    } as any;
    await ctrl.create({ email: 'a@b.c' } as any, req);
    expect(service.create).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ ip: '1.1.1.1', userAgent: 'UA' }),
    );
  });
});
