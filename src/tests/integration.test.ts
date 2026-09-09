import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/repository';
import { calculateMonthlySettlement } from '@/domain/financial/engine';

describe('Salesforce Partnership Payment Manager — Final Business Verification Tests (A through Y)', () => {
  const orgId = '00000000-0000-0000-0000-000000000001';
  const anuragId = '11111111-1111-1111-1111-111111111111';
  const vivekId = '22222222-2222-2222-2222-222222222222';

  beforeEach(() => {
    db.resetToSeed();
  });

  // A. Sai August Cycle 1 ₹20,000 is historical and already settled.
  it('A. Sai August Cycle 1 ₹20,000 is historical and already settled', () => {
    const period = db.getBillingPeriodByKey(orgId, '2026-08-C1')!;
    expect(period).toBeDefined();
    expect(period.status).toBe('CLOSED');

    const settlement = db.getSettlementPeriod(period.id);
    expect(settlement).toBeDefined();
    expect(settlement?.isSettled).toBe(true);
    expect(settlement?.paymentReference).toBe('SAI-AUG-1-15-SETTLED-50-50');

    const saiPayment = db.getPaymentsForPeriod(period.id).find((p) => p.id === 'pay-aug-sai-c1');
    expect(saiPayment).toBeDefined();
    expect(saiPayment?.amountReceived).toBe('20000.00');
    expect(saiPayment?.collectedByPartnerId).toBe(vivekId);
    expect(saiPayment?.status).toBe('CONFIRMED');
  });

  // B. Sai August Cycle 2 expected payment is ₹20,000.
  it('B. Sai August Cycle 2 expected payment is ₹20,000', () => {
    const period = db.getBillingPeriodByKey(orgId, '2026-08-C2')!;
    expect(period).toBeDefined();

    const saiPlan = db.getBillingPlans(period.id).find((p) => p.clientId === 'client-sai')!;
    expect(saiPlan).toBeDefined();
    expect(saiPlan.grossBillingAmount).toBe('20000.00');

    // Before payment is recorded, actual received = 0, outstanding = 20,000
    const saiPayments = db.getPaymentsForPeriod(period.id).filter((p) => p.billingPlanId === saiPlan.id);
    expect(saiPayments.length).toBe(0);
  });

  // C. Sai August Cycle 2 receipt on 11 September still belongs to August Cycle 2.
  it('C. Sai August Cycle 2 receipt on 11 September still belongs to August Cycle 2', () => {
    const periodAugC2 = db.getBillingPeriodByKey(orgId, '2026-08-C2')!;
    const periodSepC1 = db.getBillingPeriodByKey(orgId, '2026-09-C1')!;
    const saiPlanAugC2 = db.getBillingPlans(periodAugC2.id).find((p) => p.clientId === 'client-sai')!;

    // Record receipt on 11 September tied to August Cycle 2 plan
    const payment = db.recordPayment(
      {
        billingPlanId: saiPlanAugC2.id,
        collectedByPartnerId: vivekId,
        paymentDate: '2026-09-11',
        amountReceived: '20000.00',
        paymentReference: 'SAI-AUG-C2-CLEARING-SEP11',
        notes: 'August Cycle 2 payment cleared on 11 September',
        createdByPartnerId: vivekId,
      },
      vivekId
    );

    expect(payment.paymentDate).toBe('2026-09-11');
    expect(payment.billingPlanId).toBe(saiPlanAugC2.id);

    // It is in August Cycle 2
    const augPayments = db.getPaymentsForPeriod(periodAugC2.id);
    expect(augPayments.some((p) => p.id === payment.id)).toBe(true);

    // It is NOT in September Cycle 1
    const sepPayments = db.getPaymentsForPeriod(periodSepC1.id);
    expect(sepPayments.some((p) => p.id === payment.id)).toBe(false);
  });

  // D. Sai September billing is ₹50,000.
  it('D. Sai September billing is ₹50,000', () => {
    const periodSep = db.getBillingPeriodByKey(orgId, '2026-09')!;
    const saiPlan = db.getBillingPlans(periodSep.id).find((p) => p.clientId === 'client-sai')!;
    expect(saiPlan).toBeDefined();
    expect(saiPlan.grossBillingAmount).toBe('50000.00');
  });

  // E. Sai September Cycle 1 expected = ₹25,000.
  it('E. Sai September Cycle 1 expected = ₹25,000', () => {
    const periodSepC1 = db.getBillingPeriodByKey(orgId, '2026-09-C1')!;
    const saiPlan = db.getBillingPlans(periodSepC1.id).find((p) => p.clientId === 'client-sai')!;
    expect(saiPlan).toBeDefined();
    expect(saiPlan.grossBillingAmount).toBe('25000.00');
  });

  // F. Sai September Cycle 2 expected = ₹25,000.
  it('F. Sai September Cycle 2 expected = ₹25,000', () => {
    const periodSepC2 = db.getBillingPeriodByKey(orgId, '2026-09-C2')!;
    const saiPlan = db.getBillingPlans(periodSepC2.id).find((p) => p.clientId === 'client-sai')!;
    expect(saiPlan).toBeDefined();
    expect(saiPlan.grossBillingAmount).toBe('25000.00');
  });

  // G. Current September actual received = ₹0 before actual September payment.
  it('G. Current September actual received = ₹0 before actual September payment', () => {
    const periodSepC1 = db.getBillingPeriodByKey(orgId, '2026-09-C1')!;
    const periodSepC2 = db.getBillingPeriodByKey(orgId, '2026-09-C2')!;
    const periodSep = db.getBillingPeriodByKey(orgId, '2026-09')!;

    const c1Confirmed = db
      .getPaymentsForPeriod(periodSepC1.id)
      .filter((p) => p.status === 'CONFIRMED')
      .reduce((sum, p) => sum + Number(p.amountReceived), 0);

    const c2Confirmed = db
      .getPaymentsForPeriod(periodSepC2.id)
      .filter((p) => p.status === 'CONFIRMED')
      .reduce((sum, p) => sum + Number(p.amountReceived), 0);

    const fullConfirmed = db
      .getPaymentsForPeriod(periodSep.id)
      .filter((p) => p.status === 'CONFIRMED')
      .reduce((sum, p) => sum + Number(p.amountReceived), 0);

    expect(c1Confirmed).toBe(0);
    expect(c2Confirmed).toBe(0);
    expect(fullConfirmed).toBe(0);
  });

  // H. Eshwar monthly billing = ₹50,000.
  it('H. Eshwar monthly billing = ₹50,000', () => {
    const periodAug = db.getBillingPeriodByKey(orgId, '2026-08')!;
    const eshwarPlanAug = db.getBillingPlans(periodAug.id).find((p) => p.clientId === 'client-eshwar')!;
    expect(eshwarPlanAug).toBeDefined();
    expect(eshwarPlanAug.grossBillingAmount).toBe('50000.00');

    const periodSep = db.getBillingPeriodByKey(orgId, '2026-09')!;
    const eshwarPlanSep = db.getBillingPlans(periodSep.id).find((p) => p.clientId === 'client-eshwar')!;
    expect(eshwarPlanSep).toBeDefined();
    expect(eshwarPlanSep.grossBillingAmount).toBe('50000.00');
  });

  // I. Eshwar Cycle 1 = ₹25,000 received, ₹10,000 external, ₹15,000 net, ₹7,500 each.
  it('I. Eshwar Cycle 1 = ₹25,000 received, ₹10,000 external, ₹15,000 net, ₹7,500 each', () => {
    const period = db.getBillingPeriodByKey(orgId, '2026-08-C1')!;
    const plans = db.getBillingPlans(period.id).filter((p) => p.clientId === 'client-eshwar');
    const payments = db.getPaymentsForPeriod(period.id).filter((p) => p.billingPlanId === 'cbp-eshwar-aug-c1');
    const disbursements = db.getExternalDisbursements(period.id).filter((d) => d.id === 'ed-aug-eshwar-c1');

    const summary = calculateMonthlySettlement({
      periodKey: period.periodKey,
      anuragPartnerId: anuragId,
      vivekPartnerId: vivekId,
      billingPlans: plans,
      payments,
      disbursements,
      adjustments: [],
    });

    expect(summary.totalCollected).toBe('25000.00');
    expect(summary.totalExternalDisbursed).toBe('10000.00');
    expect(summary.netPartnershipIncome).toBe('15000.00');
    expect(summary.anuragEntitlement).toBe('7500.00');
    expect(summary.vivekEntitlement).toBe('7500.00');
  });

  // J. Eshwar Cycle 2 = same.
  it('J. Eshwar Cycle 2 = same (₹25,000 received, ₹10,000 external, ₹15,000 net, ₹7,500 each)', () => {
    const period = db.getBillingPeriodByKey(orgId, '2026-08-C2')!;
    const plans = db.getBillingPlans(period.id).filter((p) => p.clientId === 'client-eshwar');
    const payments = db.getPaymentsForPeriod(period.id).filter((p) => p.billingPlanId === 'cbp-eshwar-aug-c2');
    const disbursements = db.getExternalDisbursements(period.id).filter((d) => d.id === 'ed-aug-eshwar-c2');

    const summary = calculateMonthlySettlement({
      periodKey: period.periodKey,
      anuragPartnerId: anuragId,
      vivekPartnerId: vivekId,
      billingPlans: plans,
      payments,
      disbursements,
      adjustments: [],
    });

    expect(summary.totalCollected).toBe('25000.00');
    expect(summary.totalExternalDisbursed).toBe('10000.00');
    expect(summary.netPartnershipIncome).toBe('15000.00');
    expect(summary.anuragEntitlement).toBe('7500.00');
    expect(summary.vivekEntitlement).toBe('7500.00');
  });

  // K. Eshwar August total = ₹50,000 received, ₹20,000 external, ₹30,000 net, ₹15,000 each.
  it('K. Eshwar August total = ₹50,000 received, ₹20,000 external, ₹30,000 net, ₹15,000 each', () => {
    const period = db.getBillingPeriodByKey(orgId, '2026-08')!;
    const plans = db.getBillingPlans(period.id).filter((p) => p.clientId === 'client-eshwar');
    const payments = db.getPaymentsForPeriod(period.id).filter((p) => p.billingPlanId === 'cbp-eshwar-aug');
    const disbursements = db.getExternalDisbursements(period.id).filter((d) => d.obligationId === 'eo-aug-eshwar');

    const summary = calculateMonthlySettlement({
      periodKey: period.periodKey,
      anuragPartnerId: anuragId,
      vivekPartnerId: vivekId,
      billingPlans: plans,
      payments,
      disbursements,
      adjustments: [],
    });

    expect(summary.totalCollected).toBe('50000.00');
    expect(summary.totalExternalDisbursed).toBe('20000.00');
    expect(summary.netPartnershipIncome).toBe('30000.00');
    expect(summary.anuragEntitlement).toBe('15000.00');
    expect(summary.vivekEntitlement).toBe('15000.00');
  });

  // L. Billing does not increase cash.
  it('L. Billing does not increase cash', () => {
    const testPeriod = db.ensureBillingPeriod(orgId, '2026-10-C1');
    const plan = db.setBillingPlan('client-sai', testPeriod.id, '100000.00', anuragId);

    const summary = calculateMonthlySettlement({
      periodKey: testPeriod.periodKey,
      anuragPartnerId: anuragId,
      vivekPartnerId: vivekId,
      billingPlans: [plan],
      payments: [],
      disbursements: [],
      adjustments: [],
    });

    expect(summary.totalBilled).toBe('100000.00');
    expect(summary.totalCollected).toBe('0.00');
    expect(summary.anuragLiquidCashHeld).toBe('0.00');
    expect(summary.vivekLiquidCashHeld).toBe('0.00');
  });

  // M. Expected payment does not increase cash.
  it('M. Expected payment does not increase cash', () => {
    const testPeriod = db.ensureBillingPeriod(orgId, '2026-10-C2');
    const plan = db.setBillingPlan('client-eshwar', testPeriod.id, '25000.00', anuragId);

    const payments = db.getPaymentsForPeriod(testPeriod.id);
    expect(payments.length).toBe(0);

    const summary = calculateMonthlySettlement({
      periodKey: testPeriod.periodKey,
      anuragPartnerId: anuragId,
      vivekPartnerId: vivekId,
      billingPlans: [plan],
      payments: [],
      disbursements: [],
      adjustments: [],
    });

    expect(summary.totalCollected).toBe('0.00');
    expect(summary.netPartnershipIncome).toBe('0.00');
  });

  // N. Expected external obligation does not reduce cash.
  it('N. Expected external obligation does not reduce cash', () => {
    const testPeriod = db.ensureBillingPeriod(orgId, '2026-11-C1');
    const plan = db.setBillingPlan('client-ganesh', testPeriod.id, '35000.00', anuragId);

    // Anurag collects ₹35,000
    const payment = db.recordPayment(
      {
        billingPlanId: plan.id,
        collectedByPartnerId: anuragId,
        paymentDate: '2026-11-05',
        amountReceived: '35000.00',
        createdByPartnerId: anuragId,
      },
      anuragId
    );

    // External obligation exists (e.g. ₹20,000 expected) but NO disbursement was recorded
    const summary = calculateMonthlySettlement({
      periodKey: testPeriod.periodKey,
      anuragPartnerId: anuragId,
      vivekPartnerId: vivekId,
      billingPlans: [plan],
      payments: [payment],
      disbursements: [], // No disbursements!
      adjustments: [],
    });

    expect(summary.totalCollected).toBe('35000.00');
    expect(summary.totalExternalDisbursed).toBe('0.00');
    expect(summary.netPartnershipIncome).toBe('35000.00');
    expect(summary.anuragLiquidCashHeld).toBe('35000.00');
  });

  // O. Actual external payment reduces only paying partner's cash.
  it("O. Actual external payment reduces only paying partner's cash", () => {
    const testPeriod = db.ensureBillingPeriod(orgId, '2026-11-C2');
    const plan = db.setBillingPlan('client-eshwar', testPeriod.id, '25000.00', anuragId);

    // Anurag collects ₹25,000
    const payment = db.recordPayment(
      {
        billingPlanId: plan.id,
        collectedByPartnerId: anuragId,
        paymentDate: '2026-11-16',
        amountReceived: '25000.00',
        createdByPartnerId: anuragId,
      },
      anuragId
    );

    // Anurag disburses ₹10,000
    const party = db.getExternalParties(orgId)[0];
    const disbursement = db.recordExternalDisbursement(
      {
        billingPeriodId: testPeriod.id,
        externalPartyId: party.id,
        disbursedByPartnerId: anuragId,
        amountPaid: '10000.00',
        disbursementDate: '2026-11-17',
        createdByPartnerId: anuragId,
      },
      anuragId
    );

    const summary = calculateMonthlySettlement({
      periodKey: testPeriod.periodKey,
      anuragPartnerId: anuragId,
      vivekPartnerId: vivekId,
      billingPlans: [plan],
      payments: [payment],
      disbursements: [disbursement],
      adjustments: [],
    });

    // Anurag cash held = 25,000 - 10,000 = 15,000
    expect(summary.anuragLiquidCashHeld).toBe('15000.00');
    // Vivek cash held remains 0 (not reduced)
    expect(summary.vivekLiquidCashHeld).toBe('0.00');
  });

  // P. ₹500 carry-forward is separate from collections and external expenses.
  it('P. ₹500 carry-forward is separate from collections and external expenses', () => {
    const testPeriod = db.ensureBillingPeriod(orgId, '2026-12-C1');
    const plan = db.setBillingPlan('client-sai', testPeriod.id, '20000.00', anuragId);

    // Equal ₹10k received by each partner
    const p1 = db.recordPayment(
      {
        billingPlanId: plan.id,
        collectedByPartnerId: anuragId,
        paymentDate: '2026-12-05',
        amountReceived: '10000.00',
        createdByPartnerId: anuragId,
      },
      anuragId
    );
    const p2 = db.recordPayment(
      {
        billingPlanId: plan.id,
        collectedByPartnerId: vivekId,
        paymentDate: '2026-12-05',
        amountReceived: '10000.00',
        createdByPartnerId: vivekId,
      },
      vivekId
    );

    const adjustments = db.getBusinessAdjustments();
    const carryForward = adjustments.find((a) => a.id === 'ba-carry-forward-500')!;
    expect(carryForward).toBeDefined();

    const summary = calculateMonthlySettlement({
      periodKey: testPeriod.periodKey,
      anuragPartnerId: anuragId,
      vivekPartnerId: vivekId,
      billingPlans: [plan],
      payments: [p1, p2],
      disbursements: [],
      adjustments: [carryForward],
    });

    // Does NOT affect collections, expenses, or net pool
    expect(summary.totalCollected).toBe('20000.00');
    expect(summary.totalExternalDisbursed).toBe('0.00');
    expect(summary.netPartnershipIncome).toBe('20000.00');
    expect(summary.anuragEntitlement).toBe('10000.00');
    expect(summary.vivekEntitlement).toBe('10000.00');

    // Operational balance is 0
    expect(summary.operationalBalancingTransfer).toBe('0.00');

    // Business adjustment is applied separately to final settlement
    expect(summary.finalSettlementDirection).toBe('ANURAG_PAYS_VIVEK');
    expect(summary.finalSettlementAmount).toBe('500.00');
  });

  // Q. ₹500 is not applied repeatedly every month.
  it('Q. ₹500 is not applied repeatedly every month', () => {
    // Only the designated adjustment record exists
    const adjustments = db.getBusinessAdjustments();
    const carryForwards = adjustments.filter((a) => a.reason.includes('500'));
    expect(carryForwards.length).toBe(1);

    // Another month calculated without passing the one-time adjustment does not include it
    const testPeriod = db.ensureBillingPeriod(orgId, '2027-01-C1');
    const summary = calculateMonthlySettlement({
      periodKey: testPeriod.periodKey,
      anuragPartnerId: anuragId,
      vivekPartnerId: vivekId,
      billingPlans: [],
      payments: [],
      disbursements: [],
      adjustments: [],
    });

    expect(summary.businessAdjustmentsTotal).toBe('0.00');
    expect(summary.finalSettlementAmount).toBe('0.00');
  });

  // R. Historical settled period does not request settlement again.
  it('R. Historical settled period does not request settlement again', () => {
    const period = db.getBillingPeriodByKey(orgId, '2026-08-C1')!;
    const settlement = db.getSettlementPeriod(period.id);

    expect(settlement).toBeDefined();
    expect(settlement?.isSettled).toBe(true);
    expect(settlement?.paymentReference).toBe('SAI-AUG-1-15-SETTLED-50-50');
  });

  // S. No transaction is double-counted in cycle and consolidated month views.
  it('S. No transaction is double-counted in cycle and consolidated month views', () => {
    const c1Period = db.getBillingPeriodByKey(orgId, '2026-08-C1')!;
    const c2Period = db.getBillingPeriodByKey(orgId, '2026-08-C2')!;
    const fullPeriod = db.getBillingPeriodByKey(orgId, '2026-08')!;

    const c1Payments = db.getPaymentsForPeriod(c1Period.id);
    const c2Payments = db.getPaymentsForPeriod(c2Period.id);
    const fullPayments = db.getPaymentsForPeriod(fullPeriod.id);

    const c1Eshwar = c1Payments.filter((p) => p.paymentReference === 'ESHWAR-AUG-C1');
    const c2Eshwar = c2Payments.filter((p) => p.paymentReference === 'ESHWAR-AUG-C2');
    const fullEshwar = fullPayments.filter((p) => p.paymentReference?.startsWith('ESHWAR-AUG-FULL'));

    expect(c1Eshwar.length).toBe(1);
    expect(c2Eshwar.length).toBe(1);
    expect(fullEshwar.length).toBe(2);

    const fullTotal = fullEshwar.reduce((sum, p) => sum + Number(p.amountReceived), 0);
    expect(fullTotal).toBe(50000);
  });

  // T. August payment received in September is still attributed to August cycle.
  it('T. August payment received in September is still attributed to August cycle', () => {
    const augC2Period = db.getBillingPeriodByKey(orgId, '2026-08-C2')!;
    const sepC1Period = db.getBillingPeriodByKey(orgId, '2026-09-C1')!;
    const saiAugPlan = db.getBillingPlans(augC2Period.id).find((p) => p.clientId === 'client-sai')!;

    const payment = db.recordPayment(
      {
        billingPlanId: saiAugPlan.id,
        collectedByPartnerId: vivekId,
        paymentDate: '2026-09-11',
        amountReceived: '20000.00',
        paymentReference: 'SAI-LATE-SEP11',
        createdByPartnerId: vivekId,
      },
      vivekId
    );

    const augPayments = db.getPaymentsForPeriod(augC2Period.id);
    const sepPayments = db.getPaymentsForPeriod(sepC1Period.id);

    expect(augPayments.some((p) => p.id === payment.id)).toBe(true);
    expect(sepPayments.some((p) => p.id === payment.id)).toBe(false);
  });

  // U. Ganesh does not create fake September cash.
  it('U. Ganesh does not create fake September cash', () => {
    const periodC1 = db.getBillingPeriodByKey(orgId, '2026-09-C1')!;
    const periodMonth = db.getBillingPeriodByKey(orgId, '2026-09')!;

    const ganeshPaymentsC1 = db.getPaymentsForPeriod(periodC1.id).filter((p) => {
      const plan = db.getBillingPlans(periodC1.id).find((bp) => bp.id === p.billingPlanId);
      return plan?.clientId === 'client-ganesh';
    });
    const ganeshPaymentsMonth = db.getPaymentsForPeriod(periodMonth.id).filter((p) => {
      const plan = db.getBillingPlans(periodMonth.id).find((bp) => bp.id === p.billingPlanId);
      return plan?.clientId === 'client-ganesh';
    });

    expect(ganeshPaymentsC1.length).toBe(0);
    expect(ganeshPaymentsMonth.length).toBe(0);
  });

  // V. Rohit does not create fake September cash.
  it('V. Rohit does not create fake September cash', () => {
    const periodC1 = db.getBillingPeriodByKey(orgId, '2026-09-C1')!;
    const periodMonth = db.getBillingPeriodByKey(orgId, '2026-09')!;

    const rohitPaymentsC1 = db.getPaymentsForPeriod(periodC1.id).filter((p) => {
      const plan = db.getBillingPlans(periodC1.id).find((bp) => bp.id === p.billingPlanId);
      return plan?.clientId === 'client-rohit';
    });
    const rohitPaymentsMonth = db.getPaymentsForPeriod(periodMonth.id).filter((p) => {
      const plan = db.getBillingPlans(periodMonth.id).find((bp) => bp.id === p.billingPlanId);
      return plan?.clientId === 'client-rohit';
    });

    expect(rohitPaymentsC1.length).toBe(0);
    expect(rohitPaymentsMonth.length).toBe(0);
  });

  // W. Closed-period protection works.
  it('W. Closed-period protection works', () => {
    const closedPeriod = db.getBillingPeriodByKey(orgId, '2026-08')!;
    expect(closedPeriod.status).toBe('CLOSED');

    expect(() => {
      db.setBillingPlan('client-sai', closedPeriod.id, '60000.00', anuragId);
    }).toThrow(/closed/i);

    const closedPlan = db.getBillingPlans(closedPeriod.id)[0];
    expect(() => {
      db.recordPayment(
        {
          billingPlanId: closedPlan.id,
          collectedByPartnerId: anuragId,
          paymentDate: '2026-08-25',
          amountReceived: '1000.00',
          createdByPartnerId: anuragId,
        },
        anuragId
      );
    }).toThrow(/closed/i);
  });

  // X. Void/reversal remains auditable.
  it('X. Void/reversal remains auditable', () => {
    const testPeriod = db.ensureBillingPeriod(orgId, '2027-03-C1');
    const plan = db.setBillingPlan('client-sai', testPeriod.id, '20000.00', anuragId);

    const payment = db.recordPayment(
      {
        billingPlanId: plan.id,
        collectedByPartnerId: anuragId,
        paymentDate: '2027-03-05',
        amountReceived: '20000.00',
        createdByPartnerId: anuragId,
      },
      anuragId
    );

    const auditCountBefore = db.getAuditLogs(orgId).length;

    const voided = db.voidPayment(payment.id, anuragId, 'Auditable test void');
    expect(voided.status).toBe('VOIDED');

    const auditLogs = db.getAuditLogs(orgId);
    expect(auditLogs.length).toBe(auditCountBefore + 1);

    const latestLog = auditLogs[0];
    expect(latestLog.entityName).toBe('client_payments');
    expect(latestLog.entityId).toBe(payment.id);
    expect(latestLog.action).toBe('VOID');
    expect(latestLog.changeReason).toBe('Auditable test void');
  });

  // Y. Idempotency still works.
  it('Y. Idempotency still works', () => {
    const testPeriod = db.ensureBillingPeriod(orgId, '2027-04-C1');
    const plan = db.setBillingPlan('client-sai', testPeriod.id, '20000.00', anuragId);
    const key = 'idem-unique-key-999';

    const p1 = db.recordPayment(
      {
        billingPlanId: plan.id,
        collectedByPartnerId: anuragId,
        paymentDate: '2027-04-05',
        amountReceived: '10000.00',
        idempotencyKey: key,
        createdByPartnerId: anuragId,
      },
      anuragId
    );

    const p2 = db.recordPayment(
      {
        billingPlanId: plan.id,
        collectedByPartnerId: anuragId,
        paymentDate: '2027-04-05',
        amountReceived: '10000.00',
        idempotencyKey: key,
        createdByPartnerId: anuragId,
      },
      anuragId
    );

    expect(p1.id).toBe(p2.id);
    const allMatching = db.getPaymentsForPeriod(testPeriod.id).filter((p) => p.idempotencyKey === key);
    expect(allMatching.length).toBe(1);
  });
});
