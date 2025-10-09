import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';

import { CategoriesController } from '../categories.controller';

import type { TranslationService } from '../../../common/services/translation.service';
import type { CategoriesService } from '../categories.service';
import type { CreateCategoryDto } from '../dto/create-category.dto';
import type { MoveCategoryDto } from '../dto/move-category.dto';
import type { UpdateCategoryDto } from '../dto/update-category.dto';

// Mock guards to avoid dependency issues
jest.mock('src/common/guards/jwt-auth.guard', () => ({
  JwtAuthGuard: class {},
}));

describe('CategoriesController', () => {
  let controller: CategoriesController;
  let service: jest.Mocked<CategoriesService>;
  let _translationService: jest.Mocked<TranslationService>;

  const validMerchantId = new Types.ObjectId().toHexString();

  const makeController = (overrides: Partial<CategoriesService> = {}) => {
    const mockService = {
      create: jest.fn(),
      findAllFlat: jest.fn(),
      findAllTree: jest.fn(),
      findOne: jest.fn(),
      breadcrumbs: jest.fn(),
      subtree: jest.fn(),
      move: jest.fn(),
      remove: jest.fn(),
      update: jest.fn(),
      uploadCategoryImageToMinio: jest.fn(),
      ...overrides,
    };

    const mockTranslationService = {
      translate: jest.fn(),
    };

    return {
      controller: new CategoriesController(
        mockService as any,
        mockTranslationService as any,
      ),
      service: mockService,
      translationService: mockTranslationService,
    };
  };

  beforeEach(() => {
    const setup = makeController();
    controller = setup.controller;
    service = setup.service as any;
    _translationService = setup.translationService as any;
  });

  describe('create', () => {
    it('should create category', async () => {
      const dto: CreateCategoryDto = {
        name: 'Test Category',
        description: 'Test description',
        keywords: ['test'],
        order: 0,
        merchantId: validMerchantId,
      };
      const result = { _id: new Types.ObjectId(), name: 'Test Category' };

      service.create.mockResolvedValue(result as any);

      const response = await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(response).toEqual(result);
    });
  });

  describe('findAll', () => {
    it('should return flat categories when tree is not true', async () => {
      const categories = [
        { _id: new Types.ObjectId(), name: 'Cat1' },
        { _id: new Types.ObjectId(), name: 'Cat2' },
      ];

      service.findAllFlat.mockResolvedValue(categories as any);

      const result = await controller.findAll(validMerchantId, 'false');

      expect(service.findAllFlat).toHaveBeenCalledWith(validMerchantId);
      expect(result).toEqual(categories);
    });

    it('should return tree categories when tree is true', async () => {
      const treeCategories = [
        {
          _id: new Types.ObjectId(),
          name: 'Parent',
          order: 0,
          parent: null,
          children: [],
        },
      ];

      service.findAllTree.mockResolvedValue(treeCategories as any);

      const result = await controller.findAll(validMerchantId, 'true');

      expect(service.findAllTree).toHaveBeenCalledWith(validMerchantId);
      expect(result).toEqual(treeCategories);
    });

    it('should throw BadRequestException when merchantId is missing', () => {
      expect(() => controller.findAll('', 'false')).toThrow(
        BadRequestException,
      );
    });
  });

  describe('findOne', () => {
    it('should return single category', async () => {
      const categoryId = new Types.ObjectId().toHexString();
      const category = { _id: new Types.ObjectId(), name: 'Test Category' };

      service.findOne.mockResolvedValue(category as any);

      const result = await controller.findOne(categoryId, validMerchantId);

      expect(service.findOne).toHaveBeenCalledWith(categoryId, validMerchantId);
      expect(result).toEqual(category);
    });

    it('should throw BadRequestException when merchantId is missing', () => {
      const categoryId = new Types.ObjectId().toHexString();

      expect(() => controller.findOne(categoryId, '')).toThrow(
        BadRequestException,
      );
    });
  });

  describe('breadcrumbs', () => {
    it('should return breadcrumbs', async () => {
      const categoryId = new Types.ObjectId().toHexString();
      const breadcrumbs = [
        { name: 'Parent', slug: 'parent', path: 'parent', depth: 0 },
        { name: 'Child', slug: 'child', path: 'parent/child', depth: 1 },
      ];

      service.breadcrumbs.mockResolvedValue(breadcrumbs);

      const result = await controller.breadcrumbs(categoryId, validMerchantId);

      expect(service.breadcrumbs).toHaveBeenCalledWith(
        categoryId,
        validMerchantId,
      );
      expect(result).toEqual(breadcrumbs);
    });

    it('should throw BadRequestException when merchantId is missing', () => {
      const categoryId = new Types.ObjectId().toHexString();

      expect(() => controller.breadcrumbs(categoryId, '')).toThrow(
        BadRequestException,
      );
    });
  });

  describe('subtree', () => {
    it('should return subtree', async () => {
      const categoryId = new Types.ObjectId().toHexString();
      const subtree = { _id: new Types.ObjectId(), name: 'Root', children: [] };

      service.subtree.mockResolvedValue(subtree as any);

      const result = await controller.subtree(categoryId, validMerchantId);

      expect(service.subtree).toHaveBeenCalledWith(categoryId, validMerchantId);
      expect(result).toEqual(subtree);
    });

    it('should throw BadRequestException when merchantId is missing', () => {
      const categoryId = new Types.ObjectId().toHexString();

      expect(() => controller.subtree(categoryId, '')).toThrow(
        BadRequestException,
      );
    });
  });

  describe('move', () => {
    it('should move category', async () => {
      const categoryId = new Types.ObjectId().toHexString();
      const dto: MoveCategoryDto = { position: 1 };
      const result = { _id: new Types.ObjectId(), name: 'Moved Category' };

      service.move.mockResolvedValue(result as any);

      const response = await controller.move(categoryId, validMerchantId, dto);

      expect(service.move).toHaveBeenCalledWith(
        categoryId,
        validMerchantId,
        dto,
      );
      expect(response).toEqual(result);
    });

    it('should throw BadRequestException when merchantId is missing', () => {
      const categoryId = new Types.ObjectId().toHexString();
      const dto: MoveCategoryDto = { position: 1 };

      expect(() => controller.move(categoryId, '', dto)).toThrow(
        BadRequestException,
      );
    });
  });

  describe('remove', () => {
    it('should remove category without cascade', async () => {
      const categoryId = new Types.ObjectId().toHexString();
      const result = { message: 'Category deleted successfully' };

      service.remove.mockResolvedValue(result);

      const response = await controller.remove(
        categoryId,
        validMerchantId,
        'false',
      );

      expect(service.remove).toHaveBeenCalledWith(
        categoryId,
        validMerchantId,
        false,
      );
      expect(response).toEqual(result);
    });

    it('should remove category with cascade', async () => {
      const categoryId = new Types.ObjectId().toHexString();
      const result = { message: 'Category subtree deleted successfully' };

      service.remove.mockResolvedValue(result);

      const response = await controller.remove(
        categoryId,
        validMerchantId,
        'true',
      );

      expect(service.remove).toHaveBeenCalledWith(
        categoryId,
        validMerchantId,
        true,
      );
      expect(response).toEqual(result);
    });

    it('should throw BadRequestException when merchantId is missing', () => {
      const categoryId = new Types.ObjectId().toHexString();

      expect(() => controller.remove(categoryId, '', 'false')).toThrow(
        BadRequestException,
      );
    });
  });

  describe('uploadImage', () => {
    it('should upload image successfully', async () => {
      const categoryId = new Types.ObjectId().toHexString();
      const mockFile = {
        filename: 'test.webp',
        path: '/tmp/test.webp',
        mimetype: 'image/webp',
        size: 1000,
      } as Express.Multer.File;

      const url = 'https://cdn.example.com/image.webp';
      service.uploadCategoryImageToMinio.mockResolvedValue(url);

      const result = await controller.uploadImage(
        categoryId,
        validMerchantId,
        mockFile,
      );

      expect(service.uploadCategoryImageToMinio).toHaveBeenCalledWith(
        categoryId,
        validMerchantId,
        mockFile,
      );
      expect(result).toEqual({
        success: true,
        message: 'تم رفع صورة الفئة بنجاح',
        url,
        categoryId,
      });
    });
  });

  describe('update', () => {
    it('should update category', async () => {
      const categoryId = new Types.ObjectId().toHexString();
      const dto: UpdateCategoryDto = {
        name: 'Updated Name',
        description: 'Updated description',
      };
      const result = { _id: new Types.ObjectId(), name: 'Updated Name' };

      service.update.mockResolvedValue(result as any);

      const response = await controller.update(
        categoryId,
        validMerchantId,
        dto,
      );

      expect(service.update).toHaveBeenCalledWith(
        categoryId,
        validMerchantId,
        dto,
      );
      expect(response).toEqual(result);
    });

    it('should throw BadRequestException when merchantId is missing', async () => {
      const categoryId = new Types.ObjectId().toHexString();
      const dto: UpdateCategoryDto = { name: 'Updated Name' };

      await expect(controller.update(categoryId, '', dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('validateUploadImageRequest', () => {
    it('should throw BadRequestException when merchantId is missing', () => {
      const mockFile = {} as Express.Multer.File;

      expect(() => {
        (controller as any).validateUploadImageRequest('', mockFile);
      }).toThrow(BadRequestException);
    });

    it('should throw BadRequestException when file is missing', () => {
      expect(() => {
        (controller as any).validateUploadImageRequest(
          validMerchantId,
          null as any,
        );
      }).toThrow(BadRequestException);
    });
  });

  describe('createUploadImageResponse', () => {
    it('should create success response', () => {
      const url = 'https://cdn.example.com/image.webp';
      const categoryId = new Types.ObjectId().toHexString();

      const result = (controller as any).createUploadImageResponse(
        url,
        categoryId,
      );

      expect(result).toEqual({
        success: true,
        message: 'تم رفع صورة الفئة بنجاح',
        url,
        categoryId,
      });
    });
  });
});
