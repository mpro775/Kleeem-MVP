import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { VectorService } from '../vector/vector.service';
import { Product } from './schemas/product.schema';
import { Storefront } from '../storefront/schemas/storefront.schema';
import { Category } from '../categories/schemas/category.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductNotFoundError, OutOfStockError } from '../../common';

describe('ProductsService', () => {
  let service: ProductsService;
  let productModel: jest.Mocked<any>;
  let storefrontModel: jest.Mocked<any>;
  let categoryModel: jest.Mocked<any>;
  let vectorService: jest.Mocked<VectorService>;

  const mockProduct = {
    _id: 'product123',
    merchantId: 'merchant456',
    name: 'Test Product',
    description: 'Test Description',
    price: 100,
    quantity: 10,
    status: 'active',
    isAvailable: true,
    category: 'category123',
    images: [],
    attributes: [],
    keywords: ['test', 'product'],
    save: jest.fn(),
    toObject: jest.fn(),
    toJSON: jest.fn(),
  };

  const mockStorefront = {
    _id: 'storefront123',
    merchantId: 'merchant456',
    slug: 'test-store',
    domain: 'test-store.com',
  };

  const mockCategory = {
    _id: 'category123',
    name: 'Test Category',
    merchantId: 'merchant456',
  };

  beforeEach(async () => {
    const mockProductModel = {
      create: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
      findOne: jest.fn(),
      countDocuments: jest.fn(),
      aggregate: jest.fn(),
      sort: jest.fn(),
      limit: jest.fn(),
      skip: jest.fn(),
      exec: jest.fn(),
      lean: jest.fn(),
    };

    const mockStorefrontModel = {
      findOne: jest.fn(),
    };

    const mockCategoryModel = {
      findById: jest.fn(),
    };

    const mockVectorService = {
      upsertProducts: jest.fn(),
      deleteProductPoint: jest.fn(),
      searchProducts: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: getModelToken(Product.name), useValue: mockProductModel },
        {
          provide: getModelToken(Storefront.name),
          useValue: mockStorefrontModel,
        },
        { provide: getModelToken(Category.name), useValue: mockCategoryModel },
        { provide: VectorService, useValue: mockVectorService },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    productModel = module.get(getModelToken(Product.name));
    storefrontModel = module.get(getModelToken(Storefront.name));
    categoryModel = module.get(getModelToken(Category.name));
    vectorService = module.get(VectorService);

    jest.clearAllMocks();
    mockProduct.save.mockResolvedValue(mockProduct);
    mockProduct.toObject.mockReturnValue(mockProduct);
    mockProduct.toJSON.mockReturnValue(mockProduct);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createProductDto: CreateProductDto = {
      merchantId: 'merchant456',
      name: 'Test Product',
      description: 'Test Description',
      price: 100,
      quantity: 10,
      category: 'category123',
      images: [],
      attributes: [],
      keywords: ['test', 'product'],
    };

    it('should create a product successfully', async () => {
      productModel.create.mockResolvedValue(mockProduct);
      storefrontModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockStorefront),
      });
      categoryModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockCategory),
      });
      vectorService.upsertProducts.mockResolvedValue(undefined);

      const result = await service.create(createProductDto);

      expect(productModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...createProductDto,
          status: 'active',
          isAvailable: true,
        }),
      );
      expect(vectorService.upsertProducts).toHaveBeenCalled();
      expect(result).toEqual(mockProduct);
    });

    it('should handle vector service errors gracefully', async () => {
      productModel.create.mockResolvedValue(mockProduct);
      storefrontModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockStorefront),
      });
      categoryModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockCategory),
      });
      vectorService.upsertProducts.mockRejectedValue(
        new Error('Vector service error'),
      );

      // Should still create product even if vector indexing fails
      const result = await service.create(createProductDto);

      expect(result).toEqual(mockProduct);
    });

    it('should set default values correctly', async () => {
      const minimalDto = {
        merchantId: 'merchant456',
        name: 'Test Product',
        price: 100,
      };

      productModel.create.mockResolvedValue(mockProduct);
      storefrontModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockStorefront),
      });

      await service.create(minimalDto as CreateProductDto);

      expect(productModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'active',
          isAvailable: true,
          quantity: 0,
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated products', async () => {
      const mockProducts = [mockProduct];

      productModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockProducts),
              }),
            }),
          }),
        }),
      });

      productModel.countDocuments.mockResolvedValue(1);

      const result = await service.findAll({}, 1, 10);

      expect(result).toEqual({
        products: mockProducts,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should apply filters correctly', async () => {
      const filters = {
        merchantId: 'merchant456',
        status: 'active',
        isAvailable: true,
      };

      productModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      });

      productModel.countDocuments.mockResolvedValue(0);

      await service.findAll(filters);

      expect(productModel.find).toHaveBeenCalledWith(filters);
    });
  });

  describe('findOne', () => {
    it('should return a product by ID', async () => {
      productModel.findById.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockProduct),
        }),
      });

      const result = await service.findOne('product123');

      expect(productModel.findById).toHaveBeenCalledWith('product123');
      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException for non-existent product', async () => {
      productModel.findById.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        ProductNotFoundError,
      );
    });
  });

  describe('update', () => {
    const updateProductDto: UpdateProductDto = {
      name: 'Updated Product',
      price: 150,
    };

    it('should update a product successfully', async () => {
      const updatedProduct = { ...mockProduct, ...updateProductDto };

      productModel.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(updatedProduct),
        }),
      });

      storefrontModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockStorefront),
      });

      categoryModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockCategory),
      });

      vectorService.upsertProducts.mockResolvedValue(undefined);

      const result = await service.update('product123', updateProductDto);

      expect(productModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'product123',
        updateProductDto,
        { new: true },
      );
      expect(vectorService.upsertProducts).toHaveBeenCalled();
      expect(result).toEqual(updatedProduct);
    });

    it('should throw NotFoundException for non-existent product', async () => {
      productModel.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(
        service.update('nonexistent', updateProductDto),
      ).rejects.toThrow(ProductNotFoundError);
    });
  });

  describe('remove', () => {
    it('should delete a product successfully', async () => {
      productModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProduct),
      });

      vectorService.deleteProductPoint.mockResolvedValue(undefined);

      const result = await service.remove('product123');

      expect(productModel.findByIdAndDelete).toHaveBeenCalledWith('product123');
      expect(vectorService.deleteProductPoint).toHaveBeenCalledWith(
        'product123',
      );
      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException for non-existent product', async () => {
      productModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.remove('nonexistent')).rejects.toThrow(
        ProductNotFoundError,
      );
    });
  });

  describe('search', () => {
    it('should perform vector search successfully', async () => {
      const mockSearchResults = [
        { payload: { productId: 'product123' }, score: 0.9 },
      ];

      vectorService.searchProducts.mockResolvedValue(mockSearchResults);
      productModel.find.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([mockProduct]),
        }),
      });

      const result = await service.search('test query', 'merchant456');

      expect(vectorService.searchProducts).toHaveBeenCalledWith(
        'test query',
        'merchant456',
        expect.any(Number),
      );
      expect(result).toEqual([mockProduct]);
    });

    it('should handle empty search results', async () => {
      vectorService.searchProducts.mockResolvedValue([]);

      const result = await service.search('no results', 'merchant456');

      expect(result).toEqual([]);
    });
  });

  describe('checkStock', () => {
    it('should return true for available product with sufficient stock', async () => {
      const productWithStock = {
        ...mockProduct,
        quantity: 5,
        isAvailable: true,
      };

      productModel.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(productWithStock),
          }),
        }),
      });

      const result = await service.checkStock('product123', 3);

      expect(result).toBe(true);
    });

    it('should throw OutOfStockError for insufficient stock', async () => {
      const productWithLowStock = {
        ...mockProduct,
        quantity: 1,
        isAvailable: true,
      };

      productModel.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(productWithLowStock),
          }),
        }),
      });

      await expect(service.checkStock('product123', 5)).rejects.toThrow(
        OutOfStockError,
      );
    });

    it('should throw BadRequestException for unavailable product', async () => {
      const unavailableProduct = { ...mockProduct, isAvailable: false };

      productModel.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(unavailableProduct),
          }),
        }),
      });

      await expect(service.checkStock('product123', 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ProductNotFoundError for non-existent product', async () => {
      productModel.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(null),
          }),
        }),
      });

      await expect(service.checkStock('nonexistent', 1)).rejects.toThrow(
        ProductNotFoundError,
      );
    });
  });

  describe('updateStock', () => {
    it('should update stock quantity successfully', async () => {
      const updatedProduct = { ...mockProduct, quantity: 8 };

      productModel.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(updatedProduct),
        }),
      });

      const result = await service.updateStock('product123', -2);

      expect(productModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'product123',
        { $inc: { quantity: -2 } },
        { new: true },
      );
      expect(result).toEqual(updatedProduct);
    });

    it('should throw ProductNotFoundError for non-existent product', async () => {
      productModel.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(service.updateStock('nonexistent', 1)).rejects.toThrow(
        ProductNotFoundError,
      );
    });
  });

  describe('getProductsByMerchant', () => {
    it('should return products for specific merchant', async () => {
      const merchantProducts = [mockProduct];

      productModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue(merchantProducts),
              }),
            }),
          }),
        }),
      });

      productModel.countDocuments.mockResolvedValue(1);

      const result = await service.getProductsByMerchant('merchant456');

      expect(productModel.find).toHaveBeenCalledWith({
        merchantId: 'merchant456',
      });
      expect(result.products).toEqual(merchantProducts);
    });
  });
});
