'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { db } from '@/db/repository';
import { SESSION_COOKIE_NAME } from '@/server/auth';
import { GATEWAY_COOKIE_NAME, DEFAULT_GATEWAY_PASSCODE } from '@/server/constants';
import { ActionResult } from '@/server/boundaries';

export async function loginAction(partnerCode: 'ANURAG' | 'VIVEK'): Promise<ActionResult> {
  try {
    // Defense-in-depth: Ensure the Front Door Security Gateway has been unlocked
    const gatewayCookie = cookies().get(GATEWAY_COOKIE_NAME);
    if (process.env.NODE_ENV !== 'test' && gatewayCookie?.value !== 'unlocked') {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Security Gateway is locked. Please enter the master passcode at the front door.',
        },
      };
    }

    // Dynamic lookup: organization is determined from the verified partner record
    const partner = db.getPartnerByCode(partnerCode);
    if (!partner || !partner.isActive) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: `Partner ${partnerCode} is inactive or not found` },
      };
    }

    const maxAge = 60 * 60 * 24 * 30; // 30 days
    const expires = new Date(Date.now() + maxAge * 1000);

    cookies().set(SESSION_COOKIE_NAME, partner.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge,
      expires,
    });

    revalidatePath('/');
    revalidatePath('/dashboard');

    return { success: true, data: partner };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Login failed';
    return { success: false, error: { code: 'SERVER_ERROR', message } };
  }
}

export async function switchPartnerAction(partnerCode: 'ANURAG' | 'VIVEK'): Promise<ActionResult> {
  // Security guard: In production builds, partner switching must be completely disabled
  if (process.env.NODE_ENV === 'production') {
    return {
      success: false,
      error: { code: 'FORBIDDEN', message: 'Partner switching is strictly disabled in production' },
    };
  }

  try {
    const partner = db.getPartnerByCode(partnerCode);
    if (!partner) {
      return { success: false, error: { code: 'NOT_FOUND', message: `Partner ${partnerCode} not found` } };
    }

    const maxAge = 60 * 60 * 24 * 30;
    cookies().set(SESSION_COOKIE_NAME, partner.id, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge,
      expires: new Date(Date.now() + maxAge * 1000),
    });

    revalidatePath('/');
    revalidatePath('/dashboard');

    return { success: true, data: partner };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to switch partner session';
    return { success: false, error: { code: 'SERVER_ERROR', message } };
  }
}

export async function logoutAction(): Promise<ActionResult> {
  // Explicitly invalidate session with immediate expiration
  cookies().set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });
  cookies().delete(SESSION_COOKIE_NAME);
  revalidatePath('/');
  return { success: true };
}

export async function resetDatabaseAction(): Promise<ActionResult> {
  // Security guard: In production, database reset must be completely disabled
  if (process.env.NODE_ENV === 'production') {
    return {
      success: false,
      error: { code: 'FORBIDDEN', message: 'Database reset is strictly disabled in production' },
    };
  }

  try {
    db.resetToSeed();
    revalidatePath('/');
    revalidatePath('/dashboard');
    revalidatePath('/clients');
    revalidatePath('/billing');
    revalidatePath('/payments');
    revalidatePath('/expenses');
    revalidatePath('/settlements');
    revalidatePath('/audit');
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to reset database';
    return { success: false, error: { code: 'SERVER_ERROR', message } };
  }
}

export async function verifyGatewayPasscodeAction(passcode: string): Promise<ActionResult> {
  const expectedPasscode = process.env.GATEWAY_PASSCODE || DEFAULT_GATEWAY_PASSCODE;

  if (!passcode || passcode.trim() !== expectedPasscode.trim()) {
    return {
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Incorrect passcode. Security access denied.' },
    };
  }

  const maxAge = 60 * 60 * 24 * 30; // 30 days
  const expires = new Date(Date.now() + maxAge * 1000);

  cookies().set(GATEWAY_COOKIE_NAME, 'unlocked', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge,
    expires,
  });

  return { success: true };
}

export async function lockGatewayAction(): Promise<ActionResult> {
  cookies().set(GATEWAY_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });
  cookies().delete(GATEWAY_COOKIE_NAME);
  revalidatePath('/login');
  return { success: true };
}

