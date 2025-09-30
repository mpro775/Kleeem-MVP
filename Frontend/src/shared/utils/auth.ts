// src/shared/utils/auth.ts
import type { User, BackendUser, Role } from "@/context/types";

/**
 * تحويل BackendUser إلى User
 * يحول role من string إلى Role enum
 */
export function backendUserToUser(backendUser: BackendUser): User {
  return {
    id: backendUser.id,
    name: backendUser.name,
    email: backendUser.email,
    role: backendUser.role as Role, // تحويل string إلى Role enum
    merchantId: backendUser.merchantId,
    firstLogin: backendUser.firstLogin,
    emailVerified: backendUser.emailVerified,
  };
}
