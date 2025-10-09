import { Types } from 'mongoose';

import { SlugResolverService } from '../slug-resolver.service';

describe('SlugResolverService', () => {
  const makeModels = () => {
    const merchants = {
      findOne: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
        }),
      }),
    } as any;
    const channels = {
      findOne: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
        }),
      }),
    } as any;
    return { merchants, channels };
  };

  it('resolves slug and default webchat channel', async () => {
    const { merchants, channels } = makeModels();
    const svc = new SlugResolverService(merchants, channels);
    const res = await svc.resolve('store');
    expect(res.merchantId).toBeDefined();
    expect(res.webchatChannelId).toBeDefined();
    expect(merchants.findOne).toHaveBeenCalled();
    expect(channels.findOne).toHaveBeenCalled();
  });

  it('throws when slug not found or disabled', async () => {
    const { merchants, channels } = makeModels();
    // make merchants return null
    merchants.findOne().select().lean.mockResolvedValueOnce(null);
    const svc = new SlugResolverService(merchants, channels);
    await expect(svc.resolve('x')).rejects.toThrow(
      'slug not found or disabled',
    );
  });
});
