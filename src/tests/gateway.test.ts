import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockCookieStore: Record<string, { value: string; options?: Record<string, unknown> }> = {};

vi.mock('next/headers', () => ({
  cookies: () => ({
    get: (name: string) => (mockCookieStore[name] ? { name, value: mockCookieStore[name].value } : undefined),
    set: (name: string, value: string, options?: Record<string, unknown>) => {
      mockCookieStore[name] = { value, options };
    },
    delete: (name: string) => {
      delete mockCookieStore[name];
    },
  }),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import { verifyGatewayPasscodeAction, lockGatewayAction, loginAction } from '@/server/actions/auth';
import { DEFAULT_GATEWAY_PASSCODE, GATEWAY_COOKIE_NAME } from '@/server/constants';

describe('Front Door Security Gateway Action Tests', () => {
  beforeEach(() => {
    for (const key of Object.keys(mockCookieStore)) {
      delete mockCookieStore[key];
    }
  });

  it('rejects empty passcode', async () => {
    const res = await verifyGatewayPasscodeAction('');
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('UNAUTHORIZED');
    expect(mockCookieStore[GATEWAY_COOKIE_NAME]).toBeUndefined();
  });

  it('rejects incorrect passcode', async () => {
    const res = await verifyGatewayPasscodeAction('wrong_password_123');
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('UNAUTHORIZED');
    expect(mockCookieStore[GATEWAY_COOKIE_NAME]).toBeUndefined();
  });

  it('accepts correct master passcode SFDC@2026 and sets unlocked cookie', async () => {
    const res = await verifyGatewayPasscodeAction(DEFAULT_GATEWAY_PASSCODE);
    expect(res.success).toBe(true);
    expect(mockCookieStore[GATEWAY_COOKIE_NAME]).toBeDefined();
    expect(mockCookieStore[GATEWAY_COOKIE_NAME].value).toBe('unlocked');
    expect(mockCookieStore[GATEWAY_COOKIE_NAME].options?.httpOnly).toBe(true);
  });

  it('lockGatewayAction executes successfully and clears cookie', async () => {
    mockCookieStore[GATEWAY_COOKIE_NAME] = { value: 'unlocked' };
    const res = await lockGatewayAction();
    expect(res.success).toBe(true);
    expect(mockCookieStore[GATEWAY_COOKIE_NAME]).toBeUndefined();
  });

  it('rejects partner login if gateway is locked in production mode', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    delete mockCookieStore[GATEWAY_COOKIE_NAME];

    const res = await loginAction('ANURAG');
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('UNAUTHORIZED');
    expect(res.error?.message).toContain('Security Gateway is locked');

    vi.unstubAllEnvs();
  });

  it('allows partner login if gateway is unlocked in production mode', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    mockCookieStore[GATEWAY_COOKIE_NAME] = { value: 'unlocked' };

    const res = await loginAction('ANURAG');
    expect(res.success).toBe(true);
    expect(res.data).toBeDefined();

    vi.unstubAllEnvs();
  });
});
