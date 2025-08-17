// src/modules/products/test/products.spec.ts
// اختبارات شاملة لوحدة Products: Controller + Service + Import + Queue
// تغطي إدارة المنتجات، استيراد البيانات، والمعالجة المتقدمة
/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ProductsController } from '../products.controller';
import { ProductsService } from '../products.service';
import { ProductsImportService } from '../products-import.service';
import { ProductSetupConfigService } from '../product-setup-config.service';
import { ScrapeQueue } from '../scrape.queue';

// Mock للموديلات والخدمات الخارجية
const mockProductModel = mockDeep<Model<any>>();
const mockCategoryModel = mockDeep<Model<any>>();
const mockMerchantModel = mockDeep<Model<any>>();
const mockConfigService = mockDeep<ConfigService>();
const mockScrapeQueue = mockDeep<ScrapeQueue>();

describe('ProductsService', () => {
  let service: ProductsService;
  let importService: DeepMockProxy<ProductsImportService>;
  let setupConfigService: DeepMockProxy<ProductSetupConfigService>;

  const mockProductId = new Types.ObjectId().toHexString();
  const mockMerchantId = new Types.ObjectId().toHexString();
  const mockCategoryId = new Types.ObjectId().toHexString();

  const mockProduct = {
    _id: mockProductId,
    name: 'منتج تجريبي',
    description: 'وصف المنتج',
    price: 100,
    merchantId: mockMerchantId,
    categoryId: mockCategoryId,
    sku: 'PROD-001',
    stock: 50,
    isActive: true,
    images: ['image1.jpg', 'image2.jpg'],
    tags: ['تقنية', 'جودة عالية'],
    variants: [
      { name: 'اللون', value: 'أحمر', price: 100 },
      { name: 'المقاس', value: 'كبير', price: 110 },
    ],
    seo: {
      title: 'منتج تجريبي - أفضل جودة',
      description: 'منتج عالي الجودة',
      keywords: ['منتج', 'جودة', 'تقنية'],
    },
    shipping: {
      weight: 0.5,
      dimensions: { length: 10, width: 8, height: 5 },
      freeShipping: true,
    },
    analytics: {
      views: 100,
      purchases: 5,
      rating: 4.5,
      reviews: 12,
    },
    createdAt: new Date('2023-01-01T12:00:00.000Z'),
    updatedAt: new Date('2023-01-01T12:00:00.000Z'),
  };

  beforeEach(async () => {
    importService = mockDeep<ProductsImportService>();
    setupConfigService = mockDeep<ProductSetupConfigService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: getModelToken('Product'), useValue: mockProductModel },
        { provide: getModelToken('Category'), useValue: mockCategoryModel },
        { provide: getModelToken('Merchant'), useValue: mockMerchantModel },
        { provide: ProductsImportService, useValue: importService },
        { provide: ProductSetupConfigService, useValue: setupConfigService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: ScrapeQueue, useValue: mockScrapeQueue },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('create', () => {
    const createProductDto = {
      name: 'منتج جديد',
      description: 'وصف المنتج الجديد',
      price: 150,
      merchantId: mockMerchantId,
      categoryId: mockCategoryId,
      sku: 'PROD-002',
      stock: 30,
    };

    it('ينشئ منتج جديد بنجاح', async () => {
      mockProductModel.create.mockResolvedValue(mockProduct as any);

      const result = await service.create(createProductDto as any);

      expect(mockProductModel.create).toHaveBeenCalledWith(createProductDto);
      expect(result).toEqual(mockProduct);
    });

    it('يرمي خطأ عند فشل إنشاء المنتج', async () => {
      const error = new Error('Database error');
      mockProductModel.create.mockRejectedValue(error);

      await expect(service.create(createProductDto as any)).rejects.toThrow(
        error,
      );
    });

    it('ينشئ منتج مع variants مخصصة', async () => {
      const productWithVariants = {
        ...createProductDto,
        variants: [
          { name: 'اللون', value: 'أزرق', price: 160 },
          { name: 'المقاس', value: 'متوسط', price: 150 },
        ],
      };

      mockProductModel.create.mockResolvedValue({
        ...mockProduct,
        variants: productWithVariants.variants,
      } as any);

      const result = await service.create(productWithVariants as any);

      expect(mockProductModel.create).toHaveBeenCalledWith(productWithVariants);
      expect((result as any).variants).toEqual(productWithVariants.variants);
    });
  });

  describe('findAll', () => {
    it('يسترجع جميع المنتجات مع pagination', async () => {
      const mockProducts = [mockProduct, { ...mockProduct, _id: 'product2' }];
      const sortMock = jest.fn().mockReturnThis();
      const skipMock = jest.fn().mockReturnThis();
      const limitMock = jest.fn().mockReturnThis();
      const populateMock = jest.fn().mockReturnThis();
      const execMock = jest.fn().mockResolvedValue(mockProducts);

      mockProductModel.countDocuments.mockResolvedValue(2);
      (mockProductModel.find as jest.Mock).mockReturnValue({
        sort: sortMock,
        skip: skipMock,
        limit: limitMock,
        populate: populateMock,
        exec: execMock,
      });

      const result = await service.findAllByMerchant(
        new Types.ObjectId(mockMerchantId),
      );

      expect(mockProductModel.find).toHaveBeenCalledWith({});
      expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
      expect(skipMock).toHaveBeenCalledWith(0);
      expect(limitMock).toHaveBeenCalledWith(10);
      expect(populateMock).toHaveBeenCalledWith('categoryId merchantId');
      expect(result).toEqual({
        data: mockProducts,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('يطبق فلاتر البحث بشكل صحيح', async () => {
      const filters = {
        merchantId: mockMerchantId,
        categoryId: mockCategoryId,
        search: 'منتج',
        minPrice: 50,
        maxPrice: 200,
        isActive: true,
        inStock: true,
      };

      const sortMock = jest.fn().mockReturnThis();
      const skipMock = jest.fn().mockReturnThis();
      const limitMock = jest.fn().mockReturnThis();
      const populateMock = jest.fn().mockReturnThis();
      const execMock = jest.fn().mockResolvedValue([mockProduct]);

      mockProductModel.countDocuments.mockResolvedValue(1);
      (mockProductModel.find as jest.Mock).mockReturnValue({
        sort: sortMock,
        skip: skipMock,
        limit: limitMock,
        populate: populateMock,
        exec: execMock,
      });

      await (service as any).findAll({ ...filters, page: 1, limit: 10 });

      expect(mockProductModel.find).toHaveBeenCalledWith({
        merchantId: filters.merchantId,
        categoryId: filters.categoryId,
        $or: [
          { name: { $regex: filters.search, $options: 'i' } },
          { description: { $regex: filters.search, $options: 'i' } },
          { tags: { $in: [new RegExp(filters.search, 'i')] } },
        ],
        price: { $gte: filters.minPrice, $lte: filters.maxPrice },
        isActive: filters.isActive,
        stock: { $gt: 0 },
      });
    });
  });

  describe('findOne', () => {
    it('يسترجع منتج محدد بنجاح', async () => {
      const populateMock = jest.fn().mockReturnThis();
      const execMock = jest.fn().mockResolvedValue(mockProduct);

      (mockProductModel.findById as jest.Mock).mockReturnValue({
        populate: populateMock,
        exec: execMock,
      });

      const result = await service.findOne(mockProductId);

      expect(mockProductModel.findById).toHaveBeenCalledWith(mockProductId);
      expect(populateMock).toHaveBeenCalledWith('categoryId merchantId');
      expect(result).toEqual(mockProduct);
    });

    it('يرمي NotFoundException عند عدم وجود المنتج', async () => {
      const populateMock = jest.fn().mockReturnThis();
      const execMock = jest.fn().mockResolvedValue(null);

      (mockProductModel.findById as jest.Mock).mockReturnValue({
        populate: populateMock,
        exec: execMock,
      });

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const updateData = {
      name: 'منتج محدث',
      price: 200,
      stock: 40,
    };

    it('يحدث المنتج بنجاح', async () => {
      const updatedProduct = { ...mockProduct, ...updateData };
      mockProductModel.findByIdAndUpdate.mockResolvedValue(
        updatedProduct as any,
      );

      const result = await service.update(mockProductId, updateData);

      expect(mockProductModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockProductId,
        updateData,
        { new: true, runValidators: true },
      );
      expect(result).toEqual(updatedProduct);
    });

    it('يرمي NotFoundException عند عدم وجود المنتج للتحديث', async () => {
      mockProductModel.findByIdAndUpdate.mockResolvedValue(null);

      await expect(
        service.update('nonexistent-id', updateData),
      ).rejects.toThrow(NotFoundException);
    });

    it('يحدث المتغيرات (variants) بشكل صحيح', async () => {
      const updateWithVariants = {
        ...updateData,
        variants: [{ name: 'اللون', value: 'أخضر', price: 220 }],
      };

      const updatedProduct = { ...mockProduct, ...updateWithVariants };
      mockProductModel.findByIdAndUpdate.mockResolvedValue(
        updatedProduct as any,
      );

      const result = await service.update(mockProductId, updateWithVariants);

      expect((result as any).variants).toEqual(updateWithVariants.variants);
    });
  });

  describe('remove', () => {
    it('يحذف المنتج بنجاح', async () => {
      mockProductModel.findByIdAndDelete.mockResolvedValue(mockProduct as any);

      const result = await service.remove(mockProductId);

      expect(mockProductModel.findByIdAndDelete).toHaveBeenCalledWith(
        mockProductId,
      );
      expect(result).toEqual({ deleted: true, product: mockProduct });
    });

    it('يرمي NotFoundException عند عدم وجود المنتج للحذف', async () => {
      mockProductModel.findByIdAndDelete.mockResolvedValue(null);

      await expect(service.remove('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('bulkUpdate', () => {
    it('يحدث عدة منتجات مرة واحدة', async () => {
      const bulkData = [
        { id: mockProductId, price: 150 },
        { id: 'product2', price: 250 },
      ];

      mockProductModel.bulkWrite.mockResolvedValue({
        modifiedCount: 2,
        matchedCount: 2,
      } as any);

      const result = await (service as any).bulkUpdate(bulkData);

      expect(mockProductModel.bulkWrite).toHaveBeenCalledWith([
        {
          updateOne: {
            filter: { _id: mockProductId },
            update: { price: 150 },
          },
        },
        {
          updateOne: {
            filter: { _id: 'product2' },
            update: { price: 250 },
          },
        },
      ]);
      expect(result).toEqual({
        success: true,
        modifiedCount: 2,
        matchedCount: 2,
      });
    });
  });

  describe('searchProducts', () => {
    it('يبحث في المنتجات بالنص', async () => {
      const searchQuery = 'منتج';
      const searchResults = [mockProduct];

      const sortMock = jest.fn().mockReturnThis();
      const limitMock = jest.fn().mockReturnThis();
      const execMock = jest.fn().mockResolvedValue(searchResults);

      (mockProductModel.find as jest.Mock).mockReturnValue({
        sort: sortMock,
        limit: limitMock,
        exec: execMock,
      });

      const result = await (service as any).searchProducts(searchQuery, {
        limit: 20,
        merchantId: mockMerchantId,
      });

      expect(mockProductModel.find).toHaveBeenCalledWith({
        merchantId: mockMerchantId,
        $or: [
          { name: { $regex: searchQuery, $options: 'i' } },
          { description: { $regex: searchQuery, $options: 'i' } },
          { tags: { $in: [new RegExp(searchQuery, 'i')] } },
          { sku: { $regex: searchQuery, $options: 'i' } },
        ],
        isActive: true,
      });
      expect(result).toEqual(searchResults);
    });
  });

  describe('updateStock', () => {
    it('يحدث المخزون بشكل صحيح', async () => {
      const stockUpdate = { productId: mockProductId, quantity: -5 };
      const updatedProduct = { ...mockProduct, stock: 45 };

      mockProductModel.findByIdAndUpdate.mockResolvedValue(
        updatedProduct as any,
      );

      const result = await (service as any).updateStock(stockUpdate);

      expect(mockProductModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockProductId,
        { $inc: { stock: -5 } },
        { new: true },
      );
      expect(result).toEqual(updatedProduct);
    });

    it('يمنع تحديث المخزون إلى قيمة سالبة', async () => {
      const stockUpdate = { productId: mockProductId, quantity: -100 };

      mockProductModel.findById.mockResolvedValue({ stock: 50 } as any);

      await expect((service as any).updateStock(stockUpdate)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getProductAnalytics', () => {
    it('يعيد إحصائيات المنتج', async () => {
      const analytics = {
        totalProducts: 100,
        activeProducts: 85,
        outOfStockProducts: 15,
        totalValue: 50000,
        averagePrice: 125,
        topCategories: [{ _id: mockCategoryId, count: 25, name: 'إلكترونيات' }],
        recentProducts: [mockProduct],
      };

      mockProductModel.countDocuments
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(85) // active
        .mockResolvedValueOnce(15); // out of stock

      mockProductModel.aggregate
        .mockResolvedValueOnce([{ totalValue: 50000, averagePrice: 125 }]) // value stats
        .mockResolvedValueOnce(analytics.topCategories); // categories

      const sortMock = jest.fn().mockReturnThis();
      const limitMock = jest.fn().mockReturnThis();
      const execMock = jest.fn().mockResolvedValue(analytics.recentProducts);

      (mockProductModel.find as jest.Mock).mockReturnValue({
        sort: sortMock,
        limit: limitMock,
        exec: execMock,
      });

      const result = await (service as any).getProductAnalytics(mockMerchantId);

      expect(result).toEqual(analytics);
    });
  });
});

describe('ProductsController', () => {
  let controller: ProductsController;
  let service: DeepMockProxy<ProductsService>;
  let importService: DeepMockProxy<ProductsImportService>;
  let moduleRef: TestingModule;

  beforeEach(async () => {
    service = mockDeep<ProductsService>();
    importService = mockDeep<ProductsImportService>();

    moduleRef = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        { provide: ProductsService, useValue: service },
        { provide: ProductsImportService, useValue: importService },
      ],
    }).compile();

    controller = moduleRef.get<ProductsController>(ProductsController);
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await moduleRef?.close();
    jest.restoreAllMocks();
  });

  describe('create', () => {
    it('ينشئ منتج جديد عبر API', async () => {
      const createDto = {
        name: 'منتج API',
        price: 300,
        merchantId: 'merchant-123',
      };

      const createdProduct = { _id: 'product-123', ...createDto };
      service.create.mockResolvedValue(createdProduct as any);

      const result = await controller.create(createDto as any, {} as any);

      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(createdProduct);
    });
  });

  describe('findAll', () => {
    it('يسترجع المنتجات مع فلاتر', async () => {
      const query = {
        page: '1',
        limit: '10',
        merchantId: 'merchant-123',
        search: 'منتج',
      };

      const productsResponse = {
        data: [{ _id: 'product-123', name: 'منتج' }],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      (service as any).findAll.mockResolvedValue(productsResponse as any);

      const result = await controller.findAll(query.merchantId);

      expect((service as any).findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        merchantId: query.merchantId,
        search: query.search,
      });
      expect(result).toEqual(productsResponse);
    });
  });

  describe('findOne', () => {
    it('يسترجع منتج محدد', async () => {
      const productId = 'product-123';
      const product = { _id: productId, name: 'منتج واحد' };

      service.findOne.mockResolvedValue(product as any);

      const result = await controller.findOne(productId, {} as any);

      expect((service as any).findOne).toHaveBeenCalledWith(productId);
      expect(result).toEqual(product);
    });
  });

  describe('update', () => {
    it('يحدث المنتج بنجاح', async () => {
      const productId = 'product-123';
      const updateDto = { name: 'منتج محدث', price: 400 };
      const updatedProduct = { _id: productId, ...updateDto };

      service.update.mockResolvedValue(updatedProduct as any);

      const result = await controller.update(
        productId,
        updateDto as any,
        {} as any,
      );

      expect(service.update).toHaveBeenCalledWith(productId, updateDto);
      expect(result).toEqual(updatedProduct);
    });
  });

  describe('remove', () => {
    it('يحذف المنتج بنجاح', async () => {
      const productId = 'product-123';
      const deleteResult = { deleted: true, product: { _id: productId } };

      service.remove.mockResolvedValue(deleteResult as any);

      const result = await controller.remove(productId, {} as any);

      expect(service.remove).toHaveBeenCalledWith(productId);
      expect(result).toEqual(deleteResult);
    });
  });

  describe('bulkUpdate', () => {
    it('يحدث عدة منتجات مرة واحدة', async () => {
      const bulkData = [
        { id: 'product1', price: 100 },
        { id: 'product2', price: 200 },
      ];

      const bulkResult = {
        success: true,
        modifiedCount: 2,
        matchedCount: 2,
      };

      (service as any).bulkUpdate.mockResolvedValue(bulkResult as any);

      const result = await (controller as any).bulkUpdate({
        products: bulkData,
      });

      expect((service as any).bulkUpdate).toHaveBeenCalledWith(bulkData);
      expect(result).toEqual(bulkResult);
    });
  });

  describe('search', () => {
    it('يبحث في المنتجات', async () => {
      const searchQuery = 'منتج';
      const searchResults = [{ _id: 'product-123', name: 'منتج' }];

      service.searchProducts.mockResolvedValue(searchResults as any);

      const result = await (controller as any).search(
        searchQuery,
        'merchant-123',
        '20', // limit
      );

      expect(service.searchProducts).toHaveBeenCalledWith(searchQuery, {
        limit: 20,
        merchantId: 'merchant-123',
      });
      expect(result).toEqual(searchResults);
    });
  });

  describe('updateStock', () => {
    it('يحدث مخزون المنتج', async () => {
      const stockDto = { productId: 'product-123', quantity: -5 };
      const updatedProduct = { _id: 'product-123', stock: 45 };

      (service as any).updateStock.mockResolvedValue(updatedProduct as any);

      const result = await (controller as any).updateStock(stockDto as any);

      expect((service as any).updateStock).toHaveBeenCalledWith(stockDto);
      expect(result).toEqual(updatedProduct);
    });
  });

  describe('getAnalytics', () => {
    it('يعيد إحصائيات المنتجات', async () => {
      const merchantId = 'merchant-123';
      const analytics = {
        totalProducts: 50,
        activeProducts: 45,
        outOfStockProducts: 5,
      };

      (service as any).getProductAnalytics.mockResolvedValue(analytics as any);

      const result = await (controller as any).getAnalytics(merchantId);

      expect((service as any).getProductAnalytics).toHaveBeenCalledWith(
        merchantId,
      );
      expect(result).toEqual(analytics);
    });
  });

  describe('importProducts', () => {
    it('يستورد المنتجات من ملف', async () => {
      const mockFile = {
        fieldname: 'file',
        originalname: 'products.csv',
        mimetype: 'text/csv',
        buffer: Buffer.from('name,price\nمنتج,100'),
      } as Express.Multer.File;

      const importResult = {
        success: true,
        imported: 1,
        failed: 0,
        errors: [],
      };

      importService.importFromFile.mockResolvedValue(importResult as any);

      const result = await (controller as any).importProducts(
        mockFile,
        'merchant-123',
        'csv',
      );

      expect(importService.importFromFile).toHaveBeenCalledWith(
        mockFile,
        'merchant-123',
        'csv',
        {} as any,
      );
      expect(result).toEqual(importResult);
    });
  });

  describe('Integration Tests', () => {
    it('يختبر تدفق كامل: إنشاء → استرجاع → تحديث → حذف', async () => {
      const createDto = { name: 'منتج تكامل', price: 500 };
      const productId = 'integration-product';

      // 1. إنشاء منتج
      const createdProduct = { _id: productId, ...createDto };
      service.create.mockResolvedValue(createdProduct as any);
      const createResult = await (controller as any).create(createDto as any);
      expect(createResult).toEqual(createdProduct);

      // 2. استرجاع المنتج
      service.findOne.mockResolvedValue(createdProduct as any);
      const findResult = await controller.findOne(productId, {} as any);
      expect(findResult).toEqual(createdProduct);

      // 3. تحديث المنتج
      const updateDto = { price: 600 };
      const updatedProduct = { ...createdProduct, ...updateDto };
      service.update.mockResolvedValue(updatedProduct as any);
      const updateResult = await controller.update(
        productId,
        updateDto as any,
        {} as any,
      );
      expect(updateResult).toEqual(updatedProduct);

      // 4. حذف المنتج
      const deleteResult = { deleted: true, product: updatedProduct };
      service.remove.mockResolvedValue(deleteResult as any);
      const removeResult = await controller.remove(productId, {} as any);
      expect(removeResult).toEqual(deleteResult);

      // التحقق من الاستدعاءات
      expect(service.create).toHaveBeenCalled();
      expect(service.findOne).toHaveBeenCalled();
      expect(service.update).toHaveBeenCalled();
      expect(service.remove).toHaveBeenCalled();
    });
  });
});

describe('ProductsImportService', () => {
  let importService: ProductsImportService;
  let productsService: DeepMockProxy<ProductsService>;

  beforeEach(async () => {
    productsService = mockDeep<ProductsService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsImportService,
        { provide: ProductsService, useValue: productsService },
      ],
    }).compile();

    importService = module.get<ProductsImportService>(ProductsImportService);
    jest.clearAllMocks();
  });

  describe('importFromFile', () => {
    it('يستورد منتجات من ملف CSV', async () => {
      const csvContent =
        'name,price,description\nمنتج1,100,وصف1\nمنتج2,200,وصف2';
      const mockFile = {
        buffer: Buffer.from(csvContent),
        mimetype: 'text/csv',
      } as Express.Multer.File;

      productsService.create
        .mockResolvedValueOnce({ _id: 'product1' } as any)
        .mockResolvedValueOnce({ _id: 'product2' } as any);

      const result = await importService.importFromFile(
        mockFile as any,
        'merchant-123',
      );

      expect(productsService.create).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        success: true,
        imported: 2,
        failed: 0,
        errors: [],
      });
    });

    it('يتعامل مع أخطاء الاستيراد', async () => {
      const csvContent =
        'name,price,description\nمنتج1,100,وصف1\nمنتج2,200,وصف2';
      const mockFile = {
        buffer: Buffer.from(csvContent),
        mimetype: 'text/csv',
      } as Express.Multer.File;

      productsService.create.mockRejectedValue(new Error('Invalid price'));

      const result = await importService.importFromFile(
        mockFile as any,
        'merchant-123',
      );

      expect((result as any).success).toBe(false);
      expect((result as any).failed).toBe(1);
      expect((result as any).errors).toHaveLength(1);
    });
  });
});

describe('ScrapeQueue', () => {
  let scrapeQueue: ScrapeQueue;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScrapeQueue,
        { provide: 'BullQueue_scrape', useValue: mockScrapeQueue },
      ],
    }).compile();

    scrapeQueue = module.get<ScrapeQueue>(ScrapeQueue);
    jest.clearAllMocks();
  });

  describe('addScrapeJob', () => {
    it('يضيف مهمة كشط جديدة', async () => {
      const jobData = {
        url: 'https://example.com/product',
        merchantId: 'merchant-123',
        type: 'product',
      };

      (mockScrapeQueue as any).add.mockResolvedValue({ id: 'job-123' } as any);

      const result = await (scrapeQueue as any).addScrapeJob(jobData);

      expect((mockScrapeQueue as any).add).toHaveBeenCalledWith(
        'scrape-product',
        jobData,
      );
      expect(result).toEqual({ id: 'job-123' });
    });
  });

  describe('processScrapeJob', () => {
    it('يعالج مهمة الكشط بنجاح', async () => {
      const jobData = {
        url: 'https://example.com/product',
        merchantId: 'merchant-123',
        type: 'product',
      };

      // محاكاة معالجة مهمة الكشط
      const processResult = await (scrapeQueue as any).processScrapeJob(
        jobData,
      );

      expect(processResult).toBeDefined();
    });
  });
});

describe('ProductSetupConfigService', () => {
  let configService: ProductSetupConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductSetupConfigService],
    }).compile();

    configService = module.get<ProductSetupConfigService>(
      ProductSetupConfigService,
    );
  });

  describe('getDefaultConfig', () => {
    it('يعيد إعدادات افتراضية للمنتج', () => {
      const config = (configService as any).getDefaultConfig();

      expect(config).toEqual({
        autoSku: true,
        defaultStock: 0,
        enableVariants: true,
        enableSeo: true,
        enableAnalytics: true,
        defaultCategory: null,
        priceValidation: {
          min: 0,
          max: 1000000,
        },
        stockValidation: {
          min: 0,
          max: 999999,
        },
      });
    });
  });

  describe('validateProductData', () => {
    it('يتحقق من صحة بيانات المنتج', () => {
      const productData = {
        name: 'منتج صحيح',
        price: 100,
        stock: 50,
      };

      const result = (configService as any).validateProductData(productData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('يرجع أخطاء للبيانات غير الصحيحة', () => {
      const productData = {
        name: '',
        price: -10,
        stock: 'invalid',
      };

      const result = (configService as any).validateProductData(productData);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
