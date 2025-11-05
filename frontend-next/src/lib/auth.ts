import { cookies } from 'next/headers';
import { jwtVerify, SignJWT } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const secret = new TextEncoder().encode(JWT_SECRET);

export type User = {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'MERCHANT' | 'MEMBER';
  merchantId: string | null;
  firstLogin: boolean;
  emailVerified: boolean;
  storeName?: string;
  storeLogoUrl?: string;
  storeAvatarUrl?: string;
};

export type AuthToken = {
  user: User;
  exp: number;
  iat: number;
};

export async function createAuthToken(user: User): Promise<string> {
  const token = await new SignJWT({ user })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(secret);

  return token;
}

export async function verifyAuthToken(
  token: string
): Promise<AuthToken | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as AuthToken;
  } catch {
    return null;
  }
}

export async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token');
  return token?.value || null;
}

export async function setAuthToken(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

export async function removeAuthToken(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('auth-token');
}

export async function getCurrentUser(): Promise<User | null> {
  const token = await getAuthToken();
  if (!token) return null;

  const payload = await verifyAuthToken(token);
  if (!payload) return null;

  return payload.user;
}

export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

export async function requireRole(
  ...roles: User['role'][]
): Promise<User> {
  const user = await requireAuth();
  if (!roles.includes(user.role)) {
    throw new Error('Forbidden');
  }
  return user;
}

