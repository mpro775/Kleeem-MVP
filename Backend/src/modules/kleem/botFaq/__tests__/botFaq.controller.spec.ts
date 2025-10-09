import { Test } from '@nestjs/testing';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { TranslationService } from 'src/common/services/translation.service';

import { BotFaqController, BotFaqPublicController } from '../botFaq.controller';
import { BotFaqService } from '../botFaq.service';
import { BOT_FAQ_REPOSITORY } from '../tokens';

import type { BotFaqRepository } from '../repositories/bot-faq.repository';
import type { TestingModule } from '@nestjs/testing';

describe('BotFaqController', () => {
  let controller: BotFaqController;
  let _service: jest.Mocked<BotFaqService>;

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    bulkImport: jest.fn(),
    reindexAll: jest.fn(),
    semanticSearch: jest.fn(),
  } as unknown as jest.Mocked<BotFaqService>;

  const mockRepository: jest.Mocked<BotFaqRepository> = {
    create: jest.fn(),
    findById: jest.fn(),
    updateById: jest.fn(),
    softDelete: jest.fn(),
    findAllActiveSorted: jest.fn(),
    findAllActiveLean: jest.fn(),
    insertMany: jest.fn(),
    updateManyByIds: jest.fn(),
  };

  const mockTranslationService = {
    translate: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BotFaqController, BotFaqPublicController],
      providers: [
        {
          provide: BotFaqService,
          useValue: mockService,
        },
        {
          provide: BOT_FAQ_REPOSITORY,
          useValue: mockRepository,
        },
        {
          provide: TranslationService,
          useValue: mockTranslationService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: jest.fn(() => true),
      })
      .overrideGuard(RolesGuard)
      .useValue({
        canActivate: jest.fn(() => true),
      })
      .compile();

    controller = module.get<BotFaqController>(BotFaqController);
    _service = module.get(BotFaqService);
  });

  describe('POST / (create)', () => {
    it('should create a new FAQ successfully', async () => {
      const createDto = {
        question: 'كيف يمكنني إعادة تعيين كلمة المرور؟',
        answer:
          'يمكنك إعادة تعيين كلمة المرور من خلال النقر على "نسيت كلمة المرور" في صفحة تسجيل الدخول.',
        source: 'manual',
        tags: ['حساب', 'تسجيل دخول'],
        locale: 'ar',
      };

      const expectedResult = {
        _id: '507f1f77bcf86cd799439011' as any,
        ...createDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockService.create.mockResolvedValue(expectedResult as any);

      const result = await controller.create(createDto as any);

      expect(mockService.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(expectedResult);
    });

    it('should create FAQ with minimal data', async () => {
      const createDto = {
        question: 'سؤال بسيط',
        answer: 'إجابة بسيطة',
      };

      const expectedResult = {
        _id: '507f1f77bcf86cd799439012' as any,
        ...createDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockService.create.mockResolvedValue(expectedResult as any);

      const result = await controller.create(createDto);

      expect(mockService.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(expectedResult);
    });

    it('should handle English FAQ creation', async () => {
      const createDto = {
        question: 'How can I reset my password?',
        answer:
          'You can reset your password by clicking on "Forgot Password" on the login page.',
        source: 'manual',
        tags: ['account', 'login'],
        locale: 'en',
      };

      const expectedResult = {
        _id: '507f1f77bcf86cd799439013' as any,
        ...createDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockService.create.mockResolvedValue(expectedResult as any);

      const result = await controller.create(createDto as any);

      expect(mockService.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(expectedResult);
    });

    it('should handle FAQ with all optional fields', async () => {
      const createDto = {
        question: 'سؤال شامل',
        answer:
          'إجابة شاملة مع الكثير من التفاصيل حول هذا الموضوع المهم جداً في النظام',
        source: 'imported',
        tags: ['عام', 'شائع', 'مهم'],
        locale: 'ar',
      };

      const expectedResult = {
        _id: '507f1f77bcf86cd799439014' as any,
        ...createDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockService.create.mockResolvedValue(expectedResult as any);

      const result = await controller.create(createDto as any);

      expect(mockService.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('GET / (list)', () => {
    it('should return all FAQs', async () => {
      const expectedResult = [
        {
          _id: '507f1f77bcf86cd799439011' as any,
          question: 'سؤال الأول',
          answer: 'إجابة الأولى',
        },
        {
          _id: '507f1f77bcf86cd799439012' as any,
          question: 'سؤال الثاني',
          answer: 'إجابة الثانية',
        },
      ];

      mockService.findAll.mockResolvedValue(expectedResult as any);

      const result = await controller.list();

      expect(mockService.findAll).toHaveBeenCalled();
      expect(result).toEqual(expectedResult);
    });

    it('should return empty array when no FAQs exist', async () => {
      mockService.findAll.mockResolvedValue([]);

      const result = await controller.list();

      expect(mockService.findAll).toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should handle large number of FAQs', async () => {
      const expectedResult = Array(1000)
        .fill(null)
        .map((_, index) => ({
          _id: `507f1f77bcf86cd799439${String(index + 11).padStart(3, '0')}` as any,
          question: `سؤال ${index + 1}`,
          answer: `إجابة ${index + 1}`,
        }));

      mockService.findAll.mockResolvedValue(expectedResult as any);

      const result = await controller.list();

      expect(mockService.findAll).toHaveBeenCalled();
      expect(result).toHaveLength(1000);
    });
  });

  describe('PATCH /:id (update)', () => {
    it('should update FAQ successfully', async () => {
      const id = '507f1f77bcf86cd799439011';
      const updateDto = {
        question: 'سؤال محدث',
        answer: 'إجابة محدثة',
      };

      const expectedResult = {
        _id: id as any,
        question: 'سؤال محدث',
        answer: 'إجابة محدثة',
        updatedAt: new Date(),
      };

      mockService.update.mockResolvedValue(expectedResult as any);

      const result = await controller.update(id, updateDto);

      expect(mockService.update).toHaveBeenCalledWith(id, updateDto);
      expect(result).toEqual(expectedResult);
    });

    it('should return null when FAQ not found for update', async () => {
      const id = 'nonexistent_id';
      const updateDto = {
        question: 'سؤال محدث',
      };

      mockService.update.mockResolvedValue(null);

      const result = await controller.update(id, updateDto as any);

      expect(mockService.update).toHaveBeenCalledWith(id, updateDto);
      expect(result).toBeNull();
    });

    it('should handle partial update', async () => {
      const id = '507f1f77bcf86cd799439012';
      const updateDto = {
        answer: 'إجابة محدثة فقط',
      };

      const expectedResult = {
        _id: id as any,
        question: 'سؤال أصلي',
        answer: 'إجابة محدثة فقط',
        updatedAt: new Date(),
      };

      mockService.update.mockResolvedValue(expectedResult as any);

      const result = await controller.update(id, updateDto);

      expect(mockService.update).toHaveBeenCalledWith(id, updateDto);
      expect(result).toEqual(expectedResult);
    });

    it('should handle update with all fields', async () => {
      const id = '507f1f77bcf86cd799439013';
      const updateDto = {
        question: 'سؤال محدث بالكامل',
        answer: 'إجابة محدثة بالكامل',
        source: 'auto',
        tags: ['محدث', 'جديد'],
        locale: 'en',
      };

      const expectedResult = {
        _id: id as any,
        ...updateDto,
        updatedAt: new Date(),
      };

      mockService.update.mockResolvedValue(expectedResult as any);

      const result = await controller.update(id, updateDto as any);

      expect(mockService.update).toHaveBeenCalledWith(id, updateDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('DELETE /:id (delete)', () => {
    it('should delete FAQ successfully', async () => {
      const id = '507f1f77bcf86cd799439011';
      const expectedResult = {
        _id: id as any,
        question: 'سؤال محذوف',
        answer: 'إجابة محذوفة',
        deletedAt: new Date(),
      };

      mockService.delete.mockResolvedValue(expectedResult as any);

      const result = await controller.delete(id);

      expect(mockService.delete).toHaveBeenCalledWith(id);
      expect(result).toEqual(expectedResult);
    });

    it('should return null when FAQ not found for deletion', async () => {
      const id = 'nonexistent_id';

      mockService.delete.mockResolvedValue(null);

      const result = await controller.delete(id);

      expect(mockService.delete).toHaveBeenCalledWith(id);
      expect(result).toBeNull();
    });

    it('should handle deletion of FAQ with all metadata', async () => {
      const id = '507f1f77bcf86cd799439012';
      const expectedResult = {
        _id: id as any,
        question: 'سؤال مع بيانات كاملة',
        answer: 'إجابة مع بيانات كاملة',
        source: 'manual',
        tags: ['حساب', 'مساعدة'],
        locale: 'ar',
        deletedAt: new Date(),
      };

      mockService.delete.mockResolvedValue(expectedResult as any);

      const result = await controller.delete(id);

      expect(mockService.delete).toHaveBeenCalledWith(id);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('POST /import (bulk import)', () => {
    it('should import multiple FAQs successfully', async () => {
      const bulkImportDto = {
        items: [
          {
            question: 'سؤال الأول',
            answer: 'إجابة الأولى',
          },
          {
            question: 'سؤال الثاني',
            answer: 'إجابة الثانية',
          },
        ],
      };

      mockService.bulkImport.mockResolvedValue({ inserted: 2 });

      const result = await controller.bulk(bulkImportDto as any);

      expect(mockService.bulkImport).toHaveBeenCalledWith(bulkImportDto);
      expect(result).toEqual({ inserted: 2 });
    });

    it('should handle single item import', async () => {
      const bulkImportDto = {
        items: [
          {
            question: 'سؤال واحد فقط',
            answer: 'إجابة واحدة فقط',
          },
        ],
      };

      mockService.bulkImport.mockResolvedValue({ inserted: 1 });

      const result = await controller.bulk(bulkImportDto);

      expect(mockService.bulkImport).toHaveBeenCalledWith(bulkImportDto);
      expect(result).toEqual({ inserted: 1 });
    });

    it('should handle import with all optional fields', async () => {
      const bulkImportDto = {
        items: [
          {
            question: 'سؤال كامل',
            answer: 'إجابة كاملة',
            source: 'imported',
            tags: ['مستورد', 'جديد'],
            locale: 'ar',
          },
        ],
      };

      mockService.bulkImport.mockResolvedValue({ inserted: 1 });

      const result = await controller.bulk(bulkImportDto as any);

      expect(mockService.bulkImport).toHaveBeenCalledWith(bulkImportDto);
      expect(result).toEqual({ inserted: 1 });
    });

    it('should handle import with mixed languages', async () => {
      const bulkImportDto = {
        items: [
          {
            question: 'سؤال باللغة العربية',
            answer: 'إجابة باللغة العربية',
            locale: 'ar',
          },
          {
            question: 'Question in English',
            answer: 'Answer in English',
            locale: 'en',
          },
        ],
      };

      mockService.bulkImport.mockResolvedValue({ inserted: 2 });

      const result = await controller.bulk(bulkImportDto as any);

      expect(mockService.bulkImport).toHaveBeenCalledWith(bulkImportDto);
      expect(result).toEqual({ inserted: 2 });
    });

    it('should handle import with different sources', async () => {
      const bulkImportDto = {
        items: [
          {
            question: 'سؤال من مصدر يدوي',
            answer: 'إجابة من مصدر يدوي',
            source: 'manual',
          },
          {
            question: 'سؤال من مصدر تلقائي',
            answer: 'إجابة من مصدر تلقائي',
            source: 'auto',
          },
          {
            question: 'سؤال من مصدر مستورد',
            answer: 'إجابة من مصدر مستورد',
            source: 'imported',
          },
        ],
      };

      mockService.bulkImport.mockResolvedValue({ inserted: 3 });

      const result = await controller.bulk(bulkImportDto as any);

      expect(mockService.bulkImport).toHaveBeenCalledWith(bulkImportDto);
      expect(result).toEqual({ inserted: 3 });
    });

    it('should handle import with tags', async () => {
      const bulkImportDto = {
        items: [
          {
            question: 'سؤال مع وسوم متعددة',
            answer: 'إجابة مع وسوم متعددة',
            tags: ['عام', 'شائع', 'مهم', 'أساسي'],
          },
        ],
      };

      mockService.bulkImport.mockResolvedValue({ inserted: 1 });

      const result = await controller.bulk(bulkImportDto);

      expect(mockService.bulkImport).toHaveBeenCalledWith(bulkImportDto);
      expect(result).toEqual({ inserted: 1 });
    });

    it('should handle import with empty tags array', async () => {
      const bulkImportDto = {
        items: [
          {
            question: 'سؤال بدون وسوم',
            answer: 'إجابة بدون وسوم',
            tags: [],
          },
        ],
      };

      mockService.bulkImport.mockResolvedValue({ inserted: 1 });

      const result = await controller.bulk(bulkImportDto);

      expect(mockService.bulkImport).toHaveBeenCalledWith(bulkImportDto);
      expect(result).toEqual({ inserted: 1 });
    });

    it('should handle import with maximum allowed items', async () => {
      const bulkImportDto = {
        items: Array(500).fill({
          question: 'سؤال قصير',
          answer: 'إجابة قصيرة',
        }),
      };

      mockService.bulkImport.mockResolvedValue({ inserted: 500 });

      const result = await controller.bulk(bulkImportDto);

      expect(mockService.bulkImport).toHaveBeenCalledWith(bulkImportDto);
      expect(result).toEqual({ inserted: 500 });
    });
  });

  describe('POST /import/file (bulk file import)', () => {
    it('should import FAQs from file successfully', async () => {
      const fileContent = JSON.stringify([
        {
          question: 'سؤال من الملف',
          answer: 'إجابة من الملف',
        },
        {
          question: 'سؤال آخر من الملف',
          answer: 'إجابة أخرى من الملف',
        },
      ]);

      const mockFile = {
        buffer: Buffer.from(fileContent, 'utf8'),
      } as Express.Multer.File;

      mockService.bulkImport.mockResolvedValue({ inserted: 2 });

      const result = await controller.bulkFile(mockFile);

      expect(mockService.bulkImport).toHaveBeenCalledWith({
        items: JSON.parse(fileContent),
      });
      expect(result).toEqual({ inserted: 2 });
    });

    it('should handle file with single FAQ', async () => {
      const fileContent = JSON.stringify([
        {
          question: 'سؤال واحد من الملف',
          answer: 'إجابة واحدة من الملف',
        },
      ]);

      const mockFile = {
        buffer: Buffer.from(fileContent, 'utf8'),
      } as Express.Multer.File;

      mockService.bulkImport.mockResolvedValue({ inserted: 1 });

      const result = await controller.bulkFile(mockFile);

      expect(mockService.bulkImport).toHaveBeenCalledWith({
        items: JSON.parse(fileContent),
      });
      expect(result).toEqual({ inserted: 1 });
    });

    it('should handle empty file', async () => {
      const fileContent = '[]';
      const mockFile = {
        buffer: Buffer.from(fileContent, 'utf8'),
      } as Express.Multer.File;

      mockService.bulkImport.mockResolvedValue({ inserted: 0 });

      const result = await controller.bulkFile(mockFile);

      expect(mockService.bulkImport).toHaveBeenCalledWith({
        items: [],
      });
      expect(result).toEqual({ inserted: 0 });
    });

    it('should handle file with complex FAQ data', async () => {
      const fileContent = JSON.stringify([
        {
          question: 'سؤال معقد من الملف',
          answer:
            'إجابة معقدة من الملف مع تفاصيل كثيرة جداً ومحتوى طويل يشرح الموضوع بالتفصيل الكامل',
          source: 'imported',
          tags: ['معقد', 'مفصل', 'شامل'],
          locale: 'ar',
        },
      ]);

      const mockFile = {
        buffer: Buffer.from(fileContent, 'utf8'),
      } as Express.Multer.File;

      mockService.bulkImport.mockResolvedValue({ inserted: 1 });

      const result = await controller.bulkFile(mockFile);

      expect(mockService.bulkImport).toHaveBeenCalledWith({
        items: JSON.parse(fileContent),
      });
      expect(result).toEqual({ inserted: 1 });
    });

    it('should handle file with missing buffer', async () => {
      const mockFile = {} as Express.Multer.File;

      mockService.bulkImport.mockResolvedValue({ inserted: 0 });

      const result = await controller.bulkFile(mockFile);

      expect(mockService.bulkImport).toHaveBeenCalledWith({
        items: [],
      });
      expect(result).toEqual({ inserted: 0 });
    });

    it('should handle invalid JSON in file', async () => {
      const fileContent = 'invalid json content';
      const mockFile = {
        buffer: Buffer.from(fileContent, 'utf8'),
      } as Express.Multer.File;

      // يجب أن يرمي خطأ
      await expect(controller.bulkFile(mockFile)).rejects.toThrow();
    });

    it('should handle file with non-array content', async () => {
      const fileContent = JSON.stringify({
        question: 'سؤال',
        answer: 'إجابة',
      });

      const mockFile = {
        buffer: Buffer.from(fileContent, 'utf8'),
      } as Express.Multer.File;

      // يجب أن يرمي خطأ
      await expect(controller.bulkFile(mockFile)).rejects.toThrow();
    });
  });

  describe('POST /reindex (reindex all)', () => {
    it('should reindex all FAQs successfully', async () => {
      const expectedResult = { count: 150 };

      mockService.reindexAll.mockResolvedValue(expectedResult);

      const result = await controller.reindex();

      expect(mockService.reindexAll).toHaveBeenCalled();
      expect(result).toEqual(expectedResult);
    });

    it('should handle reindex with zero FAQs', async () => {
      const expectedResult = { count: 0 };

      mockService.reindexAll.mockResolvedValue(expectedResult);

      const result = await controller.reindex();

      expect(mockService.reindexAll).toHaveBeenCalled();
      expect(result).toEqual(expectedResult);
    });

    it('should handle reindex with large number of FAQs', async () => {
      const expectedResult = { count: 10000 };

      mockService.reindexAll.mockResolvedValue(expectedResult);

      const result = await controller.reindex();

      expect(mockService.reindexAll).toHaveBeenCalled();
      expect(result).toEqual(expectedResult);
    });
  });
});

describe('BotFaqPublicController', () => {
  let controller: BotFaqPublicController;
  let service: jest.Mocked<BotFaqService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BotFaqPublicController],
      providers: [
        {
          provide: BotFaqService,
          useValue: {
            semanticSearch: jest.fn(),
          } as any,
        },
      ],
    }).compile();

    controller = module.get<BotFaqPublicController>(BotFaqPublicController);
    service = module.get(BotFaqService);
  });

  describe('GET /semantic-search', () => {
    it('should perform semantic search with query', async () => {
      const query = 'كيفية إعادة تعيين كلمة المرور';
      const topK = '5';

      const expectedResult = [
        {
          question: 'كيف يمكنني إعادة تعيين كلمة المرور؟',
          answer:
            'يمكنك إعادة تعيين كلمة المرور من خلال النقر على "نسيت كلمة المرور" في صفحة تسجيل الدخول.',
          score: 0.95,
        },
        {
          question: 'ما هي خطوات استعادة الحساب؟',
          answer:
            'لاستعادة الحساب، اتبع الخطوات التالية: 1. اذهب إلى صفحة تسجيل الدخول، 2. انقر على "نسيت كلمة المرور"...',
          score: 0.87,
        },
      ];

      service.semanticSearch.mockResolvedValue(expectedResult as any);

      const result = await controller.semanticSearch(query, topK);

      expect(service.semanticSearch).toHaveBeenCalledWith(query, 5);
      expect(result).toEqual(expectedResult);
    });

    it('should perform semantic search with default topK', async () => {
      const query = 'كيفية استخدام النظام';

      const expectedResult = [
        {
          question: 'دليل استخدام النظام',
          answer: 'لاستخدام النظام بشكل فعال، اتبع هذا الدليل المفصل...',
          score: 0.92,
        },
      ];

      service.semanticSearch.mockResolvedValue(expectedResult as any);

      const result = await controller.semanticSearch(query, undefined);

      expect(service.semanticSearch).toHaveBeenCalledWith(query, 5);
      expect(result).toEqual(expectedResult);
    });

    it('should return empty array for empty query', async () => {
      const result = await controller.semanticSearch('', '5');

      expect(service.semanticSearch).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should return empty array for whitespace-only query', async () => {
      const result = await controller.semanticSearch('   ', '5');

      expect(service.semanticSearch).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should limit topK to maximum of 20', async () => {
      const query = 'اختبار البحث';
      const topK = '50'; // أكبر من الحد الأقصى

      const expectedResult = [
        {
          question: 'نتيجة البحث الأولى',
          answer: 'محتوى النتيجة الأولى',
          score: 0.9,
        },
      ];

      service.semanticSearch.mockResolvedValue(expectedResult as any);

      const result = await controller.semanticSearch(query, topK);

      expect(service.semanticSearch).toHaveBeenCalledWith(query, 20);
      expect(result).toEqual(expectedResult);
    });

    it('should handle string topK parameter', async () => {
      const query = 'اختبار مع رقم نصي';
      const topK = '3';

      const expectedResult = [
        {
          question: 'نتيجة بحث واحدة',
          answer: 'محتوى النتيجة الوحيدة',
          score: 0.85,
        },
      ];

      service.semanticSearch.mockResolvedValue(expectedResult as any);

      const result = await controller.semanticSearch(query, topK);

      expect(service.semanticSearch).toHaveBeenCalledWith(query, 3);
      expect(result).toEqual(expectedResult);
    });

    it('should handle invalid topK parameter gracefully', async () => {
      const query = 'اختبار مع قيمة غير صحيحة';
      const topK = 'invalid';

      const expectedResult = [
        {
          question: 'نتيجة افتراضية',
          answer: 'محتوى افتراضي',
          score: 0.8,
        },
      ];

      service.semanticSearch.mockResolvedValue(expectedResult as any);

      const result = await controller.semanticSearch(query, topK);

      // يجب أن يستخدم القيمة الافتراضية 5
      expect(service.semanticSearch).toHaveBeenCalledWith(query, 5);
      expect(result).toEqual(expectedResult);
    });

    it('should handle semantic search with Arabic query', async () => {
      const query = 'كيفية إنشاء حساب جديد في النظام';

      const expectedResult = [
        {
          question: 'خطوات إنشاء حساب جديد',
          answer:
            'لإنشاء حساب جديد، اتبع الخطوات التالية: 1. اذهب إلى صفحة التسجيل، 2. أدخل بياناتك...',
          score: 0.96,
        },
      ];

      service.semanticSearch.mockResolvedValue(expectedResult as any);

      const result = await controller.semanticSearch(query, '1');

      expect(service.semanticSearch).toHaveBeenCalledWith(query, 1);
      expect(result).toEqual(expectedResult);
    });

    it('should handle semantic search with English query', async () => {
      const query = 'How to create a new account in the system';

      const expectedResult = [
        {
          question: 'Steps to create a new account',
          answer:
            'To create a new account, follow these steps: 1. Go to the registration page, 2. Enter your information...',
          score: 0.94,
        },
      ];

      service.semanticSearch.mockResolvedValue(expectedResult as any);

      const result = await controller.semanticSearch(query, '1');

      expect(service.semanticSearch).toHaveBeenCalledWith(query, 1);
      expect(result).toEqual(expectedResult);
    });

    it('should handle semantic search with mixed language query', async () => {
      const query = 'كيف أستخدم API في النظام؟';

      const expectedResult = [
        {
          question: 'دليل استخدام API',
          answer:
            'لاستخدام API، تحتاج إلى مفتاح API صالح وقراءة التوثيق الفني المتوفر...',
          score: 0.91,
        },
      ];

      service.semanticSearch.mockResolvedValue(expectedResult as any);

      const result = await controller.semanticSearch(query, '1');

      expect(service.semanticSearch).toHaveBeenCalledWith(query, 1);
      expect(result).toEqual(expectedResult);
    });

    it('should handle semantic search with very short query', async () => {
      const query = 'API';

      const expectedResult = [
        {
          question: 'ما هو API؟',
          answer:
            'API هو واجهة برمجة التطبيقات التي تسمح للتطبيقات بالتواصل مع بعضها البعض.',
          score: 0.88,
        },
      ];

      service.semanticSearch.mockResolvedValue(expectedResult as any);

      const result = await controller.semanticSearch(query, '1');

      expect(service.semanticSearch).toHaveBeenCalledWith(query, 1);
      expect(result).toEqual(expectedResult);
    });

    it('should handle semantic search with long detailed query', async () => {
      const query =
        'أريد أن أتعلم كيفية استخدام جميع ميزات النظام بالتفصيل الكامل مع أمثلة عملية وتفسيرات واضحة لكل خطوة';

      const expectedResult = [
        {
          question: 'دليل المستخدم الشامل للنظام',
          answer:
            'هذا الدليل يغطي جميع ميزات النظام بالتفصيل مع أمثلة عملية وشرح واضح لكل خطوة...',
          score: 0.97,
        },
      ];

      service.semanticSearch.mockResolvedValue(expectedResult as any);

      const result = await controller.semanticSearch(query, '1');

      expect(service.semanticSearch).toHaveBeenCalledWith(query, 1);
      expect(result).toEqual(expectedResult);
    });

    it('should handle semantic search with special characters', async () => {
      const query = 'كيف أتعامل مع الرموز الخاصة مثل @#$%^&*()؟';

      const expectedResult = [
        {
          question: 'التعامل مع الرموز الخاصة',
          answer: 'يمكنك استخدام جميع الرموز الخاصة في النظام بدون قيود...',
          score: 0.89,
        },
      ];

      service.semanticSearch.mockResolvedValue(expectedResult as any);

      const result = await controller.semanticSearch(query, '1');

      expect(service.semanticSearch).toHaveBeenCalledWith(query, 1);
      expect(result).toEqual(expectedResult);
    });

    it('should handle semantic search with numbers', async () => {
      const query = 'كيف أتعامل مع الأرقام 123 والرموز $%^ في النظام؟';

      const expectedResult = [
        {
          question: 'التعامل مع الأرقام والرموز في النظام',
          answer:
            'النظام يدعم جميع أنواع المحتوى بما في ذلك الأرقام والرموز الخاصة...',
          score: 0.86,
        },
      ];

      service.semanticSearch.mockResolvedValue(expectedResult as any);

      const result = await controller.semanticSearch(query, '1');

      expect(service.semanticSearch).toHaveBeenCalledWith(query, 1);
      expect(result).toEqual(expectedResult);
    });

    it('should handle semantic search with technical terms', async () => {
      const query = 'كيف أقوم بتكوين قاعدة البيانات والاتصال بالخادم؟';

      const expectedResult = [
        {
          question: 'دليل التكوين الفني',
          answer:
            'للتكوين الفني، اتبع الخطوات التالية لقاعدة البيانات والخادم...',
          score: 0.93,
        },
      ];

      service.semanticSearch.mockResolvedValue(expectedResult as any);

      const result = await controller.semanticSearch(query, '1');

      expect(service.semanticSearch).toHaveBeenCalledWith(query, 1);
      expect(result).toEqual(expectedResult);
    });

    it('should handle semantic search with business terms', async () => {
      const query = 'كيف أدير الحسابات المالية والتقارير المالية في النظام؟';

      const expectedResult = [
        {
          question: 'إدارة الحسابات المالية',
          answer:
            'لإدارة الحسابات المالية والتقارير، استخدم قسم المالية في لوحة التحكم...',
          score: 0.9,
        },
      ];

      service.semanticSearch.mockResolvedValue(expectedResult as any);

      const result = await controller.semanticSearch(query, '1');

      expect(service.semanticSearch).toHaveBeenCalledWith(query, 1);
      expect(result).toEqual(expectedResult);
    });

    it('should handle semantic search with no results', async () => {
      const query = 'موضوع غير موجود في قاعدة البيانات';

      service.semanticSearch.mockResolvedValue([]);

      const result = await controller.semanticSearch(query, '5');

      expect(service.semanticSearch).toHaveBeenCalledWith(query, 5);
      expect(result).toEqual([]);
    });

    it('should handle semantic search with maximum results', async () => {
      const query = 'موضوع شائع جداً';

      const expectedResult = Array(20)
        .fill(null)
        .map((_, index) => ({
          question: `نتيجة البحث ${index + 1}`,
          answer: `محتوى النتيجة ${index + 1}`,
          score: 0.95 - index * 0.01, // تنازلي في النتيجة
        }));

      service.semanticSearch.mockResolvedValue(expectedResult as any);

      const result = await controller.semanticSearch(query, '20');

      expect(service.semanticSearch).toHaveBeenCalledWith(query, 20);
      expect(result).toHaveLength(20);
    });

    it('should handle semantic search with minimum results', async () => {
      const query = 'موضوع محدد جداً';

      const expectedResult = [
        {
          question: 'نتيجة بحث واحدة فقط',
          answer: 'محتوى النتيجة الوحيدة المتطابقة تماماً',
          score: 0.99,
        },
      ];

      service.semanticSearch.mockResolvedValue(expectedResult as any);

      const result = await controller.semanticSearch(query, '1');

      expect(service.semanticSearch).toHaveBeenCalledWith(query, 1);
      expect(result).toHaveLength(1);
    });
  });
});
