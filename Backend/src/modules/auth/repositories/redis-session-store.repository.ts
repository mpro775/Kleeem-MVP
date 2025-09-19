import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { SessionData, SessionStore } from './session-store.repository';

@Injectable()
export class RedisSessionStore implements SessionStore {
  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  private keySess(jti: string) {
    return `sess:${jti}`;
  }
  private keyUserSessions(userId: string) {
    return `user_sessions:${userId}`;
  }
  private keyBlacklist(jti: string) {
    return `bl:${jti}`;
  }

  async setSession(
    jti: string,
    data: SessionData,
    ttlSeconds: number,
  ): Promise<void> {
    await this.cache.set(
      this.keySess(jti),
      JSON.stringify(data),
      ttlSeconds * 1000,
    ); // ✅ ms
  }

  async getSession(jti: string): Promise<SessionData | null> {
    const s = await this.cache.get<string>(this.keySess(jti));
    if (!s) return null;
    try {
      return JSON.parse(s) as SessionData;
    } catch {
      return null;
    }
  }

  async deleteSession(jti: string): Promise<void> {
    await this.cache.del(this.keySess(jti));
  }

  async addUserSession(
    userId: string,
    jti: string,
    ttlSeconds: number,
  ): Promise<void> {
    const key = this.keyUserSessions(userId);
    const raw = await this.cache.get<string>(key);
    const arr: string[] = raw ? (JSON.parse(raw) as string[]) : [];
    if (!arr.includes(jti)) arr.push(jti);
    await this.cache.set(key, JSON.stringify(arr), ttlSeconds * 1000); // ✅ key الصحيح + ms
  }

  async getUserSessions(userId: string): Promise<string[]> {
    const raw = await this.cache.get<string>(this.keyUserSessions(userId));
    if (!raw) return [];
    try {
      return JSON.parse(raw) as string[];
    } catch {
      return [];
    }
  }

  async clearUserSessions(userId: string): Promise<void> {
    await this.cache.del(this.keyUserSessions(userId));
  }
  async addToBlacklist(jti: string, ttlSeconds: number): Promise<void> {
    await this.cache.set(this.keyBlacklist(jti), 'revoked', ttlSeconds * 1000); // ✅ ms
  }

  async isBlacklisted(jti: string): Promise<boolean> {
    const v = await this.cache.get(this.keyBlacklist(jti));
    return !!v;
  }
}
