import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, Model, Types } from 'mongoose';
import {
  Integration,
  IntegrationSchema,
  IntegrationDocument,
} from '../schemas/integration.schema';

describe('Integration Schema', () => {
  let mongod: MongoMemoryServer;
  let connection: Connection;
  let integrationModel: Model<IntegrationDocument>;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri),
        MongooseModule.forFeature([
          { name: Integration.name, schema: IntegrationSchema },
        ]),
      ],
    }).compile();

    integrationModel = module.get<Model<IntegrationDocument>>(
      getModelToken(Integration.name),
    );
    connection = module.get<Connection>('DatabaseConnection');
  });

  afterAll(async () => {
    await connection.close();
    await mongod.stop();
  });

  afterEach(async () => {
    await integrationModel.deleteMany({});
  });

  describe('Schema Definition', () => {
    it('should create a valid integration document', async () => {
      const merchantId = new Types.ObjectId();
      const integrationData = {
        merchantId,
        provider: 'salla' as const,
        active: true,
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        tokenType: 'Bearer',
        expiresIn: 3600,
        expiresAt: new Date(Date.now() + 3600 * 1000),
        storeId: 'store-123',
        storeUrl: 'https://test-store.salla.sa',
        scopes: ['read:products', 'write:products'],
        lastSync: new Date(),
      };

      const integration = new integrationModel(integrationData);
      const savedIntegration = await integration.save();

      expect(savedIntegration._id).toBeDefined();
      expect(savedIntegration.merchantId.toString()).toBe(
        merchantId.toString(),
      );
      expect(savedIntegration.provider).toBe('salla');
      expect(savedIntegration.active).toBe(true);
      expect(savedIntegration.accessToken).toBe('test-access-token');
      expect(savedIntegration.refreshToken).toBe('test-refresh-token');
      expect(savedIntegration.tokenType).toBe('Bearer');
      expect(savedIntegration.expiresIn).toBe(3600);
      expect(savedIntegration.expiresAt).toBeDefined();
      expect(savedIntegration.storeId).toBe('store-123');
      expect(savedIntegration.storeUrl).toBe('https://test-store.salla.sa');
      expect(savedIntegration.scopes).toEqual([
        'read:products',
        'write:products',
      ]);
      expect(savedIntegration.lastSync).toBeDefined();
      expect((savedIntegration as any).createdAt).toBeDefined();
      expect((savedIntegration as any).updatedAt).toBeDefined();
    });

    it('should create integration with minimal required fields', async () => {
      const merchantId = new Types.ObjectId();
      const integrationData = {
        merchantId,
        provider: 'zid' as const,
      };

      const integration = new integrationModel(integrationData);
      const savedIntegration = await integration.save();

      expect(savedIntegration.merchantId.toString()).toBe(
        merchantId.toString(),
      );
      expect(savedIntegration.provider).toBe('zid');
      expect(savedIntegration.active).toBe(false); // default value
      expect(savedIntegration.accessToken).toBeUndefined();
      expect(savedIntegration.refreshToken).toBeUndefined();
    });

    it('should enforce required fields', async () => {
      const integration = new integrationModel({});

      await expect(integration.save()).rejects.toThrow();

      // Test specific required field errors
      const validationError = integration.validateSync();
      expect(validationError?.errors.merchantId).toBeDefined();
      expect(validationError?.errors.provider).toBeDefined();
    });

    it('should validate provider enum values', async () => {
      const merchantId = new Types.ObjectId();
      const integrationData = {
        merchantId,
        provider: 'invalid-provider' as any,
      };

      const integration = new integrationModel(integrationData);

      await expect(integration.save()).rejects.toThrow();

      const validationError = integration.validateSync();
      expect(validationError?.errors.provider).toBeDefined();
      expect(validationError?.errors.provider.message).toContain('enum');
    });

    it('should accept valid provider values', async () => {
      const merchantId = new Types.ObjectId();

      const sallaIntegration = new integrationModel({
        merchantId,
        provider: 'salla',
      });

      const zidIntegration = new integrationModel({
        merchantId: new Types.ObjectId(),
        provider: 'zid',
      });

      await expect(sallaIntegration.save()).resolves.toBeDefined();
      await expect(zidIntegration.save()).resolves.toBeDefined();
    });

    it('should set default value for active field', async () => {
      const merchantId = new Types.ObjectId();
      const integration = new integrationModel({
        merchantId,
        provider: 'salla',
      });

      const savedIntegration = await integration.save();
      expect(savedIntegration.active).toBe(false);
    });

    it('should handle optional fields properly', async () => {
      const merchantId = new Types.ObjectId();
      const integration = new integrationModel({
        merchantId,
        provider: 'salla',
        accessToken: 'token',
      });

      const savedIntegration = await integration.save();

      expect(savedIntegration.accessToken).toBe('token');
      expect(savedIntegration.refreshToken).toBeUndefined();
      expect(savedIntegration.tokenType).toBeUndefined();
      expect(savedIntegration.expiresIn).toBeUndefined();
      expect(savedIntegration.expiresAt).toBeUndefined();
      expect(savedIntegration.storeId).toBeUndefined();
      expect(savedIntegration.storeUrl).toBeUndefined();
      expect(savedIntegration.scopes).toBeUndefined();
      expect(savedIntegration.lastSync).toBeUndefined();
    });
  });

  describe('Schema Indexes', () => {
    it('should have merchantId index', async () => {
      const indexes = await integrationModel.collection.getIndexes();

      // Check for merchantId index
      const merchantIdIndex = Object.keys(indexes).find((key) =>
        indexes[key].some((field: any) => field[0] === 'merchantId'),
      );

      expect(merchantIdIndex).toBeDefined();
    });

    it('should have provider index', async () => {
      const indexes = await integrationModel.collection.getIndexes();

      // Check for provider index
      const providerIndex = Object.keys(indexes).find((key) =>
        indexes[key].some((field: any) => field[0] === 'provider'),
      );

      expect(providerIndex).toBeDefined();
    });

    it('should have unique compound index on merchantId and provider', async () => {
      const merchantId = new Types.ObjectId();

      // Create first integration
      const integration1 = new integrationModel({
        merchantId,
        provider: 'salla',
      });
      await integration1.save();

      // Try to create duplicate
      const integration2 = new integrationModel({
        merchantId,
        provider: 'salla',
      });

      await expect(integration2.save()).rejects.toThrow();
    });

    it('should allow same provider for different merchants', async () => {
      const merchantId1 = new Types.ObjectId();
      const merchantId2 = new Types.ObjectId();

      const integration1 = new integrationModel({
        merchantId: merchantId1,
        provider: 'salla',
      });

      const integration2 = new integrationModel({
        merchantId: merchantId2,
        provider: 'salla',
      });

      await expect(integration1.save()).resolves.toBeDefined();
      await expect(integration2.save()).resolves.toBeDefined();
    });

    it('should allow different providers for same merchant', async () => {
      const merchantId = new Types.ObjectId();

      const sallaIntegration = new integrationModel({
        merchantId,
        provider: 'salla',
      });

      const zidIntegration = new integrationModel({
        merchantId,
        provider: 'zid',
      });

      await expect(sallaIntegration.save()).resolves.toBeDefined();
      await expect(zidIntegration.save()).resolves.toBeDefined();
    });
  });

  describe('Timestamps', () => {
    it('should automatically set createdAt and updatedAt', async () => {
      const merchantId = new Types.ObjectId();
      const integration = new integrationModel({
        merchantId,
        provider: 'salla',
      });

      const savedIntegration = await integration.save();

      expect((savedIntegration as any).createdAt).toBeDefined();
      expect((savedIntegration as any).updatedAt).toBeDefined();
      expect((savedIntegration as any).createdAt).toBeInstanceOf(Date);
      expect((savedIntegration as any).updatedAt).toBeInstanceOf(Date);
    });

    it('should update updatedAt on document modification', async () => {
      const merchantId = new Types.ObjectId();
      const integration = new integrationModel({
        merchantId,
        provider: 'salla',
      });

      const savedIntegration = await integration.save();
      const originalUpdatedAt = (savedIntegration as any).updatedAt;

      // Wait a moment to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      savedIntegration.active = true;
      const updatedIntegration = await savedIntegration.save();

      expect((updatedIntegration as any).updatedAt.getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime(),
      );
    });
  });

  describe('Data Types and Validation', () => {
    it('should handle Date fields correctly', async () => {
      const merchantId = new Types.ObjectId();
      const now = new Date();
      const futureDate = new Date(now.getTime() + 3600 * 1000);

      const integration = new integrationModel({
        merchantId,
        provider: 'salla',
        expiresAt: futureDate,
        lastSync: now,
      });

      const savedIntegration = await integration.save();

      expect(savedIntegration.expiresAt).toBeInstanceOf(Date);
      expect(savedIntegration.lastSync).toBeInstanceOf(Date);
      expect(savedIntegration.expiresAt?.getTime()).toBe(futureDate.getTime());
      expect(savedIntegration.lastSync?.getTime()).toBe(now.getTime());
    });

    it('should handle array fields correctly', async () => {
      const merchantId = new Types.ObjectId();
      const scopes = ['read:products', 'write:products', 'read:orders'];

      const integration = new integrationModel({
        merchantId,
        provider: 'salla',
        scopes,
      });

      const savedIntegration = await integration.save();

      expect(Array.isArray(savedIntegration.scopes)).toBe(true);
      expect(savedIntegration.scopes).toEqual(scopes);
    });

    it('should handle ObjectId references correctly', async () => {
      const merchantId = new Types.ObjectId();

      const integration = new integrationModel({
        merchantId,
        provider: 'salla',
      });

      const savedIntegration = await integration.save();

      expect(savedIntegration.merchantId).toBeInstanceOf(Types.ObjectId);
      expect(savedIntegration.merchantId.toString()).toBe(
        merchantId.toString(),
      );
    });
  });
});
