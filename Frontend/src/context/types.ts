// src/context/types.ts
export type Role = "ADMIN" | "MERCHANT" | "MEMBER";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  merchantId: string | null;
  firstLogin: boolean;
  emailVerified: boolean;
  storeName?: string;
  storeLogoUrl?: string;
  storeAvatarUrl?: string;
}

// نوع البيانات القادمة من الباك إند (قبل التحويل)
export interface BackendUser {
  id: string;
  name: string;
  email: string;
  role: string; // string من الباك إند، سيتم تحويله إلى Role
  merchantId: string | null;
  firstLogin: boolean;
  emailVerified: boolean;
}

export interface AuthPayload {
  accessToken: string;
  user: BackendUser;
}


