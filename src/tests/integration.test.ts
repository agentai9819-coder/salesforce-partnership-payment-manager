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

  it('MUST independently derive the exact September 2026 15-day cycle figures from database records', () => {
    // --- Test Cycle 1: Sep 1 - Sep 15 (Eshwar paid ₹25k, Sai paid ₹20k, Dev paid ₹10k) ---
    const periodC1 = db.getBillingPeriodByKey(orgId, '2026-09-C1')!;
    expect(periodC1).toBeDefined();
    const plansC1 = db.getBillingPlans(periodC1.id);
    const paymentsC1 = db.getPaymentsForPeriod(periodC1.id);
    const disbursementsC1 = db.getExternalDisbursements(periodC1.id);
    const adjustmentsC1 = db.getBusinessAdjustments(periodC1.id);

    const summaryC1 = calculateMonthlySettlement({
      periodKey: periodC1.periodKey,
      anuragPartnerId: anuragId,
      vivekPartnerId: vivekId,
      billingPlans: plansC1,
      payments: paymentsC1,
      disbursements: disbursementsC1,
      adjustments: adjustmentsC1,
    });

    expect(summaryC1.totalCollected).toBe('45000.00'); // ₹25,000 (Eshwar) + ₹20,000 (Sai)
    expect(summaryC1.totalExternalDisbursed).toBe('10000.00'); // ₹10,000 paid to dev by Anurag
    expect(summaryC1.netPartnershipIncome).toBe('35000.00');
    expect(summaryC1.anuragEntitlement).toBe('17500.00');
    expect(summaryC1.vivekEntitlement).toBe('17500.00');
    expect(summaryC1.anuragLiquidCashHeld).toBe('15000.00'); // ₹25,000 - ₹10,000
    expect(summaryC1.vivekLiquidCashHeld).toBe('20000.00'); // ₹20,000 collected from Sai
    expect(summaryC1.operationalBalancingTransfer).toBe('2500.00');
    expect(summaryC1.operationalBalancingDirection).toBe('VIVEK_OWES_ANURAG');
    expect(summaryC1.finalSettlementAmount).toBe('2500.00');
    expect(summaryC1.finalSettlementDirection).toBe('VIVEK_PAYS_ANURAG');

    // --- Test Cycle 2: Sep 16 - Sep 30 (Eshwar paid ₹25k, Sai ₹30k is PENDING, Dev paid ₹10k) ---
    const periodC2 = db.getBillingPeriodByKey(orgId, '2026-09-C2')!;
    expect(periodC2).toBeDefined();
    const plansC2 = db.getBillingPlans(periodC2.id);
    const paymentsC2 = db.getPaymentsForPeriod(periodC2.id);
    const disbursementsC2 = db.getExternalDisbursements(periodC2.id);
    const adjustmentsC2 = db.getBusinessAdjustments(periodC2.id);

    const summaryC2 = calculateMonthlySettlement({
      periodKey: periodC2.periodKey,
      anuragPartnerId: anuragId,
      vivekPartnerId: vivekId,
      billingPlans: plansC2,
      payments: paymentsC2,
      disbursements: disbursementsC2,
      adjustments: adjustmentsC2,
    });

    expect(summaryC2.totalCollected).toBe('25000.00'); // Only Eshwar paid ₹25,000, Sai is pending
    expect(summaryC2.totalExternalDisbursed).toBe('10000.00'); // ₹10,000 paid to dev by Anurag
    expect(summaryC2.netPartnershipIncome).toBe('15000.00');
    expect(summaryC2.anuragEntitlement).toBe('7500.00');
    expect(summaryC2.vivekEntitlement).toBe('7500.00');
    expect(summaryC2.anuragLiquidCashHeld).toBe('15000.00'); // ₹25,000 - ₹10,000
    expect(summaryC2.vivekLiquidCashHeld).toBe('0.00'); // Sai payment pending
    expect(summaryC2.operationalBalancingTransfer).toBe('7500.00');
    expect(summaryC2.operationalBalancingDirection).toBe('ANURAG_OWES_VIVEK');
    expect(summaryC2.finalSettlementAmount).toBe('7500.00');
    expect(summaryC2.finalSettlementDirection).toBe('ANURAG_PAYS_VIVEK');
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
    const period = db.getBillingPeriodByKey(orgId, '2026-09-C1')!;
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

    // Eshwar is voided, Sai remains confirmed (₹20,000)
    expect(updatedSummary.totalCollected).toBe('20000.00');
    expect(updatedSummary.anuragLiquidCashHeld).toBe('-10000.00'); // Anurag: 0 collected - 10,000 disbursed
    expect(updatedSummary.vivekLiquidCashHeld).toBe('20000.00'); // Vivek: 20,000 from Sai
  });
});
