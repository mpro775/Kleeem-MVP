import { Test, type TestingModule } from '@nestjs/testing';
import { mockDeep } from 'jest-mock-extended';

import { AuthService } from '../auth.service';

describe('AuthService - Simple Tests', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: 'AuthRepository',
          useValue: mockDeep(),
        },
        {
          provide: 'TokenService',
          useValue: mockDeep(),
        },
        {
          provide: 'MailService',
          useValue: mockDeep(),
        },
        {
          provide: 'MerchantsService',
          useValue: mockDeep(),
        },
        {
          provide: 'TranslationService',
          useValue: mockDeep(),
        },
        {
          provide: 'BusinessMetrics',
          useValue: mockDeep(),
        },
        {
          provide: 'ConfigService',
          useValue: mockDeep(),
        },
        {
          provide: 'JwtService',
          useValue: mockDeep(),
        },
        {
          provide: 'CACHE_MANAGER',
          useValue: mockDeep(),
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have register method', () => {
    expect(typeof service.register).toBe('function');
  });

  it('should have login method', () => {
    expect(typeof service.login).toBe('function');
  });

  it('should have verifyEmail method', () => {
    expect(typeof service.verifyEmail).toBe('function');
  });

  it('should have logout method', () => {
    expect(typeof service.logout).toBe('function');
  });

  it('should have refreshTokens method', () => {
    expect(typeof service.refreshTokens).toBe('function');
  });
});
