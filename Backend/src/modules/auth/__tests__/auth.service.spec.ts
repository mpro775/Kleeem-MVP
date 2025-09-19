import { Test } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { AuthRepository } from '../repositories/auth.repository';

describe('AuthService', () => {
  let service: AuthService;
  let repo: jest.Mocked<AuthRepository>;

  beforeEach(async () => {
    repo = {
      createUser: jest.fn(),
      findUserByEmailWithPassword: jest.fn(),
      findUserByEmailSelectId: jest.fn(),
      findUserById: jest.fn(),
      findUserByIdWithPassword: jest.fn(),
      saveUser: jest.fn(),

      findMerchantBasicById: jest.fn(),

      createEmailVerificationToken: jest.fn(),
      latestEmailVerificationTokenByUser: jest.fn(),
      deleteEmailVerificationTokensByUser: jest.fn(),

      createPasswordResetToken: jest.fn(),
      latestPasswordResetTokenByUser: jest.fn(),
      findLatestPasswordResetForUser: jest.fn(),
      markPasswordResetTokenUsed: jest.fn(),
      deleteOtherPasswordResetTokens: jest.fn(),
      deletePasswordResetTokensByUser: jest.fn(),
    } as any;

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: 'AuthRepository', useValue: repo },
        {
          provide: 'JwtService',
          useValue: { sign: jest.fn().mockReturnValue('jwt') },
        },
        {
          provide: 'MerchantsService',
          useValue: {
            ensureForUser: jest.fn().mockResolvedValue({ _id: 'm1' }),
          },
        },
        {
          provide: 'MailService',
          useValue: {
            sendVerificationEmail: jest.fn(),
            sendPasswordResetEmail: jest.fn(),
          },
        },
        {
          provide: 'BusinessMetrics',
          useValue: { incEmailSent: jest.fn(), incEmailFailed: jest.fn() },
        },
        {
          provide: 'ConfigService',
          useValue: { get: jest.fn().mockReturnValue('https://front.example') },
        },
        {
          provide: 'TokenService',
          useValue: {
            createTokenPair: jest
              .fn()
              .mockResolvedValue({ accessToken: 'a', refreshToken: 'r' }),
            refreshTokens: jest.fn(),
            revokeRefreshToken: jest.fn(),
            revokeAllUserSessions: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('registers user and sends verification', async () => {
    repo.createUser.mockResolvedValue({
      _id: 'u1',
      name: 'Ali',
      email: 'a@a.com',
      role: 'MERCHANT',
      active: true,
      firstLogin: true,
      emailVerified: false,
    } as any);
    repo.createEmailVerificationToken.mockResolvedValue({} as any);

    const res = await service.register({
      name: 'Ali',
      email: 'a@a.com',
      password: 'x',
      confirmPassword: 'x',
    } as any);
    expect(repo.createUser).toHaveBeenCalled();
    expect(res.user.email).toBe('a@a.com');
  });

  it('login returns token pair', async () => {
    repo.findUserByEmailWithPassword.mockResolvedValue({
      _id: 'u1',
      email: 'a@a.com',
      name: 'Ali',
      role: 'MERCHANT',
      active: true,
      emailVerified: true,
      firstLogin: false,
      password: await (await import('bcrypt')).hash('x', 4),
      merchantId: null,
    } as any);

    const out = await service.login({ email: 'a@a.com', password: 'x' } as any);
    expect(out.accessToken).toBeDefined();
    expect(out.refreshToken).toBeDefined();
  });
});
