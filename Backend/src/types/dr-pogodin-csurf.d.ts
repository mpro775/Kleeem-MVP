declare module '@dr.pogodin/csurf' {
  import type { RequestHandler } from 'express-serve-static-core';

  export type SameSite = 'strict' | 'lax' | 'none';

  export interface CsrfCookieOptions {
    httpOnly?: boolean;
    sameSite?: SameSite;
    secure?: boolean;
    path?: string;
    domain?: string;
    maxAge?: number;
  }

  export interface CsrfOptions {
    cookie?: boolean | CsrfCookieOptions;
  }

  /**
   * CommonJS export — الموديول نفسه يُستدعى كدالة
   */
  function csurf(options?: CsrfOptions): RequestHandler;
  export = csurf;
}
