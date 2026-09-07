/**
 * Domain Financial Models & Calculation Contracts
 */

import { SettlementDirection } from './entities';

export interface MonthlyFinancialSummary {
  periodKey: string;
  totalBilled: string;
  totalCollected: string;
  outstandingReceivable: string;
  totalExternalDisbursed: string;
  netPartnershipIncome: string;
  anuragEntitlement: string;
  vivekEntitlement: string;
  anuragLiquidCashHeld: string;
  vivekLiquidCashHeld: string;
  operationalBalancingTransfer: string;
  operationalBalancingDirection: 'VIVEK_OWES_ANURAG' | 'ANURAG_OWES_VIVEK' | 'BALANCED';
  businessAdjustmentsTotal: string;
  finalSettlementAmount: string;
  finalSettlementDirection: SettlementDirection;
}

export interface PartnerCashPosition {
  partnerId: string;
  partnerCode: 'ANURAG' | 'VIVEK';
  grossCollections: string;
  externalDisbursements: string;
  netLiquidCashHeld: string;
  entitlement: string;
  netVariance: string; // Cash Held - Entitlement
}
