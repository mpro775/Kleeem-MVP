import { Test, type TestingModule } from '@nestjs/testing';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    })
      .overrideGuard(JwtAuthGuard) // Override the specific JWT guard
      .useValue({ canActivate: () => true }) // Mock guard to always allow
      .compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('testError', () => {
    it('should throw an error with message "Backend test error"', () => {
      expect(() => appController.testError()).toThrow('Backend test error');
    });

    it('should throw Error instance', () => {
      expect(() => appController.testError()).toThrow(Error);
    });
  });
});
