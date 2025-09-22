export interface SessionData {
  userId: string;
  role: string;
  merchantId?: string | null;
  createdAt: number;
  lastUsed: number;
  userAgent?: string;
  ip?: string;
  csrfToken?: string; // CSRF token for double-submit cookie pattern
  refreshTokenHash?: string; // Hash of refresh token for validation
}

export interface SessionStore {
  // جلسات Refresh
  setSession(jti: string, data: SessionData, ttlSeconds: number): Promise<void>;
  getSession(jti: string): Promise<SessionData | null>;
  deleteSession(jti: string): Promise<void>;

  // قائمة جلسات المستخدم (لتنفيذ logoutAll)
  addUserSession(
    userId: string,
    jti: string,
    ttlSeconds: number,
  ): Promise<void>;
  getUserSessions(userId: string): Promise<string[]>;
  clearUserSessions(userId: string): Promise<void>;

  // القائمة السوداء للـ JWT IDs
  addToBlacklist(jti: string, ttlSeconds: number): Promise<void>;
  isBlacklisted(jti: string): Promise<boolean>;
}
