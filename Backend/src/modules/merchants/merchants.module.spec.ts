import { Test, TestingModule } from '@nestjs/testing';
import { MerchantsModule } from './merchants.module';

describe('MerchantsModule', () => {
  let moduleRef: TestingModule;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [MerchantsModule],
    }).compile();
  });

  it('should be defined', () => {
    expect(moduleRef).toBeDefined();
  });
});
