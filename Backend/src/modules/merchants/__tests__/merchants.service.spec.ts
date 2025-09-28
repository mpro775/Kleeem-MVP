import { Test, type TestingModule } from '@nestjs/testing';
import { mockDeep } from 'jest-mock-extended';

import { MerchantsService } from '../merchants.service';

import type { MongoMerchantsRepository } from '../repositories/mongo-merchants.repository';

describe('MerchantsService', () => {
  let service: MerchantsService;
  let repository: jest.Mocked<MongoMerchantsRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MerchantsService,
        {
          provide: 'MerchantsRepository',
          useValue: mockDeep<MongoMerchantsRepository>(),
        },
      ],
    }).compile();

    service = module.get<MerchantsService>(MerchantsService);
    repository = module.get('MerchantsRepository');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should return merchant when found', async () => {
      const mockMerchant = {
        id: '1',
        name: 'Test Merchant',
        email: 'merchant@example.com',
        status: 'active',
      };

      repository.findOne.mockResolvedValue(mockMerchant as any);

      const result = await service.findOne('1');

      expect(result).toEqual(mockMerchant);
      expect(repository.findOne.bind(repository)).toHaveBeenCalledWith('1');
    });

    it('should return null when merchant not found', async () => {
      repository.findOne.mockResolvedValue(null as any);

      const result = await service.findOne('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create and return new merchant', async () => {
      const createMerchantDto = {
        name: 'New Merchant',
        email: 'new@example.com',
        phone: '+1234567890',
        subscription: {
          tier: 'free',
          startDate: new Date(),
          features: ['Basic features'],
        },
        userId: 'user1',
      };

      const mockCreatedMerchant = {
        id: '2',
        ...createMerchantDto,
        status: 'active',
        createdAt: new Date(),
      };

      repository.create.mockResolvedValue(mockCreatedMerchant as any);

      const result = await service.create(createMerchantDto as any);

      expect(result).toEqual(mockCreatedMerchant);
      expect(repository.create.bind(repository)).toHaveBeenCalledWith(
        createMerchantDto,
      );
    });
  });

  describe('update', () => {
    it('should update and return merchant', async () => {
      const updateMerchantDto = {
        name: 'Updated Merchant',
        phone: '+0987654321',
      };

      const mockUpdatedMerchant = {
        id: '1',
        name: 'Updated Merchant',
        email: 'merchant@example.com',
        phone: '+0987654321',
        status: 'active',
      };

      repository.update.mockResolvedValue(mockUpdatedMerchant as any);

      const result = await service.update('1', updateMerchantDto);

      expect(result).toEqual(mockUpdatedMerchant);
      expect(repository.update.bind(repository)).toHaveBeenCalledWith(
        '1',
        updateMerchantDto,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated merchants', async () => {
      const mockMerchants = [
        { id: '1', name: 'Merchant 1', email: 'm1@example.com' },
        { id: '2', name: 'Merchant 2', email: 'm2@example.com' },
      ];

      const mockPaginatedResult = {
        data: mockMerchants,
        total: 2,
        page: 1,
        limit: 10,
      };

      repository.findAll.mockResolvedValue(mockPaginatedResult as any);

      const result = await service.findAll();

      expect(result).toEqual(mockPaginatedResult);
      expect(repository.findAll.bind(repository)).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
      });
    });
  });
});
