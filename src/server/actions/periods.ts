'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db/repository';
import { requireAuthenticatedPartner } from '@/server/auth';
import { ActionResult } from '@/server/boundaries';
import { calculateMonthlySettlement } from '@/domain/financial/engine';

export async function closePeriodAction(periodId: string, idempotencyKey?: string): Promise<ActionResult> {
  try {
    const { partner, organizationId } = await requireAuthenticatedPartner();

    const period = db.getBillingPeriodById(periodId);
    if (!period || period.organizationId !== organizationId) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Period not found' } };
    }

    // Idempotent return if period is already closed
    if (period.status === 'CLOSED') {
      const existing = db.getSettlementPeriod(periodId);
      return { success: true, data: existing };
    }

    const partners = db.getPartners(organizationId);
    const anurag = partners.find((p) => p.partnerCode === 'ANURAG');
    const vivek = partners.find((p) => p.partnerCode === 'VIVEK');

    if (!anurag || !vivek) {
      return { success: false, error: { code: 'CONFIG_ERROR', message: 'Partners not configured' } };
    }

    const billingPlans = db.getBillingPlans(periodId);
    const payments = db.getPaymentsForPeriod(periodId);
    const disbursements = db.getExternalDisbursements(periodId);
    const adjustments = db.getBusinessAdjustments(periodId);

    // Derive the frozen settlement snapshot
    const summary = calculateMonthlySettlement({
      periodKey: period.periodKey,
      anuragPartnerId: anurag.id,
      vivekPartnerId: vivek.id,
      billingPlans,
      payments,
      disbursements,
      adjustments,
    });

    const snapshot = db.closePeriod(
      periodId,
      {
        billingPeriodId: periodId,
        totalCollections: summary.totalCollected,
        totalDisbursements: summary.totalExternalDisbursed,
        netPartnershipPool: summary.netPartnershipIncome,
        anuragEntitlement: summary.anuragEntitlement,
        vivekEntitlement: summary.vivekEntitlement,
        anuragCashHeld: summary.anuragLiquidCashHeld,
        vivekCashHeld: summary.vivekLiquidCashHeld,
        businessAdjustmentsNet: summary.businessAdjustmentsTotal,
        settlementDirection: summary.finalSettlementDirection,
        settlementAmount: summary.finalSettlementAmount,
        isSettled: false,
        idempotencyKey,
      },
      partner.id
    );

    revalidatePath('/settlements');
    revalidatePath('/dashboard');
    revalidatePath('/billing');
    revalidatePath('/payments');

    return { success: true, data: snapshot };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to close period';
    return { success: false, error: { code: 'SERVER_ERROR', message } };
  }
}

export async function reopenPeriodAction(periodId: string, reason: string): Promise<ActionResult> {
  try {
    const { partner, organizationId } = await requireAuthenticatedPartner();

    const period = db.getBillingPeriodById(periodId);
    if (!period || period.organizationId !== organizationId) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Period not found' } };
    }

    db.reopenPeriod(periodId, partner.id, reason || 'Reopened for corrections');

    revalidatePath('/settlements');
    revalidatePath('/dashboard');
    revalidatePath('/billing');
    revalidatePath('/payments');

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to reopen period';
    return { success: false, error: { code: 'SERVER_ERROR', message } };
  }
}

export async function markSettlementPaidAction(periodId: string, reference: string): Promise<ActionResult> {
  try {
    const { partner, organizationId } = await requireAuthenticatedPartner();

    const settlement = db.getSettlementPeriod(periodId);
    if (!settlement) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Settlement snapshot not found' } };
    }

    settlement.isSettled = true;
    settlement.settledAt = new Date().toISOString();
    settlement.paymentReference = reference || 'BANK-TRANSFER';

    db.logAudit({
      organizationId,
      actorPartnerId: partner.id,
      entityName: 'settlement_periods',
      entityId: settlement.id,
      action: 'STATUS_CHANGE',
      newData: { isSettled: true, settledAt: settlement.settledAt, reference },
      changeReason: `Settlement transfer confirmed: ${reference}`,
    });

    revalidatePath('/settlements');
    revalidatePath('/dashboard');

    return { success: true, data: settlement };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to mark settlement paid';
    return { success: false, error: { code: 'SERVER_ERROR', message } };
  }
}
