import { Test, TestingModule } from '@nestjs/testing';
import { PlansModule } from './plans.module';

describe('PlansModule', () => {
  let moduleRef: TestingModule;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [PlansModule],
    }).compile();
  });

  it('should be defined', () => {
    expect(moduleRef).toBeDefined();
  });
});
