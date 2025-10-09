import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';

import { CategoriesService } from '../categories.service';

import type { CategoriesRepository } from '../repositories/categories.repository';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let repo: jest.Mocked<CategoriesRepository>;
  const validMerchantId = new Types.ObjectId().toHexString();

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
      name: 'Cat',
    } as any);
    const out = await service.create({
      name: 'Cat',
      description: 'Cat',
      keywords: [],
      order: 0,
      merchantId: validMerchantId,
    });
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
    await service.move('c1', validMerchantId, { position: 1 });
    expect(repo.updateOrder).toHaveBeenCalled();
  });

  describe('create', () => {
    it('should create category with parent', async () => {
      const parentId = new Types.ObjectId();
      repo.findLeanByIdForMerchant.mockResolvedValue({
        _id: parentId,
        ancestors: [],
        path: 'parent',
      } as any);
      repo.createCategory.mockResolvedValue({
        name: 'Child',
        slug: 'child',
        path: 'parent/child',
      } as any);

      const result = await service.create({
        name: 'Child',
        description: 'Child category',
        keywords: ['child'],
        order: 1,
        merchantId: validMerchantId,
        parent: parentId.toHexString(),
      });

      expect(repo.findLeanByIdForMerchant).toHaveBeenCalledWith(
        parentId.toHexString(),
        new Types.ObjectId(validMerchantId),
      );
      expect(repo.createCategory).toHaveBeenCalled();
      expect(result.name).toBe('Child');
    });

    it('should throw error when parent not found', async () => {
      repo.findLeanByIdForMerchant.mockResolvedValue(null);

      await expect(
        service.create({
          name: 'Child',
          description: 'Child category',
          keywords: [],
          order: 0,
          merchantId: validMerchantId,
          parent: new Types.ObjectId().toHexString(),
        }),
      ).rejects.toThrow('Parent not found for this merchant');
    });
  });

  describe('findAllFlat', () => {
    it('should return all categories for merchant', async () => {
      const categories = [
        { _id: new Types.ObjectId(), name: 'Cat1' },
        { _id: new Types.ObjectId(), name: 'Cat2' },
      ];
      repo.findAllByMerchant.mockResolvedValue(categories as any);

      const result = await service.findAllFlat(validMerchantId);

      expect(repo.findAllByMerchant).toHaveBeenCalledWith(
        new Types.ObjectId(validMerchantId),
      );
      expect(result).toEqual(categories);
    });
  });

  describe('findAllTree', () => {
    it('should build tree structure', async () => {
      const categories = [
        { _id: new Types.ObjectId(), name: 'Parent', parent: null, order: 0 },
        {
          _id: new Types.ObjectId(),
          name: 'Child',
          parent: new Types.ObjectId(),
          order: 0,
        },
      ];
      repo.findAllByMerchant.mockResolvedValue(categories as any);

      const result = await service.findAllTree(validMerchantId);

      expect(repo.findAllByMerchant).toHaveBeenCalledWith(
        new Types.ObjectId(validMerchantId),
      );
      expect(result).toBeInstanceOf(Array);
    });
  });

  describe('breadcrumbs', () => {
    it('should return breadcrumbs for category', async () => {
      const categoryId = new Types.ObjectId().toHexString();
      const ancestors = [new Types.ObjectId(), new Types.ObjectId()];
      const doc = {
        _id: new Types.ObjectId(),
        ancestors,
        name: 'Child',
        slug: 'child',
        path: 'parent/child',
        depth: 2,
      };

      repo.findLeanByIdForMerchant.mockResolvedValue(doc as any);
      repo.findManyByIds.mockResolvedValue([
        { name: 'Parent', slug: 'parent', path: 'parent', depth: 1 },
        {
          name: 'GrandParent',
          slug: 'grandparent',
          path: 'grandparent',
          depth: 0,
        },
        { name: 'Child', slug: 'child', path: 'parent/child', depth: 2 },
      ] as any);

      const result = await service.breadcrumbs(categoryId, validMerchantId);

      expect(repo.findLeanByIdForMerchant).toHaveBeenCalledWith(
        categoryId,
        new Types.ObjectId(validMerchantId),
      );
      expect(repo.findManyByIds).toHaveBeenCalled();
      expect(result).toBeInstanceOf(Array);
      expect(result).toHaveLength(3);
    });
  });

  describe('subtree', () => {
    it('should return subtree for category', async () => {
      const categoryId = new Types.ObjectId().toHexString();
      const root = {
        _id: new Types.ObjectId(),
        name: 'Root',
        parent: null,
        children: [],
      };

      repo.findLeanByIdForMerchant.mockResolvedValue(root as any);
      repo.findSubtreeIds.mockResolvedValue([root._id]);
      repo.findManyByIds.mockResolvedValue([root] as any);

      const result = await service.subtree(categoryId, validMerchantId);

      expect(repo.findLeanByIdForMerchant).toHaveBeenCalledWith(
        categoryId,
        new Types.ObjectId(validMerchantId),
      );
      expect(repo.findSubtreeIds).toHaveBeenCalled();
      expect(result).toEqual(root);
    });
  });

  describe('findOne', () => {
    it('should return category by id', async () => {
      const categoryId = new Types.ObjectId().toHexString();
      const category = { _id: new Types.ObjectId(), name: 'Test' };

      repo.findByIdForMerchant.mockResolvedValue(category as any);

      const result = await service.findOne(categoryId, validMerchantId);

      expect(repo.findByIdForMerchant).toHaveBeenCalledWith(
        categoryId,
        new Types.ObjectId(validMerchantId),
      );
      expect(result).toEqual(category);
    });

    it('should throw error when category not found', async () => {
      const categoryId = new Types.ObjectId().toHexString();
      repo.findByIdForMerchant.mockResolvedValue(null);

      await expect(
        service.findOne(categoryId, validMerchantId),
      ).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('should update category fields', async () => {
      const categoryId = new Types.ObjectId().toHexString();
      const category = {
        _id: new Types.ObjectId(),
        name: 'Old Name',
        description: 'Old Desc',
        save: jest.fn(),
      };

      repo.findByIdForMerchant.mockResolvedValue(category as any);

      const result = await service.update(categoryId, validMerchantId, {
        name: 'New Name',
        description: 'New Desc',
      });

      expect(repo.findByIdForMerchant).toHaveBeenCalledWith(
        categoryId,
        new Types.ObjectId(validMerchantId),
      );
      expect(category.save).toHaveBeenCalled();
      expect(result.name).toBe('New Name');
      expect(result.description).toBe('New Desc');
    });

    it('should update parent relationship', async () => {
      const categoryId = new Types.ObjectId().toHexString();
      const newParentId = new Types.ObjectId().toHexString();
      const category = {
        _id: new Types.ObjectId(),
        parent: null,
        save: jest.fn(),
      };

      repo.findByIdForMerchant.mockResolvedValue(category as any);
      repo.parentExistsForMerchant.mockResolvedValue(true);
      repo.isDescendant.mockResolvedValue(false);

      await service.update(categoryId, validMerchantId, {
        parent: newParentId,
      });

      expect(repo.parentExistsForMerchant).toHaveBeenCalledWith(
        new Types.ObjectId(newParentId),
        new Types.ObjectId(validMerchantId),
      );
      expect(category.save).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove category without cascade', async () => {
      const categoryId = new Types.ObjectId().toHexString();
      const category = { _id: new Types.ObjectId(), name: 'Test' };

      repo.findLeanByIdForMerchant.mockResolvedValue(category as any);
      repo.findSubtreeIds.mockResolvedValue([category._id]);
      repo.anyProductsInCategories.mockResolvedValue(false);

      const result = await service.remove(categoryId, validMerchantId, false);

      expect(repo.deleteManyByIds).toHaveBeenCalledWith(
        new Types.ObjectId(validMerchantId),
        [category._id],
      );
      expect(result.message).toContain('Category deleted successfully');
    });

    it('should remove category with cascade', async () => {
      const categoryId = new Types.ObjectId().toHexString();
      const category = { _id: new Types.ObjectId(), name: 'Test' };

      repo.findLeanByIdForMerchant.mockResolvedValue(category as any);
      repo.findSubtreeIds.mockResolvedValue([
        category._id,
        new Types.ObjectId(),
      ]);
      repo.anyProductsInCategories.mockResolvedValue(false);

      const result = await service.remove(categoryId, validMerchantId, true);

      expect(repo.deleteManyByIds).toHaveBeenCalled();
      expect(result.message).toContain('Category subtree deleted successfully');
    });

    it('should throw error when category has products', async () => {
      const categoryId = new Types.ObjectId().toHexString();
      const category = { _id: new Types.ObjectId(), name: 'Test' };

      repo.findLeanByIdForMerchant.mockResolvedValue(category as any);
      repo.findSubtreeIds.mockResolvedValue([category._id]);
      repo.anyProductsInCategories.mockResolvedValue(true);

      await expect(
        service.remove(categoryId, validMerchantId, false),
      ).rejects.toThrow('لا يمكن حذف فئة مرتبطة بمنتجات');
    });
  });

  describe('move - advanced scenarios', () => {
    it('should move with afterId', async () => {
      const categoryId = new Types.ObjectId().toHexString();
      const current = {
        _id: new Types.ObjectId(),
        parent: null,
      };
      const siblings = [
        { _id: new Types.ObjectId(), order: 0 },
        { _id: new Types.ObjectId(), order: 1 },
      ];

      repo.findByIdForMerchant.mockResolvedValue(current as any);
      repo.listSiblings.mockResolvedValue(siblings as any);

      await service.move(categoryId, validMerchantId, {
        afterId: siblings[0]._id.toHexString(),
      });

      expect(repo.listSiblings).toHaveBeenCalled();
      expect(repo.updateOrder).toHaveBeenCalled();
    });

    it('should move with beforeId', async () => {
      const categoryId = new Types.ObjectId().toHexString();
      const current = {
        _id: new Types.ObjectId(),
        parent: null,
      };
      const siblingId = new Types.ObjectId();

      repo.findByIdForMerchant.mockResolvedValue(current as any);
      repo.listSiblings.mockResolvedValue([
        { _id: siblingId, order: 0 },
      ] as any);

      await service.move(categoryId, validMerchantId, {
        beforeId: siblingId.toHexString(),
      });

      expect(repo.listSiblings).toHaveBeenCalled();
      expect(repo.updateOrder).toHaveBeenCalled();
    });

    it('should prevent moving under own descendant', async () => {
      const categoryId = new Types.ObjectId().toHexString();
      const current = {
        _id: new Types.ObjectId(),
        parent: null,
      };
      const newParentId = new Types.ObjectId().toHexString();

      repo.findByIdForMerchant.mockResolvedValue(current as any);
      repo.isDescendant.mockResolvedValue(true);

      await expect(
        service.move(categoryId, validMerchantId, { parent: newParentId }),
      ).rejects.toThrow('Cannot move under its own descendant');
    });
  });

  describe('getDescendantIds', () => {
    it('should return descendant IDs', async () => {
      const rootId = new Types.ObjectId().toHexString();
      const descendantIds = [new Types.ObjectId(), new Types.ObjectId()];

      repo.findSubtreeIds.mockResolvedValue(descendantIds);

      const result = await service.getDescendantIds(validMerchantId, rootId);

      expect(repo.findSubtreeIds).toHaveBeenCalledWith(
        new Types.ObjectId(validMerchantId),
        new Types.ObjectId(rootId),
      );
      expect(result).toEqual(descendantIds);
    });
  });
});
