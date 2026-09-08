import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/repository';
import { calculateMonthlySettlement } from '@/domain/financial/engine';

describe('Multi-User End-to-End Business Workflows & September Baseline Verification', () => {
  const orgId = '00000000-0000-0000-0000-000000000001';
  const anuragId = '11111111-1111-1111-1111-111111111111';
  const vivekId = '22222222-2222-2222-2222-222222222222';

  beforeEach(() => {
    db.resetToSeed();
  });

  it('MUST independently derive the exact September 2026 figures from database records', () => {
    const period = db.getBillingPeriodByKey(orgId, '2026-09')!;
    const billingPlans = db.getBillingPlans(period.id);
    const payments = db.getPaymentsForPeriod(period.id);
    const disbursements = db.getExternalDisbursements(period.id);
    const adjustments = db.getBusinessAdjustments(period.id);

    const summary = calculateMonthlySettlement({
      periodKey: period.periodKey,
      anuragPartnerId: anuragId,
      vivekPartnerId: vivekId,
      billingPlans,
      payments,
      disbursements,
      adjustments,
    });

    // Verification of true September figures: Sai has not paid, only Eshwar paid ₹25k to Anurag
    expect(summary.totalCollected).toBe('25000.00');
    expect(summary.totalExternalDisbursed).toBe('10000.00');
    expect(summary.netPartnershipIncome).toBe('15000.00');
    expect(summary.anuragEntitlement).toBe('7500.00');
    expect(summary.vivekEntitlement).toBe('7500.00');
    expect(summary.anuragLiquidCashHeld).toBe('15000.00'); // ₹25,000 collected - ₹10,000 paid to dev
    expect(summary.vivekLiquidCashHeld).toBe('0.00');      // ₹0 collected by Vivek (Sai has not paid)
    expect(summary.operationalBalancingTransfer).toBe('7500.00');
    expect(summary.operationalBalancingDirection).toBe('ANURAG_OWES_VIVEK');
    expect(summary.businessAdjustmentsTotal).toBe('0.00');
    expect(summary.finalSettlementAmount).toBe('7500.00');
    expect(summary.finalSettlementDirection).toBe('ANURAG_PAYS_VIVEK');
  });

  it('should support full collaborative lifecycle across Anurag and Vivek with shared state', () => {
    // 1. Anurag creates a client
    const newClient = db.createClient(
      {
        organizationId: orgId,
        name: 'OmniCloud Systems',
        status: 'ACTIVE',
        defaultNote: 'Full support package',
      },
      anuragId
    );

    // 2. Anurag sets October 2026 billing plan for OmniCloud
    const octPeriod = db.ensureBillingPeriod(orgId, '2026-10');
    const octPlan = db.setBillingPlan(
      newClient.id,
      octPeriod.id,
      '60000.00',
      anuragId,
      'Monthly fee',
      'Contract signed'
    );

    // 3. Anurag collects installment 1: ₹30,000
    db.recordPayment(
      {
        billingPlanId: octPlan.id,
        collectedByPartnerId: anuragId,
        paymentDate: '2026-10-05',
        amountReceived: '30000.00',
        paymentReference: 'OCT-INST-1',
        createdByPartnerId: anuragId,
      },
      anuragId
    );

    // 4. Anurag pays external dev ₹10,000
    const party = db.getExternalParties(orgId)[0];
    db.recordExternalDisbursement(
      {
        billingPeriodId: octPeriod.id,
        externalPartyId: party.id,
        disbursedByPartnerId: anuragId,
        amountPaid: '10000.00',
        disbursementDate: '2026-10-06',
        createdByPartnerId: anuragId,
      },
      anuragId
    );

    // 5. Vivek logs in and collects installment 2: ₹30,000
    db.recordPayment(
      {
        billingPlanId: octPlan.id,
        collectedByPartnerId: vivekId,
        paymentDate: '2026-10-20',
        amountReceived: '30000.00',
        paymentReference: 'OCT-INST-2',
        createdByPartnerId: vivekId,
      },
      vivekId
    );

    // 6. Compute October settlement
    const octSummary = calculateMonthlySettlement({
      periodKey: octPeriod.periodKey,
      anuragPartnerId: anuragId,
      vivekPartnerId: vivekId,
      billingPlans: db.getBillingPlans(octPeriod.id),
      payments: db.getPaymentsForPeriod(octPeriod.id),
      disbursements: db.getExternalDisbursements(octPeriod.id),
      adjustments: db.getBusinessAdjustments(octPeriod.id),
    });

    expect(octSummary.totalCollected).toBe('60000.00');
    expect(octSummary.totalExternalDisbursed).toBe('10000.00');
    expect(octSummary.netPartnershipIncome).toBe('50000.00');
    expect(octSummary.anuragEntitlement).toBe('25000.00');
    expect(octSummary.vivekEntitlement).toBe('25000.00');

    // Anurag cash: ₹30,000 - ₹10,000 = ₹20,000
    // Vivek cash: ₹30,000 - ₹0 = ₹30,000
    expect(octSummary.anuragLiquidCashHeld).toBe('20000.00');
    expect(octSummary.vivekLiquidCashHeld).toBe('30000.00');

    // Vivek holds ₹5,000 excess partnership cash and owes Anurag ₹5,000
    expect(octSummary.operationalBalancingTransfer).toBe('5000.00');
    expect(octSummary.finalSettlementDirection).toBe('VIVEK_PAYS_ANURAG');
    expect(octSummary.finalSettlementAmount).toBe('5000.00');
  });

  it('should exclude voided payments from cash held and settlement', () => {
    const period = db.getBillingPeriodByKey(orgId, '2026-09')!;
    const initialPayments = db.getPaymentsForPeriod(period.id);
    const eshwarPayment = initialPayments.find((p) => p.amountReceived === '25000.00')!;

    // Void the Eshwar ₹25,000 payment
    db.voidPayment(eshwarPayment.id, anuragId, 'Mistaken client entry');

    const updatedSummary = calculateMonthlySettlement({
      periodKey: period.periodKey,
      anuragPartnerId: anuragId,
      vivekPartnerId: vivekId,
      billingPlans: db.getBillingPlans(period.id),
      payments: db.getPaymentsForPeriod(period.id),
      disbursements: db.getExternalDisbursements(period.id),
      adjustments: db.getBusinessAdjustments(period.id),
    });

    // Since Sai has not paid and Eshwar is voided, 0 active collections remain
    expect(updatedSummary.totalCollected).toBe('0.00');
    expect(updatedSummary.anuragLiquidCashHeld).toBe('-10000.00'); // 0 collected - 10,000 disbursed
  });
});
