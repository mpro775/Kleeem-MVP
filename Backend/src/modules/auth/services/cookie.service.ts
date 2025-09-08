// src/modules/auth/services/cookie.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

export interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  domain?: string;
  maxAge?: number;
  path?: string;
}

@Injectable()
export class CookieService {
  constructor(private readonly config: ConfigService) {}

  /**
   * ✅ C4: إعداد كوكيز آمنة
   */
  private getSecureCookieOptions(): CookieOptions {
    const isProduction = this.config.get<string>('NODE_ENV') === 'production';

    return {
      httpOnly: true, // منع الوصول عبر JavaScript
      secure: isProduction, // HTTPS فقط في الإنتاج
      sameSite: isProduction ? 'none' : 'lax', // للـ cross-origin في الإنتاج
      domain: isProduction ? '.kaleem-ai.com' : undefined, // للـ subdomains
      path: '/',
    };
  }

  /**
   * تعيين Access Token في كوكيز آمنة
   */
  setAccessTokenCookie(
    res: Response,
    accessToken: string,
    expiresInSeconds: number,
  ): void {
    const options = {
      ...this.getSecureCookieOptions(),
      maxAge: expiresInSeconds * 1000, // Convert to milliseconds
    };

    res.cookie('accessToken', accessToken, options);
  }

  /**
   * تعيين Refresh Token في كوكيز آمنة
   */
  setRefreshTokenCookie(
    res: Response,
    refreshToken: string,
    expiresInSeconds: number,
  ): void {
    const options = {
      ...this.getSecureCookieOptions(),
      maxAge: expiresInSeconds * 1000, // Convert to milliseconds
    };

    res.cookie('refreshToken', refreshToken, options);
  }

  /**
   * حذف كوكيز التوكنات
   */
  clearAuthCookies(res: Response): void {
    const options = this.getSecureCookieOptions();

    res.clearCookie('accessToken', options);
    res.clearCookie('refreshToken', options);
  }

  /**
   * تعيين كوكيز مخصصة آمنة
   */
  setSecureCookie(
    res: Response,
    name: string,
    value: string,
    expiresInSeconds?: number,
  ): void {
    const options = {
      ...this.getSecureCookieOptions(),
      maxAge: expiresInSeconds ? expiresInSeconds * 1000 : undefined,
    };

    res.cookie(name, value, options);
  }

  /**
   * حذف كوكيز مخصصة
   */
  clearCookie(res: Response, name: string): void {
    const options = this.getSecureCookieOptions();
    res.clearCookie(name, options);
  }

  /**
   * تعيين كوكيز الجلسة (session-only)
   */
  setSessionCookie(res: Response, name: string, value: string): void {
    const options = {
      ...this.getSecureCookieOptions(),
      // لا maxAge = session cookie
    };

    res.cookie(name, value, options);
  }
}
