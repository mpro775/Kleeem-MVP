export type Role = "ADMIN" | "MERCHANT" | "MEMBER";

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  role: Role;
  merchantId: string | null;
  firstLogin: boolean;
  emailVerified: boolean; // 👈 جديد
  storeName?: string;
  storeLogoUrl?: string;
  storeAvatarUrl?: string;
}

export interface AuthResponse {
  accessToken: string;
  user: UserDTO;
}