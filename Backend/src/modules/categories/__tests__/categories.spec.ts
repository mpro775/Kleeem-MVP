import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';

import { CategoriesService } from '../categories.service';

import type { CategoriesRepository } from '../repositories/categories.repository';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let repo: jest.Mocked<CategoriesRepository>;

  beforeEach(async () => {
    repo = {
      createCategory: jest.fn(),
      findAllByMerchant: jest.fn(),
      findByIdForMerchant: jest.fn(),
      findLeanByIdForMerchant: jest.fn(),
      updateCategoryFields: jest.fn(),
      deleteManyByIds: jest.fn(),
      parentExistsForMerchant: jest.fn(),
      isDescendant: jest.fn(),
      listSiblings: jest.fn(),
      updateOrder: jest.fn(),
      normalizeSiblingsOrders: jest.fn(),
      findManyByIds: jest.fn(),
      findSubtreeIds: jest.fn(),
      anyProductsInCategories: jest.fn(),
      startSession: jest.fn().mockResolvedValue({
        withTransaction: (fn: () => Promise<void>) => fn(),
        endSession() {},
      } as any),
    };

    const module = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: 'CategoriesRepository', useValue: repo },
        {
          provide: 'MINIO_CLIENT',
          useValue: {
            bucketExists: jest.fn(),
            makeBucket: jest.fn(),
            fPutObject: jest.fn(),
            presignedUrl: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(CategoriesService);
  });

  it('creates category with computed path', async () => {
    repo.findLeanByIdForMerchant.mockResolvedValue(null);
    repo.createCategory.mockResolvedValue({
      toObject: () => ({ name: 'Cat' }),
    } as any);
    const out = await service.create({ name: 'Cat', merchantId: 'm1' });
    expect(out.name).toBe('Cat');
  });

  it('move calculates order', async () => {
    repo.findByIdForMerchant.mockResolvedValue({
      _id: new Types.ObjectId(),
      parent: null,
    } as any);
    repo.listSiblings.mockResolvedValue([
      { _id: new Types.ObjectId(), order: 0 } as any,
      { _id: new Types.ObjectId(), order: 1 } as any,
    ] as any);
    await service.move('c1', 'm1', { position: 1 });
    expect(repo.updateOrder).toHaveBeenCalled(); // eslint-disable-line @typescript-eslint/unbound-method
  });
});
