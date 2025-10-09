// common/decorators/public.decorator.spec.ts
import { SetMetadata } from '@nestjs/common';

import { Public } from './public.decorator';

import type { Mock } from 'jest-mock';

const SetMetadataMock = SetMetadata as unknown as Mock;

// نضع الـ mock قبل الاستيراد حتى تستخدمه وحدة الاختبار داخل ملف الديكوريتر
jest.mock('@nestjs/common', () => ({
  SetMetadata: jest.fn(),
}));
describe('Public decorator factory', () => {
  // يغطي: استدعاء SetMetadata بالمفتاح والقيمة الصحيحين، إرجاع نفس الديكوريتر المُعاد من SetMetadata، واستدعاءات متعددة مستقلة.

  beforeEach(() => {
    // ARRANGE
    jest.clearAllMocks();
  });

  it('should call SetMetadata with "isPublic" and true', () => {
    // ARRANGE
    const fakeDecorator = jest.fn();
    SetMetadataMock.mockReturnValueOnce(fakeDecorator);

    // ACT
    const result = Public();

    // ASSERT
    expect(SetMetadataMock).toHaveBeenCalledTimes(1);
    expect(SetMetadataMock).toHaveBeenCalledWith('isPublic', true);
    expect(result).toBe(fakeDecorator);
    expect(typeof result).toBe('function');
  });

  it('should return a new decorator each time if SetMetadata returns new instance', () => {
    // ARRANGE
    const dec1 = jest.fn();
    const dec2 = jest.fn();
    SetMetadataMock.mockReturnValueOnce(dec1).mockReturnValueOnce(dec2);

    // ACT
    const r1 = Public(); // call #1
    const r2 = Public(); // call #2

    // ASSERT
    expect(SetMetadataMock).toHaveBeenCalledTimes(2);
    expect(SetMetadataMock).toHaveBeenNthCalledWith(1, 'isPublic', true);
    expect(SetMetadataMock).toHaveBeenNthCalledWith(2, 'isPublic', true);
    expect(r1).toBe(dec1);
    expect(r2).toBe(dec2);
    expect(r1).not.toBe(r2);
  });

  it('should be usable as a decorator function (shape only, no real behavior)', () => {
    // ARRANGE
    const fakeDecorator = jest.fn();
    SetMetadataMock.mockReturnValueOnce(fakeDecorator);
    class Dummy {}

    // ACT
    const decorator = Public();
    decorator(Dummy); // استدعاء شكلي مثل ديكوريتر صنف

    // ASSERT
    expect(fakeDecorator).toHaveBeenCalledTimes(1);
    expect(fakeDecorator).toHaveBeenCalledWith(Dummy);
  });
});
