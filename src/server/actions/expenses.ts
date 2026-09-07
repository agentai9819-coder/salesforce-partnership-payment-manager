'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db/repository';
import { requireAuthenticatedPartner } from '@/server/auth';
import { ActionResult } from '@/server/boundaries';
import { z } from 'zod';

const RecordDisbursementSchema = z.object({
  billingPeriodId: z.string().min(1, 'Billing period is required'),
  externalPartyId: z.string().min(1, 'External party is required'),
  disbursedByPartnerId: z.string().min(1, 'Disbursing partner is required'),
  amountPaid: z.coerce.number().positive('Amount paid must be greater than zero'),
  disbursementDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid date is required'),
  notes: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

export async function recordDisbursementAction(formData: FormData): Promise<ActionResult> {
  try {
    const { partner } = await requireAuthenticatedPartner();

    const parsed = RecordDisbursementSchema.safeParse({
      billingPeriodId: formData.get('billingPeriodId'),
      externalPartyId: formData.get('externalPartyId'),
      disbursedByPartnerId: formData.get('disbursedByPartnerId'),
      amountPaid: formData.get('amountPaid'),
      disbursementDate: formData.get('disbursementDate'),
      notes: formData.get('notes') || undefined,
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

    const disb = db.recordExternalDisbursement(
      {
        billingPeriodId: parsed.data.billingPeriodId,
        externalPartyId: parsed.data.externalPartyId,
        disbursedByPartnerId: parsed.data.disbursedByPartnerId,
        amountPaid: parsed.data.amountPaid.toString(),
        disbursementDate: parsed.data.disbursementDate,
        notes: parsed.data.notes,
        idempotencyKey: parsed.data.idempotencyKey,
        createdByPartnerId: partner.id,
      },
      partner.id
    );

    revalidatePath('/expenses');
    revalidatePath('/dashboard');
    revalidatePath('/settlements');

    return { success: true, data: disb };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to record external disbursement';
    return { success: false, error: { code: 'SERVER_ERROR', message } };
  }
}

export async function voidDisbursementAction(disbursementId: string, reason: string): Promise<ActionResult> {
  try {
    const { partner } = await requireAuthenticatedPartner();

    if (!reason || reason.trim() === '') {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'A reason is required to void a disbursement' },
      };
    }

    const voided = db.voidExternalDisbursement(disbursementId, partner.id, reason);

    revalidatePath('/expenses');
    revalidatePath('/dashboard');
    revalidatePath('/settlements');

    return { success: true, data: voided };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to void disbursement';
    return { success: false, error: { code: 'SERVER_ERROR', message } };
  }
}
