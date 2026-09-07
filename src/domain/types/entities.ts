/**
 * Domain Entities for Salesforce Partnership Payment Manager
 * Pure domain interfaces decoupled from persistence, UI, and external frameworks.
 */

export type PartnerCode = 'ANURAG' | 'VIVEK';

export interface Organization {
  id: string;
  name: string;
  defaultCurrency: 'INR';
  createdAt: string;
}

export interface Partner {
  id: string;
  organizationId: string;
  authUserId: string;
  partnerCode: PartnerCode;
  fullName: string;
  email: string;
  profitSharePercentage: number; // 50.00
  isActive: boolean;
  createdAt: string;
}

export type ClientStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export interface Client {
  id: string;
  organizationId: string;
  name: string;
  status: ClientStatus;
  defaultNote?: string;
  createdAt: string;
  updatedAt: string;
}

export type PeriodStatus = 'OPEN' | 'CLOSED';

export interface BillingPeriod {
  id: string;
  organizationId: string;
  periodKey: string; // 'YYYY-MM'
  startDate: string; // 'YYYY-MM-DD'
  endDate: string;   // 'YYYY-MM-DD'
  status: PeriodStatus;
  closedAt?: string;
  closedByPartnerId?: string;
  createdAt: string;
}

export interface ClientBillingPlan {
  id: string;
  clientId: string;
  billingPeriodId: string;
  grossBillingAmount: string; // Formatted exact decimal string e.g. "50000.00"
  notes?: string;
  createdByPartnerId: string;
  updatedByPartnerId: string;
  idempotencyKey?: string;
  createdAt: string;
  updatedAt: string;
}

export type PaymentStatus = 'CONFIRMED' | 'VOIDED';

export interface ClientPayment {
  id: string;
  billingPlanId: string;
  collectedByPartnerId: string;
  paymentDate: string; // 'YYYY-MM-DD'
  amountReceived: string; // Formatted exact decimal string e.g. "20000.00"
  paymentReference?: string;
  status: PaymentStatus;
  notes?: string;
  createdByPartnerId: string;
  idempotencyKey?: string;
  createdAt: string;
  updatedAt: string;
}

export type ExternalPartyType = 'RESOURCE' | 'BROKER' | 'VENDOR' | 'OTHER';

export interface ExternalParty {
  id: string;
  organizationId: string;
  name: string;
  partyType: ExternalPartyType;
  contactInfo?: string;
  isActive: boolean;
  createdAt: string;
}

export interface ExternalObligation {
  id: string;
  billingPlanId: string;
  externalPartyId: string;
  expectedAmount: string; // Formatted exact decimal string e.g. "70000.00"
  notes?: string;
  createdAt: string;
}

export type DisbursementStatus = 'CONFIRMED' | 'VOIDED';

export interface ExternalDisbursement {
  id: string;
  obligationId?: string;
  billingPeriodId: string;
  externalPartyId: string;
  disbursedByPartnerId: string; // Critical: Who physically paid
  amountPaid: string; // Formatted exact decimal string e.g. "10000.00"
  disbursementDate: string; // 'YYYY-MM-DD'
  status: DisbursementStatus;
  notes?: string;
  createdByPartnerId: string;
  idempotencyKey?: string;
  createdAt: string;
  updatedAt: string;
}

export type AdjustmentStatus = 'APPLIED' | 'VOIDED';

export interface BusinessAdjustment {
  id: string;
  organizationId: string;
  effectiveBillingPeriodId: string;
  fromPartnerId: string;
  toPartnerId: string;
  amount: string; // e.g. "500.00"
  reason: string;
  status: AdjustmentStatus;
  createdByPartnerId: string;
  idempotencyKey?: string;
  createdAt: string;
  updatedAt: string;
}

export type SettlementDirection = 'VIVEK_PAYS_ANURAG' | 'ANURAG_PAYS_VIVEK' | 'BALANCED';

export interface SettlementPeriod {
  id: string;
  billingPeriodId: string;
  totalCollections: string;
  totalDisbursements: string;
  netPartnershipPool: string;
  anuragEntitlement: string;
  vivekEntitlement: string;
  anuragCashHeld: string;
  vivekCashHeld: string;
  businessAdjustmentsNet: string;
  settlementDirection: SettlementDirection;
  settlementAmount: string;
  isSettled: boolean;
  settledAt?: string;
  paymentReference?: string;
  idempotencyKey?: string;
  createdAt: string;
}

export type AuditAction = 'INSERT' | 'UPDATE' | 'VOID' | 'STATUS_CHANGE';

export interface AuditLog {
  id: string;
  organizationId: string;
  actorPartnerId?: string;
  entityName: string;
  entityId: string;
  action: AuditAction;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  changeReason?: string;
  ipAddress?: string;
  createdAt: string;
}
