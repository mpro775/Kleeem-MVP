import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { MS_PER_SECOND } from 'src/common/constants/common';

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

  private getSecureCookieOptions(): CookieOptions {
    const isProduction =
      (this.config.get<string>('NODE_ENV') || '').toLowerCase() ===
      'production';

    // تسمح بالتهيئة عبر البيئة، مع قيم افتراضية آمنة
    const domain =
      this.config.get<string>('COOKIE_DOMAIN') ||
      (isProduction ? '.kaleem-ai.com' : undefined);

    const sameSiteRaw = (
      this.config.get<string>('COOKIE_SAMESITE') ||
      (isProduction ? 'none' : 'lax')
    ).toLowerCase();
    const sameSite = (
      ['strict', 'lax', 'none'].includes(sameSiteRaw)
        ? sameSiteRaw
        : isProduction
          ? 'none'
          : 'lax'
    ) as 'strict' | 'lax' | 'none';

    const secureEnv = this.config.get<string>('COOKIE_SECURE');
    const secure =
      typeof secureEnv === 'string'
        ? ['1', 'true', 'yes', 'on'].includes(secureEnv.toLowerCase())
        : isProduction;

    return {
      httpOnly: true,
      secure,
      sameSite,
      ...(domain && { domain }),
      path: '/',
    };
  }

  setAccessTokenCookie(
    res: Response,
    accessToken: string,
    expiresInSeconds: number,
  ): void {
    const options = {
      ...this.getSecureCookieOptions(),
      maxAge: expiresInSeconds * MS_PER_SECOND,
    };
    res.cookie('accessToken', accessToken, options);
  }

  setRefreshTokenCookie(
    res: Response,
    refreshToken: string,
    expiresInSeconds: number,
  ): void {
    const options = {
      ...this.getSecureCookieOptions(),
      maxAge: expiresInSeconds * MS_PER_SECOND,
      // Additional security for refresh token
      httpOnly: true, // Prevent JavaScript access
      secure: true, // HTTPS only in production
      sameSite: 'strict', // Strict same-site policy
    };
    res.cookie('refreshToken', refreshToken, options as CookieOptions);
  }

  clearAuthCookies(res: Response): void {
    const options = this.getSecureCookieOptions();
    res.clearCookie('accessToken', options);
    res.clearCookie('refreshToken', options);
  }

  setSecureCookie(
    res: Response,
    name: string,
    value: string,
    expiresInSeconds?: number,
  ): void {
    const options = {
      ...this.getSecureCookieOptions(),
      maxAge: expiresInSeconds ? expiresInSeconds * MS_PER_SECOND : undefined,
    };
    res.cookie(name, value, options);
  }

  clearCookie(res: Response, name: string): void {
    const options = this.getSecureCookieOptions();
    res.clearCookie(name, options);
  }

  setSessionCookie(res: Response, name: string, value: string): void {
    const options = this.getSecureCookieOptions(); // بدون maxAge → session cookie
    res.cookie(name, value, options);
  }
}
