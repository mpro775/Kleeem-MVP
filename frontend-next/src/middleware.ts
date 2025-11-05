import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { locales, defaultLocale } from './i18n';
import { verifyAuthToken } from './lib/auth';

// Create the next-intl middleware
const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
  localeDetection: true,
});

// Protected route patterns
const protectedRoutes = [
  '/dashboard',
  '/admin',
  '/onboarding',
];

const authRoutes = ['/login', '/signup'];

export async function middleware(request: NextRequest) {
  // First, run the intl middleware
  const response = intlMiddleware(request);

  // Get the pathname
  const { pathname } = request.nextUrl;

  // Extract locale from pathname
  const pathnameLocale = pathname.split('/')[1];
  const pathnameWithoutLocale = pathname.replace(`/${pathnameLocale}`, '');

  // Check if route is protected
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathnameWithoutLocale.startsWith(route)
  );

  const isAuthRoute = authRoutes.some((route) =>
    pathnameWithoutLocale.startsWith(route)
  );

  // Get auth token from cookies
  const token = request.cookies.get('auth-token')?.value;

  // Verify token
  let user = null;
  if (token) {
    user = await verifyAuthToken(token);
  }

  // If accessing protected route without auth, redirect to login
  if (isProtectedRoute && !user) {
    const loginUrl = new URL(`/${pathnameLocale}/login`, request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If accessing auth route with valid token, redirect to dashboard
  if (isAuthRoute && user) {
    const dashboardUrl = new URL(`/${pathnameLocale}/dashboard`, request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // Role-based access control for admin routes
  if (pathnameWithoutLocale.startsWith('/admin') && user) {
    if (user.user.role !== 'ADMIN') {
      const homeUrl = new URL(`/${pathnameLocale}`, request.url);
      return NextResponse.redirect(homeUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
