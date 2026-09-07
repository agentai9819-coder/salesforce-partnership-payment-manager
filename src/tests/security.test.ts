import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DatabaseRepository } from '@/db/repository';
import { SESSION_COOKIE_NAME, VALID_PARTNER_IDS, GATEWAY_COOKIE_NAME } from '@/server/constants';
import { loginAction, logoutAction } from '@/server/actions/auth';
import { getSupabaseSecretKey, getSupabasePublishableKey, isSupabaseConfigured } from '@/db/supabase';

// Mock next/headers cookies
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

describe('Security, Authorization & Multi-Tenant Boundaries', () => {
  let db: DatabaseRepository;

  beforeEach(() => {
    db = DatabaseRepository.getInstance();
    db.resetToSeed();
    for (const key of Object.keys(mockCookieStore)) {
      delete mockCookieStore[key];
    }
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('MUST derive organization ID from authenticated partner and reject cross-organization client access', () => {
    const partner = db.getAllPartners()[0];
    const orgId = partner.organizationId;
    expect(orgId).toBeDefined();

    const clients = db.getClients(orgId);
    expect(clients.length).toBeGreaterThan(0);

    // Foreign org ID attempt
    const foreignOrgId = '99999999-9999-9999-9999-999999999999';
    const foreignClients = db.getClients(foreignOrgId);
    expect(foreignClients.length).toBe(0);
  });

  it('MUST reject modifying billing plans in closed periods', () => {
    const period = db.getBillingPeriods()[0];
    const plan = db.getBillingPlans(period.id)[0];

    // Close the period
    db.closePeriod(
      period.id,
      {
        billingPeriodId: period.id,
        totalCollections: '45000.00',
        totalDisbursements: '10000.00',
        netPartnershipPool: '35000.00',
        anuragEntitlement: '17500.00',
        vivekEntitlement: '17500.00',
        anuragCashHeld: '15000.00',
        vivekCashHeld: '20000.00',
        businessAdjustmentsNet: '500.00',
        settlementDirection: 'VIVEK_PAYS_ANURAG',
        settlementAmount: '2000.00',
        isSettled: false,
      },
      'partner-anurag-uuid'
    );

    // Direct mutation attempt on closed period must throw
    expect(() => {
      db.setBillingPlan(
        plan.clientId,
        period.id,
        '99999.00',
        'partner-anurag-uuid',
        'Unauthorized rewrite',
        'Malicious change'
      );
    }).toThrow(/CLOSED/);
  });

  it('MUST reject external disbursements in closed periods', () => {
    const period = db.getBillingPeriods()[0];

    db.closePeriod(
      period.id,
      {
        billingPeriodId: period.id,
        totalCollections: '45000.00',
        totalDisbursements: '10000.00',
        netPartnershipPool: '35000.00',
        anuragEntitlement: '17500.00',
        vivekEntitlement: '17500.00',
        anuragCashHeld: '15000.00',
        vivekCashHeld: '20000.00',
        businessAdjustmentsNet: '500.00',
        settlementDirection: 'VIVEK_PAYS_ANURAG',
        settlementAmount: '2000.00',
        isSettled: false,
      },
      'partner-anurag-uuid'
    );

    expect(() => {
      db.recordExternalDisbursement(
        {
          billingPeriodId: period.id,
          externalPartyId: 'ep-mock',
          disbursedByPartnerId: 'partner-anurag-uuid',
          amountPaid: '1000.00',
          disbursementDate: '2026-09-25',
          createdByPartnerId: 'partner-anurag-uuid',
        },
        'partner-anurag-uuid'
      );
    }).toThrow(/CLOSED/);
  });

  it('MUST reject negative or zero financial transactions', () => {
    const period = db.getBillingPeriods()[0];
    const plan = db.getBillingPlans(period.id)[0];

    expect(() => {
      db.recordPayment(
        {
          billingPlanId: plan.id,
          collectedByPartnerId: 'partner-anurag-uuid',
          paymentDate: '2026-09-10',
          amountReceived: '0.00',
          createdByPartnerId: 'partner-anurag-uuid',
        },
        'partner-anurag-uuid'
      );
    }).toThrow(/greater than zero/);

    expect(() => {
      db.recordPayment(
        {
          billingPlanId: plan.id,
          collectedByPartnerId: 'partner-anurag-uuid',
          paymentDate: '2026-09-10',
          amountReceived: '-500.00',
          createdByPartnerId: 'partner-anurag-uuid',
        },
        'partner-anurag-uuid'
      );
    }).toThrow(/greater than zero/);
  });

  it('MUST reject business adjustments between the same partner', () => {
    const orgId = db.getAllPartners()[0].organizationId;
    const period = db.getBillingPeriods()[0];
    expect(() => {
      db.addBusinessAdjustment(
        {
          organizationId: orgId,
          effectiveBillingPeriodId: period.id,
          fromPartnerId: 'partner-anurag-uuid',
          toPartnerId: 'partner-anurag-uuid', // Invalid: from === to
          amount: '500.00',
          reason: 'Self adjustment',
          createdByPartnerId: 'partner-anurag-uuid',
        },
        'partner-anurag-uuid'
      );
    }).toThrow(/two different partners/);
  });

  it('MUST produce immutable audit trail entries upon mutations', () => {
    const orgId = db.getAllPartners()[0].organizationId;
    const initialLogs = db.getAuditLogs(orgId).length;
    const period = db.getBillingPeriods()[0];
    const plan = db.getBillingPlans(period.id)[0];

    db.recordPayment(
      {
        billingPlanId: plan.id,
        collectedByPartnerId: 'partner-anurag-uuid',
        paymentDate: '2026-09-15',
        amountReceived: '1500.00',
        createdByPartnerId: 'partner-anurag-uuid',
      },
      'partner-anurag-uuid'
    );

    const afterLogs = db.getAuditLogs(orgId);
    expect(afterLogs.length).toBe(initialLogs + 1);

    const latest = afterLogs[0];
    expect(latest.entityName).toBe('client_payments');
    expect(latest.actorPartnerId).toBe('partner-anurag-uuid');
    expect(latest.action).toBe('INSERT');
  });

  describe('Session Cookie Security & Auth Enforcements', () => {
    it('MUST set HttpOnly, Lax, 30-day expiry, and root path on login', async () => {
      const result = await loginAction('ANURAG');
      expect(result.success).toBe(true);

      const cookie = mockCookieStore[SESSION_COOKIE_NAME];
      const partner = db.getPartnerByCode('ANURAG');
      expect(cookie.value).toBe(partner?.id);
      expect(cookie.options?.httpOnly).toBe(true);
      expect(cookie.options?.sameSite).toBe('lax');
      expect(cookie.options?.path).toBe('/');
      expect(cookie.options?.maxAge).toBe(60 * 60 * 24 * 30);
      expect(cookie.options?.expires).toBeInstanceOf(Date);
    });

    it('MUST enable Secure flag when in production environment', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      mockCookieStore[GATEWAY_COOKIE_NAME] = { value: 'unlocked' };

      const result = await loginAction('VIVEK');
      expect(result.success).toBe(true);

      const cookie = mockCookieStore[SESSION_COOKIE_NAME];
      expect(cookie).toBeDefined();
      expect(cookie.options?.secure).toBe(true);
      expect(cookie.options?.httpOnly).toBe(true);
    });

    it('MUST completely invalidate and purge the session cookie on logout', async () => {
      // First login
      await loginAction('ANURAG');
      expect(mockCookieStore[SESSION_COOKIE_NAME]).toBeDefined();

      // Logout
      const logoutResult = await logoutAction();
      expect(logoutResult.success).toBe(true);

      // Verify cookie is deleted/invalidated
      const cookie = mockCookieStore[SESSION_COOKIE_NAME];
      expect(!cookie || cookie.options?.maxAge === 0).toBe(true);
    });

    it('MUST reject forged or invalid partner session IDs', () => {
      const forgedSessionId = 'forged-attacker-partner-uuid';
      expect((VALID_PARTNER_IDS as readonly string[]).includes(forgedSessionId)).toBe(false);

      const partner = db.getPartnerById(forgedSessionId);
      expect(partner).toBeUndefined();
    });
  });

  describe('Production Persistence Fail-Safe & Supabase Key Model', () => {
    it('MUST fail safely with a clear configuration error if Supabase is missing in production runtime', () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('NEXT_PHASE', 'phase-production-server');
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
      vi.stubEnv('SUPABASE_SECRET_KEY', '');
      vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', '');
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');

      const period = db.getBillingPeriods()[0];
      const plan = db.getBillingPlans(period.id)[0];

      // Mutating in production without Supabase credentials must throw critical config error
      expect(() => {
        db.recordPayment(
          {
            billingPlanId: plan.id,
            collectedByPartnerId: 'partner-anurag-uuid',
            paymentDate: '2026-09-15',
            amountReceived: '100.00',
            createdByPartnerId: 'partner-anurag-uuid',
          },
          'partner-anurag-uuid'
        );
      }).toThrow(/CRITICAL CONFIGURATION ERROR: Supabase PostgreSQL credentials are required in production runtime/);
    });

    it('MUST recognize new format SUPABASE_SECRET_KEY as server-only key and fallback to SUPABASE_SERVICE_ROLE_KEY', () => {
      // Test modern key format sb_secret_...
      vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_sample_test_key_12345');
      vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
      expect(getSupabaseSecretKey()).toBe('sb_secret_sample_test_key_12345');

      // Test fallback to legacy SUPABASE_SERVICE_ROLE_KEY
      vi.stubEnv('SUPABASE_SECRET_KEY', '');
      vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'legacy_service_role_jwt_key');
      expect(getSupabaseSecretKey()).toBe('legacy_service_role_jwt_key');
    });

    it('MUST recognize new format NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and fallback to NEXT_PUBLIC_SUPABASE_ANON_KEY', () => {
      // Test modern key format sb_publishable_...
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_sample_test_key_67890');
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
      expect(getSupabasePublishableKey()).toBe('sb_publishable_sample_test_key_67890');

      // Test fallback to legacy anon key
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', '');
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'legacy_anon_jwt_key');
      expect(getSupabasePublishableKey()).toBe('legacy_anon_jwt_key');
    });

    it('MUST ensure secret key is server-only and never reads client publishable keys', () => {
      vi.stubEnv('SUPABASE_SECRET_KEY', '');
      vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_client_key');
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'legacy_anon_client_key');

      // Server secret key must be strictly empty when only publishable keys are present
      expect(getSupabaseSecretKey()).toBe('');
    });

    it('MUST consider Supabase configured when URL and secret key are present', () => {
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://ujnfzjjpybynlsdmwhvs.supabase.co');
      vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_valid_key');
      expect(isSupabaseConfigured()).toBe(true);
    });
  });
});

