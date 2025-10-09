import { Test, type TestingModule } from '@nestjs/testing';

import { AppService } from './app.service';

describe('AppService', () => {
  let service: AppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AppService],
    }).compile();

    service = module.get<AppService>(AppService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getHello', () => {
    it('should return "Hello World!"', () => {
      expect(service.getHello()).toBe('Hello World!');
    });

    it('should return a string', () => {
      const result = service.getHello();
      expect(typeof result).toBe('string');
    });

    it('should return non-empty string', () => {
      const result = service.getHello();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should have getHello method defined', () => {
      expect(typeof service.getHello).toBe('function');
    });

    it('should be callable multiple times', () => {
      const result1 = service.getHello();
      const result2 = service.getHello();
      const result3 = service.getHello();
      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
      expect(result1).toBe('Hello World!');
    });
  });
});
