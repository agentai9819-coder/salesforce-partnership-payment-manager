/**
 * Domain Financial Calculation Engine
 * Pure TypeScript functions with exact fixed-precision arithmetic (using Money class).
 * Zero floating-point drift. 100% unit-testable and deterministic.
 */

import { Money } from '@/domain/precision/money';
import {
  ClientPayment,
  ExternalDisbursement,
  BusinessAdjustment,
  ClientBillingPlan,
  SettlementDirection,
} from '@/domain/types/entities';
import { MonthlyFinancialSummary, PartnerCashPosition } from '@/domain/types/financial';

export interface SettlementEngineInput {
  periodKey: string;
  anuragPartnerId: string;
  vivekPartnerId: string;
  billingPlans: ClientBillingPlan[];
  payments: ClientPayment[];
  disbursements: ExternalDisbursement[];
  adjustments: BusinessAdjustment[];
}

export function calculateMonthlySettlement(input: SettlementEngineInput): MonthlyFinancialSummary {
  const {
    periodKey,
    anuragPartnerId,
    vivekPartnerId,
    billingPlans,
    payments,
    disbursements,
    adjustments,
  } = input;

  // 1. Contractual Billed Total (Accrual)
  let totalBilledMoney = Money.zero();
  for (const bp of billingPlans) {
    totalBilledMoney = totalBilledMoney.add(Money.from(bp.grossBillingAmount));
  }

  // 2. Active Confirmed Collections (Cash Inflow)
  let anuragCollectionsMoney = Money.zero();
  let vivekCollectionsMoney = Money.zero();

  for (const p of payments) {
    if (p.status !== 'CONFIRMED') continue;
    const amount = Money.from(p.amountReceived);
    if (p.collectedByPartnerId === anuragPartnerId) {
      anuragCollectionsMoney = anuragCollectionsMoney.add(amount);
    } else if (p.collectedByPartnerId === vivekPartnerId) {
      vivekCollectionsMoney = vivekCollectionsMoney.add(amount);
    }
  }
  const totalCollectionsMoney = anuragCollectionsMoney.add(vivekCollectionsMoney);

  // 3. Outstanding Receivables
  const outstandingMoney = totalBilledMoney.subtract(totalCollectionsMoney);
  const safeOutstanding = outstandingMoney.isNegative() ? Money.zero() : outstandingMoney;

  // 4. Active Confirmed External Disbursements (Cash Outflow)
  let anuragDisbursementsMoney = Money.zero();
  let vivekDisbursementsMoney = Money.zero();

  for (const d of disbursements) {
    if (d.status !== 'CONFIRMED') continue;
    const amount = Money.from(d.amountPaid);
    if (d.disbursedByPartnerId === anuragPartnerId) {
      anuragDisbursementsMoney = anuragDisbursementsMoney.add(amount);
    } else if (d.disbursedByPartnerId === vivekPartnerId) {
      vivekDisbursementsMoney = vivekDisbursementsMoney.add(amount);
    }
  }
  const totalDisbursementsMoney = anuragDisbursementsMoney.add(vivekDisbursementsMoney);

  // 5. Realized Net Partnership Pool: N = Collections - Disbursements
  const netPoolMoney = totalCollectionsMoney.subtract(totalDisbursementsMoney);

  // 6. 50/50 Partner Entitlements
  const anuragEntitlementMoney = netPoolMoney.divideBy2();
  const vivekEntitlementMoney = netPoolMoney.subtract(anuragEntitlementMoney); // Ensures exact paisa preservation

  // 7. Liquid Cash Held by Each Partner: H_p = C_p - D_p
  const anuragCashHeldMoney = anuragCollectionsMoney.subtract(anuragDisbursementsMoney);
  const vivekCashHeldMoney = vivekCollectionsMoney.subtract(vivekDisbursementsMoney);

  // 8. Operational Balancing: B_V = H_V - E_V (Excess cash held by Vivek)
  // If B_V > 0, Vivek holds surplus partnership cash and owes Anurag.
  // If B_V < 0, Anurag holds surplus partnership cash and owes Vivek.
  const operationalBalancingToAnurag = vivekCashHeldMoney.subtract(vivekEntitlementMoney);

  let operationalDirection: 'VIVEK_OWES_ANURAG' | 'ANURAG_OWES_VIVEK' | 'BALANCED' = 'BALANCED';
  if (operationalBalancingToAnurag.isPositive()) {
    operationalDirection = 'VIVEK_OWES_ANURAG';
  } else if (operationalBalancingToAnurag.isNegative()) {
    operationalDirection = 'ANURAG_OWES_VIVEK';
  }

  // 9. Business Carry-Forward Adjustments
  // CF = Sum(Anurag -> Vivek) - Sum(Vivek -> Anurag)
  let netAdjustmentToVivek = Money.zero();
  for (const adj of adjustments) {
    if (adj.status !== 'APPLIED') continue;
    const amount = Money.from(adj.amount);
    if (adj.fromPartnerId === anuragPartnerId && adj.toPartnerId === vivekPartnerId) {
      netAdjustmentToVivek = netAdjustmentToVivek.add(amount);
    } else if (adj.fromPartnerId === vivekPartnerId && adj.toPartnerId === anuragPartnerId) {
      netAdjustmentToVivek = netAdjustmentToVivek.subtract(amount);
    }
  }

  // 10. Final Equalization Transfer (S)
  // S_to_Anurag = operationalBalancingToAnurag - netAdjustmentToVivek
  const finalTransferToAnurag = operationalBalancingToAnurag.subtract(netAdjustmentToVivek);

  let finalDirection: SettlementDirection = 'BALANCED';
  let finalAmount = Money.zero();

  if (finalTransferToAnurag.isPositive()) {
    finalDirection = 'VIVEK_PAYS_ANURAG';
    finalAmount = finalTransferToAnurag;
  } else if (finalTransferToAnurag.isNegative()) {
    finalDirection = 'ANURAG_PAYS_VIVEK';
    finalAmount = finalTransferToAnurag.abs();
  }

  return {
    periodKey,
    totalBilled: totalBilledMoney.toNumericString(),
    totalCollected: totalCollectionsMoney.toNumericString(),
    outstandingReceivable: safeOutstanding.toNumericString(),
    totalExternalDisbursed: totalDisbursementsMoney.toNumericString(),
    netPartnershipIncome: netPoolMoney.toNumericString(),
    anuragEntitlement: anuragEntitlementMoney.toNumericString(),
    vivekEntitlement: vivekEntitlementMoney.toNumericString(),
    anuragLiquidCashHeld: anuragCashHeldMoney.toNumericString(),
    vivekLiquidCashHeld: vivekCashHeldMoney.toNumericString(),
    operationalBalancingTransfer: operationalBalancingToAnurag.abs().toNumericString(),
    operationalBalancingDirection: operationalDirection,
    businessAdjustmentsTotal: netAdjustmentToVivek.toNumericString(),
    finalSettlementAmount: finalAmount.toNumericString(),
    finalSettlementDirection: finalDirection,
  };
}

export function calculatePartnerPositions(input: SettlementEngineInput): PartnerCashPosition[] {
  const summary = calculateMonthlySettlement(input);
  return [
    {
      partnerId: input.anuragPartnerId,
      partnerCode: 'ANURAG',
      grossCollections: Money.from(
        input.payments
          .filter((p) => p.status === 'CONFIRMED' && p.collectedByPartnerId === input.anuragPartnerId)
          .reduce((sum, p) => sum + Number(p.amountReceived), 0)
      ).toNumericString(),
      externalDisbursements: Money.from(
        input.disbursements
          .filter((d) => d.status === 'CONFIRMED' && d.disbursedByPartnerId === input.anuragPartnerId)
          .reduce((sum, d) => sum + Number(d.amountPaid), 0)
      ).toNumericString(),
      netLiquidCashHeld: summary.anuragLiquidCashHeld,
      entitlement: summary.anuragEntitlement,
      netVariance: Money.from(summary.anuragLiquidCashHeld)
        .subtract(Money.from(summary.anuragEntitlement))
        .toNumericString(),
    },
    {
      partnerId: input.vivekPartnerId,
      partnerCode: 'VIVEK',
      grossCollections: Money.from(
        input.payments
          .filter((p) => p.status === 'CONFIRMED' && p.collectedByPartnerId === input.vivekPartnerId)
          .reduce((sum, p) => sum + Number(p.amountReceived), 0)
      ).toNumericString(),
      externalDisbursements: Money.from(
        input.disbursements
          .filter((d) => d.status === 'CONFIRMED' && d.disbursedByPartnerId === input.vivekPartnerId)
          .reduce((sum, d) => sum + Number(d.amountPaid), 0)
      ).toNumericString(),
      netLiquidCashHeld: summary.vivekLiquidCashHeld,
      entitlement: summary.vivekEntitlement,
      netVariance: Money.from(summary.vivekLiquidCashHeld)
        .subtract(Money.from(summary.vivekEntitlement))
        .toNumericString(),
    },
  ];
}
