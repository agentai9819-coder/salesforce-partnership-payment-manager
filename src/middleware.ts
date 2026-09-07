import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME, VALID_PARTNER_IDS } from './server/constants';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public assets, login route, and Next.js internals
  if (
    pathname === '/login' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const session = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  // Reject missing, forged, or invalid partner session cookies
  if (!session || !(VALID_PARTNER_IDS as readonly string[]).includes(session)) {
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname);
    }
    const response = NextResponse.redirect(loginUrl);
    if (session) {
      response.cookies.delete(SESSION_COOKIE_NAME);
    }
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
