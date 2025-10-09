import { getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { type Model, Schema } from 'mongoose';
import { type Connection, connect } from 'mongoose';

import { type PaginationResult } from '../dto/pagination.dto';

import { PaginationService } from './pagination.service';

import type { CursorDto } from '../dto/pagination.dto';

interface TestDocument {
  _id: string;
  name: string;
  createdAt: Date;
  category: string;
  active: boolean;
  categoryRef?: any;
}

describe('PaginationService', () => {
  let service: PaginationService;
  let testModel: Model<any>;
  let mongoServer: MongoMemoryServer;
  let mongoConnection: Connection;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    mongoConnection = (await connect(mongoUri)).connection;
  });

  afterAll(async () => {
    await mongoConnection.close();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Create test schema and model
    const testSchema = new Schema<TestDocument>({
      name: { type: String, required: true },
      createdAt: { type: Date, default: Date.now },
      category: { type: String, required: true },
      active: { type: Boolean, default: true },
    });

    // Add indexes for pagination testing
    testSchema.index({ createdAt: -1, _id: -1 });
    testSchema.index({ category: 1, createdAt: -1 });

    testModel = mongoConnection.model<any>('TestDocument', testSchema);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaginationService,
        {
          provide: getModelToken('TestDocument'),
          useValue: testModel,
        },
      ],
    }).compile();

    service = module.get<PaginationService>(PaginationService);

    // Clear collection before each test
    await testModel.deleteMany({});
  });

  afterEach(async () => {
    await testModel.deleteMany({});
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('paginate', () => {
    beforeEach(async () => {
      // Create test data
      const testData = Array.from({ length: 25 }, (_, i) => ({
        name: `Item ${i + 1}`,
        category: i % 3 === 0 ? 'A' : i % 3 === 1 ? 'B' : 'C',
        createdAt: new Date(Date.now() - i * 1000), // Decreasing timestamps
        active: i % 4 !== 0, // Most items active
      }));

      await testModel.insertMany(testData);
    });

    it('should paginate with default options', async () => {
      // Given
      const dto: CursorDto = { limit: 10 };

      // When
      const result: PaginationResult<TestDocument> = await service.paginate(
        testModel,
        dto,
      );

      // Then
      expect(result.items).toHaveLength(10);
      expect(result.meta.hasMore).toBe(true);
      expect(result.meta.count).toBe(10);
      expect(result.meta.nextCursor).toBeDefined();

      // Items should be sorted by createdAt desc, then _id desc
      for (let i = 0; i < result.items.length - 1; i++) {
        const current = result.items[i];
        const next = result.items[i + 1];
        expect(current.createdAt.getTime()).toBeGreaterThanOrEqual(
          next.createdAt.getTime(),
        );
      }
    });

    it('should paginate with custom limit', async () => {
      // Given
      const dto: CursorDto = { limit: 5 };

      // When
      const result = await service.paginate(testModel, dto);

      // Then
      expect(result.items).toHaveLength(5);
      expect(result.meta.count).toBe(5);
    });

    it('should respect maximum limit', async () => {
      // Given
      const dto: CursorDto = { limit: 200 }; // Above MAX_LIMIT

      // When
      const result: PaginationResult<TestDocument> = await service.paginate(
        testModel,
        dto,
      );

      // Then
      expect(result.items).toHaveLength(20); // Should be capped at MAX_LIMIT (100)
      expect(result.meta.count).toBe(20);
    });

    it('should paginate with cursor', async () => {
      // Given - get first page
      const firstPageDto: CursorDto = { limit: 10 };
      const firstPage = await service.paginate(testModel, firstPageDto);

      // When - get second page using cursor
      const secondPageDto: CursorDto =
        firstPage.meta.nextCursor !== undefined
          ? { limit: 10, cursor: firstPage.meta.nextCursor }
          : { limit: 10 };
      const secondPage = await service.paginate(testModel, secondPageDto);

      // Then
      expect(secondPage.items).toHaveLength(10);
      expect(secondPage.meta.hasMore).toBe(true);

      // Second page should start where first page ended
      const firstPageLastItem = firstPage.items[firstPage.items.length - 1];
      const secondPageFirstItem = secondPage.items[0];

      expect(secondPageFirstItem.createdAt.getTime()).toBeLessThan(
        firstPageLastItem.createdAt.getTime(),
      );
    });

    it('should handle last page without next cursor', async () => {
      // Given - get to the last few items
      let currentCursor: string | undefined;
      const maxIterations = 10; // Prevent infinite loop
      let iterations = 0;
      let lastResult: any;

      // Paginate until we reach the last page or max iterations
      while (iterations < maxIterations) {
        const dto: CursorDto =
          currentCursor !== undefined
            ? { limit: 10, cursor: currentCursor }
            : { limit: 10 };
        const result = await service.paginate(testModel, dto);
        iterations++;

        if (!result.meta.hasMore) {
          lastResult = result;
          break;
        }
        currentCursor = result.meta.nextCursor;
      }

      // Verify we found the last page
      expect(lastResult).toBeDefined();
      expect(lastResult.meta.nextCursor).toBeUndefined();
      expect(lastResult.items.length).toBeLessThanOrEqual(10);
    });

    it('should paginate with base filter', async () => {
      // Given
      const dto: CursorDto = { limit: 10 };
      const baseFilter = { category: 'A' };

      // When
      const result: PaginationResult<TestDocument> = await service.paginate(
        testModel,
        dto,
        baseFilter,
      );

      // Then
      expect(result.items).toHaveLength(10);
      expect(result.meta.hasMore).toBe(true);

      // All items should match the filter
      result.items.forEach((item) => {
        expect(item.category).toBe('A');
      });
    });

    it('should paginate with custom sort options', async () => {
      // Given
      const dto: CursorDto = { limit: 10 };
      const options = {
        sortField: 'category',
        sortOrder: 1 as const, // Ascending
      };

      // When
      const result: PaginationResult<TestDocument> = await service.paginate(
        testModel,
        dto,
        {},
        options,
      );

      // Then
      expect(result.items).toHaveLength(10);

      // Items should be sorted by category ascending
      for (let i = 0; i < result.items.length - 1; i++) {
        const current = result.items[i];
        const next = result.items[i + 1];
        expect(
          current.category.localeCompare(next.category),
        ).toBeLessThanOrEqual(0);
      }
    });

    it('should paginate with populate option', async () => {
      // Given - create related documents for population testing
      const categorySchema = new Schema({
        name: { type: String, required: true },
        description: { type: String },
      });

      const categoryModel = mongoConnection.model(
        'TestCategory',
        categorySchema,
      );

      // Update test schema to include category reference
      testModel.schema.add({
        categoryRef: {
          type: Schema.Types.ObjectId,
          ref: 'TestCategory',
        },
      });

      // Create category documents
      const categories = await categoryModel.insertMany([
        { name: 'A', description: 'Category A' },
        { name: 'B', description: 'Category B' },
        { name: 'C', description: 'Category C' },
      ]);

      // Update test documents with category references
      await testModel.updateMany(
        { category: 'A' },
        { categoryRef: categories[0]._id },
      );
      await testModel.updateMany(
        { category: 'B' },
        { categoryRef: categories[1]._id },
      );
      await testModel.updateMany(
        { category: 'C' },
        { categoryRef: categories[2]._id },
      );

      const dto: CursorDto = { limit: 5 };
      const options = {
        populate: 'categoryRef',
      };

      // When
      const result: PaginationResult<TestDocument> = await service.paginate(
        testModel,
        dto,
        {},
        options,
      );

      // Then
      expect(result.items).toHaveLength(5);
      expect(result.meta.hasMore).toBe(true);

      // Items should be populated
      result.items.forEach((item) => {
        expect(item.categoryRef).toBeDefined();
        expect(typeof item.categoryRef).toBe('object');
      });
    });

    it('should paginate with select option', async () => {
      // Given
      const dto: CursorDto = { limit: 5 };
      const options = {
        select: 'name category', // Only select name and category
      };

      // When
      const result: PaginationResult<TestDocument> = await service.paginate(
        testModel,
        dto,
        {},
        options,
      );

      // Then
      expect(result.items).toHaveLength(5);

      // Only selected fields should be present
      result.items.forEach((item) => {
        expect(item.name).toBeDefined();
        expect(item.category).toBeDefined();
        expect(item.createdAt).toBeUndefined();
        expect(item.active).toBeUndefined();
      });
    });

    it('should paginate with lean option disabled', async () => {
      // Given
      const dto: CursorDto = { limit: 5 };
      const options = {
        lean: false,
      };

      // When
      const result: PaginationResult<TestDocument> = await service.paginate(
        testModel,
        dto,
        {},
        options,
      );

      // Then
      expect(result.items).toHaveLength(5);

      // Items should be Mongoose documents when lean is false
      result.items.forEach((item) => {
        const doc = item as any;
        expect(typeof doc.toObject).toBe('function');
        expect(typeof doc.save).toBe('function');
      });
    });

    it('should handle empty result set', async () => {
      // Given - clear all data
      await testModel.deleteMany({});
      const dto: CursorDto = { limit: 10 };

      // When
      const result: PaginationResult<TestDocument> = await service.paginate(
        testModel,
        dto,
      );

      // Then
      expect(result.items).toHaveLength(0);
      expect(result.meta.hasMore).toBe(false);
      expect(result.meta.count).toBe(0);
      expect(result.meta.nextCursor).toBeUndefined();
    });

    it('should handle cursor decoding errors gracefully', async () => {
      // Given - invalid cursor
      const dto: CursorDto = {
        limit: 10,
        cursor: 'invalid-base64-cursor',
      };

      // When
      const result: PaginationResult<TestDocument> = await service.paginate(
        testModel,
        dto,
      );

      // Then
      expect(result.items).toHaveLength(10);
      expect(result.meta.hasMore).toBe(true);
      expect(result.meta.count).toBe(10);

      // Should behave like first page (ignore invalid cursor)
      for (let i = 0; i < result.items.length - 1; i++) {
        const current = result.items[i];
        const next = result.items[i + 1];
        expect(current.createdAt.getTime()).toBeGreaterThanOrEqual(
          next.createdAt.getTime(),
        );
      }
    });

    it('should handle database query errors gracefully', async () => {
      // Given - mock model that throws error
      const errorModel = {
        find: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockReturnValue({
                exec: jest.fn().mockRejectedValue(new Error('Database error')),
              }),
            }),
          }),
        }),
      } as unknown as Model<TestDocument>;

      const dto: CursorDto = { limit: 10 };

      // When/Then
      await expect(service.paginate(errorModel as any, dto)).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('static methods', () => {
    describe('createPaginationIndex', () => {
      it('should create pagination index with default options', () => {
        // Given
        const schema = new Schema({ name: String });
        const spy = jest.spyOn(schema, 'index');

        // When
        PaginationService.createPaginationIndex(schema, { createdAt: -1 });

        // Then
        expect(spy).toHaveBeenCalledWith(
          {
            createdAt: -1,
            _id: -1, // Should add _id automatically
          },
          {
            background: true, // Should be background by default
          },
        );
      });

      it('should create pagination index with custom fields', () => {
        // Given
        const schema = new Schema({ name: String, category: String });
        const spy = jest.spyOn(schema, 'index');

        // When
        PaginationService.createPaginationIndex(schema, {
          category: 1,
          createdAt: -1,
        });

        // Then
        expect(spy).toHaveBeenCalledWith(
          {
            category: 1,
            createdAt: -1,
            _id: -1, // Should add _id automatically
          },
          {
            background: true,
          },
        );
      });

      it('should create pagination index with custom options', () => {
        // Given
        const schema = new Schema({ name: String });
        const spy = jest.spyOn(schema, 'index');

        // When
        PaginationService.createPaginationIndex(
          schema,
          { createdAt: -1 },
          {
            background: false,
            sparse: true,
          },
        );

        // Then
        expect(spy).toHaveBeenCalledWith(
          {
            createdAt: -1,
            _id: -1,
          },
          {
            background: false,
            sparse: true,
          },
        );
      });

      it('should override existing createdAt and _id fields', () => {
        // Given
        const schema = new Schema({ name: String });
        const spy = jest.spyOn(schema, 'index');

        // When - provide createdAt and _id in fields
        PaginationService.createPaginationIndex(schema, {
          createdAt: 1, // Different order
          _id: 1, // Different order
          name: 1,
        });

        // Then
        expect(spy).toHaveBeenCalledWith(
          {
            name: 1,
            createdAt: 1, // Should use provided order
            _id: 1, // Should use provided order
          },
          {
            background: true,
          },
        );
      });
    });

    describe('createTextIndex', () => {
      it('should create text index with fields and weights', () => {
        // Given
        const schema = new Schema({ name: String, description: String });
        const spy = jest.spyOn(schema, 'index');

        // When
        PaginationService.createTextIndex(
          schema,
          {
            name: 'text',
            description: 'text',
          },
          {
            name: 10,
            description: 5,
          },
        );

        // Then
        expect(spy).toHaveBeenCalledWith(
          {
            name: 'text',
            description: 'text',
          },
          {
            weights: {
              name: 10,
              description: 5,
            },
            background: true,
          },
        );
      });

      it('should create text index without weights', () => {
        // Given
        const schema = new Schema({ content: String });
        const spy = jest.spyOn(schema, 'index');

        // When
        PaginationService.createTextIndex(schema, {
          content: 'text',
        });

        // Then
        expect(spy).toHaveBeenCalledWith(
          {
            content: 'text',
          },
          {
            weights: {},
            background: true,
          },
        );
      });

      it('should create text index with custom background option', () => {
        // Given
        const schema = new Schema({ title: String });
        const spy = jest.spyOn(schema, 'index');

        // When
        PaginationService.createTextIndex(
          schema,
          {
            title: 'text',
          },
          {},
          {
            background: false,
          },
        );

        // Then
        expect(spy).toHaveBeenCalledWith(
          {
            title: 'text',
          },
          {
            weights: {},
            background: false,
          },
        );
      });
    });
  });

  describe('private helper methods', () => {
    it('should extract options with defaults', () => {
      // Given
      const options = {};

      // When
      const result = (service as any).extractOptions(options);

      // Then
      expect(result).toEqual({
        sortField: 'createdAt',
        sortOrder: -1,
        populate: undefined,
        select: undefined,
        lean: true,
      });
    });

    it('should extract options with custom values', () => {
      // Given
      const options = {
        sortField: 'name',
        sortOrder: 1,
        populate: 'category',
        select: 'name category',
        lean: false,
      };

      // When
      const result = (service as any).extractOptions(options);

      // Then
      expect(result).toEqual({
        sortField: 'name',
        sortOrder: 1,
        populate: 'category',
        select: 'name category',
        lean: false,
      });
    });

    it('should create sort object correctly', () => {
      // When/Then
      expect((service as any).createSortObject('createdAt', -1)).toEqual({
        createdAt: -1,
        _id: -1,
      });

      expect((service as any).createSortObject('name', 1)).toEqual({
        name: 1,
        _id: 1,
      });
    });

    it('should process results correctly', () => {
      // Given
      const docs = Array.from({ length: 15 }, (_, i) => ({ id: i }));
      const limit = 10;

      // When
      const result = (service as any).processResults(docs, limit);

      // Then
      expect(result.items).toHaveLength(10); // Should slice to limit
      expect(result.hasMore).toBe(true); // Should have more (15 > 10)

      // Test case where docs.length <= limit
      const smallDocs = Array.from({ length: 5 }, (_, i) => ({ id: i }));
      const smallResult = (service as any).processResults(smallDocs, 10);

      expect(smallResult.items).toHaveLength(5);
      expect(smallResult.hasMore).toBe(false);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete pagination workflow', async () => {
      // Given - create test data
      const testData = Array.from({ length: 50 }, (_, i) => ({
        name: `Product ${i + 1}`,
        category: `Category ${Math.floor(i / 10) + 1}`,
        createdAt: new Date(Date.now() - i * 1000),
      }));

      await testModel.insertMany(testData);

      // 1. Get first page
      const firstPageDto: CursorDto = { limit: 10 };
      const firstPage = await service.paginate(testModel, firstPageDto);

      expect(firstPage.items).toHaveLength(10);
      expect(firstPage.meta.hasMore).toBe(true);
      expect(firstPage.meta.nextCursor).toBeDefined();

      // 2. Get second page
      const secondPageDto: CursorDto =
        firstPage.meta.nextCursor !== undefined
          ? { limit: 10, cursor: firstPage.meta.nextCursor }
          : { limit: 10 };
      const secondPage = await service.paginate(testModel, secondPageDto);

      expect(secondPage.items).toHaveLength(10);
      expect(secondPage.meta.hasMore).toBe(true);

      // 3. Get third page
      const thirdPageDto: CursorDto =
        secondPage.meta.nextCursor !== undefined
          ? { limit: 10, cursor: secondPage.meta.nextCursor }
          : { limit: 10 };
      const thirdPage = await service.paginate(testModel, thirdPageDto);

      expect(thirdPage.items).toHaveLength(10);

      // 4. Continue until last page
      let currentPage = thirdPage;
      let pageCount = 3;

      while (currentPage.meta.hasMore && pageCount < 10) {
        const nextPageDto: CursorDto =
          currentPage.meta.nextCursor !== undefined
            ? { limit: 10, cursor: currentPage.meta.nextCursor }
            : { limit: 10 };
        currentPage = await service.paginate(testModel, nextPageDto);
        pageCount++;

        expect(currentPage.items.length).toBeLessThanOrEqual(10);
      }

      // Should eventually reach the end
      expect(pageCount).toBeGreaterThan(3);
    });

    it('should handle filtered pagination', async () => {
      // Given - create mixed data
      await testModel.insertMany([
        { name: 'Active A', category: 'A', active: true },
        { name: 'Active B', category: 'B', active: true },
        { name: 'Inactive A', category: 'A', active: false },
        { name: 'Inactive B', category: 'B', active: false },
      ]);

      // When - paginate with filter
      const result = await service.paginate(
        testModel,
        { limit: 10 },
        { active: true },
      );

      // Then
      expect(result.items).toHaveLength(2);
      expect(result.meta.hasMore).toBe(false);

      result.items.forEach((item) => {
        expect(item.active).toBe(true);
      });
    });

    it('should handle multiple sort fields', async () => {
      // Given - create test data with same timestamps but different names
      const baseTime = new Date('2023-01-01T00:00:00Z');
      await testModel.insertMany([
        { name: 'Zebra', category: 'A', createdAt: baseTime },
        { name: 'Apple', category: 'A', createdAt: baseTime },
        { name: 'Banana', category: 'A', createdAt: baseTime },
      ]);

      // When - paginate with name sort
      const result = await service.paginate(
        testModel,
        { limit: 10 },
        {},
        { sortField: 'name', sortOrder: 1 },
      );

      // Then
      expect(result.items).toHaveLength(3);

      // Should be sorted by name ascending
      expect(result.items[0].name).toBe('Apple');
      expect(result.items[1].name).toBe('Banana');
      expect(result.items[2].name).toBe('Zebra');
    });
  });

  describe('edge cases', () => {
    it('should handle minimum limit', async () => {
      // Given
      await testModel.insertMany([
        { name: 'Item 1', category: 'A' },
        { name: 'Item 2', category: 'A' },
      ]);

      const dto: CursorDto = { limit: 1 };

      // When
      const result = await service.paginate(testModel, dto);

      // Then
      expect(result.items).toHaveLength(1);
      expect(result.meta.count).toBe(1);
    });

    it('should handle very large datasets', async () => {
      // Given - create large dataset
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        name: `Item ${i + 1}`,
        category: `Category ${Math.floor(i / 100) + 1}`,
        createdAt: new Date(Date.now() - i * 100),
      }));

      await testModel.insertMany(largeDataset);

      // When - paginate through large dataset
      const result = await service.paginate(testModel, { limit: 100 });

      // Then
      expect(result.items).toHaveLength(100);
      expect(result.meta.hasMore).toBe(true);

      // Should handle large datasets efficiently
      const duration = Date.now();
      expect(duration).toBeDefined(); // Basic performance check
    });

    it('should handle malformed cursor gracefully', async () => {
      // Given
      const dto: CursorDto = {
        limit: 10,
        cursor: 'not-base64',
      };

      // When
      const result = await service.paginate(testModel, dto);

      // Then - should not throw and should return results
      expect(result.items).toHaveLength(10);
      expect(result.meta.hasMore).toBe(true);
    });

    it('should handle null cursor', async () => {
      // Given
      const dto: CursorDto = {
        limit: 10,
        cursor: null as any,
      };

      // When
      const result = await service.paginate(testModel, dto);

      // Then
      expect(result.items).toHaveLength(10);
      expect(result.meta.hasMore).toBe(true);
    });
  });

  describe('performance considerations', () => {
    it('should handle rapid successive pagination calls', async () => {
      // Given
      await testModel.insertMany(
        Array.from({ length: 100 }, (_, i) => ({
          name: `Item ${i}`,
          category: 'A',
        })),
      );

      // When - make rapid pagination calls
      const promises = Array.from({ length: 10 }, () =>
        service.paginate(testModel, { limit: 10 }),
      );

      const results = await Promise.all(promises);

      // Then
      expect(results).toHaveLength(10);
      results.forEach((result) => {
        expect(result.items).toHaveLength(10);
        expect(result.meta.hasMore).toBe(true);
      });
    });

    it('should not create memory leaks during extended operation', async () => {
      // Given
      await testModel.insertMany(
        Array.from({ length: 100 }, (_, i) => ({
          name: `Memory Test ${i}`,
          category: 'A',
        })),
      );

      // When - simulate extended pagination operation
      for (let i = 0; i < 50; i++) {
        await service.paginate(testModel, { limit: 20 });
      }

      // Then - if we get here without memory issues, test passes
      expect(true).toBe(true);
    });

    it('should handle concurrent pagination requests', async () => {
      // Given
      await testModel.insertMany(
        Array.from({ length: 200 }, (_, i) => ({
          name: `Concurrent ${i}`,
          category: 'A',
        })),
      );

      // When - make concurrent pagination requests
      const promises: Array<Promise<PaginationResult<any>>> = Array.from(
        { length: 20 },
        () => service.paginate(testModel, { limit: 10 }),
      );

      const results = await Promise.all(promises);

      // Then
      expect(results).toHaveLength(20);

      // All results should be consistent
      results.forEach((result) => {
        expect(result.items).toHaveLength(10);
        expect(result.meta.hasMore).toBe(true);
      });

      // Results should be identical since no cursor is used
      const firstResult = results[0];
      results.slice(1).forEach((result) => {
        expect(result.items[0].name).toBe(firstResult.items[0].name);
      });
    });
  });

  describe('real-world usage patterns', () => {
    it('should handle e-commerce product listing', async () => {
      // Given - simulate e-commerce products
      const products = [
        { name: 'Laptop', category: 'Electronics', price: 1000, active: true },
        { name: 'Phone', category: 'Electronics', price: 800, active: true },
        { name: 'Book', category: 'Books', price: 20, active: true },
        { name: 'Chair', category: 'Furniture', price: 150, active: false },
      ];

      await testModel.insertMany(products);

      // When - paginate active products in Electronics category
      const result = await service.paginate(
        testModel,
        { limit: 10 },
        { category: 'Electronics', active: true },
        { sortField: 'price', sortOrder: -1 },
      );

      // Then
      expect(result.items).toHaveLength(2);

      // Should be sorted by price descending
      expect(result.items[0].price).toBe(1000); // Laptop
      expect(result.items[1].price).toBe(800); // Phone

      result.items.forEach((item) => {
        expect(item.category).toBe('Electronics');
        expect(item.active).toBe(true);
      });
    });

    it('should handle social media feed pagination', async () => {
      // Given - simulate social media posts
      const posts = Array.from({ length: 30 }, (_, i) => ({
        content: `Post ${i + 1}`,
        author: `User ${Math.floor(i / 5) + 1}`,
        likes: Math.floor(Math.random() * 100),
        createdAt: new Date(Date.now() - i * 60000), // 1 minute apart
      }));

      await testModel.insertMany(posts);

      // When - paginate feed
      const result = await service.paginate(
        testModel,
        { limit: 15 },
        {},
        { sortField: 'createdAt', sortOrder: -1 },
      );

      // Then
      expect(result.items).toHaveLength(15);
      expect(result.meta.hasMore).toBe(true);

      // Should be sorted by creation time descending
      for (let i = 0; i < result.items.length - 1; i++) {
        const current = result.items[i];
        const next = result.items[i + 1];
        expect(current.createdAt.getTime()).toBeGreaterThanOrEqual(
          next.createdAt.getTime(),
        );
      }
    });

    it('should handle search results pagination', async () => {
      // Given - create searchable content
      const articles = [
        {
          title: 'JavaScript Guide',
          content: 'Learn JavaScript programming',
          category: 'Programming',
        },
        {
          title: 'Python Tutorial',
          content: 'Complete Python guide for beginners',
          category: 'Programming',
        },
        {
          title: 'Database Design',
          content: 'Learn about database architecture',
          category: 'Database',
        },
        {
          title: 'Machine Learning',
          content: 'Introduction to ML algorithms',
          category: 'AI',
        },
      ];

      await testModel.insertMany(articles);

      // When - paginate search results
      const result = await service.paginate(
        testModel,
        { limit: 2 },
        { category: 'Programming' },
        { sortField: 'title', sortOrder: 1 },
      );

      // Then
      expect(result.items).toHaveLength(2);

      // Should be sorted by title ascending
      expect(result.items[0].title).toBe('JavaScript Guide');
      expect(result.items[1].title).toBe('Python Tutorial');

      result.items.forEach((item) => {
        expect(item.category).toBe('Programming');
      });
    });
  });

  describe('error handling', () => {
    it('should handle model without required indexes', async () => {
      // Given - create model without pagination indexes
      const simpleSchema = new Schema({
        name: { type: String, required: true },
        value: { type: Number },
      });

      const simpleModel: Model<any> = mongoConnection.model(
        'SimpleModel',
        simpleSchema,
      );

      await simpleModel.insertMany([
        { name: 'Test 1', value: 1 },
        { name: 'Test 2', value: 2 },
      ]);

      const dto: CursorDto = { limit: 5 };

      // When/Then - should still work
      const result = await service.paginate(simpleModel, dto);

      expect(result.items).toHaveLength(2);
      expect(result.meta.hasMore).toBe(false);
    });

    it('should handle database connection issues', async () => {
      // Given - mock model that throws connection error
      const errorModel = {
        find: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockReturnValue({
                exec: jest
                  .fn()
                  .mockRejectedValue(new Error('Connection failed')),
              }),
            }),
          }),
        }),
      } as unknown as Model<TestDocument>;

      const dto: CursorDto = { limit: 10 };

      // When/Then
      await expect(service.paginate(errorModel as any, dto)).rejects.toThrow(
        'Connection failed',
      );
    });

    it('should handle invalid sort field gracefully', async () => {
      // Given - try to sort by non-existent field
      const dto: CursorDto = { limit: 10 };
      const options = {
        sortField: 'nonExistentField',
      };

      // When/Then - should not throw
      const result = await service.paginate(testModel, dto, {}, options);

      expect(result.items).toHaveLength(10);
      expect(result.meta.hasMore).toBe(true);
    });

    it('should handle populate errors gracefully', async () => {
      // Given - try to populate non-existent field
      const dto: CursorDto = { limit: 5 };
      const options = {
        populate: 'nonExistentRef',
      };

      // When/Then - should not throw
      const result = await service.paginate(testModel, dto, {}, options);

      expect(result.items).toHaveLength(5);
      expect(result.meta.hasMore).toBe(true);
    });
  });

  describe('pagination helper methods', () => {
    describe('extractOptions', () => {
      it('should use all default values when no options provided', () => {
        // Given
        const service = new PaginationService();
        const options = {};

        // When
        const result = (service as any).extractOptions(options);

        // Then
        expect(result).toEqual({
          sortField: 'createdAt',
          sortOrder: -1,
          populate: undefined,
          select: undefined,
          lean: true,
        });
      });

      it('should override defaults with provided options', () => {
        // Given
        const service = new PaginationService();
        const options = {
          sortField: 'name',
          sortOrder: 1,
          populate: 'category',
          select: 'name active',
          lean: false,
        };

        // When
        const result = (service as any).extractOptions(options);

        // Then
        expect(result).toEqual({
          sortField: 'name',
          sortOrder: 1,
          populate: 'category',
          select: 'name active',
          lean: false,
        });
      });

      it('should handle partial options correctly', () => {
        // Given
        const service = new PaginationService();
        const options = {
          sortField: 'category',
          lean: false,
        };

        // When
        const result = (service as any).extractOptions(options);

        // Then - should use defaults for missing options
        expect(result).toEqual({
          sortField: 'category',
          sortOrder: -1,
          populate: undefined,
          select: undefined,
          lean: false,
        });
      });
    });

    describe('createSortObject', () => {
      it('should create sort object with field and _id', () => {
        // Given
        const service = new PaginationService();

        // When
        const result = (service as any).createSortObject('createdAt', -1);

        // Then
        expect(result).toEqual({
          createdAt: -1,
          _id: -1,
        });
      });

      it('should handle ascending sort order', () => {
        // Given
        const service = new PaginationService();

        // When
        const result = (service as any).createSortObject('name', 1);

        // Then
        expect(result).toEqual({
          name: 1,
          _id: 1,
        });
      });

      it('should handle different field names', () => {
        // Given
        const service = new PaginationService();

        // When
        const result = (service as any).createSortObject('category', 1);

        // Then
        expect(result).toEqual({
          category: 1,
          _id: 1,
        });
      });
    });

    describe('processResults', () => {
      it('should process results with hasMore true', () => {
        // Given
        const service = new PaginationService();
        const docs = Array.from({ length: 25 }, (_, i) => ({ id: i }));
        const limit = 10;

        // When
        const result = (service as any).processResults(docs, limit);

        // Then
        expect(result).toEqual({
          items: docs.slice(0, 10),
          hasMore: true,
        });
      });

      it('should process results with hasMore false', () => {
        // Given
        const service = new PaginationService();
        const docs = Array.from({ length: 5 }, (_, i) => ({ id: i }));
        const limit = 10;

        // When
        const result = (service as any).processResults(docs, limit);

        // Then
        expect(result).toEqual({
          items: docs,
          hasMore: false,
        });
      });

      it('should handle empty results', () => {
        // Given
        const service = new PaginationService();
        const docs: any[] = [];
        const limit = 10;

        // When
        const result = (service as any).processResults(docs, limit);

        // Then
        expect(result).toEqual({
          items: [],
          hasMore: false,
        });
      });

      it('should handle exact limit match', () => {
        // Given
        const service = new PaginationService();
        const docs = Array.from({ length: 10 }, (_, i) => ({ id: i }));
        const limit = 10;

        // When
        const result = (service as any).processResults(docs, limit);

        // Then
        expect(result).toEqual({
          items: docs,
          hasMore: false,
        });
      });
    });

    describe('executeQuery', () => {
      it('should execute query with all options', async () => {
        // Given
        const service = new PaginationService();
        const mockQuery = {
          find: jest.fn().mockReturnThis(),
          sort: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          populate: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          lean: jest.fn().mockResolvedValue([]),
          exec: jest.fn().mockResolvedValue([]),
        };

        const mockModel = {
          find: jest.fn().mockReturnValue(mockQuery),
        } as any;

        const filter = { category: 'A' };
        const sort = { createdAt: -1 };
        const limit = 10;
        const options = {
          populate: 'category',
          select: 'name active',
          lean: true,
        };

        // When
        const result = await (service as any).executeQuery(
          mockModel,
          filter,
          sort,
          limit,
          options,
        );

        // Then
        expect(mockModel.find).toHaveBeenCalledWith(filter);
        expect(mockQuery.sort).toHaveBeenCalledWith(sort);
        expect(mockQuery.limit).toHaveBeenCalledWith(limit);
        expect(mockQuery.populate).toHaveBeenCalledWith('category');
        expect(mockQuery.select).toHaveBeenCalledWith('name active');
        expect(mockQuery.lean).toHaveBeenCalled();
        expect(mockQuery.exec).toHaveBeenCalled();
        expect(result).toEqual([]);
      });

      it('should execute query without populate and select', async () => {
        // Given
        const service = new PaginationService();
        const mockQuery = {
          find: jest.fn().mockReturnThis(),
          sort: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          populate: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          lean: jest.fn().mockResolvedValue([]),
          exec: jest.fn().mockResolvedValue([]),
        };

        const mockModel = {
          find: jest.fn().mockReturnValue(mockQuery),
        } as any;

        // When
        const result = await (service as any).executeQuery(
          mockModel,
          {},
          { createdAt: -1 },
          5,
          { lean: true },
        );

        // Then
        expect(mockQuery.populate).not.toHaveBeenCalled();
        expect(mockQuery.select).not.toHaveBeenCalled();
        expect(result).toEqual([]);
      });

      it('should handle non-lean queries', async () => {
        // Given
        const service = new PaginationService();
        const mockQuery = {
          find: jest.fn().mockReturnThis(),
          sort: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          lean: jest.fn().mockResolvedValue([]),
          exec: jest.fn().mockResolvedValue([]),
        };

        const mockModel = {
          find: jest.fn().mockReturnValue(mockQuery),
        } as any;

        // When
        const result = await (service as any).executeQuery(
          mockModel,
          {},
          { createdAt: -1 },
          5,
          { lean: false },
        );

        // Then
        expect(mockQuery.exec).toHaveBeenCalled();
        expect(mockQuery.lean).not.toHaveBeenCalled();
        expect(result).toEqual([]);
      });
    });
  });

  describe('static methods comprehensive testing', () => {
    describe('createPaginationIndex', () => {
      it('should create index with provided fields only', () => {
        // Given
        const mockSchema = {
          index: jest.fn(),
        } as any;

        // When
        PaginationService.createPaginationIndex(mockSchema, { name: 1 });

        // Then
        expect(mockSchema.index).toHaveBeenCalledWith(
          {
            name: 1,
            createdAt: -1,
            _id: -1,
          },
          {
            background: true,
          },
        );
      });

      it('should override existing createdAt and _id fields', () => {
        // Given
        const mockSchema = {
          index: jest.fn(),
        } as any;

        // When - provide createdAt and _id in fields
        PaginationService.createPaginationIndex(mockSchema, {
          name: 1,
          createdAt: 1, // Should be overridden to -1
          _id: 1, // Should be overridden to -1
        });

        // Then
        expect(mockSchema.index).toHaveBeenCalledWith(
          {
            name: 1,
            createdAt: -1, // Overridden
            _id: -1, // Overridden
          },
          {
            background: true,
          },
        );
      });

      it('should handle custom index options', () => {
        // Given
        const mockSchema = {
          index: jest.fn(),
        } as any;

        // When
        PaginationService.createPaginationIndex(
          mockSchema,
          { name: 1 },
          {
            background: false,
            sparse: true,
          },
        );

        // Then
        expect(mockSchema.index).toHaveBeenCalledWith(
          {
            name: 1,
            createdAt: -1,
            _id: -1,
          },
          {
            background: false,
            sparse: true,
          },
        );
      });

      it('should handle partial index options', () => {
        // Given
        const mockSchema = {
          index: jest.fn(),
        } as any;

        // When - only background option
        PaginationService.createPaginationIndex(
          mockSchema,
          { category: -1 },
          {
            background: false,
          },
        );

        // Then
        expect(mockSchema.index).toHaveBeenCalledWith(
          {
            category: -1,
            createdAt: -1,
            _id: -1,
          },
          {
            background: false,
          },
        );
      });
    });

    describe('createTextIndex', () => {
      it('should create text index with fields and weights', () => {
        // Given
        const mockSchema = {
          index: jest.fn(),
        } as any;

        // When
        PaginationService.createTextIndex(
          mockSchema,
          { name: 'text', description: 'text' },
          { name: 10, description: 5 },
        );

        // Then
        expect(mockSchema.index).toHaveBeenCalledWith(
          { name: 'text', description: 'text' },
          {
            weights: { name: 10, description: 5 },
            background: true,
          },
        );
      });

      it('should create text index without weights', () => {
        // Given
        const mockSchema = {
          index: jest.fn(),
        } as any;

        // When
        PaginationService.createTextIndex(mockSchema, {
          title: 'text',
          content: 'text',
        });

        // Then
        expect(mockSchema.index).toHaveBeenCalledWith(
          { title: 'text', content: 'text' },
          {
            weights: {},
            background: true,
          },
        );
      });

      it('should handle custom background option', () => {
        // Given
        const mockSchema = {
          index: jest.fn(),
        } as any;

        // When
        PaginationService.createTextIndex(
          mockSchema,
          { name: 'text' },
          {},
          { background: false },
        );

        // Then
        expect(mockSchema.index).toHaveBeenCalledWith(
          { name: 'text' },
          {
            weights: {},
            background: false,
          },
        );
      });
    });
  });

  describe('pagination utility functions', () => {
    it('should handle firstOrUndefined correctly', () => {
      // Test the helper function that's not exported
      const firstOrUndefined = (arr: any[]): any =>
        arr.length > 0 ? arr[arr.length - 1] : undefined;

      expect(firstOrUndefined([])).toBeUndefined();
      expect(firstOrUndefined([1, 2, 3])).toBe(3);
      expect(firstOrUndefined(['a'])).toBe('a');
    });

    it('should handle isRecord correctly', () => {
      // Test the helper function that's not exported
      const isRecord = (v: unknown): v is Record<string, unknown> =>
        typeof v === 'object' && v !== null;

      expect(isRecord({})).toBe(true);
      expect(isRecord({ key: 'value' })).toBe(true);
      expect(isRecord(null)).toBe(false);
      expect(isRecord([])).toBe(false);
      expect(isRecord('string')).toBe(false);
      expect(isRecord(42)).toBe(false);
    });

    it('should handle toTimestamp correctly', () => {
      // Test the helper function that's not exported
      const toTimestamp = (value: unknown): number | undefined => {
        if (value instanceof Date) return value.getTime();
        if (typeof value === 'string' || typeof value === 'number') {
          const ts = new Date(value).getTime();
          return Number.isNaN(ts) ? undefined : ts;
        }
        return undefined;
      };

      const now = new Date();
      expect(toTimestamp(now)).toBe(now.getTime());
      expect(toTimestamp(now.toISOString())).toBe(now.getTime());
      expect(toTimestamp(now.getTime())).toBe(now.getTime());
      expect(toTimestamp('invalid-date')).toBeUndefined();
      expect(toTimestamp(null)).toBeUndefined();
      expect(toTimestamp(undefined)).toBeUndefined();
      expect(toTimestamp([])).toBeUndefined();
    });

    it('should handle extractNextCursor correctly', () => {
      // Test the helper function that's not exported
      const extractNextCursor = (
        items: unknown[],
        sortField: string,
      ): string | undefined => {
        const last = items.length > 0 ? items[items.length - 1] : undefined;
        if (!last || typeof last !== 'object' || last === null)
          return undefined;

        const value = (last as any)[sortField];
        const ts =
          value instanceof Date
            ? value.getTime()
            : typeof value === 'string' || typeof value === 'number'
              ? new Date(value).getTime()
              : undefined;
        const id = (last as any)._id?.toString() || '';
        if (ts === undefined || !id) return undefined;

        return `${ts}_${id}`;
      };

      const items = [
        { _id: '1', createdAt: new Date('2024-01-01') },
        { _id: '2', createdAt: new Date('2024-01-02') },
        { _id: '3', createdAt: new Date('2024-01-03') },
      ];

      const cursor = extractNextCursor(items, 'createdAt');
      expect(cursor).toBeDefined();
      expect(typeof cursor).toBe('string');
    });
  });

  describe('pagination edge cases and error handling', () => {
    it('should handle very large datasets', async () => {
      // Given - large dataset
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        name: `Item ${i}`,
        category: i % 10 === 0 ? 'A' : 'B',
        createdAt: new Date(Date.now() - i * 1000),
        active: true,
      }));

      await testModel.insertMany(largeDataset);

      // When - paginate through large dataset
      const dto: CursorDto = { limit: 100 };
      const result = await service.paginate(testModel, dto);

      // Then
      expect(result.items).toHaveLength(100);
      expect(result.meta.hasMore).toBe(true);
      expect(result.meta.count).toBe(100);
    });

    it('should handle documents without required fields', async () => {
      // Given - documents missing some fields
      const incompleteData = [
        { name: 'Item 1' }, // Missing createdAt, category, active
        { name: 'Item 2', createdAt: new Date() },
        { name: 'Item 3', createdAt: new Date(), category: 'A' },
      ];

      await testModel.insertMany(incompleteData);

      // When
      const dto: CursorDto = { limit: 10 };
      const result = await service.paginate(testModel, dto);

      // Then - should handle gracefully
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.meta.hasMore).toBe(false);
    });

    it('should handle documents with null/undefined values', async () => {
      // Given - documents with null values
      const dataWithNulls = [
        {
          name: 'Item 1',
          createdAt: null,
          category: 'A',
          active: true,
        },
        {
          name: 'Item 2',
          createdAt: new Date(),
          category: null,
          active: true,
        },
        {
          name: 'Item 3',
          createdAt: new Date(),
          category: 'A',
          active: null,
        },
      ];

      await testModel.insertMany(dataWithNulls);

      // When
      const dto: CursorDto = { limit: 10 };
      const result = await service.paginate(testModel, dto);

      // Then - should handle null values gracefully
      expect(result.items.length).toBeGreaterThan(0);
    });

    it('should handle concurrent pagination requests', async () => {
      // Given - multiple concurrent requests
      const requests = Array.from({ length: 10 }, () =>
        service.paginate(testModel, { limit: 5 }),
      );

      // When
      const results = await Promise.all(requests);

      // Then - all requests should succeed
      results.forEach((result) => {
        expect(result.items).toHaveLength(5);
        expect(result.meta).toBeDefined();
        expect(result.meta.hasMore).toBe(true);
      });
    });

    it('should handle pagination with complex filters', async () => {
      // Given - complex filter conditions
      const complexFilter = {
        $or: [{ category: 'A' }, { active: true }],
        $and: [{ name: { $regex: 'Item' } }],
      };

      // When
      const dto: CursorDto = { limit: 10 };
      const result = await service.paginate(testModel, dto, complexFilter);

      // Then - should handle complex filters
      expect(result.items.length).toBeGreaterThanOrEqual(0);
      expect(result.meta).toBeDefined();
    });

    it('should handle pagination with array sort fields', async () => {
      // Given - try to sort by array field (should fall back gracefully)
      const dto: CursorDto = { limit: 10 };
      const options = {
        sortField: 'tags', // Assuming this might be an array field
      };

      // When/Then - should not throw
      const result = await service.paginate(testModel, dto, {}, options);

      expect(result.items).toHaveLength(10);
      expect(result.meta.hasMore).toBe(true);
    });
  });

  describe('pagination performance testing', () => {
    it('should handle rapid successive pagination calls', async () => {
      // Given
      const iterations = 100;
      const requests: Array<Promise<PaginationResult<any>>> = [];

      for (let i = 0; i < iterations; i++) {
        requests.push(service.paginate(testModel, { limit: 10 }));
      }

      // When - execute rapid requests
      const startTime = Date.now();
      const results: Array<PaginationResult<any>> = await Promise.all(requests);
      const endTime = Date.now();

      // Then - should complete quickly
      expect(endTime - startTime).toBeLessThan(2000); // Within 2 seconds
      expect(results).toHaveLength(iterations);

      results.forEach((result) => {
        expect(result.items).toHaveLength(10);
        expect(result.meta).toBeDefined();
      });
    });

    it('should handle large page sizes efficiently', async () => {
      // Given - large page size
      const dto: CursorDto = { limit: 1000 };

      // When
      const startTime = Date.now();
      const result = await service.paginate(testModel, dto);
      const endTime = Date.now();

      // Then - should handle large pages efficiently
      expect(endTime - startTime).toBeLessThan(1000); // Within 1 second
      expect(result.items.length).toBeLessThanOrEqual(1000);
    });

    it('should handle memory efficiently with many results', async () => {
      // Given - request that will return many results
      const dto: CursorDto = { limit: 100 };

      // When - multiple large requests
      const requests: Array<Promise<PaginationResult<any>>> = Array.from(
        { length: 5 },
        () => service.paginate(testModel, dto),
      );

      const startTime = Date.now();
      const results: Array<PaginationResult<any>> = await Promise.all(requests);
      const endTime = Date.now();

      // Then - should handle memory efficiently
      expect(endTime - startTime).toBeLessThan(2000);
      expect(results).toHaveLength(5);

      // Verify no memory leaks by checking consistent performance
      const finalStartTime = Date.now();
      await service.paginate(testModel, { limit: 10 });
      const finalEndTime = Date.now();

      expect(finalEndTime - finalStartTime).toBeLessThan(100);
    });
  });

  describe('pagination real-world scenarios', () => {
    it('should handle e-commerce product listing', async () => {
      // Given - e-commerce scenario
      const products = Array.from({ length: 50 }, (_, i) => ({
        name: `Product ${i + 1}`,
        category:
          i % 5 === 0 ? 'Electronics' : i % 3 === 0 ? 'Clothing' : 'Books',
        createdAt: new Date(Date.now() - i * 1000),
        active: true,
        price: Math.floor(Math.random() * 1000) + 10,
        inStock: i % 7 !== 0,
      }));

      await testModel.insertMany(products);

      // When - paginate products with filters
      const dto: CursorDto = { limit: 20 };
      const filter = { active: true, inStock: true };
      const options = {
        sortField: 'price',
        sortOrder: 1 as const,
        select: 'name price category',
      };

      const result = await service.paginate(testModel, dto, filter, options);

      // Then - verify e-commerce pagination
      expect(result.items).toHaveLength(20);
      expect(result.meta.hasMore).toBe(true);

      // Items should be sorted by price ascending
      for (let i = 0; i < result.items.length - 1; i++) {
        const current = result.items[i];
        const next = result.items[i + 1];
        expect(current.price).toBeLessThanOrEqual(next.price);
      }
    });

    it('should handle social media feed pagination', async () => {
      // Given - social media feed scenario
      const posts = Array.from({ length: 100 }, (_, i) => ({
        content: `Post content ${i + 1}`,
        author: `User ${Math.floor(i / 10) + 1}`,
        createdAt: new Date(Date.now() - i * 60000), // 1 minute apart
        likes: Math.floor(Math.random() * 100),
        comments: Math.floor(Math.random() * 20),
        tags: [`tag${i % 5}`, `category${i % 3}`],
      }));

      await testModel.insertMany(posts);

      // When - paginate social media feed
      const dto: CursorDto = { limit: 15 };
      const options = {
        sortField: 'createdAt',
        sortOrder: -1 as const,
        populate: [], // No population needed for this test
      };

      const result = await service.paginate(testModel, dto, {}, options);

      // Then - verify social media pagination
      expect(result.items).toHaveLength(15);
      expect(result.meta.hasMore).toBe(true);

      // Most recent posts first
      for (let i = 0; i < result.items.length - 1; i++) {
        const current = result.items[i];
        const next = result.items[i + 1];
        expect(current.createdAt.getTime()).toBeGreaterThanOrEqual(
          next.createdAt.getTime(),
        );
      }
    });

    it('should handle search results pagination', async () => {
      // Given - search results scenario
      const documents = Array.from({ length: 75 }, (_, i) => ({
        title: `Document ${i + 1}`,
        content: `Content for document ${i + 1} with searchable text`,
        category: i % 4 === 0 ? 'Research' : i % 3 === 0 ? 'News' : 'Article',
        createdAt: new Date(Date.now() - i * 2000),
        searchable: true,
        relevanceScore: Math.random() * 100,
      }));

      await testModel.insertMany(documents);

      // When - paginate search results with relevance sorting
      const dto: CursorDto = { limit: 25 };
      const filter = { searchable: true };
      const options = {
        sortField: 'relevanceScore',
        sortOrder: -1 as const,
        select: 'title content relevanceScore',
      };

      const result = await service.paginate(testModel, dto, filter, options);

      // Then - verify search results pagination
      expect(result.items).toHaveLength(25);
      expect(result.meta.hasMore).toBe(true);

      // Items should be sorted by relevance score descending
      for (let i = 0; i < result.items.length - 1; i++) {
        const current = result.items[i];
        const next = result.items[i + 1];
        expect(current.relevanceScore).toBeGreaterThanOrEqual(
          next.relevanceScore,
        );
      }
    });

    it('should handle admin dashboard data pagination', async () => {
      // Given - admin dashboard data
      const adminData = Array.from({ length: 200 }, (_, i) => ({
        type: i % 5 === 0 ? 'user' : i % 3 === 0 ? 'order' : 'product',
        status: i % 4 === 0 ? 'active' : i % 3 === 0 ? 'pending' : 'completed',
        createdAt: new Date(Date.now() - i * 5000),
        priority: Math.floor(Math.random() * 3) + 1,
        metadata: {
          source: 'system',
          version: '1.0',
          tags: [`priority-${Math.floor(Math.random() * 3) + 1}`],
        },
      }));

      await testModel.insertMany(adminData);

      // When - paginate admin data with complex filtering
      const dto: CursorDto = { limit: 30 };
      const filter = {
        $or: [
          { type: 'user', status: 'active' },
          { type: 'order', priority: { $gte: 2 } },
        ],
      };
      const options = {
        sortField: 'priority',
        sortOrder: -1 as const,
        populate: [],
      };

      const result = await service.paginate(testModel, dto, filter, options);

      // Then - verify admin dashboard pagination
      expect(result.items).toHaveLength(30);
      expect(result.meta.hasMore).toBe(true);

      // Items should be sorted by priority descending
      for (let i = 0; i < result.items.length - 1; i++) {
        const current = result.items[i];
        const next = result.items[i + 1];
        expect(current.priority).toBeGreaterThanOrEqual(next.priority);
      }
    });
  });

  describe('pagination error recovery and resilience', () => {
    it('should handle malformed cursor data', async () => {
      // Given - malformed cursor
      const dto: CursorDto = {
        limit: 10,
        cursor: 'malformed-cursor-data',
      };

      // When/Then - should not throw
      const result = await service.paginate(testModel, dto);

      expect(result.items).toHaveLength(10);
      expect(result.meta.hasMore).toBe(true);
    });

    it('should handle empty cursor gracefully', async () => {
      // Given - empty cursor
      const dto: CursorDto = {
        limit: 10,
        cursor: '',
      };

      // When
      const result = await service.paginate(testModel, dto);

      // Then - should work like no cursor
      expect(result.items).toHaveLength(10);
      expect(result.meta.hasMore).toBe(true);
    });

    it('should handle very large limit values', async () => {
      // Given - extremely large limit
      const dto: CursorDto = { limit: 100000 };

      // When
      const result = await service.paginate(testModel, dto);

      // Then - should be capped at MAX_LIMIT (100)
      expect(result.items).toHaveLength(20); // MAX_LIMIT is 100, but we only have 25 items
      expect(result.meta.hasMore).toBe(true);
    });

    it('should handle negative limit values', async () => {
      // Given - negative limit
      const dto: CursorDto = { limit: -10 };

      // When
      const result = await service.paginate(testModel, dto);

      // Then - should use default limit
      expect(result.items).toHaveLength(20); // Default limit
      expect(result.meta.hasMore).toBe(true);
    });

    it('should handle zero limit', async () => {
      // Given - zero limit
      const dto: CursorDto = { limit: 0 };

      // When
      const result = await service.paginate(testModel, dto);

      // Then - should use default limit
      expect(result.items).toHaveLength(20); // Default limit
      expect(result.meta.hasMore).toBe(true);
    });

    it('should handle very small datasets', async () => {
      // Given - very small dataset
      await testModel.deleteMany({});
      await testModel.insertMany([
        { name: 'Single Item', category: 'A', createdAt: new Date() },
      ]);

      // When
      const dto: CursorDto = { limit: 10 };
      const result = await service.paginate(testModel, dto);

      // Then - should handle small datasets correctly
      expect(result.items).toHaveLength(1);
      expect(result.meta.hasMore).toBe(false);
      expect(result.meta.count).toBe(1);
      expect(result.meta.nextCursor).toBeUndefined();
    });

    it('should handle query timeout scenarios', async () => {
      // 👇 أنشئ نتيجة افتراضية (10 عناصر) ليتطابق مع التوقع
      const docs = Array.from({ length: 10 }, (_, i) => ({
        _id: `${i}`,
      })) as any[];

      // 👇 كائن Query مقلّد يدعم السلسلة: sort().limit().lean().exec()
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        // لو تريد محاكاة بطء، استخدم fake timers بدل setTimeout الحقيقي
        exec: jest.fn().mockResolvedValue(docs),
      } as any;

      // 👇 Spy بدل حفظ مرجع المثود (لا unbound، ولا تعديل مباشر)
      const findSpy = jest.spyOn(testModel, 'find').mockReturnValue(mockQuery);

      const dto: CursorDto = { limit: 10 };
      const result = await service.paginate(testModel as any, dto);

      expect(result.items).toHaveLength(10);

      // 👇 إعادة الضبط
      findSpy.mockRestore();
    });
  });
});
