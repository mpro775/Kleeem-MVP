// src/common/interfaces/request-with-user.interface.ts
import type { Request } from 'express';

export interface JwtPayload {
  userId: string;
  role: 'ADMIN' | 'MERCHANT' | 'MEMBER';
  merchantId?: string | null;
}

export interface RequestWithUser extends Request {
  user?: JwtPayload;
  authUser?: {
    _id: unknown;
    role: 'ADMIN' | 'MERCHANT' | 'MEMBER';
    emailVerified: boolean;
    active: boolean;
    merchantId?: unknown;
  } | null;
  authMerchant?: {
    _id: unknown;
    active: boolean;
    deletedAt?: Date | null;
  } | null;
}

// ✅ Alias للتوافق مع الاسم الذي قد تتوقعه الاختبارات
export type RequestWithUserInterface = RequestWithUser;
