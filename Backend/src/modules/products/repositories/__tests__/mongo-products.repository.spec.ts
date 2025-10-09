import { MongoProductsRepository } from '../mongo-products.repository';

describe('MongoProductsRepository', () => {
  let repository: MongoProductsRepository;

  beforeEach(() => {
    repository = new MongoProductsRepository(
      {} as any, // Mock product model
      {} as any, // Mock pagination service
    );
  });

  describe('Basic functionality', () => {
    it('should be instantiable', () => {
      // Assert
      expect(repository).toBeInstanceOf(MongoProductsRepository);
      expect(repository).toBeDefined();
    });

    it('should have all required methods', () => {
      // Assert
      expect(typeof repository.create).toBe('function');
      expect(typeof repository.findById).toBe('function');
      expect(typeof repository.updateById).toBe('function');
      expect(typeof repository.deleteById).toBe('function');
      expect(typeof repository.countByMerchant).toBe('function');
      expect(typeof repository.findAllByMerchant).toBe('function');
      expect(typeof repository.findPublicBySlug).toBe('function');
      expect(typeof repository.findPublicBySlugWithMerchant).toBe('function');
      expect(typeof repository.list).toBe('function');
      expect(typeof repository.listPublic).toBe('function');
      expect(typeof repository.listPublicByMerchant).toBe('function');
      expect(typeof repository.searchText).toBe('function');
      expect(typeof repository.searchHeuristics).toBe('function');
      expect(typeof repository.findByExternal).toBe('function');
      expect(typeof repository.upsertExternal).toBe('function');
      expect(typeof repository.setAvailability).toBe('function');
      expect(typeof repository.findByIdsScoped).toBe('function');
      expect(typeof repository.removeByExternal).toBe('function');
      expect(typeof repository.startSession).toBe('function');
    });

    it('should have correct class name and structure', () => {
      // Assert
      expect(repository.constructor.name).toBe('MongoProductsRepository');
      expect(repository).toHaveProperty('productModel');
      expect(repository).toHaveProperty('pagination');
    });
  });
});
