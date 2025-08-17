import { Test, TestingModule } from '@nestjs/testing';
import { ScraperModule } from './scraper.module';

describe('ScraperModule', () => {
  let moduleRef: TestingModule;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ScraperModule],
    }).compile();
  });

  it('should be defined', () => {
    expect(moduleRef).toBeDefined();
  });
});
