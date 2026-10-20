import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME, GATEWAY_COOKIE_NAME, HISTORICAL_COOKIE_NAMES } from '@/server/constants';

export async function GET(request: Request) {
  const cookieStore = cookies();
  const cookiesToPurge = [
    SESSION_COOKIE_NAME,
    GATEWAY_COOKIE_NAME,
    ...HISTORICAL_COOKIE_NAMES,
  ];

  for (const name of cookiesToPurge) {
    try {
      cookieStore.set(name, '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
        expires: new Date(0),
      });
      cookieStore.delete(name);
    } catch {
      // Continue
    }
  }

  const url = new URL('/login', request.url);
  return NextResponse.redirect(url, { status: 302 });
}
