import { validate } from 'class-validator';
import { Types } from 'mongoose';

import { CreateCategoryDto } from '../dto/create-category.dto';
import { MoveCategoryDto } from '../dto/move-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';

describe('Categories DTOs', () => {
  describe('CreateCategoryDto', () => {
    it('should validate valid create data', async () => {
      const dto = new CreateCategoryDto();
      dto.name = 'Test Category';
      dto.description = 'Test description';
      dto.keywords = ['test', 'category'];
      dto.merchantId = new Types.ObjectId().toHexString();
      dto.order = 0;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation when name is missing', async () => {
      const dto = new CreateCategoryDto();
      dto.description = 'Test description';
      dto.keywords = ['test'];
      dto.merchantId = new Types.ObjectId().toHexString();
      dto.order = 0;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('name');
    });

    it('should fail validation when merchantId is missing', async () => {
      const dto = new CreateCategoryDto();
      dto.name = 'Test Category';
      dto.description = 'Test description';
      dto.keywords = ['test'];
      dto.order = 0;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('merchantId');
    });

    it('should fail validation when merchantId is invalid', async () => {
      const dto = new CreateCategoryDto();
      dto.name = 'Test Category';
      dto.description = 'Test description';
      dto.keywords = ['test'];
      dto.merchantId = 'invalid-id';
      dto.order = 0;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('merchantId');
    });

    it('should fail validation when order is negative', async () => {
      const dto = new CreateCategoryDto();
      dto.name = 'Test Category';
      dto.description = 'Test description';
      dto.keywords = ['test'];
      dto.merchantId = new Types.ObjectId().toHexString();
      dto.order = -1;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('order');
    });

    it('should validate with optional parent', async () => {
      const dto = new CreateCategoryDto();
      dto.name = 'Test Category';
      dto.description = 'Test description';
      dto.keywords = ['test'];
      dto.merchantId = new Types.ObjectId().toHexString();
      dto.order = 0;
      dto.parent = new Types.ObjectId().toHexString();

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation when parent is invalid ObjectId', async () => {
      const dto = new CreateCategoryDto();
      dto.name = 'Test Category';
      dto.description = 'Test description';
      dto.keywords = ['test'];
      dto.merchantId = new Types.ObjectId().toHexString();
      dto.order = 0;
      dto.parent = 'invalid-parent-id';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('parent');
    });

    it('should validate with slug', async () => {
      const dto = new CreateCategoryDto();
      dto.name = 'Test Category';
      dto.description = 'Test description';
      dto.keywords = ['test'];
      dto.merchantId = new Types.ObjectId().toHexString();
      dto.order = 0;
      dto.slug = 'test-category';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate with image', async () => {
      const dto = new CreateCategoryDto();
      dto.name = 'Test Category';
      dto.description = 'Test description';
      dto.keywords = ['test'];
      dto.merchantId = new Types.ObjectId().toHexString();
      dto.order = 0;
      dto.image = 'https://example.com/image.jpg';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('UpdateCategoryDto', () => {
    it('should validate empty update (all optional)', async () => {
      const dto = new UpdateCategoryDto();

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate partial update with name only', async () => {
      const dto = new UpdateCategoryDto();
      dto.name = 'Updated Name';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate partial update with description only', async () => {
      const dto = new UpdateCategoryDto();
      dto.description = 'Updated description';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate partial update with parent', async () => {
      const dto = new UpdateCategoryDto();
      dto.parent = new Types.ObjectId().toHexString();

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate partial update with null parent (to remove parent)', async () => {
      const dto = new UpdateCategoryDto();
      (dto as any).parent = null;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation when parent is invalid ObjectId', async () => {
      const dto = new UpdateCategoryDto();
      dto.parent = 'invalid-parent-id';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('parent');
    });

    it('should validate full update', async () => {
      const dto = new UpdateCategoryDto();
      dto.name = 'Updated Name';
      dto.description = 'Updated description';
      dto.keywords = ['updated', 'keywords'];
      dto.image = 'https://example.com/updated-image.jpg';
      dto.slug = 'updated-slug';
      dto.order = 5;
      dto.parent = new Types.ObjectId().toHexString();

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('MoveCategoryDto', () => {
    it('should validate move with position', async () => {
      const dto = new MoveCategoryDto();
      dto.position = 5;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation when position is negative', async () => {
      const dto = new MoveCategoryDto();
      dto.position = -1;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('position');
    });

    it('should validate move with afterId', async () => {
      const dto = new MoveCategoryDto();
      dto.afterId = new Types.ObjectId().toHexString();

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation when afterId is invalid ObjectId', async () => {
      const dto = new MoveCategoryDto();
      dto.afterId = 'invalid-id';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('afterId');
    });

    it('should validate move with beforeId', async () => {
      const dto = new MoveCategoryDto();
      dto.beforeId = new Types.ObjectId().toHexString();

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation when beforeId is invalid ObjectId', async () => {
      const dto = new MoveCategoryDto();
      dto.beforeId = 'invalid-id';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('beforeId');
    });

    it('should validate move with parent', async () => {
      const dto = new MoveCategoryDto();
      dto.parent = new Types.ObjectId().toHexString();

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate move with null parent', async () => {
      const dto = new MoveCategoryDto();
      dto.parent = null;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation when parent is invalid ObjectId', async () => {
      const dto = new MoveCategoryDto();
      dto.parent = 'invalid-parent-id';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('parent');
    });

    it('should validate complex move operation', async () => {
      const dto = new MoveCategoryDto();
      dto.parent = new Types.ObjectId().toHexString();
      dto.afterId = new Types.ObjectId().toHexString();
      dto.position = 10;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});
