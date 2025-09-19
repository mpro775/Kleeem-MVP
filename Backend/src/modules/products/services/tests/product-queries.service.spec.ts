import { Test, TestingModule } from '@nestjs/testing';
import { ProductQueriesService } from '../product-queries.service';
import { ConfigService } from '@nestjs/config';

const repo = {
  findById: jest.fn(),
  searchHeuristics: jest.fn(),
  searchText: jest.fn(),
  findAllByMerchant: jest.fn()
};
const t = {
  translate: (k: string) => k,
  translateProduct: (k: string) => k
};
const cfg = {
  get: (k: string) => (k.endsWith('heuristicTopN') ? 10 : 20)
};

describe('ProductQueriesService', () => {
  let svc: ProductQueriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductQueriesService,
        { provide: 'ProductsRepository', useValue: repo },
        { provide: 'TranslationService', useValue: t },
        { provide: ConfigService, useValue: cfg },
      ],
    }).compile();
    svc = module.get(ProductQueriesService);
    jest.resetAllMocks();
  });

  it('findOne -> returns product by valid id', async () => {
    const product = { _id: '507f1f77bcf86cd799439011', name: 'Test Product' };
    repo.findById.mockResolvedValue(product);

    const result = await svc.findOne('507f1f77bcf86cd799439011');

    expect(repo.findById).toHaveBeenCalledWith(
      expect.any(Object) // ObjectId
    );
    expect(result).toBe(product);
  });

  it('findOne -> throws BadRequestException for invalid ObjectId', async () => {
    await expect(svc.findOne('invalid-id')).rejects.toThrow(
      'validation.mongoId'
    );
    expect(repo.findById).not.toHaveBeenCalled();
  });

  it('findOne -> throws NotFoundException when product not found', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(svc.findOne('507f1f77bcf86cd799439011')).rejects.toThrow(
      'errors.notFound'
    );
  });

  it('findAllByMerchant -> delegates to repository', async () => {
    const merchantId = '507f1f77bcf86cd799439011';
    const products = [{ _id: 'p1' }, { _id: 'p2' }];
    repo.findAllByMerchant.mockResolvedValue(products);

    const result = await svc.findAllByMerchant(merchantId as any);

    expect(repo.findAllByMerchant).toHaveBeenCalledWith(merchantId);
    expect(result).toBe(products);
  });

  it('searchCatalog -> heuristics first then text', async () => {
    const heuristicsResult = [{ _id: 'h1' }];
    repo.searchHeuristics.mockResolvedValue(heuristicsResult);
    repo.searchText.mockResolvedValue([{ _id: 't1' }]);

    const result = await svc.searchCatalog('507f1f77bcf86cd799439011', 'test query');

    expect(repo.searchHeuristics).toHaveBeenCalledWith(
      expect.any(Object), // ObjectId
      'test query',
      10
    );
    expect(repo.searchText).not.toHaveBeenCalled();
    expect(result).toBe(heuristicsResult);
  });

  it('searchCatalog -> falls back to text search when heuristics empty', async () => {
    const textResult = [{ _id: 't1' }];
    repo.searchHeuristics.mockResolvedValue([]);
    repo.searchText.mockResolvedValue(textResult);

    const result = await svc.searchCatalog('507f1f77bcf86cd799439011', 'test query');

    expect(repo.searchHeuristics).toHaveBeenCalled();
    expect(repo.searchText).toHaveBeenCalledWith(
      expect.any(Object), // ObjectId
      'test query',
      10
    );
    expect(result).toBe(textResult);
  });

  it('searchCatalog -> returns empty when both searches fail', async () => {
    repo.searchHeuristics.mockResolvedValue([]);
    repo.searchText.mockRejectedValue(new Error('search failed'));

    const result = await svc.searchCatalog('507f1f77bcf86cd799439011', 'test query');

    expect(repo.searchHeuristics).toHaveBeenCalled();
    expect(repo.searchText).toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('searchCatalog -> handles text search failure gracefully', async () => {
    repo.searchHeuristics.mockResolvedValue([]);
    repo.searchText.mockRejectedValue(new Error('search failed'));

    const result = await svc.searchCatalog('507f1f77bcf86cd799439011', 'test query');

    expect(result).toEqual([]);
  });

  it('searchCatalog -> uses correct config values', async () => {
    cfg.get = jest.fn((k: string) => {
      if (k === 'vars.products.heuristicTopN') return 15;
      return 20;
    });

    repo.searchHeuristics.mockResolvedValue([]);

    await svc.searchCatalog('507f1f77bcf86cd799439011', 'test');

    expect(cfg.get).toHaveBeenCalledWith('vars.products.heuristicTopN');
  });
});
