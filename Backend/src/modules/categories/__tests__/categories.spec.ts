import { Test } from '@nestjs/testing';
import { CategoriesService } from '../categories.service';
import { CategoriesRepository } from '../repositories/categories.repository';

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
        withTransaction: async (fn: any) => fn(),
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
    const out = await service.create({ name: 'Cat', merchantId: 'm1' } as any);
    expect(out.name).toBe('Cat');
  });

  it('move calculates order', async () => {
    repo.findByIdForMerchant.mockResolvedValue({
      _id: 'c1',
      parent: null,
    } as any);
    repo.listSiblings.mockResolvedValue([
      { _id: 'a', order: 0 },
      { _id: 'b', order: 1 },
    ] as any);
    const res = await service.move('c1', 'm1', { position: 1 } as any);
    expect(repo.updateOrder).toHaveBeenCalled();
  });
});
