// src/common/decorators/current-user.decorator.ts
import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

export type Role = 'ADMIN' | 'MERCHANT' | 'MEMBER';
export interface JwtPayload {
  userId: string;
  role: Role;
  merchantId?: string | null;
}

/** يعيد الحمولة كاملة أو مفتاحًا منها */
export const CurrentUser = createParamDecorator(
  (
    key: keyof JwtPayload | undefined,
    ctx: ExecutionContext,
  ): JwtPayload[keyof JwtPayload] | JwtPayload => {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user as JwtPayload | undefined;
    if (!user) throw new UnauthorizedException('Unauthorized');

    return key ? user[key] : user;
  },
);

/** معرف المستخدم من الـ JWT (اسم الحقل الصحيح userId) */
export const CurrentUserId = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user as JwtPayload | undefined;
    if (!user?.userId) throw new UnauthorizedException('Unauthorized');
    return user.userId;
  },
);

/** معرف التاجر من الـ JWT */
export const CurrentMerchantId = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string | null => {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user as JwtPayload | undefined;
    if (!user) throw new UnauthorizedException('Unauthorized');
    return user.merchantId ?? null;
  },
);

/** دور المستخدم من الـ JWT (اختياري) */
export const CurrentRole = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): Role => {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user as JwtPayload | undefined;
    if (!user?.role) throw new UnauthorizedException('Unauthorized');
    return user.role;
  },
);
