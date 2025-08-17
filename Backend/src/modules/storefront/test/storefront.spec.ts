// src/modules/storefront/test/storefront.spec.ts
// اختبارات شاملة لوحدة Storefront: Controller + Service
// تغطي إدارة واجهات المتاجر، التخصيص، والإعدادات
/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { NotFoundException, BadRequestException } from '@nestjs/common';

import { StorefrontController } from '../storefront.controller';
import { StorefrontService } from '../storefront.service';

// Mock للموديلات
const mockStorefrontModel = mockDeep<Model<any>>();
const mockMerchantModel = mockDeep<Model<any>>();

describe('StorefrontService', () => {
  let service: StorefrontService;

  const mockStorefrontId = new Types.ObjectId().toHexString();
  const mockMerchantId = new Types.ObjectId().toHexString();

  const mockStorefront = {
    _id: mockStorefrontId,
    merchantId: mockMerchantId,
    domain: 'mystore.example.com',
    subdomain: 'mystore',
    isActive: true,
    theme: {
      name: 'modern',
      primaryColor: '#007bff',
      secondaryColor: '#6c757d',
      fontFamily: 'Arial, sans-serif',
      layout: 'grid',
      headerStyle: 'minimal',
      footerStyle: 'expanded',
    },
    branding: {
      logo: 'https://example.com/logo.png',
      favicon: 'https://example.com/favicon.ico',
      businessName: 'متجر تجريبي',
      tagline: 'أفضل المنتجات بأفضل الأسعار',
      description: 'متجر إلكتروني متخصص في بيع المنتجات عالية الجودة',
    },
    pages: {
      home: {
        title: 'الصفحة الرئيسية',
        content: 'مرحباً بكم في متجرنا',
        seo: {
          metaTitle: 'متجر تجريبي - الصفحة الرئيسية',
          metaDescription: 'أفضل متجر إلكتروني',
          keywords: ['متجر', 'تسوق', 'منتجات'],
        },
      },
      about: {
        title: 'من نحن',
        content: 'نحن متجر متخصص...',
        isEnabled: true,
      },
      contact: {
        title: 'اتصل بنا',
        content: 'للتواصل معنا...',
        isEnabled: true,
        contactInfo: {
          email: 'info@mystore.com',
          phone: '+966501234567',
          address: 'الرياض، السعودية',
        },
      },
      privacy: {
        title: 'سياسة الخصوصية',
        content: 'سياسة الخصوصية...',
        isEnabled: true,
      },
      terms: {
        title: 'الشروط والأحكام',
        content: 'الشروط والأحكام...',
        isEnabled: true,
      },
    },
    settings: {
      currency: 'SAR',
      language: 'ar',
      timezone: 'Asia/Riyadh',
      enableSearch: true,
      enableWishlist: true,
      enableReviews: true,
      enableChat: true,
      socialMedia: {
        facebook: 'https://facebook.com/mystore',
        twitter: 'https://twitter.com/mystore',
        instagram: 'https://instagram.com/mystore',
        whatsapp: '+966501234567',
      },
      paymentMethods: ['card', 'cash', 'wallet'],
      shippingMethods: ['standard', 'express', 'pickup'],
    },
    seo: {
      globalMetaTitle: 'متجر تجريبي',
      globalMetaDescription: 'أفضل متجر إلكتروني في السعودية',
      globalKeywords: ['متجر', 'تسوق', 'السعودية'],
      googleAnalytics: 'GA-XXXXXXXX',
      facebookPixel: 'FB-XXXXXXXX',
      customHead: '<meta name="author" content="MyStore">',
    },
    customization: {
      headerMenu: [
        { name: 'الرئيسية', url: '/', isActive: true },
        { name: 'المنتجات', url: '/products', isActive: true },
        { name: 'من نحن', url: '/about', isActive: true },
      ],
      footerMenu: [
        { name: 'سياسة الخصوصية', url: '/privacy', isActive: true },
        { name: 'الشروط والأحكام', url: '/terms', isActive: true },
      ],
      banners: [
        {
          id: 'banner1',
          title: 'عرض خاص',
          description: 'خصم 50% على جميع المنتجات',
          image: 'https://example.com/banner1.jpg',
          link: '/products',
          isActive: true,
          position: 'hero',
        },
      ],
      widgets: [
        {
          id: 'widget1',
          type: 'featured_products',
          title: 'المنتجات المميزة',
          position: 'sidebar',
          isActive: true,
          settings: { limit: 5 },
        },
      ],
    },
    analytics: {
      visitors: 1250,
      pageViews: 5000,
      orders: 45,
      revenue: 22500,
      conversionRate: 3.6,
      lastUpdated: new Date('2023-01-01T12:00:00.000Z'),
    },
    createdAt: new Date('2023-01-01T12:00:00.000Z'),
    updatedAt: new Date('2023-01-01T12:00:00.000Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorefrontService,
        { provide: getModelToken('Storefront'), useValue: mockStorefrontModel },
        { provide: getModelToken('Merchant'), useValue: mockMerchantModel },
      ],
    }).compile();

    service = module.get<StorefrontService>(StorefrontService);
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('create', () => {
    const createStorefrontDto = {
      merchantId: mockMerchantId,
      domain: 'newstore.example.com',
      subdomain: 'newstore',
      theme: {
        name: 'classic',
        primaryColor: '#28a745',
        secondaryColor: '#6c757d',
      },
      branding: {
        businessName: 'متجر جديد',
        tagline: 'متجر عصري',
      },
    };

    it('ينشئ واجهة متجر جديدة بنجاح', async () => {
      mockStorefrontModel.create.mockResolvedValue(mockStorefront as any);

      const result = await service.create(createStorefrontDto as any);

      expect(mockStorefrontModel.create).toHaveBeenCalledWith(
        createStorefrontDto,
      );
      expect(result).toEqual(mockStorefront);
    });

    it('يرمي خطأ عند فشل إنشاء واجهة المتجر', async () => {
      const error = new Error('Database error');
      mockStorefrontModel.create.mockRejectedValue(error);

      await expect(service.create(createStorefrontDto as any)).rejects.toThrow(
        error,
      );
    });

    it('ينشئ واجهة متجر بإعدادات افتراضية', async () => {
      const minimalDto = {
        merchantId: mockMerchantId,
        subdomain: 'minimal',
      };

      const storefrontWithDefaults = {
        ...mockStorefront,
        ...minimalDto,
        theme: {
          name: 'default',
          primaryColor: '#007bff',
          secondaryColor: '#6c757d',
        },
      };

      mockStorefrontModel.create.mockResolvedValue(
        storefrontWithDefaults as any,
      );

      const result = await service.create(minimalDto as any);

      expect(result).toEqual(storefrontWithDefaults);
    });
  });

  describe('findAll', () => {
    it('يسترجع جميع واجهات المتاجر', async () => {
      const mockStorefronts = [
        mockStorefront,
        { ...mockStorefront, _id: 'storefront2' },
      ];

      const populateMock = jest.fn().mockReturnThis();
      const sortMock = jest.fn().mockReturnThis();
      const execMock = jest.fn().mockResolvedValue(mockStorefronts);

      (mockStorefrontModel.find as jest.Mock).mockReturnValue({
        populate: populateMock,
        sort: sortMock,
        exec: execMock,
      });

      const result = await service.findAll();

      expect(mockStorefrontModel.find).toHaveBeenCalledWith({});
      expect(populateMock).toHaveBeenCalledWith('merchantId');
      expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toEqual(mockStorefronts);
    });

    it('يطبق فلاتر البحث', async () => {
      const filters = {
        merchantId: mockMerchantId,
        isActive: true,
        domain: 'example.com',
      };

      const populateMock = jest.fn().mockReturnThis();
      const sortMock = jest.fn().mockReturnThis();
      const execMock = jest.fn().mockResolvedValue([mockStorefront]);

      (mockStorefrontModel.find as jest.Mock).mockReturnValue({
        populate: populateMock,
        sort: sortMock,
        exec: execMock,
      });

      const result = await service.findAll(filters);

      expect(mockStorefrontModel.find).toHaveBeenCalledWith(filters);
      expect(result).toEqual([mockStorefront]);
    });
  });

  describe('findOne', () => {
    it('يسترجع واجهة متجر محددة بنجاح', async () => {
      const populateMock = jest.fn().mockReturnThis();
      const execMock = jest.fn().mockResolvedValue(mockStorefront);

      (mockStorefrontModel.findById as jest.Mock).mockReturnValue({
        populate: populateMock,
        exec: execMock,
      });

      const result = await service.findOne(mockStorefrontId);

      expect(mockStorefrontModel.findById).toHaveBeenCalledWith(
        mockStorefrontId,
      );
      expect(populateMock).toHaveBeenCalledWith('merchantId');
      expect(result).toEqual(mockStorefront);
    });

    it('يرمي NotFoundException عند عدم وجود واجهة المتجر', async () => {
      const populateMock = jest.fn().mockReturnThis();
      const execMock = jest.fn().mockResolvedValue(null);

      (mockStorefrontModel.findById as jest.Mock).mockReturnValue({
        populate: populateMock,
        exec: execMock,
      });

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByMerchant', () => {
    it('يسترجع واجهة متجر بناءً على معرف التاجر', async () => {
      const populateMock = jest.fn().mockReturnThis();
      const execMock = jest.fn().mockResolvedValue(mockStorefront);

      (mockStorefrontModel.findOne as jest.Mock).mockReturnValue({
        populate: populateMock,
        exec: execMock,
      });

      const result = await service.findByMerchant(mockMerchantId);

      expect(mockStorefrontModel.findOne).toHaveBeenCalledWith({
        merchantId: mockMerchantId,
      });
      expect(result).toEqual(mockStorefront);
    });

    it('يعيد null عند عدم وجود واجهة متجر للتاجر', async () => {
      const populateMock = jest.fn().mockReturnThis();
      const execMock = jest.fn().mockResolvedValue(null);

      (mockStorefrontModel.findOne as jest.Mock).mockReturnValue({
        populate: populateMock,
        exec: execMock,
      });

      const result = await service.findByMerchant('unknown-merchant');

      expect(result).toBeNull();
    });
  });

  describe('findByDomain', () => {
    it('يسترجع واجهة متجر بناءً على النطاق', async () => {
      const domain = 'mystore.example.com';
      const populateMock = jest.fn().mockReturnThis();
      const execMock = jest.fn().mockResolvedValue(mockStorefront);

      (mockStorefrontModel.findOne as jest.Mock).mockReturnValue({
        populate: populateMock,
        exec: execMock,
      });

      const result = await service.findByDomain(domain);

      expect(mockStorefrontModel.findOne).toHaveBeenCalledWith({
        $or: [{ domain }, { subdomain: domain }],
      });
      expect(result).toEqual(mockStorefront);
    });
  });

  describe('update', () => {
    const updateData = {
      theme: {
        primaryColor: '#dc3545',
        secondaryColor: '#28a745',
      },
      branding: {
        businessName: 'متجر محدث',
      },
      isActive: false,
    };

    it('يحدث واجهة المتجر بنجاح', async () => {
      const updatedStorefront = { ...mockStorefront, ...updateData };
      mockStorefrontModel.findByIdAndUpdate.mockResolvedValue(
        updatedStorefront as any,
      );

      const result = await service.update(mockStorefrontId, updateData);

      expect(mockStorefrontModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockStorefrontId,
        updateData,
        { new: true, runValidators: true },
      );
      expect(result).toEqual(updatedStorefront);
    });

    it('يرمي NotFoundException عند عدم وجود واجهة المتجر للتحديث', async () => {
      mockStorefrontModel.findByIdAndUpdate.mockResolvedValue(null);

      await expect(
        service.update('nonexistent-id', updateData),
      ).rejects.toThrow(NotFoundException);
    });

    it('يحدث الإعدادات المتداخلة بشكل صحيح', async () => {
      const nestedUpdate = {
        'theme.primaryColor': '#ffc107',
        'settings.currency': 'USD',
        'pages.home.title': 'عنوان جديد',
      };

      const updatedStorefront = { ...mockStorefront };
      mockStorefrontModel.findByIdAndUpdate.mockResolvedValue(
        updatedStorefront as any,
      );

      const result = await service.update(mockStorefrontId, nestedUpdate);

      expect(mockStorefrontModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockStorefrontId,
        nestedUpdate,
        { new: true, runValidators: true },
      );
      expect(result).toEqual(updatedStorefront);
    });
  });

  describe('remove', () => {
    it('يحذف واجهة المتجر بنجاح', async () => {
      mockStorefrontModel.findByIdAndDelete.mockResolvedValue(
        mockStorefront as any,
      );

      const result = await service.remove(mockStorefrontId);

      expect(mockStorefrontModel.findByIdAndDelete).toHaveBeenCalledWith(
        mockStorefrontId,
      );
      expect(result).toEqual({ deleted: true, storefront: mockStorefront });
    });

    it('يرمي NotFoundException عند عدم وجود واجهة المتجر للحذف', async () => {
      mockStorefrontModel.findByIdAndDelete.mockResolvedValue(null);

      await expect(service.remove('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateTheme', () => {
    it('يحدث الثيم بنجاح', async () => {
      const themeUpdate = {
        name: 'dark',
        primaryColor: '#343a40',
        secondaryColor: '#6c757d',
        layout: 'list',
      };

      const updatedStorefront = {
        ...mockStorefront,
        theme: { ...mockStorefront.theme, ...themeUpdate },
      };

      mockStorefrontModel.findByIdAndUpdate.mockResolvedValue(
        updatedStorefront as any,
      );

      const result = await service.updateTheme(mockStorefrontId, themeUpdate);

      expect(mockStorefrontModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockStorefrontId,
        { theme: themeUpdate },
        { new: true },
      );
      expect(result).toEqual(updatedStorefront);
    });
  });

  describe('updateSettings', () => {
    it('يحدث الإعدادات بنجاح', async () => {
      const settingsUpdate = {
        currency: 'EUR',
        language: 'en',
        enableChat: false,
        paymentMethods: ['card', 'paypal'],
      };

      const updatedStorefront = {
        ...mockStorefront,
        settings: { ...mockStorefront.settings, ...settingsUpdate },
      };

      mockStorefrontModel.findByIdAndUpdate.mockResolvedValue(
        updatedStorefront as any,
      );

      const result = await service.updateSettings(
        mockStorefrontId,
        settingsUpdate,
      );

      expect(mockStorefrontModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockStorefrontId,
        { settings: settingsUpdate },
        { new: true },
      );
      expect(result).toEqual(updatedStorefront);
    });
  });

  describe('updateAnalytics', () => {
    it('يحدث الإحصائيات بنجاح', async () => {
      const analyticsUpdate = {
        visitors: 1500,
        pageViews: 6000,
        orders: 50,
        revenue: 25000,
        conversionRate: 3.8,
      };

      const updatedStorefront = {
        ...mockStorefront,
        analytics: { ...mockStorefront.analytics, ...analyticsUpdate },
      };

      mockStorefrontModel.findByIdAndUpdate.mockResolvedValue(
        updatedStorefront as any,
      );

      const result = await service.updateAnalytics(
        mockStorefrontId,
        analyticsUpdate,
      );

      expect(mockStorefrontModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockStorefrontId,
        { analytics: { ...analyticsUpdate, lastUpdated: expect.any(Date) } },
        { new: true },
      );
      expect(result).toEqual(updatedStorefront);
    });
  });

  describe('validateDomain', () => {
    it('يتحقق من صحة النطاق', async () => {
      const domain = 'validstore.example.com';
      mockStorefrontModel.findOne.mockResolvedValue(null);

      const result = await service.validateDomain(domain);

      expect(mockStorefrontModel.findOne).toHaveBeenCalledWith({
        $or: [{ domain }, { subdomain: domain }],
      });
      expect(result).toBe(true);
    });

    it('يرجع false للنطاق المستخدم', async () => {
      const domain = 'used.example.com';
      mockStorefrontModel.findOne.mockResolvedValue(mockStorefront);

      const result = await service.validateDomain(domain);

      expect(result).toBe(false);
    });

    it('يرجع false للنطاق غير الصحيح', async () => {
      const invalidDomain = 'invalid-domain';

      const result = await service.validateDomain(invalidDomain);

      expect(result).toBe(false);
    });
  });
});

describe('StorefrontController', () => {
  let controller: StorefrontController;
  let service: DeepMockProxy<StorefrontService>;
  let moduleRef: TestingModule;

  const mockStorefrontResponse = {
    _id: 'storefront-123',
    merchantId: 'merchant-123',
    domain: 'teststore.example.com',
    subdomain: 'teststore',
    isActive: true,
    theme: {
      name: 'modern',
      primaryColor: '#007bff',
      secondaryColor: '#6c757d',
    },
    branding: {
      businessName: 'متجر تجريبي',
      tagline: 'أفضل المنتجات',
    },
    createdAt: new Date('2023-01-01T12:00:00.000Z'),
  };

  beforeEach(async () => {
    service = mockDeep<StorefrontService>();

    moduleRef = await Test.createTestingModule({
      controllers: [StorefrontController],
      providers: [{ provide: StorefrontService, useValue: service }],
    }).compile();

    controller = moduleRef.get<StorefrontController>(StorefrontController);
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await moduleRef?.close();
    jest.restoreAllMocks();
  });

  describe('create', () => {
    it('ينشئ واجهة متجر جديدة عبر API', async () => {
      const createDto = {
        merchantId: 'merchant-123',
        subdomain: 'apistore',
        theme: { name: 'classic' },
      };

      service.create.mockResolvedValue(mockStorefrontResponse as any);

      const result = await controller.create(createDto as any);

      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockStorefrontResponse);
    });
  });

  describe('findAll', () => {
    it('يسترجع جميع واجهات المتاجر', async () => {
      const storefronts = [
        mockStorefrontResponse,
        { ...mockStorefrontResponse, _id: 'storefront-456' },
      ];

      service.findAll.mockResolvedValue(storefronts as any);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalledWith();
      expect(result).toEqual(storefronts);
    });

    it('يطبق فلاتر البحث', async () => {
      const filters = {
        merchantId: 'merchant-123',
        isActive: 'true',
      };

      service.findAll.mockResolvedValue([mockStorefrontResponse] as any);

      const result = await controller.findAll(
        filters.merchantId,
        filters.isActive,
      );

      expect(service.findAll).toHaveBeenCalledWith({
        merchantId: filters.merchantId,
        isActive: true,
      });
      expect(result).toEqual([mockStorefrontResponse]);
    });
  });

  describe('findOne', () => {
    it('يسترجع واجهة متجر محددة', async () => {
      const storefrontId = 'storefront-123';

      service.findOne.mockResolvedValue(mockStorefrontResponse as any);

      const result = await controller.findOne(storefrontId);

      expect(service.findOne).toHaveBeenCalledWith(storefrontId);
      expect(result).toEqual(mockStorefrontResponse);
    });
  });

  describe('findByMerchant', () => {
    it('يسترجع واجهة متجر بناءً على معرف التاجر', async () => {
      const merchantId = 'merchant-123';

      service.findByMerchant.mockResolvedValue(mockStorefrontResponse as any);

      const result = await controller.findByMerchant(merchantId);

      expect(service.findByMerchant).toHaveBeenCalledWith(merchantId);
      expect(result).toEqual(mockStorefrontResponse);
    });
  });

  describe('findByDomain', () => {
    it('يسترجع واجهة متجر بناءً على النطاق', async () => {
      const domain = 'teststore.example.com';

      service.findByDomain.mockResolvedValue(mockStorefrontResponse as any);

      const result = await controller.findByDomain(domain);

      expect(service.findByDomain).toHaveBeenCalledWith(domain);
      expect(result).toEqual(mockStorefrontResponse);
    });
  });

  describe('update', () => {
    it('يحدث واجهة المتجر بنجاح', async () => {
      const storefrontId = 'storefront-123';
      const updateDto = {
        theme: { primaryColor: '#28a745' },
        isActive: false,
      };

      const updatedStorefront = { ...mockStorefrontResponse, ...updateDto };
      service.update.mockResolvedValue(updatedStorefront as any);

      const result = await controller.update(storefrontId, updateDto as any);

      expect(service.update).toHaveBeenCalledWith(storefrontId, updateDto);
      expect(result).toEqual(updatedStorefront);
    });
  });

  describe('remove', () => {
    it('يحذف واجهة المتجر بنجاح', async () => {
      const storefrontId = 'storefront-123';
      const deleteResult = {
        deleted: true,
        storefront: mockStorefrontResponse,
      };

      service.remove.mockResolvedValue(deleteResult as any);

      const result = await controller.remove(storefrontId);

      expect(service.remove).toHaveBeenCalledWith(storefrontId);
      expect(result).toEqual(deleteResult);
    });
  });

  describe('updateTheme', () => {
    it('يحدث ثيم واجهة المتجر', async () => {
      const storefrontId = 'storefront-123';
      const themeDto = {
        name: 'dark',
        primaryColor: '#343a40',
        layout: 'list',
      };

      const updatedStorefront = {
        ...mockStorefrontResponse,
        theme: { ...mockStorefrontResponse.theme, ...themeDto },
      };

      service.updateTheme.mockResolvedValue(updatedStorefront as any);

      const result = await controller.updateTheme(
        storefrontId,
        themeDto as any,
      );

      expect(service.updateTheme).toHaveBeenCalledWith(storefrontId, themeDto);
      expect(result).toEqual(updatedStorefront);
    });
  });

  describe('updateSettings', () => {
    it('يحدث إعدادات واجهة المتجر', async () => {
      const storefrontId = 'storefront-123';
      const settingsDto = {
        currency: 'USD',
        language: 'en',
        enableChat: false,
      };

      const updatedStorefront = {
        ...mockStorefrontResponse,
        settings: settingsDto,
      };

      service.updateSettings.mockResolvedValue(updatedStorefront as any);

      const result = await controller.updateSettings(
        storefrontId,
        settingsDto as any,
      );

      expect(service.updateSettings).toHaveBeenCalledWith(
        storefrontId,
        settingsDto,
      );
      expect(result).toEqual(updatedStorefront);
    });
  });

  describe('validateDomain', () => {
    it('يتحقق من صحة النطاق', async () => {
      const domain = 'newstore.example.com';

      service.validateDomain.mockResolvedValue(true);

      const result = await controller.validateDomain(domain);

      expect(service.validateDomain).toHaveBeenCalledWith(domain);
      expect(result).toEqual({ valid: true, available: true });
    });

    it('يعيد false للنطاق المستخدم', async () => {
      const domain = 'usedstore.example.com';

      service.validateDomain.mockResolvedValue(false);

      const result = await controller.validateDomain(domain);

      expect(result).toEqual({ valid: false, available: false });
    });
  });

  describe('Integration Tests', () => {
    it('يختبر تدفق كامل: إنشاء → استرجاع → تحديث → حذف', async () => {
      const createDto = {
        merchantId: 'merchant-integration',
        subdomain: 'integration',
      };
      const storefrontId = 'integration-storefront';

      // 1. إنشاء واجهة متجر
      const createdStorefront = { _id: storefrontId, ...createDto };
      service.create.mockResolvedValue(createdStorefront as any);
      const createResult = await controller.create(createDto as any);
      expect(createResult).toEqual(createdStorefront);

      // 2. استرجاع واجهة المتجر
      service.findOne.mockResolvedValue(createdStorefront as any);
      const findResult = await controller.findOne(storefrontId);
      expect(findResult).toEqual(createdStorefront);

      // 3. تحديث الثيم
      const themeUpdate = { primaryColor: '#ff6b6b' };
      const updatedStorefront = {
        ...createdStorefront,
        theme: themeUpdate,
      };
      service.updateTheme.mockResolvedValue(updatedStorefront as any);
      const themeResult = await controller.updateTheme(
        storefrontId,
        themeUpdate as any,
      );
      expect(themeResult).toEqual(updatedStorefront);

      // 4. تحديث الإعدادات
      const settingsUpdate = { currency: 'EUR' };
      const settingsUpdatedStorefront = {
        ...updatedStorefront,
        settings: settingsUpdate,
      };
      service.updateSettings.mockResolvedValue(
        settingsUpdatedStorefront as any,
      );
      const settingsResult = await controller.updateSettings(
        storefrontId,
        settingsUpdate as any,
      );
      expect(settingsResult).toEqual(settingsUpdatedStorefront);

      // 5. حذف واجهة المتجر
      const deleteResult = {
        deleted: true,
        storefront: settingsUpdatedStorefront,
      };
      service.remove.mockResolvedValue(deleteResult as any);
      const removeResult = await controller.remove(storefrontId);
      expect(removeResult).toEqual(deleteResult);

      // التحقق من الاستدعاءات
      expect(service.create).toHaveBeenCalled();
      expect(service.findOne).toHaveBeenCalled();
      expect(service.updateTheme).toHaveBeenCalled();
      expect(service.updateSettings).toHaveBeenCalled();
      expect(service.remove).toHaveBeenCalled();
    });

    it('يختبر سيناريو التحقق من النطاق قبل الإنشاء', async () => {
      const domain = 'checkstore.example.com';
      const createDto = {
        merchantId: 'merchant-check',
        domain,
      };

      // 1. التحقق من توفر النطاق
      service.validateDomain.mockResolvedValue(true);
      const validationResult = await controller.validateDomain(domain);
      expect(validationResult.valid).toBe(true);

      // 2. إنشاء واجهة المتجر بعد التحقق
      const createdStorefront = { _id: 'check-storefront', ...createDto };
      service.create.mockResolvedValue(createdStorefront as any);
      const createResult = await controller.create(createDto as any);
      expect(createResult).toEqual(createdStorefront);

      // التحقق من ترتيب العمليات
      expect(service.validateDomain).toHaveBeenCalledBefore(service.create);
    });
  });
});
