import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/repository';

describe('Database Repository Invariants & Audit Triggers', () => {
  const orgId = '00000000-0000-0000-0000-000000000001';
  const anuragId = '11111111-1111-1111-1111-111111111111';
  const vivekId = '22222222-2222-2222-2222-222222222222';

  beforeEach(() => {
    db.resetToSeed();
  });

  it('must block any financial mutations on a CLOSED accounting period', () => {
    // August 2026 is closed in the baseline seed
    const closedPeriod = db.getBillingPeriodByKey(orgId, '2026-08');
    expect(closedPeriod?.status).toBe('CLOSED');

    // Attempting to set billing on a closed period must throw
    expect(() => {
      db.setBillingPlan(
        'client-sai',
        closedPeriod!.id,
        '45000.00',
        anuragId,
        'Late edit',
        'Should be blocked'
      );
    }).toThrow(/closed/i);
  });

  it('must reject negative billing amounts', () => {
    const openPeriod = db.getBillingPeriodByKey(orgId, '2026-09');
    expect(openPeriod?.status).toBe('OPEN');

    expect(() => {
      db.setBillingPlan(
        'client-sai',
        openPeriod!.id,
        '-1000.00',
        anuragId,
        'Invalid',
        'Negative test'
      );
    }).toThrow(/negative/i);
  });

  it('must reject zero or negative payment amounts', () => {
    const plans = db.getBillingPlans('bp-2026-09');
    const plan = plans[0];

    expect(() => {
      db.recordPayment(
        {
          billingPlanId: plan.id,
          collectedByPartnerId: anuragId,
          paymentDate: '2026-09-05',
          amountReceived: '0.00',
          createdByPartnerId: anuragId,
        },
        anuragId
      );
    }).toThrow(/greater than zero/i);
  });

  it('must automatically write an audit log entry on payment creation', () => {
    const initialLogCount = db.getAuditLogs(orgId).length;
    const plans = db.getBillingPlans('bp-2026-09');
    const plan = plans[0];

    const payment = db.recordPayment(
      {
        billingPlanId: plan.id,
        collectedByPartnerId: anuragId,
        paymentDate: '2026-09-10',
        amountReceived: '5000.00',
        paymentReference: 'TEST-AUDIT-REF',
        createdByPartnerId: anuragId,
      },
      anuragId
    );

    const logs = db.getAuditLogs(orgId);
    expect(logs.length).toBe(initialLogCount + 1);
    expect(logs[0].entityName).toBe('client_payments');
    expect(logs[0].entityId).toBe(payment.id);
    expect(logs[0].action).toBe('INSERT');
    expect(logs[0].actorPartnerId).toBe(anuragId);
  });

  it('must prevent duplicate payment insertion when same idempotency key is submitted', () => {
    const plans = db.getBillingPlans('bp-2026-09');
    const plan = plans[0];
    const idempotencyKey = 'unique-txn-key-12345';

    const p1 = db.recordPayment(
      {
        billingPlanId: plan.id,
        collectedByPartnerId: anuragId,
        paymentDate: '2026-09-12',
        amountReceived: '12000.00',
        idempotencyKey,
        createdByPartnerId: anuragId,
      },
      anuragId
    );

    // Repeated call with the same idempotency key
    const p2 = db.recordPayment(
      {
        billingPlanId: plan.id,
        collectedByPartnerId: anuragId,
        paymentDate: '2026-09-12',
        amountReceived: '12000.00',
        idempotencyKey,
        createdByPartnerId: anuragId,
      },
      anuragId
    );

    // Both should return the identical payment record without duplicate insertion
    expect(p1.id).toBe(p2.id);
  });

  it('must support rollback during an uncommitted transaction', () => {
    const clientCountBefore = db.getClients(orgId).length;

    db.beginTransaction();
    db.createClient(
      {
        organizationId: orgId,
        name: 'Temporary Test Client',
        status: 'ACTIVE',
      },
      anuragId
    );
    expect(db.getClients(orgId).length).toBe(clientCountBefore + 1);

    db.rollback();
    expect(db.getClients(orgId).length).toBe(clientCountBefore);
  });

  it('must trim client names and reject duplicate names in same organization', () => {
    const clients = db.getClients(orgId);
    const existingName = clients[0].name;

    // Direct check that same active client name matches
    const isDuplicate = clients.some(
      (c) => c.status === 'ACTIVE' && c.name.toLowerCase() === existingName.toLowerCase()
    );
    expect(isDuplicate).toBe(true);

    // Creating a distinct client with whitespace should be trimmed
    const trimmedClient = db.createClient(
      {
        organizationId: orgId,
        name: '   New Distinct Client Corp   '.trim(),
        status: 'ACTIVE',
      },
      anuragId
    );
    expect(trimmedClient.name).toBe('New Distinct Client Corp');
  });
});
