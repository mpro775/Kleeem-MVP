// src/common/decorators/current-user.decorator.spec.ts
import { UnauthorizedException } from '@nestjs/common';

import {
  CurrentUser,
  CurrentUserId,
  CurrentMerchantId,
  CurrentRole,
  type JwtPayload,
  type Role,
} from './current-user.decorator';

import type { ExecutionContext } from '@nestjs/common';

// Mock createParamDecorator to return the factory function directly for testing
jest.mock('@nestjs/common', () => ({
  UnauthorizedException: class extends Error {
    constructor(message: string = 'Unauthorized') {
      super(message);
      this.name = 'UnauthorizedException';
    }
  },
  createParamDecorator: jest.fn((factoryFn) => factoryFn),
}));

const mockHttpContext = (user?: Partial<JwtPayload>): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  }) as unknown as ExecutionContext;

describe('CurrentUser decorator', () => {
  // يغطي: إعادة الحمولة كاملة، إرجاع مفتاح محدد، التعامل مع حقول اختيارية، ورمي Unauthorized عند غياب المستخدم.

  it('should return the whole user when key is omitted', () => {
    // ARRANGE
    const user: JwtPayload = {
      userId: 'u-1',
      role: 'ADMIN',
      merchantId: 'm-1',
    };
    const ctx = mockHttpContext(user);

    // ACT
    const result = CurrentUser(undefined, ctx as any);

    // ASSERT
    expect(result).toEqual(user);
    expect(result).toHaveProperty('userId');
    expect(result).toHaveProperty('role');
  });

  it('should return a specific field when key is provided', () => {
    // ARRANGE
    const user: JwtPayload = {
      userId: 'u-2',
      role: 'MERCHANT',
      merchantId: 'm-2',
    };
    const ctx = mockHttpContext(user);

    // ACT
    const userId = CurrentUser('userId', ctx as any);
    const role = CurrentUser('role', ctx as any);
    const merchantId = CurrentUser('merchantId', ctx as any);

    // ASSERT
    expect(userId).toBe('u-2');
    expect(role).toBe<Role>('MERCHANT');
    expect(merchantId).toBe('m-2');
  });

  it('should return undefined for an optional key that is not present on payload', () => {
    // ARRANGE
    const user: JwtPayload = {
      userId: 'u-3',
      role: 'MEMBER',
      // merchantId intentionally undefined
    };
    const ctx = mockHttpContext(user);

    // ACT
    const merchantId = CurrentUser('merchantId', ctx as any);

    // ASSERT
    expect(merchantId).toBeUndefined();
  });

  it('should throw Unauthorized when user is missing', async () => {
    // ARRANGE
    const ctx = mockHttpContext(undefined);

    // ACT
    const act = () => CurrentUser(undefined, ctx as any);

    // ASSERT
    await expect(Promise.resolve().then(act)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});

describe('CurrentUserId decorator', () => {
  // يغطي: إرجاع userId الصحيح، ورمي Unauthorized عند غياب المستخدم أو غياب/فراغ userId.

  it('should return userId when present', () => {
    // ARRANGE
    const ctx = mockHttpContext({
      userId: 'user-123',
      role: 'ADMIN',
      merchantId: 'm-9',
    });

    // ACT
    const result = CurrentUserId(undefined, ctx as any);

    // ASSERT
    expect(result).toBe('user-123');
    expect(result).toMatch(/^user-/);
  });

  it('should throw Unauthorized when user is missing', async () => {
    // ARRANGE
    const ctx = mockHttpContext(undefined);

    // ACT
    const act = () => CurrentUserId(undefined, ctx as any);

    // ASSERT
    await expect(Promise.resolve().then(act)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw Unauthorized when userId is missing', async () => {
    // ARRANGE
    const ctx = mockHttpContext({
      role: 'MEMBER',
      merchantId: null,
      // userId missing
    });

    // ACT
    const act = () => CurrentUserId(undefined, ctx as any);

    // ASSERT
    await expect(Promise.resolve().then(act)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw Unauthorized when userId is empty string', async () => {
    // ARRANGE
    const ctx = mockHttpContext({
      userId: '',
      role: 'MERCHANT',
    });

    // ACT
    const act = () => CurrentUserId(undefined, ctx as any);

    // ASSERT
    await expect(Promise.resolve().then(act)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});

describe('CurrentMerchantId decorator', () => {
  // يغطي: إعادة merchantId عندما يوجد، إعادة null عند null/undefined، ورمي Unauthorized عند غياب المستخدم.

  it('should return merchantId string when present', () => {
    // ARRANGE
    const ctx = mockHttpContext({
      userId: 'u-55',
      role: 'MERCHANT',
      merchantId: 'm-55',
    });

    // ACT
    const result = CurrentMerchantId(undefined, ctx as any);

    // ASSERT
    expect(result).toBe('m-55');
  });

  it('should return null when merchantId is null', () => {
    // ARRANGE
    const ctx = mockHttpContext({
      userId: 'u-77',
      role: 'MEMBER',
      merchantId: null,
    });

    // ACT
    const result = CurrentMerchantId(undefined, ctx as any);

    // ASSERT
    expect(result).toBeNull();
  });

  it('should return null when merchantId is undefined', () => {
    // ARRANGE
    const ctx = mockHttpContext({
      userId: 'u-88',
      role: 'MEMBER',
      // merchantId undefined
    });

    // ACT
    const result = CurrentMerchantId(undefined, ctx as any);

    // ASSERT
    expect(result).toBeNull();
  });

  it('should throw Unauthorized when user is missing', async () => {
    // ARRANGE
    const ctx = mockHttpContext(undefined);

    // ACT
    const act = () => CurrentMerchantId(undefined, ctx as any);

    // ASSERT
    await expect(Promise.resolve().then(act)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});

describe('CurrentRole decorator', () => {
  // يغطي: إعادة الدور الصحيح، ورمي Unauthorized عند غياب المستخدم أو الدور.

  it('should return role when present', () => {
    // ARRANGE
    const ctx = mockHttpContext({
      userId: 'u-99',
      role: 'ADMIN',
    });

    // ACT
    const result = CurrentRole(undefined, ctx as any);

    // ASSERT
    expect(result).toBe<Role>('ADMIN');
  });

  it('should throw Unauthorized when role is missing', async () => {
    // ARRANGE
    const ctx = mockHttpContext({
      userId: 'u-100',
      // role missing
    });

    // ACT
    const act = () => CurrentRole(undefined, ctx as any);

    // ASSERT
    await expect(Promise.resolve().then(act)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw Unauthorized when user is missing', async () => {
    // ARRANGE
    const ctx = mockHttpContext(undefined);

    // ACT
    const act = () => CurrentRole(undefined, ctx as any);

    // ASSERT
    await expect(Promise.resolve().then(act)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
