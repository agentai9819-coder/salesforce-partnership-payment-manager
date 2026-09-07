import { describe, it, expect, beforeEach } from 'vitest';
import { calculateMonthlySettlement } from '@/domain/financial/engine';
import { DatabaseRepository } from '@/db/repository';
import {
  ClientBillingPlan,
  ClientPayment,
  ExternalDisbursement,
  BusinessAdjustment,
} from '@/domain/types/entities';

describe('Settlement Test Matrix (Scenarios A through T)', () => {
  const anuragId = 'partner-anurag-uuid';
  const vivekId = 'partner-vivek-uuid';

  let db: DatabaseRepository;

  beforeEach(() => {
    db = DatabaseRepository.getInstance();
    db.resetToSeed();
  });

  // A. Both partners collect client money
  it('A. Both partners collect client money -> 50/50 entitlement and operational transfer', () => {
    const payments: ClientPayment[] = [
      {
        id: 'p-a1',
        billingPlanId: 'bp-1',
        collectedByPartnerId: anuragId,
        paymentDate: '2026-09-10',
        amountReceived: '30000.00',
        status: 'CONFIRMED',
        createdByPartnerId: anuragId,
        createdAt: '2026-09-10T00:00:00Z',
        updatedAt: '2026-09-10T00:00:00Z',
      },
      {
        id: 'p-a2',
        billingPlanId: 'bp-2',
        collectedByPartnerId: vivekId,
        paymentDate: '2026-09-12',
        amountReceived: '10000.00',
        status: 'CONFIRMED',
        createdByPartnerId: vivekId,
        createdAt: '2026-09-12T00:00:00Z',
        updatedAt: '2026-09-12T00:00:00Z',
      },
    ];

    const res = calculateMonthlySettlement({
      periodKey: '2026-09',
      anuragPartnerId: anuragId,
      vivekPartnerId: vivekId,
      billingPlans: [],
      payments,
      disbursements: [],
      adjustments: [],
    });

    expect(res.totalCollected).toBe('40000.00');
    expect(res.netPartnershipIncome).toBe('40000.00');
    expect(res.anuragEntitlement).toBe('20000.00');
    expect(res.vivekEntitlement).toBe('20000.00');
    expect(res.anuragLiquidCashHeld).toBe('30000.00');
    expect(res.vivekLiquidCashHeld).toBe('10000.00');
    expect(res.finalSettlementDirection).toBe('ANURAG_PAYS_VIVEK');
    expect(res.finalSettlementAmount).toBe('10000.00');
  });

  // B. Only Anurag collects
  it('B. Only Anurag collects -> Anurag transfers Vivek 50% share', () => {
    const payments: ClientPayment[] = [
      {
        id: 'p-b1',
        billingPlanId: 'bp-1',
        collectedByPartnerId: anuragId,
        paymentDate: '2026-09-10',
        amountReceived: '50000.00',
        status: 'CONFIRMED',
        createdByPartnerId: anuragId,
        createdAt: '2026-09-10T00:00:00Z',
        updatedAt: '2026-09-10T00:00:00Z',
      },
    ];

    const res = calculateMonthlySettlement({
      periodKey: '2026-09',
      anuragPartnerId: anuragId,
      vivekPartnerId: vivekId,
      billingPlans: [],
      payments,
      disbursements: [],
      adjustments: [],
    });

    expect(res.anuragLiquidCashHeld).toBe('50000.00');
    expect(res.vivekLiquidCashHeld).toBe('0.00');
    expect(res.finalSettlementDirection).toBe('ANURAG_PAYS_VIVEK');
    expect(res.finalSettlementAmount).toBe('25000.00');
  });

  // C. Only Vivek collects
  it('C. Only Vivek collects -> Vivek transfers Anurag 50% share', () => {
    const payments: ClientPayment[] = [
      {
        id: 'p-c1',
        billingPlanId: 'bp-1',
        collectedByPartnerId: vivekId,
        paymentDate: '2026-09-10',
        amountReceived: '60000.00',
        status: 'CONFIRMED',
        createdByPartnerId: vivekId,
        createdAt: '2026-09-10T00:00:00Z',
        updatedAt: '2026-09-10T00:00:00Z',
      },
    ];

    const res = calculateMonthlySettlement({
      periodKey: '2026-09',
      anuragPartnerId: anuragId,
      vivekPartnerId: vivekId,
      billingPlans: [],
      payments,
      disbursements: [],
      adjustments: [],
    });

    expect(res.anuragLiquidCashHeld).toBe('0.00');
    expect(res.vivekLiquidCashHeld).toBe('60000.00');
    expect(res.finalSettlementDirection).toBe('VIVEK_PAYS_ANURAG');
    expect(res.finalSettlementAmount).toBe('30000.00');
  });

  // D. Anurag pays external cost
  it('D. Anurag pays external cost -> deducted from pool and reduces Anurag cash held', () => {
    const payments: ClientPayment[] = [
      {
        id: 'p-d1',
        billingPlanId: 'bp-1',
        collectedByPartnerId: vivekId,
        paymentDate: '2026-09-10',
        amountReceived: '40000.00',
        status: 'CONFIRMED',
        createdByPartnerId: vivekId,
        createdAt: '2026-09-10T00:00:00Z',
        updatedAt: '2026-09-10T00:00:00Z',
      },
    ];
    const disbursements: ExternalDisbursement[] = [
      {
        id: 'ed-d1',
        billingPeriodId: 'bp-1',
        externalPartyId: 'ep-1',
        disbursedByPartnerId: anuragId,
        amountPaid: '10000.00',
        disbursementDate: '2026-09-11',
        status: 'CONFIRMED',
        createdByPartnerId: anuragId,
        createdAt: '2026-09-11T00:00:00Z',
        updatedAt: '2026-09-11T00:00:00Z',
      },
    ];

    const res = calculateMonthlySettlement({
      periodKey: '2026-09',
      anuragPartnerId: anuragId,
      vivekPartnerId: vivekId,
      billingPlans: [],
      payments,
      disbursements,
      adjustments: [],
    });

    expect(res.netPartnershipIncome).toBe('30000.00'); // 40k - 10k
    expect(res.anuragEntitlement).toBe('15000.00');
    expect(res.vivekEntitlement).toBe('15000.00');
    expect(res.anuragLiquidCashHeld).toBe('-10000.00');
    expect(res.vivekLiquidCashHeld).toBe('40000.00');
    expect(res.finalSettlementDirection).toBe('VIVEK_PAYS_ANURAG');
    expect(res.finalSettlementAmount).toBe('25000.00'); // Vivek pays 40k - 15k = 25k to Anurag
  });

  // E. Vivek pays external cost
  it('E. Vivek pays external cost -> deducted from pool and reduces Vivek cash held', () => {
    const payments: ClientPayment[] = [
      {
        id: 'p-e1',
        billingPlanId: 'bp-1',
        collectedByPartnerId: anuragId,
        paymentDate: '2026-09-10',
        amountReceived: '40000.00',
        status: 'CONFIRMED',
        createdByPartnerId: anuragId,
        createdAt: '2026-09-10T00:00:00Z',
        updatedAt: '2026-09-10T00:00:00Z',
      },
    ];
    const disbursements: ExternalDisbursement[] = [
      {
        id: 'ed-e1',
        billingPeriodId: 'bp-1',
        externalPartyId: 'ep-1',
        disbursedByPartnerId: vivekId,
        amountPaid: '10000.00',
        disbursementDate: '2026-09-11',
        status: 'CONFIRMED',
        createdByPartnerId: vivekId,
        createdAt: '2026-09-11T00:00:00Z',
        updatedAt: '2026-09-11T00:00:00Z',
      },
    ];

    const res = calculateMonthlySettlement({
      periodKey: '2026-09',
      anuragPartnerId: anuragId,
      vivekPartnerId: vivekId,
      billingPlans: [],
      payments,
      disbursements,
      adjustments: [],
    });

    expect(res.netPartnershipIncome).toBe('30000.00');
    expect(res.anuragLiquidCashHeld).toBe('40000.00');
    expect(res.vivekLiquidCashHeld).toBe('-10000.00');
    expect(res.finalSettlementDirection).toBe('ANURAG_PAYS_VIVEK');
    expect(res.finalSettlementAmount).toBe('25000.00');
  });

  // F. Both partners pay external costs
  it('F. Both partners pay external costs -> correctly aggregates and balances', () => {
    const payments: ClientPayment[] = [
      {
        id: 'p-f1',
        billingPlanId: 'bp-1',
        collectedByPartnerId: anuragId,
        paymentDate: '2026-09-10',
        amountReceived: '50000.00',
        status: 'CONFIRMED',
        createdByPartnerId: anuragId,
        createdAt: '2026-09-10T00:00:00Z',
        updatedAt: '2026-09-10T00:00:00Z',
      },
    ];
    const disbursements: ExternalDisbursement[] = [
      {
        id: 'ed-f1',
        billingPeriodId: 'bp-1',
        externalPartyId: 'ep-1',
        disbursedByPartnerId: anuragId,
        amountPaid: '8000.00',
        disbursementDate: '2026-09-11',
        status: 'CONFIRMED',
        createdByPartnerId: anuragId,
        createdAt: '2026-09-11T00:00:00Z',
        updatedAt: '2026-09-11T00:00:00Z',
      },
      {
        id: 'ed-f2',
        billingPeriodId: 'bp-1',
        externalPartyId: 'ep-2',
        disbursedByPartnerId: vivekId,
        amountPaid: '12000.00',
        disbursementDate: '2026-09-11',
        status: 'CONFIRMED',
        createdByPartnerId: vivekId,
        createdAt: '2026-09-11T00:00:00Z',
        updatedAt: '2026-09-11T00:00:00Z',
      },
    ];

    const res = calculateMonthlySettlement({
      periodKey: '2026-09',
      anuragPartnerId: anuragId,
      vivekPartnerId: vivekId,
      billingPlans: [],
      payments,
      disbursements,
      adjustments: [],
    });

    // Total collections: 50,000. Total disb: 20,000. Net: 30,000. Entitlement: 15,000 each.
    // Anurag cash: 50,000 - 8,000 = 42,000. Entitlement: 15,000. Excess: 27,000.
    // Vivek cash: 0 - 12,000 = -12,000. Entitlement: 15,000. Deficit: 27,000.
    expect(res.netPartnershipIncome).toBe('30000.00');
    expect(res.anuragLiquidCashHeld).toBe('42000.00');
    expect(res.vivekLiquidCashHeld).toBe('-12000.00');
    expect(res.finalSettlementDirection).toBe('ANURAG_PAYS_VIVEK');
    expect(res.finalSettlementAmount).toBe('27000.00');
  });

  // G. External obligation exists but has not yet been paid
  it('G. External obligation exists but unpaid -> does NOT reduce realized cash pool', () => {
    // Expected obligation is purely contractual, cash realized pool only deducts confirmed disbursements
    const payments: ClientPayment[] = [
      {
        id: 'p-g1',
        billingPlanId: 'bp-1',
        collectedByPartnerId: anuragId,
        paymentDate: '2026-09-10',
        amountReceived: '30000.00',
        status: 'CONFIRMED',
        createdByPartnerId: anuragId,
        createdAt: '2026-09-10T00:00:00Z',
        updatedAt: '2026-09-10T00:00:00Z',
      },
    ];

    const res = calculateMonthlySettlement({
      periodKey: '2026-09',
      anuragPartnerId: anuragId,
      vivekPartnerId: vivekId,
      billingPlans: [],
      payments,
      disbursements: [], // 0 disbursements paid
      adjustments: [],
    });

    expect(res.totalExternalDisbursed).toBe('0.00');
    expect(res.netPartnershipIncome).toBe('30000.00');
    expect(res.anuragEntitlement).toBe('15000.00');
  });

  // H. External cost was paid in advance
  it('H. External cost paid in advance when collections = ₹0 -> rebalances 50% advance', () => {
    const disbursements: ExternalDisbursement[] = [
      {
        id: 'ed-h1',
        billingPeriodId: 'bp-1',
        externalPartyId: 'ep-1',
        disbursedByPartnerId: anuragId,
        amountPaid: '10000.00',
        disbursementDate: '2026-09-02',
        status: 'CONFIRMED',
        createdByPartnerId: anuragId,
        createdAt: '2026-09-02T00:00:00Z',
        updatedAt: '2026-09-02T00:00:00Z',
      },
    ];

    const res = calculateMonthlySettlement({
      periodKey: '2026-09',
      anuragPartnerId: anuragId,
      vivekPartnerId: vivekId,
      billingPlans: [],
      payments: [],
      disbursements,
      adjustments: [],
    });

    expect(res.netPartnershipIncome).toBe('-10000.00');
    expect(res.anuragLiquidCashHeld).toBe('-10000.00');
    expect(res.vivekLiquidCashHeld).toBe('0.00');
    expect(res.finalSettlementDirection).toBe('VIVEK_PAYS_ANURAG');
    expect(res.finalSettlementAmount).toBe('5000.00');
  });

  // I. Partial client collection
  it('I. Partial client collection -> correctly tracks outstanding receivable without fabricating income', () => {
    const billingPlans: ClientBillingPlan[] = [
      {
        id: 'bp-i1',
        clientId: 'c-1',
        billingPeriodId: 'bp-1',
        grossBillingAmount: '50000.00',
        createdByPartnerId: anuragId,
        updatedByPartnerId: anuragId,
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
    ];
    const payments: ClientPayment[] = [
      {
        id: 'p-i1',
        billingPlanId: 'bp-i1',
        collectedByPartnerId: vivekId,
        paymentDate: '2026-09-10',
        amountReceived: '20000.00',
        status: 'CONFIRMED',
        createdByPartnerId: vivekId,
        createdAt: '2026-09-10T00:00:00Z',
        updatedAt: '2026-09-10T00:00:00Z',
      },
    ];

    const res = calculateMonthlySettlement({
      periodKey: '2026-09',
      anuragPartnerId: anuragId,
      vivekPartnerId: vivekId,
      billingPlans,
      payments,
      disbursements: [],
      adjustments: [],
    });

    expect(res.totalBilled).toBe('50000.00');
    expect(res.totalCollected).toBe('20000.00');
    expect(res.outstandingReceivable).toBe('30000.00');
    expect(res.netPartnershipIncome).toBe('20000.00');
  });

  // J. Multiple collections in one billing period
  it('J. Multiple collections in one billing period -> sums accurately', () => {
    const payments: ClientPayment[] = [
      {
        id: 'p-j1',
        billingPlanId: 'bp-1',
        collectedByPartnerId: anuragId,
        paymentDate: '2026-09-05',
        amountReceived: '12500.50',
        status: 'CONFIRMED',
        createdByPartnerId: anuragId,
        createdAt: '2026-09-05T00:00:00Z',
        updatedAt: '2026-09-05T00:00:00Z',
      },
      {
        id: 'p-j2',
        billingPlanId: 'bp-1',
        collectedByPartnerId: anuragId,
        paymentDate: '2026-09-20',
        amountReceived: '12500.50',
        status: 'CONFIRMED',
        createdByPartnerId: anuragId,
        createdAt: '2026-09-20T00:00:00Z',
        updatedAt: '2026-09-20T00:00:00Z',
      },
    ];

    const res = calculateMonthlySettlement({
      periodKey: '2026-09',
      anuragPartnerId: anuragId,
      vivekPartnerId: vivekId,
      billingPlans: [],
      payments,
      disbursements: [],
      adjustments: [],
    });

    expect(res.totalCollected).toBe('25001.00');
    expect(res.anuragEntitlement).toBe('12500.50');
    expect(res.vivekEntitlement).toBe('12500.50');
    expect(res.finalSettlementAmount).toBe('12500.50');
  });

  // K. Multiple external disbursements
  it('K. Multiple external disbursements -> sums accurately', () => {
    const disbursements: ExternalDisbursement[] = [
      {
        id: 'ed-k1',
        billingPeriodId: 'bp-1',
        externalPartyId: 'ep-1',
        disbursedByPartnerId: anuragId,
        amountPaid: '5000.25',
        disbursementDate: '2026-09-05',
        status: 'CONFIRMED',
        createdByPartnerId: anuragId,
        createdAt: '2026-09-05T00:00:00Z',
        updatedAt: '2026-09-05T00:00:00Z',
      },
      {
        id: 'ed-k2',
        billingPeriodId: 'bp-1',
        externalPartyId: 'ep-2',
        disbursedByPartnerId: anuragId,
        amountPaid: '4999.75',
        disbursementDate: '2026-09-20',
        status: 'CONFIRMED',
        createdByPartnerId: anuragId,
        createdAt: '2026-09-20T00:00:00Z',
        updatedAt: '2026-09-20T00:00:00Z',
      },
    ];

    const res = calculateMonthlySettlement({
      periodKey: '2026-09',
      anuragPartnerId: anuragId,
      vivekPartnerId: vivekId,
      billingPlans: [],
      payments: [],
      disbursements,
      adjustments: [],
    });

    expect(res.totalExternalDisbursed).toBe('10000.00');
  });

  // L. Business carry-forward adjustment
  it('L. Business carry-forward adjustment -> Anurag owes Vivek ₹500 factored into settlement', () => {
    const payments: ClientPayment[] = [
      {
        id: 'p-l1',
        billingPlanId: 'bp-1',
        collectedByPartnerId: anuragId,
        paymentDate: '2026-09-10',
        amountReceived: '20000.00',
        status: 'CONFIRMED',
        createdByPartnerId: anuragId,
        createdAt: '2026-09-10T00:00:00Z',
        updatedAt: '2026-09-10T00:00:00Z',
      },
      {
        id: 'p-l2',
        billingPlanId: 'bp-2',
        collectedByPartnerId: vivekId,
        paymentDate: '2026-09-10',
        amountReceived: '20000.00',
        status: 'CONFIRMED',
        createdByPartnerId: vivekId,
        createdAt: '2026-09-10T00:00:00Z',
        updatedAt: '2026-09-10T00:00:00Z',
      },
    ];
    const adjustments: BusinessAdjustment[] = [
      {
        id: 'adj-l1',
        organizationId: 'org-1',
        effectiveBillingPeriodId: 'bp-1',
        fromPartnerId: anuragId,
        toPartnerId: vivekId,
        amount: '500.00',
        reason: 'Carry-forward balance from prior engagement',
        status: 'APPLIED',
        createdByPartnerId: anuragId,
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
    ];

    const res = calculateMonthlySettlement({
      periodKey: '2026-09',
      anuragPartnerId: anuragId,
      vivekPartnerId: vivekId,
      billingPlans: [],
      payments,
      disbursements: [],
      adjustments,
    });

    // Operationally balanced (20k each collected). Carry-forward requires Anurag to pay Vivek ₹500.
    expect(res.operationalBalancingDirection).toBe('BALANCED');
    expect(res.finalSettlementDirection).toBe('ANURAG_PAYS_VIVEK');
    expect(res.finalSettlementAmount).toBe('500.00');
  });

  // M. Multiple adjustments
  it('M. Multiple adjustments -> nets out correctly', () => {
    const adjustments: BusinessAdjustment[] = [
      {
        id: 'adj-m1',
        organizationId: 'org-1',
        effectiveBillingPeriodId: 'bp-1',
        fromPartnerId: anuragId,
        toPartnerId: vivekId,
        amount: '1500.00',
        reason: 'Adjustment 1',
        status: 'APPLIED',
        createdByPartnerId: anuragId,
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
      {
        id: 'adj-m2',
        organizationId: 'org-1',
        effectiveBillingPeriodId: 'bp-1',
        fromPartnerId: vivekId,
        toPartnerId: anuragId,
        amount: '500.00',
        reason: 'Adjustment 2',
        status: 'APPLIED',
        createdByPartnerId: vivekId,
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
    ];

    const res = calculateMonthlySettlement({
      periodKey: '2026-09',
      anuragPartnerId: anuragId,
      vivekPartnerId: vivekId,
      billingPlans: [],
      payments: [],
      disbursements: [],
      adjustments,
    });

    // Net adjustments: Anurag owes Vivek 1500 - 500 = 1000
    expect(res.finalSettlementDirection).toBe('ANURAG_PAYS_VIVEK');
    expect(res.finalSettlementAmount).toBe('1000.00');
  });

  // N. Adjustment in either direction
  it('N. Adjustment in opposite direction -> Vivek owes Anurag', () => {
    const adjustments: BusinessAdjustment[] = [
      {
        id: 'adj-n1',
        organizationId: 'org-1',
        effectiveBillingPeriodId: 'bp-1',
        fromPartnerId: vivekId,
        toPartnerId: anuragId,
        amount: '750.00',
        reason: 'Vivek compensation to Anurag',
        status: 'APPLIED',
        createdByPartnerId: vivekId,
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
    ];

    const res = calculateMonthlySettlement({
      periodKey: '2026-09',
      anuragPartnerId: anuragId,
      vivekPartnerId: vivekId,
      billingPlans: [],
      payments: [],
      disbursements: [],
      adjustments,
    });

    expect(res.finalSettlementDirection).toBe('VIVEK_PAYS_ANURAG');
    expect(res.finalSettlementAmount).toBe('750.00');
  });

  // O. Closed-period settlement cannot be altered directly
  it('O. Closed-period settlement cannot be altered directly in database repository', () => {
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
      anuragId
    );

    // Attempting to record payment in closed period must throw
    const plans = db.getBillingPlans(period.id);
    expect(() =>
      db.recordPayment(
        {
          billingPlanId: plans[0].id,
          collectedByPartnerId: anuragId,
          paymentDate: '2026-09-25',
          amountReceived: '5000.00',
          createdByPartnerId: anuragId,
        },
        anuragId
      )
    ).toThrow(/CLOSED/);
  });

  // P. Correction to closed period requires compensating adjustment
  it('P. Correction to closed period requires compensating adjustment in subsequent open period', () => {
    // September is closed. Partner adds adjustment into October to correct historical deviation
    const octPeriod = db.ensureBillingPeriod(db.getOrganizations()[0].id, '2026-10');
    const adj = db.addBusinessAdjustment(
      {
        organizationId: octPeriod.organizationId,
        effectiveBillingPeriodId: octPeriod.id,
        fromPartnerId: anuragId,
        toPartnerId: vivekId,
        amount: '250.00',
        reason: 'Compensating adjustment for September accounting variance',
        createdByPartnerId: anuragId,
      },
      anuragId
    );

    expect(adj.status).toBe('APPLIED');
    expect(adj.effectiveBillingPeriodId).toBe(octPeriod.id);
  });

  // Q. Duplicate financial submission with same idempotency key
  it('Q. Duplicate financial submission with same idempotency key returns original record without duplicate', () => {
    const period = db.getBillingPeriods()[0];
    const plan = db.getBillingPlans(period.id)[0];
    const key = 'idem-unique-test-key-q';

    const p1 = db.recordPayment(
      {
        billingPlanId: plan.id,
        collectedByPartnerId: anuragId,
        paymentDate: '2026-09-18',
        amountReceived: '3000.00',
        idempotencyKey: key,
        createdByPartnerId: anuragId,
      },
      anuragId
    );

    const initialCount = db.getPaymentsForPeriod(period.id).length;

    // Submit identical second request with the same idempotencyKey
    const p2 = db.recordPayment(
      {
        billingPlanId: plan.id,
        collectedByPartnerId: anuragId,
        paymentDate: '2026-09-18',
        amountReceived: '3000.00',
        idempotencyKey: key,
        createdByPartnerId: anuragId,
      },
      anuragId
    );

    const finalCount = db.getPaymentsForPeriod(period.id).length;

    expect(p2.id).toBe(p1.id);
    expect(finalCount).toBe(initialCount); // Zero duplicate rows inserted
  });

  // R. Two concurrent settlement attempts
  it('R. Two concurrent settlement attempts -> second is idempotent or throws safe conflict', () => {
    const period = db.getBillingPeriods()[0];
    const s1 = db.closePeriod(
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
        idempotencyKey: 'idem-settle-period-r',
      },
      anuragId
    );

    // Second call with same periodId returns existing settlement snapshot
    const s2 = db.closePeriod(
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
        idempotencyKey: 'idem-settle-period-r',
      },
      vivekId
    );

    expect(s2.id).toBe(s1.id);
  });

  // S. Zero-collection period
  it('S. Zero-collection period -> pool is ₹0 and entitlement is ₹0', () => {
    const res = calculateMonthlySettlement({
      periodKey: '2026-11',
      anuragPartnerId: anuragId,
      vivekPartnerId: vivekId,
      billingPlans: [],
      payments: [],
      disbursements: [],
      adjustments: [],
    });

    expect(res.totalCollected).toBe('0.00');
    expect(res.netPartnershipIncome).toBe('0.00');
    expect(res.anuragEntitlement).toBe('0.00');
    expect(res.vivekEntitlement).toBe('0.00');
    expect(res.finalSettlementDirection).toBe('BALANCED');
    expect(res.finalSettlementAmount).toBe('0.00');
  });

  // T. Zero-external-cost period
  it('T. Zero-external-cost period -> 100% of collected client revenue forms realized pool', () => {
    const payments: ClientPayment[] = [
      {
        id: 'p-t1',
        billingPlanId: 'bp-1',
        collectedByPartnerId: anuragId,
        paymentDate: '2026-09-10',
        amountReceived: '80000.00',
        status: 'CONFIRMED',
        createdByPartnerId: anuragId,
        createdAt: '2026-09-10T00:00:00Z',
        updatedAt: '2026-09-10T00:00:00Z',
      },
    ];

    const res = calculateMonthlySettlement({
      periodKey: '2026-09',
      anuragPartnerId: anuragId,
      vivekPartnerId: vivekId,
      billingPlans: [],
      payments,
      disbursements: [],
      adjustments: [],
    });

    expect(res.totalExternalDisbursed).toBe('0.00');
    expect(res.netPartnershipIncome).toBe('80000.00');
    expect(res.anuragEntitlement).toBe('40000.00');
    expect(res.vivekEntitlement).toBe('40000.00');
  });
});
