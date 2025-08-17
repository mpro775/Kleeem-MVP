import { Test, TestingModule } from '@nestjs/testing';
import { ProductsModule } from './products.module';

describe('ProductsModule', () => {
  let moduleRef: TestingModule;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ProductsModule],
    }).compile();
  });

  it('should be defined', () => {
    expect(moduleRef).toBeDefined();
  });
});
