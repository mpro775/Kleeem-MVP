// src/common/decorators/current-user.decorator.ts

import {
  createParamDecorator,
  UnauthorizedException,
  type ExecutionContext,
} from '@nestjs/common';

export type Role = 'ADMIN' | 'MERCHANT' | 'MEMBER';

export interface JwtPayload {
  userId: string;
  role: Role;
  merchantId?: string | null;
}

/** يعيد الحمولة كاملة أو مفتاحًا منها */
export const CurrentUser = createParamDecorator<
  keyof JwtPayload | undefined,
  JwtPayload[keyof JwtPayload] | JwtPayload
>(
  (
    key: keyof JwtPayload | undefined,
    ctx: ExecutionContext,
  ): JwtPayload[keyof JwtPayload] | JwtPayload => {
    const req = ctx.switchToHttp().getRequest<{ user?: JwtPayload }>();
    const user = req.user;
    if (!user) throw new UnauthorizedException('Unauthorized');

    return key ? user[key] : user;
  },
);

/** معرف المستخدم من الـ JWT (اسم الحقل الصحيح userId) */
export const CurrentUserId = createParamDecorator<void, string>(
  (_: void, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest<{ user?: JwtPayload }>();
    const user = req.user;
    if (!user?.userId) throw new UnauthorizedException('Unauthorized');
    return user.userId;
  },
);

/** معرف التاجر من الـ JWT */
export const CurrentMerchantId = createParamDecorator<void, string | null>(
  (_: void, ctx: ExecutionContext): string | null => {
    const req = ctx.switchToHttp().getRequest<{ user?: JwtPayload }>();
    const user = req.user;
    if (!user) throw new UnauthorizedException('Unauthorized');
    return user.merchantId ?? null;
  },
);

/** دور المستخدم من الـ JWT (اختياري) */
export const CurrentRole = createParamDecorator<void, Role>(
  (_: void, ctx: ExecutionContext): Role => {
    const req = ctx.switchToHttp().getRequest<{ user?: JwtPayload }>();
    const user = req.user;
    if (!user?.role) throw new UnauthorizedException('Unauthorized');
    return user.role;
  },
);
