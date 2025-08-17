// src/modules/auth/__tests__/auth.service.spec.ts
// Unit tests لـ AuthService: تغطية register/login/verifyEmail/resendVerification مع موك كامل للتبعيات، دون أي I/O حقيقي.
// نمط Arrange–Act–Assert

import 'reflect-metadata';
import { AuthService } from '../auth.service';
import { BadRequestException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { faker } from '@faker-js/faker';

// موك bcrypt
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));
import { compare as bcryptCompare } from 'bcrypt';

type AnyFn = (...args: any[]) => any;

describe('AuthService (unit)', () => {
  let service: AuthService;

  // Mongoose Model stubs (كائنات قابلة للإنشاء عبر new)
  let userModelMock: any;
  let merchantModelMock: any;

  // Doc helpers
  const makeUserDoc = (overrides: Partial<any> = {}) => {
    const base: any = {
      _id: 'user_1',
      name: overrides.name ?? 'أحمد',
      email: overrides.email ?? 'user@example.com',
      password: overrides.password ?? 'hashed',
      role: overrides.role ?? 'MERCHANT',
      firstLogin: overrides.firstLogin ?? true,
      emailVerified: overrides.emailVerified ?? false,
      emailVerificationCode: overrides.emailVerificationCode,
      emailVerificationExpiresAt: overrides.emailVerificationExpiresAt,
    };
    const doc: any = {
      ...base,
      save: jest.fn().mockResolvedValue(undefined),
    };
    return doc;
  };

  const makeMerchantDoc = (overrides: Partial<any> = {}) => ({
    _id: overrides._id ?? 'm_1',
    userId: overrides.userId ?? 'user_1',
  });

  const jwtServiceMock = {
    sign: jest.fn().mockReturnValue('jwt.token'),
  };

  const merchantsServiceMock = {
    create: jest.fn(),
  };

  const mailServiceMock = {
    sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  };

  const resetModels = () => {
    // userModelMock قابل للإنشاء عبر new وله دوال static
    userModelMock = jest.fn(); // constructor
    userModelMock.exists = jest.fn();
    userModelMock.findByIdAndDelete = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(undefined) });
    userModelMock.findOne = jest.fn();

    merchantModelMock = jest.fn();
    merchantModelMock.findByIdAndDelete = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(undefined) });
    merchantModelMock.findOne = jest.fn();
  };

  beforeEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
    resetModels();

    service = new AuthService(
      userModelMock,
      merchantModelMock,
      jwtServiceMock as any,
      merchantsServiceMock as any,
      mailServiceMock as any,
    );
  });

  describe('register', () => {
    const fixedNow = 1_700_000_000_000; // ثابت
    const mockCodeFromRandom = '211110'; // floor(100000 + 0.123456 * 900000) = 211110

    beforeEach(() => {
      jest.spyOn(Date, 'now').mockReturnValue(fixedNow);
      jest.spyOn(Math, 'random').mockReturnValue(0.123456);
    });

    it('يسجّل مستخدمًا جديدًا ويعيد JWT + user، ويرسل كود التفعيل، ويربط merchant', async () => {
      // Arrange
      const dto = {
        email: faker.internet.email(),
        name: 'متجر أحمد',
        password: 'securePass',
        confirmPassword: 'securePass',
      };

      // لا يوجد بريد مسجل
      (userModelMock.exists as jest.Mock).mockResolvedValue(null);

      // new userModel().save()
      const newUserDoc = makeUserDoc({ email: dto.email, name: dto.name });
      (userModelMock as jest.Mock).mockImplementation(() => newUserDoc);

      // merchants.create => merchantDoc
      const merchantDoc = makeMerchantDoc({ _id: 'm_123' });
      (merchantsServiceMock.create as jest.Mock).mockResolvedValue(merchantDoc);

      // Act
      const result = await service.register(dto as any);

      // Assert
      // save calls: 1) إنشاء المستخدم، 2) بعد وضع الكود/الصلاحية، 3) بعد ربط merchantId
      expect(newUserDoc.save).toHaveBeenCalledTimes(3);

      // تم ضبط كود التفعيل والصلاحية 15 دقيقة
      expect(newUserDoc.emailVerificationCode).toBe(mockCodeFromRandom);
      expect(newUserDoc.emailVerificationExpiresAt.getTime()).toBe(fixedNow + 15 * 60 * 1000);

      // تم ربط التاجر
      expect(newUserDoc.merchantId).toBe('m_123');

      // إرسال الإيميل
      expect(mailServiceMock.sendVerificationEmail).toHaveBeenCalledWith(dto.email, mockCodeFromRandom);

      // JWT payload
      expect(jwtServiceMock.sign).toHaveBeenCalledWith({
        userId: newUserDoc._id,
        role: newUserDoc.role,
        merchantId: newUserDoc.merchantId,
      });

      // النتيجة
      expect(result).toEqual({
        accessToken: 'jwt.token',
        user: expect.objectContaining({
          id: newUserDoc._id,
          name: newUserDoc.name,
          email: newUserDoc.email,
          role: newUserDoc.role,
          merchantId: 'm_123',
          firstLogin: true,
          emailVerified: false,
        }),
      });
    });

    it('يرفض عندما لا تتطابق كلمة المرور والتأكيد', async () => {
      // Arrange
      const dto = { email: 'x@y.com', name: 'X', password: 'a', confirmPassword: 'b' };

      // Act + Assert
      await expect(service.register(dto as any)).rejects.toBeInstanceOf(BadRequestException);
      expect(userModelMock.exists).not.toHaveBeenCalled();
    });

    it('يرفض عندما يكون البريد مستخدمًا مسبقًا', async () => {
      // Arrange
      const dto = { email: 'x@y.com', name: 'X', password: 'pppppp', confirmPassword: 'pppppp' };
      (userModelMock.exists as jest.Mock).mockResolvedValue({ _id: 'exists' });

      // Act + Assert
      await expect(service.register(dto as any)).rejects.toBeInstanceOf(ConflictException);
    });

    it('ينظّف المستخدم الذي أُنشئ إذا فشل إنشاء التاجر (rollback منطقي)', async () => {
      // Arrange
      const dto = { email: 'x@y.com', name: 'X', password: 'pppppp', confirmPassword: 'pppppp' };
      (userModelMock.exists as jest.Mock).mockResolvedValue(null);
      const newUserDoc = makeUserDoc({ _id: 'user_rollback', email: dto.email, name: dto.name });
      (userModelMock as jest.Mock).mockImplementation(() => newUserDoc);
      (merchantsServiceMock.create as jest.Mock).mockRejectedValue(new Error('boom'));

      // Act + Assert
      await expect(service.register(dto as any)).rejects.toBeInstanceOf(InternalServerErrorException);

      // تم استدعاء حذف المستخدم
      expect(userModelMock.findByIdAndDelete).toHaveBeenCalledWith('user_rollback');
      // لم يُنشأ merchant، لذلك لا حذف له
      expect(merchantModelMock.findByIdAndDelete).not.toHaveBeenCalled();
    });

    it('لا يفشل الطلب حتى لو فشل إرسال بريد التفعيل (يتم تسجيل الخطأ فقط)', async () => {
      // Arrange
      const dto = { email: 'x@y.com', name: 'X', password: 'pppppp', confirmPassword: 'pppppp' };
      (userModelMock.exists as jest.Mock).mockResolvedValue(null);
      const newUserDoc = makeUserDoc({ email: dto.email, name: dto.name });
      (userModelMock as jest.Mock).mockImplementation(() => newUserDoc);
      (merchantsServiceMock.create as jest.Mock).mockResolvedValue(makeMerchantDoc());
      (mailServiceMock.sendVerificationEmail as jest.Mock).mockRejectedValue(new Error('smtp down'));

      // Act
      const out = await service.register(dto as any);

      // Assert
      expect(out.accessToken).toBe('jwt.token');
      expect(mailServiceMock.sendVerificationEmail).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const email = 'user@example.com';

    it('ينجح ويعيد JWT + user عندما تكون بيانات الاعتماد صحيحة', async () => {
      // Arrange
      const userDoc = makeUserDoc({ email, password: 'hashed', firstLogin: true, emailVerified: false });
      // findOne(...).select('+password')
      (userModelMock.findOne as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(userDoc),
      });
      (bcryptCompare as jest.Mock).mockResolvedValue(true);

      // Merchant موجود
      (merchantModelMock.findOne as jest.Mock).mockResolvedValue({ _id: 'm_1' });

      // Act
      const out = await service.login({ email, password: 'plain' } as any);

      // Assert
      expect(bcryptCompare).toHaveBeenCalledWith('plain', 'hashed');
      expect(jwtServiceMock.sign).toHaveBeenCalledWith({
        userId: userDoc._id,
        role: userDoc.role,
        merchantId: 'm_1',
      });
      expect(out).toEqual({
        accessToken: 'jwt.token',
        user: expect.objectContaining({
          id: userDoc._id,
          email,
          merchantId: 'm_1',
          firstLogin: true,
          emailVerified: false,
        }),
      });
    });

    it('يرفض عند عدم وجود المستخدم', async () => {
      // Arrange
      (userModelMock.findOne as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      // Act + Assert
      await expect(service.login({ email, password: 'x' } as any)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('يرفض عند كلمة مرور غير صحيحة', async () => {
      // Arrange
      const userDoc = makeUserDoc({ email, password: 'hashed' });
      (userModelMock.findOne as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(userDoc),
      });
      (bcryptCompare as jest.Mock).mockResolvedValue(false);

      // Act + Assert
      await expect(service.login({ email, password: 'wrong' } as any)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('يتعامل مع عدم وجود merchant ويرجع merchantId = null', async () => {
      // Arrange
      const userDoc = makeUserDoc({ email, password: 'hashed' });
      (userModelMock.findOne as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(userDoc),
      });
      (bcryptCompare as jest.Mock).mockResolvedValue(true);
      (merchantModelMock.findOne as jest.Mock).mockResolvedValue(null);

      // Act
      const out = await service.login({ email, password: 'ok' } as any);

      // Assert
      expect(out.user.merchantId).toBeNull();
      expect(jwtServiceMock.sign).toHaveBeenCalledWith({
        userId: userDoc._id,
        role: userDoc.role,
        merchantId: null,
      });
    });
  });

  describe('verifyEmail', () => {
    const email = 'verify@example.com';

    it('يُفعّل البريد عندما يكون الرمز صحيحًا وغير منتهي', async () => {
      // Arrange
      const now = 1_800_000_000_000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const userDoc = makeUserDoc({
        email,
        emailVerificationCode: '654321',
        emailVerificationExpiresAt: new Date(now + 60_000),
        firstLogin: true,
        emailVerified: false,
      });

      (userModelMock.findOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(userDoc),
      });

      // Act
      await service.verifyEmail({ email, code: '654321' } as any);

      // Assert
      expect(userDoc.emailVerified).toBe(true);
      expect(userDoc.firstLogin).toBe(false);
      expect(userDoc.emailVerificationCode).toBeUndefined();
      expect(userDoc.emailVerificationExpiresAt).toBeUndefined();
      expect(userDoc.save).toHaveBeenCalled();
    });

    it('يرفض عند رمز غير صحيح', async () => {
      // Arrange
      (userModelMock.findOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      // Act + Assert
      await expect(service.verifyEmail({ email, code: '000000' } as any)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('يرفض عند انتهاء صلاحية الرمز', async () => {
      // Arrange
      const now = 1_800_000_000_000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const userDoc = makeUserDoc({
        email,
        emailVerificationCode: '111111',
        emailVerificationExpiresAt: new Date(now - 1),
      });

      (userModelMock.findOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(userDoc),
      });

      // Act + Assert
      await expect(service.verifyEmail({ email, code: '111111' } as any)).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('resendVerification', () => {
    const email = 'resend@example.com';
    const fixedNow = 1_900_000_000_000;

    beforeEach(() => {
      jest.spyOn(Date, 'now').mockReturnValue(fixedNow);
      jest.spyOn(Math, 'random').mockReturnValue(0.123456); // => 211110
    });

    it('يعيد إرسال كود التفعيل عندما يكون المستخدم غير مفعّل', async () => {
      // Arrange
      const userDoc = makeUserDoc({ email, emailVerified: false });
      (userModelMock.findOne as jest.Mock).mockReturnValue({ exec: jest.fn().mockResolvedValue(userDoc) });

      // Act
      await expect(service.resendVerification({ email } as any)).resolves.toBeUndefined();

      // Assert
      expect(userDoc.emailVerificationCode).toBe('211110');
      expect(userDoc.emailVerificationExpiresAt.getTime()).toBe(fixedNow + 15 * 60 * 1000);
      expect(userDoc.save).toHaveBeenCalled();
      expect(mailServiceMock.sendVerificationEmail).toHaveBeenCalledWith(email, '211110');
    });

    it('يرفض إن لم يوجد مستخدم للبريد', async () => {
      // Arrange
      (userModelMock.findOne as jest.Mock).mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      // Act + Assert
      await expect(service.resendVerification({ email } as any)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('يرفض إذا كان البريد مُفعّلًا مسبقًا', async () => {
      // Arrange
      const userDoc = makeUserDoc({ email, emailVerified: true });
      (userModelMock.findOne as jest.Mock).mockReturnValue({ exec: jest.fn().mockResolvedValue(userDoc) });

      // Act + Assert
      await expect(service.resendVerification({ email } as any)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('لا يرمي خطأ إذا فشل إرسال البريد (تُسجّل فقط)', async () => {
      // Arrange
      const userDoc = makeUserDoc({ email, emailVerified: false });
      (userModelMock.findOne as jest.Mock).mockReturnValue({ exec: jest.fn().mockResolvedValue(userDoc) });
      (mailServiceMock.sendVerificationEmail as jest.Mock).mockRejectedValue(new Error('smtp down'));

      // Act + Assert
      await expect(service.resendVerification({ email } as any)).resolves.toBeUndefined();
      expect(mailServiceMock.sendVerificationEmail).toHaveBeenCalled();
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});
