// src/common/interfaces/jwt-payload.interface.ts
export type Role = 'ADMIN' | 'MERCHANT' | 'MEMBER';

export interface JwtPayload {
  userId: string;
  role: Role;
  merchantId?: string | null;
  iat?: number; // اختياري: مفيد لمقارنة passwordChangedAt لاحقاً
}
