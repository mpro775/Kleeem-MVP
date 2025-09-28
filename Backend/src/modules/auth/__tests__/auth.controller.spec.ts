import { Test, type TestingModule } from '@nestjs/testing';
import { mockDeep } from 'jest-mock-extended';

import { AuthController } from '../auth.controller';

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: 'AuthService',
          useValue: mockDeep(),
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should have register method', () => {
    expect(typeof controller.register).toBe('function');
  });

  it('should have login method', () => {
    expect(typeof controller.login).toBe('function');
  });

  it('should have verifyEmail method', () => {
    expect(typeof controller.verifyEmail).toBe('function');
  });

  it('should have logout method', () => {
    expect(typeof controller.logout).toBe('function');
  });
});
