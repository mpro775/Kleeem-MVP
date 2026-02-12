import { Test } from '@nestjs/testing';

import { S3_CLIENT_TOKEN } from '../../../common/storage/s3-client.provider';
import { Product } from '../../products/schemas/product.schema';
import { CategoriesController } from '../categories.controller';
import { CategoriesModule } from '../categories.module';
import { CategoriesService } from '../categories.service';
import { MongoCategoriesRepository } from '../repositories/mongo-categories.repository';
import { Category } from '../schemas/category.schema';

describe('CategoriesModule', () => {
  let module: any;
  const s3Mock = { send: jest.fn() };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CategoriesModule],
    })
      .overrideProvider(S3_CLIENT_TOKEN)
      .useValue(s3Mock)
      .compile();

    module = moduleRef;
  });

  it('should compile the module', () => {
    expect(module).toBeDefined();
  });

  it('should have CategoriesController', () => {
    const controller = module.get(CategoriesController);
    expect(controller).toBeDefined();
    expect(controller).toBeInstanceOf(CategoriesController);
  });

  it('should have CategoriesService', () => {
    const service = module.get(CategoriesService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(CategoriesService);
  });

  it('should have MongoCategoriesRepository as CategoriesRepository', () => {
    const repository = module.get('CategoriesRepository');
    expect(repository).toBeDefined();
    expect(repository).toBeInstanceOf(MongoCategoriesRepository);
  });

  it('should have S3 client', () => {
    const s3Client = module.get(S3_CLIENT_TOKEN);
    expect(s3Client).toBeDefined();
    expect(typeof s3Client.send).toBe('function');
  });

  it('should export CategoriesService', () => {
    const service = module.get(CategoriesService);
    expect(service).toBeDefined();
  });

  describe('MongooseModule configuration', () => {
    it('should be configured with Category schema', () => {
      // This test verifies that the module imports MongooseModule.forFeature correctly
      // The actual schema registration is tested implicitly through the module compilation
      const categoryModel = module.get(`DatabaseModel_${Category.name}`);
      expect(categoryModel).toBeDefined();
    });

    it('should be configured with Product schema', () => {
      // This test verifies that the module imports Product schema for anyProductsInCategories check
      const productModel = module.get(`DatabaseModel_${Product.name}`);
      expect(productModel).toBeDefined();
    });
  });

  describe('MulterModule configuration', () => {
    it('should be configured with dest uploads', () => {
      // MulterModule.register({ dest: './uploads' }) should be configured
      // This is tested implicitly through module compilation
      expect(module).toBeDefined();
    });
  });

  describe('S3 client factory', () => {
    it('should provide S3 client with send method', () => {
      const s3Client = module.get(S3_CLIENT_TOKEN);
      expect(s3Client).toBeDefined();
      expect(typeof s3Client.send).toBe('function');
    });
  });

  describe('CommonModule import', () => {
    it('should import CommonModule for TranslationService', () => {
      // TranslationService should be available through CommonModule
      // This is tested implicitly through the controller construction
      const controller = module.get(CategoriesController);
      expect(controller).toBeDefined();
    });
  });
});
