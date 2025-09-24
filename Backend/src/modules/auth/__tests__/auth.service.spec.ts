import { Test } from '@nestjs/testing';

import { AuthService } from '../auth.service';

import type { UserDocument } from '../../users/schemas/user.schema';
import type { LoginDto } from '../dto/login.dto';
import type { RegisterDto } from '../dto/register.dto';
import type { AuthRepository } from '../repositories/auth.repository';

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
    } as jest.Mocked<AuthRepository>;

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
    } as unknown as UserDocument);
    repo.createEmailVerificationToken.mockResolvedValue({} as any);

    const res = await service.register({
      name: 'Ali',
      email: 'a@a.com',
      password: 'x',
      confirmPassword: 'x',
    } as RegisterDto);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repo.createUser).toHaveBeenCalledWith({
      name: 'Ali',
      email: 'a@a.com',
      password: 'x',
      confirmPassword: 'x',
      role: 'MERCHANT',
      active: true,
      firstLogin: true,
      emailVerified: false,
    } as RegisterDto);
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
    } as unknown as UserDocument);

    const out = await service.login({
      email: 'a@a.com',
      password: 'x',
    } as LoginDto);
    expect(out.accessToken).toBeDefined();
    expect(out.refreshToken).toBeDefined();
  });
});
