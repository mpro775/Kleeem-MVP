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


