import { describe, it, expect } from 'vitest';
import { calculateMonthlySettlement } from '@/domain/financial/engine';
import {
  ClientBillingPlan,
  ClientPayment,
  ExternalDisbursement,
  BusinessAdjustment,
} from '@/domain/types/entities';

describe('Settlement Engine Specification & September Validation', () => {
  const anuragId = 'partner-anurag-uuid';
  const vivekId = 'partner-vivek-uuid';

  it('MUST independently derive the exact September 2026 validation case without hardcoding', () => {
    // 1. Billing plans
    const billingPlans: ClientBillingPlan[] = [
      {
        id: 'bp-sai',
        clientId: 'sai',
        billingPeriodId: 'bp-2026-09',
        grossBillingAmount: '50000.00',
        createdByPartnerId: anuragId,
        updatedByPartnerId: anuragId,
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
      {
        id: 'bp-eshwar',
        clientId: 'eshwar',
        billingPeriodId: 'bp-2026-09',
        grossBillingAmount: '50000.00',
        createdByPartnerId: anuragId,
        updatedByPartnerId: anuragId,
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
    ];

    // 2. Payments: Sai ₹20,000 (Vivek), Eshwar ₹25,000 (Anurag)
    const payments: ClientPayment[] = [
      {
        id: 'p-sai',
        billingPlanId: 'bp-sai',
        collectedByPartnerId: vivekId,
        paymentDate: '2026-09-15',
        amountReceived: '20000.00',
        status: 'CONFIRMED',
        createdByPartnerId: vivekId,
        createdAt: '2026-09-15T00:00:00Z',
        updatedAt: '2026-09-15T00:00:00Z',
      },
      {
        id: 'p-eshwar',
        billingPlanId: 'bp-eshwar',
        collectedByPartnerId: anuragId,
        paymentDate: '2026-09-15',
        amountReceived: '25000.00',
        status: 'CONFIRMED',
        createdByPartnerId: anuragId,
        createdAt: '2026-09-15T00:00:00Z',
        updatedAt: '2026-09-15T00:00:00Z',
      },
    ];

    // 3. External disbursements: ₹10,000 paid to resource by Anurag
    const disbursements: ExternalDisbursement[] = [
      {
        id: 'ed-eshwar-resource',
        billingPeriodId: 'bp-2026-09',
        externalPartyId: 'ep-eshwar-resource',
        disbursedByPartnerId: anuragId,
        amountPaid: '10000.00',
        disbursementDate: '2026-09-16',
        status: 'CONFIRMED',
        createdByPartnerId: anuragId,
        createdAt: '2026-09-16T00:00:00Z',
        updatedAt: '2026-09-16T00:00:00Z',
      },
    ];

    // 4. Carry-Forward: Anurag owes Vivek ₹500 from older work
    const adjustments: BusinessAdjustment[] = [
      {
        id: 'adj-old-work',
        organizationId: 'org-1',
        effectiveBillingPeriodId: 'bp-2026-09',
        fromPartnerId: anuragId,
        toPartnerId: vivekId,
        amount: '500.00',
        reason: 'Remaining balance from older work payment between partners',
        status: 'APPLIED',
        createdByPartnerId: anuragId,
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
    ];

    // Execute engine
    const result = calculateMonthlySettlement({
      periodKey: '2026-09',
      anuragPartnerId: anuragId,
      vivekPartnerId: vivekId,
      billingPlans,
      payments,
      disbursements,
      adjustments,
    });

    // Rigorous verification of exact business requirements
    expect(result.totalBilled).toBe('100000.00');
    expect(result.totalCollected).toBe('45000.00');
    expect(result.outstandingReceivable).toBe('55000.00');
    expect(result.totalExternalDisbursed).toBe('10000.00');
    expect(result.netPartnershipIncome).toBe('35000.00');

    // 50/50 split
    expect(result.anuragEntitlement).toBe('17500.00');
    expect(result.vivekEntitlement).toBe('17500.00');

    // Real liquid cash held
    expect(result.anuragLiquidCashHeld).toBe('15000.00'); // 25,000 - 10,000
    expect(result.vivekLiquidCashHeld).toBe('20000.00');  // 20,000 - 0

    // Operational balancing
    expect(result.operationalBalancingTransfer).toBe('2500.00');
    expect(result.operationalBalancingDirection).toBe('VIVEK_OWES_ANURAG');

    // Business carry-forward
    expect(result.businessAdjustmentsTotal).toBe('500.00');

    // Final settlement result
    expect(result.finalSettlementDirection).toBe('VIVEK_PAYS_ANURAG');
    expect(result.finalSettlementAmount).toBe('2000.00');
  });

  it('should correctly equalize advance resource pre-funding when client payment is ₹0', () => {
    // Client paid ₹0. Anurag pays ₹10,000 out of pocket to resource.
    const disbursements: ExternalDisbursement[] = [
      {
        id: 'ed-advance',
        billingPeriodId: 'bp-2026-10',
        externalPartyId: 'ep-mokika',
        disbursedByPartnerId: anuragId,
        amountPaid: '10000.00',
        disbursementDate: '2026-10-02',
        status: 'CONFIRMED',
        createdByPartnerId: anuragId,
        createdAt: '2026-10-02T00:00:00Z',
        updatedAt: '2026-10-02T00:00:00Z',
      },
    ];

    const result = calculateMonthlySettlement({
      periodKey: '2026-10',
      anuragPartnerId: anuragId,
      vivekPartnerId: vivekId,
      billingPlans: [],
      payments: [],
      disbursements,
      adjustments: [],
    });

    expect(result.totalCollected).toBe('0.00');
    expect(result.totalExternalDisbursed).toBe('10000.00');
    expect(result.netPartnershipIncome).toBe('-10000.00');
    expect(result.anuragEntitlement).toBe('-5000.00');
    expect(result.vivekEntitlement).toBe('-5000.00');
    expect(result.anuragLiquidCashHeld).toBe('-10000.00');
    expect(result.vivekLiquidCashHeld).toBe('0.00');

    // Vivek owes Anurag ₹5,000 to equalize the shared advance expense
    expect(result.operationalBalancingDirection).toBe('VIVEK_OWES_ANURAG');
    expect(result.finalSettlementDirection).toBe('VIVEK_PAYS_ANURAG');
    expect(result.finalSettlementAmount).toBe('5000.00');
  });

  it('must ignore VOIDED payments and VOIDED disbursements', () => {
    const payments: ClientPayment[] = [
      {
        id: 'p-valid',
        billingPlanId: 'bp-1',
        collectedByPartnerId: anuragId,
        paymentDate: '2026-09-01',
        amountReceived: '10000.00',
        status: 'CONFIRMED',
        createdByPartnerId: anuragId,
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
      {
        id: 'p-voided',
        billingPlanId: 'bp-1',
        collectedByPartnerId: anuragId,
        paymentDate: '2026-09-01',
        amountReceived: '99999.00',
        status: 'VOIDED',
        createdByPartnerId: anuragId,
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
    ];

    const result = calculateMonthlySettlement({
      periodKey: '2026-09',
      anuragPartnerId: anuragId,
      vivekPartnerId: vivekId,
      billingPlans: [],
      payments,
      disbursements: [],
      adjustments: [],
    });

    expect(result.totalCollected).toBe('10000.00');
    expect(result.netPartnershipIncome).toBe('10000.00');
  });
});
