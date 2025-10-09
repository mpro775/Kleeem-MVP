import { Types } from 'mongoose';

import { PublicRouterController } from '../public-router.controller';

describe('PublicRouterController', () => {
  const makeModels = () => {
    const merchants = {
      findOne: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            _id: new Types.ObjectId(),
            name: 'M',
            publicSlug: 'm',
          }),
        }),
      }),
    } as any;
    const stores = {
      findOneAndUpdate: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(),
          primaryColor: '#fff',
          secondaryColor: '#000',
        }),
      }),
    } as any;
    const widgets = {
      findOneAndUpdate: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(),
          embedMode: 'bubble',
        }),
      }),
    } as any;
    return { merchants, stores, widgets };
  };

  it('getSummary returns URLs and theme', async () => {
    const { merchants, stores, widgets } = makeModels();
    const ctrl = new PublicRouterController(merchants, widgets, stores);
    const res = await ctrl.getSummary('slug');
    expect(res.urls.store).toContain('/store/');
    expect(res.embedModes.length).toBeGreaterThan(0);
  });

  it('getStore and getChat return documents', async () => {
    const { merchants, stores, widgets } = makeModels();
    const ctrl = new PublicRouterController(merchants, widgets, stores);
    const store = await ctrl.getStore('slug');
    const chat = await ctrl.getChat('slug');
    expect(store).toBeDefined();
    expect(chat).toBeDefined();
  });
});
