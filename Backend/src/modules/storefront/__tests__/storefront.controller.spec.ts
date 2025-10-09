import { StorefrontController } from '../storefront.controller';

describe('StorefrontController', () => {
  const makeSvc = () =>
    ({
      findByMerchant: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      updateByMerchant: jest.fn().mockResolvedValue({}),
      checkSlugAvailable: jest.fn().mockResolvedValue({ available: true }),
      getStorefront: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockResolvedValue({}),
      uploadBannerImagesToMinio: jest.fn().mockResolvedValue({ ok: true }),
      getMyOrdersForSession: jest.fn().mockResolvedValue([]),
      getBrandCssBySlug: jest.fn().mockResolvedValue('/* css */'),
    }) as any;

  it('validates bad merchant request route', () => {
    const svc = makeSvc();
    const ctrl = new StorefrontController(svc);
    expect(() => ctrl.badMerchantReq()).toThrow();
  });

  it('delegates to service methods and validates inputs', async () => {
    const svc = makeSvc();
    const ctrl = new StorefrontController(svc);
    await ctrl.findByMerchant('m');
    await ctrl.update('id', {} as any);
    await ctrl.updateByMerchant('m', {} as any);
    await ctrl.storefront('slug');
    await ctrl.create({} as any);
    await ctrl.uploadBanners('m', [] as any);
    await ctrl.getBrandCss('slug');

    await expect(ctrl.checkSlug('store')).resolves.toEqual({ available: true });
    await expect(ctrl.myOrders('m', 's', undefined, '20')).resolves.toEqual([]);
  });
});
