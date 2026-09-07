'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db/repository';
import { requireAuthenticatedPartner } from '@/server/auth';
import { ActionResult } from '@/server/boundaries';
import { z } from 'zod';

const BusinessAdjustmentSchema = z.object({
  effectiveBillingPeriodId: z.string().min(1, 'Billing period is required'),
  fromPartnerId: z.string().min(1, 'Debtor partner is required'),
  toPartnerId: z.string().min(1, 'Creditor partner is required'),
  amount: z.coerce.number().positive('Adjustment amount must be greater than zero'),
  reason: z.string().min(1, 'A reason is required for business adjustments'),
  idempotencyKey: z.string().optional(),
});

export async function recordBusinessAdjustmentAction(formData: FormData): Promise<ActionResult> {
  try {
    const { partner, organizationId } = await requireAuthenticatedPartner();

    const parsed = BusinessAdjustmentSchema.safeParse({
      effectiveBillingPeriodId: formData.get('effectiveBillingPeriodId'),
      fromPartnerId: formData.get('fromPartnerId'),
      toPartnerId: formData.get('toPartnerId'),
      amount: formData.get('amount'),
      reason: formData.get('reason'),
      idempotencyKey: formData.get('idempotencyKey') || undefined,
    });

    if (!parsed.success) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues[0]?.message || 'Invalid input data',
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
      };
    }

    if (parsed.data.fromPartnerId === parsed.data.toPartnerId) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'From and To partners must be different' },
      };
    }

    const adj = db.addBusinessAdjustment(
      {
        organizationId,
        effectiveBillingPeriodId: parsed.data.effectiveBillingPeriodId,
        fromPartnerId: parsed.data.fromPartnerId,
        toPartnerId: parsed.data.toPartnerId,
        amount: parsed.data.amount.toString(),
        reason: parsed.data.reason,
        idempotencyKey: parsed.data.idempotencyKey,
        createdByPartnerId: partner.id,
      },
      partner.id
    );

    revalidatePath('/settlements');
    revalidatePath('/dashboard');

    return { success: true, data: adj };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to record adjustment';
    return { success: false, error: { code: 'SERVER_ERROR', message } };
  }
}
