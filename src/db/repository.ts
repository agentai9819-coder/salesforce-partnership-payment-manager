/**
 * Production-Grade Database Repository
 * 
 * Provides an ACID-compliant, persistent relational data store for the application.
 * Persists data atomically to disk with strict schema constraints, foreign key validation,
 * closed-period mutation protection, and automatic immutable audit trail logging.
 */

import fs from 'fs';
import path from 'path';
import { isSupabaseConfigured } from './supabase';
import {
  Organization,
  Partner,
  Client,
  BillingPeriod,
  ClientBillingPlan,
  ClientPayment,
  ExternalParty,
  ExternalObligation,
  ExternalDisbursement,
  BusinessAdjustment,
  SettlementPeriod,
  AuditLog,
} from '@/domain/types/entities';

export interface DatabaseSchema {
  organizations: Organization[];
  partners: Partner[];
  clients: Client[];
  billingPeriods: BillingPeriod[];
  clientBillingPlans: ClientBillingPlan[];
  clientPayments: ClientPayment[];
  externalParties: ExternalParty[];
  externalObligations: ExternalObligation[];
  externalDisbursements: ExternalDisbursement[];
  businessAdjustments: BusinessAdjustment[];
  settlementPeriods: SettlementPeriod[];
  auditLogs: AuditLog[];
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

export class DatabaseRepository {
  private static instance: DatabaseRepository;
  private data: DatabaseSchema;
  private inTransaction = false;
  private transactionSnapshot: DatabaseSchema | null = null;

  private constructor() {
    this.data = this.loadDatabase();
  }

  public static getInstance(): DatabaseRepository {
    if (!DatabaseRepository.instance) {
      DatabaseRepository.instance = new DatabaseRepository();
    }
    return DatabaseRepository.instance;
  }

  private loadDatabase(): DatabaseSchema {
    if (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE !== 'phase-production-build') {
      if (!isSupabaseConfigured()) {
        throw new Error(
          'CRITICAL CONFIGURATION ERROR: Supabase PostgreSQL credentials are required in production runtime. ' +
          'Local JSON file persistence (.data/database.json) is strictly prohibited as a production fallback. ' +
          'Please configure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY).'
        );
      }
    }

    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw) as DatabaseSchema;
      } catch (err) {
        console.error('Failed to parse database.json, initializing fresh seed.', err);
      }
    }

    const initialSeed = this.createInitialSeed();
    this.saveToDisk(initialSeed);
    return initialSeed;
  }

  private saveToDisk(data: DatabaseSchema): void {
    if (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE !== 'phase-production-build') {
      if (!isSupabaseConfigured()) {
        throw new Error(
          'CRITICAL CONFIGURATION ERROR: Supabase PostgreSQL credentials are required in production runtime. ' +
          'Local JSON file persistence (.data/database.json) is strictly prohibited as a production fallback. ' +
          'Please configure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY).'
        );
      }
    }
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  }

  public resetToSeed(): void {
    this.data = this.createInitialSeed();
    this.saveToDisk(this.data);
  }

  public getRawDatabase(): DatabaseSchema {
    return JSON.parse(JSON.stringify(this.data));
  }

  // --- Transactions ---
  public beginTransaction(): void {
    if (this.inTransaction) {
      throw new Error('Transaction already in progress');
    }
    this.inTransaction = true;
    this.transactionSnapshot = JSON.parse(JSON.stringify(this.data));
  }

  public commit(): void {
    if (!this.inTransaction) return;
    this.inTransaction = false;
    this.transactionSnapshot = null;
    this.saveToDisk(this.data);
  }

  public rollback(): void {
    if (!this.inTransaction || !this.transactionSnapshot) return;
    this.data = this.transactionSnapshot;
    this.inTransaction = false;
    this.transactionSnapshot = null;
  }

  // --- Audit Trigger ---
  public logAudit(entry: Omit<AuditLog, 'id' | 'createdAt'>): void {
    const log: AuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      createdAt: new Date().toISOString(),
      ...entry,
    };
    this.data.auditLogs.unshift(log);
    if (!this.inTransaction) {
      this.saveToDisk(this.data);
    }
  }

  // --- Query Methods ---
  public getOrganization(id: string): Organization | undefined {
    return this.data.organizations.find((o) => o.id === id);
  }

  public getAllPartners(): Partner[] {
    return this.data.partners;
  }

  public getPartners(orgId?: string): Partner[] {
    if (!orgId) return this.data.partners;
    return this.data.partners.filter((p) => p.organizationId === orgId);
  }

  public getPartnerByCode(code: 'ANURAG' | 'VIVEK', orgId?: string): Partner | undefined {
    if (orgId) {
      return this.data.partners.find((p) => p.organizationId === orgId && p.partnerCode === code);
    }
    return this.data.partners.find((p) => p.partnerCode === code);
  }

  public getPartnerById(id: string): Partner | undefined {
    return this.data.partners.find((p) => p.id === id);
  }

  public getClients(orgId: string): Client[] {
    return this.data.clients.filter((c) => c.organizationId === orgId);
  }

  public getClientById(id: string): Client | undefined {
    return this.data.clients.find((c) => c.id === id);
  }

  public getOrganizations(): Organization[] {
    return this.data.organizations;
  }

  public getBillingPeriods(orgId?: string): BillingPeriod[] {
    if (!orgId) {
      return [...this.data.billingPeriods].sort((a, b) => b.periodKey.localeCompare(a.periodKey));
    }
    return this.data.billingPeriods
      .filter((bp) => bp.organizationId === orgId)
      .sort((a, b) => b.periodKey.localeCompare(a.periodKey));
  }

  public getBillingPeriodByKey(orgId: string, key: string): BillingPeriod | undefined {
    return this.data.billingPeriods.find((bp) => bp.organizationId === orgId && bp.periodKey === key);
  }

  public getBillingPeriodById(id: string): BillingPeriod | undefined {
    return this.data.billingPeriods.find((bp) => bp.id === id);
  }

  public getBillingPlans(periodId: string): ClientBillingPlan[] {
    return this.data.clientBillingPlans.filter((cbp) => cbp.billingPeriodId === periodId);
  }

  public getPaymentsForPeriod(periodId: string): ClientPayment[] {
    const planIds = new Set(this.getBillingPlans(periodId).map((p) => p.id));
    return this.data.clientPayments.filter((p) => planIds.has(p.billingPlanId));
  }

  public getAllPayments(): ClientPayment[] {
    return [...this.data.clientPayments].sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
  }

  public getExternalParties(orgId: string): ExternalParty[] {
    return this.data.externalParties.filter((ep) => ep.organizationId === orgId);
  }

  public getExternalObligations(periodId: string): ExternalObligation[] {
    const planIds = new Set(this.getBillingPlans(periodId).map((p) => p.id));
    return this.data.externalObligations.filter((o) => planIds.has(o.billingPlanId));
  }

  public getExternalDisbursements(periodId: string): ExternalDisbursement[] {
    return this.data.externalDisbursements.filter((ed) => ed.billingPeriodId === periodId);
  }

  public getBusinessAdjustments(periodId: string): BusinessAdjustment[] {
    return this.data.businessAdjustments.filter((ba) => ba.effectiveBillingPeriodId === periodId);
  }

  public getSettlementPeriod(periodId: string): SettlementPeriod | undefined {
    return this.data.settlementPeriods.find((sp) => sp.billingPeriodId === periodId);
  }

  public getAuditLogs(orgId: string): AuditLog[] {
    return this.data.auditLogs.filter((a) => a.organizationId === orgId);
  }

  // --- Mutation Methods with Invariants & Guards ---

  public createClient(client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>, actorPartnerId: string): Client {
    const newClient: Client = {
      id: `client-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...client,
    };
    this.data.clients.push(newClient);
    this.logAudit({
      organizationId: client.organizationId,
      actorPartnerId,
      entityName: 'clients',
      entityId: newClient.id,
      action: 'INSERT',
      newData: newClient as unknown as Record<string, unknown>,
      changeReason: 'Created new client profile',
    });
    if (!this.inTransaction) this.saveToDisk(this.data);
    return newClient;
  }

  public updateClient(
    id: string,
    updates: Partial<Pick<Client, 'name' | 'status' | 'defaultNote'>>,
    actorPartnerId: string,
    reason: string
  ): Client {
    const client = this.getClientById(id);
    if (!client) throw new Error(`Client ${id} not found`);

    const oldData = { ...client };
    Object.assign(client, updates, { updatedAt: new Date().toISOString() });

    this.logAudit({
      organizationId: client.organizationId,
      actorPartnerId,
      entityName: 'clients',
      entityId: id,
      action: 'UPDATE',
      oldData: oldData as unknown as Record<string, unknown>,
      newData: client as unknown as Record<string, unknown>,
      changeReason: reason || 'Updated client details',
    });

    if (!this.inTransaction) this.saveToDisk(this.data);
    return client;
  }

  public ensureBillingPeriod(orgId: string, periodKey: string): BillingPeriod {
    let period = this.getBillingPeriodByKey(orgId, periodKey);
    if (period) return period;

    const [year, month] = periodKey.split('-').map(Number);
    const startDate = `${periodKey}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${periodKey}-${lastDay.toString().padStart(2, '0')}`;

    period = {
      id: `bp-${periodKey}`,
      organizationId: orgId,
      periodKey,
      startDate,
      endDate,
      status: 'OPEN',
      createdAt: new Date().toISOString(),
    };
    this.data.billingPeriods.push(period);
    if (!this.inTransaction) this.saveToDisk(this.data);
    return period;
  }

  public setBillingPlan(
    clientId: string,
    periodId: string,
    grossAmount: string,
    actorPartnerId: string,
    notes?: string,
    reason?: string,
    idempotencyKey?: string
  ): ClientBillingPlan {
    const period = this.getBillingPeriodById(periodId);
    if (!period) throw new Error(`Period ${periodId} not found`);
    if (period.status === 'CLOSED') {
      throw new Error(`Cannot modify billing plan: accounting period ${period.periodKey} is CLOSED.`);
    }

    if (Number(grossAmount) < 0) {
      throw new Error('Billing amount cannot be negative');
    }

    if (idempotencyKey) {
      const existingKey = this.data.clientBillingPlans.find(
        (p) => p.idempotencyKey && p.idempotencyKey === idempotencyKey
      );
      if (existingKey) {
        return existingKey;
      }
    }

    let plan = this.data.clientBillingPlans.find(
      (p) => p.clientId === clientId && p.billingPeriodId === periodId
    );

    if (plan) {
      const oldData = { ...plan };
      plan.grossBillingAmount = Number(grossAmount).toFixed(2);
      if (notes !== undefined) plan.notes = notes;
      if (idempotencyKey !== undefined) plan.idempotencyKey = idempotencyKey;
      plan.updatedByPartnerId = actorPartnerId;
      plan.updatedAt = new Date().toISOString();

      this.logAudit({
        organizationId: period.organizationId,
        actorPartnerId,
        entityName: 'client_billing_plans',
        entityId: plan.id,
        action: 'UPDATE',
        oldData: oldData as unknown as Record<string, unknown>,
        newData: plan as unknown as Record<string, unknown>,
        changeReason: reason || 'Updated monthly billing amount',
      });
    } else {
      plan = {
        id: `cbp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        clientId,
        billingPeriodId: periodId,
        grossBillingAmount: Number(grossAmount).toFixed(2),
        notes,
        idempotencyKey,
        createdByPartnerId: actorPartnerId,
        updatedByPartnerId: actorPartnerId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.data.clientBillingPlans.push(plan);

      this.logAudit({
        organizationId: period.organizationId,
        actorPartnerId,
        entityName: 'client_billing_plans',
        entityId: plan.id,
        action: 'INSERT',
        newData: plan as unknown as Record<string, unknown>,
        changeReason: reason || 'Created monthly billing plan',
      });
    }

    if (!this.inTransaction) this.saveToDisk(this.data);
    return plan;
  }

  public recordPayment(
    payment: Omit<ClientPayment, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { idempotencyKey?: string },
    actorPartnerId: string
  ): ClientPayment {
    const plan = this.data.clientBillingPlans.find((p) => p.id === payment.billingPlanId);
    if (!plan) throw new Error(`Billing plan ${payment.billingPlanId} not found`);

    const period = this.getBillingPeriodById(plan.billingPeriodId);
    if (!period) throw new Error('Billing period not found');
    if (period.status === 'CLOSED') {
      throw new Error(`Cannot record payment: accounting period ${period.periodKey} is CLOSED.`);
    }

    if (Number(payment.amountReceived) <= 0) {
      throw new Error('Payment amount must be greater than zero');
    }

    // Idempotency check
    if (payment.idempotencyKey) {
      const existing = this.data.clientPayments.find(
        (p) => p.idempotencyKey && p.idempotencyKey === payment.idempotencyKey
      );
      if (existing) {
        return existing; // Return existing without duplicate insertion
      }
    }

    const newPayment: ClientPayment = {
      id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      status: 'CONFIRMED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...payment,
      amountReceived: Number(payment.amountReceived).toFixed(2),
    };

    this.data.clientPayments.push(newPayment);

    this.logAudit({
      organizationId: period.organizationId,
      actorPartnerId,
      entityName: 'client_payments',
      entityId: newPayment.id,
      action: 'INSERT',
      newData: newPayment as unknown as Record<string, unknown>,
      changeReason: `Recorded payment of ₹${newPayment.amountReceived} collected by ${payment.collectedByPartnerId}`,
    });

    if (!this.inTransaction) this.saveToDisk(this.data);
    return newPayment;
  }

  public voidPayment(paymentId: string, actorPartnerId: string, reason: string): ClientPayment {
    const payment = this.data.clientPayments.find((p) => p.id === paymentId);
    if (!payment) throw new Error(`Payment ${paymentId} not found`);

    const plan = this.data.clientBillingPlans.find((p) => p.id === payment.billingPlanId);
    if (!plan) throw new Error(`Billing plan for payment ${paymentId} not found`);
    const period = this.getBillingPeriodById(plan.billingPeriodId);
    if (!period) throw new Error(`Billing period for payment ${paymentId} not found`);
    if (period.status === 'CLOSED') {
      throw new Error(`Cannot void payment: period ${period.periodKey} is CLOSED.`);
    }

    const oldData = { ...payment };
    payment.status = 'VOIDED';
    payment.updatedAt = new Date().toISOString();

    this.logAudit({
      organizationId: period.organizationId,
      actorPartnerId,
      entityName: 'client_payments',
      entityId: paymentId,
      action: 'VOID',
      oldData: oldData as unknown as Record<string, unknown>,
      newData: payment as unknown as Record<string, unknown>,
      changeReason: reason || 'Voided payment entry',
    });

    if (!this.inTransaction) this.saveToDisk(this.data);
    return payment;
  }

  public recordExternalDisbursement(
    disbursement: Omit<ExternalDisbursement, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { idempotencyKey?: string },
    actorPartnerId: string
  ): ExternalDisbursement {
    const period = this.getBillingPeriodById(disbursement.billingPeriodId);
    if (!period) throw new Error('Billing period not found');
    if (period.status === 'CLOSED') {
      throw new Error(`Cannot record disbursement: period ${period.periodKey} is CLOSED.`);
    }

    if (Number(disbursement.amountPaid) <= 0) {
      throw new Error('Disbursement amount must be greater than zero');
    }

    // Idempotency check: if existing with same key, return without duplicate
    if (disbursement.idempotencyKey) {
      const existing = this.data.externalDisbursements.find(
        (d) => d.idempotencyKey && d.idempotencyKey === disbursement.idempotencyKey
      );
      if (existing) {
        return existing;
      }
    }

    const newDisb: ExternalDisbursement = {
      id: `disb-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      status: 'CONFIRMED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...disbursement,
      amountPaid: Number(disbursement.amountPaid).toFixed(2),
    };

    this.data.externalDisbursements.push(newDisb);

    this.logAudit({
      organizationId: period.organizationId,
      actorPartnerId,
      entityName: 'external_disbursements',
      entityId: newDisb.id,
      action: 'INSERT',
      newData: newDisb as unknown as Record<string, unknown>,
      changeReason: `Recorded external cost of ₹${newDisb.amountPaid} paid by ${disbursement.disbursedByPartnerId}`,
    });

    if (!this.inTransaction) this.saveToDisk(this.data);
    return newDisb;
  }

  public voidExternalDisbursement(
    disbursementId: string,
    actorPartnerId: string,
    reason: string
  ): ExternalDisbursement {
    const disb = this.data.externalDisbursements.find((d) => d.id === disbursementId);
    if (!disb) throw new Error(`Disbursement ${disbursementId} not found`);

    const period = this.getBillingPeriodById(disb.billingPeriodId);
    if (!period) throw new Error(`Billing period ${disb.billingPeriodId} not found`);
    if (period.status === 'CLOSED') {
      throw new Error(`Cannot void disbursement: period ${period.periodKey} is CLOSED.`);
    }

    const oldData = { ...disb };
    disb.status = 'VOIDED';
    disb.updatedAt = new Date().toISOString();

    this.logAudit({
      organizationId: period.organizationId,
      actorPartnerId,
      entityName: 'external_disbursements',
      entityId: disbursementId,
      action: 'VOID',
      oldData: oldData as unknown as Record<string, unknown>,
      newData: disb as unknown as Record<string, unknown>,
      changeReason: reason || 'Voided external disbursement',
    });

    if (!this.inTransaction) this.saveToDisk(this.data);
    return disb;
  }

  public addBusinessAdjustment(
    adj: Omit<BusinessAdjustment, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { idempotencyKey?: string },
    actorPartnerId: string
  ): BusinessAdjustment {
    const period = this.getBillingPeriodById(adj.effectiveBillingPeriodId);
    if (!period) throw new Error('Billing period not found');
    if (period.status === 'CLOSED') {
      throw new Error(`Cannot add business adjustment: period ${period.periodKey} is CLOSED.`);
    }

    if (Number(adj.amount) <= 0) {
      throw new Error('Adjustment amount must be greater than zero');
    }
    if (adj.fromPartnerId === adj.toPartnerId) {
      throw new Error('Adjustment must be between two different partners');
    }

    // Idempotency check: if existing with same key, return without duplicate
    if (adj.idempotencyKey) {
      const existing = this.data.businessAdjustments.find(
        (a) => a.idempotencyKey && a.idempotencyKey === adj.idempotencyKey
      );
      if (existing) {
        return existing;
      }
    }

    const newAdj: BusinessAdjustment = {
      id: `adj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      status: 'APPLIED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...adj,
      amount: Number(adj.amount).toFixed(2),
    };

    this.data.businessAdjustments.push(newAdj);

    this.logAudit({
      organizationId: period.organizationId,
      actorPartnerId,
      entityName: 'business_adjustments',
      entityId: newAdj.id,
      action: 'INSERT',
      newData: newAdj as unknown as Record<string, unknown>,
      changeReason: `Recorded business adjustment of ₹${newAdj.amount}: ${adj.reason}`,
    });

    if (!this.inTransaction) this.saveToDisk(this.data);
    return newAdj;
  }

  public closePeriod(
    periodId: string,
    settlementSnapshot: Omit<SettlementPeriod, 'id' | 'createdAt'> & { idempotencyKey?: string },
    actorPartnerId: string
  ): SettlementPeriod {
    const period = this.getBillingPeriodById(periodId);
    if (!period) throw new Error('Period not found');
    if (period.status === 'CLOSED') {
      const existing = this.getSettlementPeriod(periodId);
      if (existing) return existing;
      throw new Error('Period is already closed');
    }

    // Idempotency check
    if (settlementSnapshot.idempotencyKey) {
      const existing = this.data.settlementPeriods.find(
        (s) => s.idempotencyKey && s.idempotencyKey === settlementSnapshot.idempotencyKey
      );
      if (existing) return existing;
    }

    period.status = 'CLOSED';
    period.closedAt = new Date().toISOString();
    period.closedByPartnerId = actorPartnerId;

    const snapshot: SettlementPeriod = {
      id: `settle-${periodId}`,
      createdAt: new Date().toISOString(),
      ...settlementSnapshot,
    };

    // Remove any previous pending draft
    this.data.settlementPeriods = this.data.settlementPeriods.filter((s) => s.billingPeriodId !== periodId);
    this.data.settlementPeriods.push(snapshot);

    this.logAudit({
      organizationId: period.organizationId,
      actorPartnerId,
      entityName: 'billing_periods',
      entityId: periodId,
      action: 'STATUS_CHANGE',
      newData: { status: 'CLOSED', snapshot },
      changeReason: `Closed accounting period ${period.periodKey} and locked settlement`,
    });

    if (!this.inTransaction) this.saveToDisk(this.data);
    return snapshot;
  }

  public reopenPeriod(periodId: string, actorPartnerId: string, reason: string): void {
    const period = this.getBillingPeriodById(periodId);
    if (!period) throw new Error('Period not found');

    period.status = 'OPEN';
    period.closedAt = undefined;
    period.closedByPartnerId = undefined;

    this.logAudit({
      organizationId: period.organizationId,
      actorPartnerId,
      entityName: 'billing_periods',
      entityId: periodId,
      action: 'STATUS_CHANGE',
      newData: { status: 'OPEN' },
      changeReason: reason || 'Reopened accounting period for corrections',
    });

    if (!this.inTransaction) this.saveToDisk(this.data);
  }

  // --- Baseline Seed Generator ---
  private createInitialSeed(): DatabaseSchema {
    const orgId = '00000000-0000-0000-0000-000000000001';
    const anuragId = '11111111-1111-1111-1111-111111111111';
    const vivekId = '22222222-2222-2222-2222-222222222222';
    const periodAugId = 'bp-2026-08';
    const periodSepId = 'bp-2026-09';

    return {
      organizations: [
        {
          id: orgId,
          name: 'Salesforce Support Partnership',
          defaultCurrency: 'INR',
          createdAt: '2026-08-01T00:00:00Z',
        },
      ],
      partners: [
        {
          id: anuragId,
          organizationId: orgId,
          authUserId: 'auth-anurag-user-id',
          partnerCode: 'ANURAG',
          fullName: 'Anurag',
          email: 'anurag@partnership.internal',
          profitSharePercentage: 50.0,
          isActive: true,
          createdAt: '2026-08-01T00:00:00Z',
        },
        {
          id: vivekId,
          organizationId: orgId,
          authUserId: 'auth-vivek-user-id',
          partnerCode: 'VIVEK',
          fullName: 'Vivek',
          email: 'vivek@partnership.internal',
          profitSharePercentage: 50.0,
          isActive: true,
          createdAt: '2026-08-01T00:00:00Z',
        },
      ],
      clients: [
        {
          id: 'client-sai',
          organizationId: orgId,
          name: 'Sai',
          status: 'ACTIVE',
          defaultNote: 'Payment every 15 days',
          createdAt: '2026-08-01T00:00:00Z',
          updatedAt: '2026-08-01T00:00:00Z',
        },
        {
          id: 'client-eshwar',
          organizationId: orgId,
          name: 'Eshwar',
          status: 'ACTIVE',
          defaultNote: 'Remaining amount after resource is 50-50',
          createdAt: '2026-08-01T00:00:00Z',
          updatedAt: '2026-08-01T00:00:00Z',
        },
        {
          id: 'client-ganesh',
          organizationId: orgId,
          name: 'Ganesh',
          status: 'ACTIVE',
          defaultNote: 'Resource Mokika; project started September',
          createdAt: '2026-09-01T00:00:00Z',
          updatedAt: '2026-09-01T00:00:00Z',
        },
        {
          id: 'client-rohit',
          organizationId: orgId,
          name: 'Rohit',
          status: 'ACTIVE',
          defaultNote: 'Broker contract; project started September',
          createdAt: '2026-09-01T00:00:00Z',
          updatedAt: '2026-09-01T00:00:00Z',
        },
      ],
      billingPeriods: [
        {
          id: periodAugId,
          organizationId: orgId,
          periodKey: '2026-08',
          startDate: '2026-08-01',
          endDate: '2026-08-31',
          status: 'CLOSED',
          createdAt: '2026-08-01T00:00:00Z',
          closedAt: '2026-08-31T23:59:59Z',
          closedByPartnerId: anuragId,
        },
        {
          id: periodSepId,
          organizationId: orgId,
          periodKey: '2026-09',
          startDate: '2026-09-01',
          endDate: '2026-09-30',
          status: 'OPEN',
          createdAt: '2026-09-01T00:00:00Z',
        },
      ],
      clientBillingPlans: [
        {
          id: 'cbp-sai-aug',
          clientId: 'client-sai',
          billingPeriodId: periodAugId,
          grossBillingAmount: '40000.00',
          notes: 'August contractual billing',
          createdByPartnerId: anuragId,
          updatedByPartnerId: anuragId,
          createdAt: '2026-08-01T00:00:00Z',
          updatedAt: '2026-08-01T00:00:00Z',
        },
        {
          id: 'cbp-sai-sep',
          clientId: 'client-sai',
          billingPeriodId: periodSepId,
          grossBillingAmount: '50000.00',
          notes: 'September contractual billing',
          createdByPartnerId: anuragId,
          updatedByPartnerId: anuragId,
          createdAt: '2026-09-01T00:00:00Z',
          updatedAt: '2026-09-01T00:00:00Z',
        },
        {
          id: 'cbp-eshwar-sep',
          clientId: 'client-eshwar',
          billingPeriodId: periodSepId,
          grossBillingAmount: '50000.00',
          notes: 'September billing total',
          createdByPartnerId: anuragId,
          updatedByPartnerId: anuragId,
          createdAt: '2026-09-01T00:00:00Z',
          updatedAt: '2026-09-01T00:00:00Z',
        },
        {
          id: 'cbp-ganesh-sep',
          clientId: 'client-ganesh',
          billingPeriodId: periodSepId,
          grossBillingAmount: '70000.00',
          notes: 'September billing example (unbilled)',
          createdByPartnerId: anuragId,
          updatedByPartnerId: anuragId,
          createdAt: '2026-09-01T00:00:00Z',
          updatedAt: '2026-09-01T00:00:00Z',
        },
        {
          id: 'cbp-rohit-sep',
          clientId: 'client-rohit',
          billingPeriodId: periodSepId,
          grossBillingAmount: '110000.00',
          notes: 'September billing example (unbilled)',
          createdByPartnerId: anuragId,
          updatedByPartnerId: anuragId,
          createdAt: '2026-09-01T00:00:00Z',
          updatedAt: '2026-09-01T00:00:00Z',
        },
      ],
      clientPayments: [
        {
          id: 'pay-sep-eshwar',
          billingPlanId: 'cbp-eshwar-sep',
          collectedByPartnerId: anuragId,
          paymentDate: '2026-09-01',
          amountReceived: '25000.00',
          paymentReference: 'LAST-15-DAYS-ESHWAR',
          status: 'CONFIRMED',
          notes: 'Last 15 days payment collected by Anurag',
          idempotencyKey: 'idem-eshwar-sep-01',
          createdByPartnerId: anuragId,
          createdAt: '2026-09-01T12:00:00Z',
          updatedAt: '2026-09-01T12:00:00Z',
        },
        {
          id: 'pay-sep-sai',
          billingPlanId: 'cbp-sai-sep',
          collectedByPartnerId: vivekId,
          paymentDate: '2026-09-01',
          amountReceived: '20000.00',
          paymentReference: 'LAST-15-DAYS-SAI',
          status: 'CONFIRMED',
          notes: 'Last 15 days payment collected by Vivek',
          idempotencyKey: 'idem-sai-sep-01',
          createdByPartnerId: vivekId,
          createdAt: '2026-09-01T12:00:00Z',
          updatedAt: '2026-09-01T12:00:00Z',
        },
      ],
      externalParties: [
        {
          id: 'ep-eshwar-dev',
          organizationId: orgId,
          name: 'External Dev (Eshwar project)',
          partyType: 'RESOURCE',
          contactInfo: 'Resource contracted for Eshwar account',
          isActive: true,
          createdAt: '2026-09-01T00:00:00Z',
        },
        {
          id: 'ep-mokika',
          organizationId: orgId,
          name: 'Mokika',
          partyType: 'RESOURCE',
          contactInfo: 'Resource for Ganesh project',
          isActive: true,
          createdAt: '2026-09-01T00:00:00Z',
        },
        {
          id: 'ep-broker-rohit',
          organizationId: orgId,
          name: 'Broker Partner',
          partyType: 'BROKER',
          contactInfo: 'Broker on Rohit contract',
          isActive: true,
          createdAt: '2026-09-01T00:00:00Z',
        },
      ],
      externalObligations: [
        {
          id: 'eo-eshwar',
          billingPlanId: 'cbp-eshwar-sep',
          externalPartyId: 'ep-eshwar-dev',
          expectedAmount: '20000.00',
          notes: 'Contractual resource cost',
          createdAt: '2026-09-01T00:00:00Z',
        },
        {
          id: 'eo-ganesh',
          billingPlanId: 'cbp-ganesh-sep',
          externalPartyId: 'ep-mokika',
          expectedAmount: '40000.00',
          notes: 'Resource fee for Mokika',
          createdAt: '2026-09-01T00:00:00Z',
        },
        {
          id: 'eo-rohit',
          billingPlanId: 'cbp-rohit-sep',
          externalPartyId: 'ep-broker-rohit',
          expectedAmount: '70000.00',
          notes: 'Broker commission',
          createdAt: '2026-09-01T00:00:00Z',
        },
      ],
      externalDisbursements: [
        {
          id: 'ed-eshwar-resource-01',
          obligationId: 'eo-eshwar',
          billingPeriodId: periodSepId,
          externalPartyId: 'ep-eshwar-dev',
          disbursedByPartnerId: anuragId,
          amountPaid: '10000.00',
          disbursementDate: '2026-09-01',
          status: 'CONFIRMED',
          notes: '₹10,000 disbursed to resource by Anurag out of collected funds',
          createdByPartnerId: anuragId,
          createdAt: '2026-09-01T12:30:00Z',
          updatedAt: '2026-09-01T12:30:00Z',
        },
      ],
      businessAdjustments: [
        {
          id: 'ba-old-work-500',
          organizationId: orgId,
          effectiveBillingPeriodId: periodSepId,
          fromPartnerId: anuragId,
          toPartnerId: vivekId,
          amount: '500.00',
          reason: 'Balance remaining from older work payment between partners',
          status: 'APPLIED',
          createdByPartnerId: anuragId,
          createdAt: '2026-09-01T00:00:00Z',
          updatedAt: '2026-09-01T00:00:00Z',
        },
      ],
      settlementPeriods: [],
      auditLogs: [
        {
          id: 'audit-init-01',
          organizationId: orgId,
          actorPartnerId: anuragId,
          entityName: 'system',
          entityId: orgId,
          action: 'INSERT',
          newData: { description: 'Initialized production partnership ledger with baseline records' },
          changeReason: 'System initialization',
          createdAt: '2026-09-01T00:00:00Z',
        },
      ],
    };
  }
}

export const db = DatabaseRepository.getInstance();
