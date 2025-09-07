// src/common/interfaces/request-with-user.interface.ts
import type { Request } from 'express';

export interface JwtPayload {
  userId: string;
  role: 'ADMIN' | 'MERCHANT' | 'MEMBER';
  merchantId?: string | null;
}

export interface RequestWithUser extends Request {
  user?: JwtPayload; // من JwtAuthGuard(passport)
  authUser?: {
    _id: any;
    role: 'ADMIN' | 'MERCHANT' | 'MEMBER';
    emailVerified: boolean;
    active: boolean;
    merchantId?: any;
  } | null;
  authMerchant?: {
    _id: any;
    active: boolean;
    deletedAt?: Date | null;
  } | null;
}
