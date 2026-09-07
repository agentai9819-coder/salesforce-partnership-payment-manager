'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db/repository';
import { requireAuthenticatedPartner } from '@/server/auth';
import { ActionResult } from '@/server/boundaries';
import { z } from 'zod';

const RecordPaymentSchema = z.object({
  billingPlanId: z.string().min(1, 'Billing plan reference is required'),
  collectedByPartnerId: z.string().min(1, 'Collecting partner is required'),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid date is required'),
  amountReceived: z.coerce.number().positive('Payment amount must be greater than zero'),
  paymentReference: z.string().optional(),
  notes: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

export async function recordPaymentAction(formData: FormData): Promise<ActionResult> {
  try {
    const { partner } = await requireAuthenticatedPartner();

    const parsed = RecordPaymentSchema.safeParse({
      billingPlanId: formData.get('billingPlanId'),
      collectedByPartnerId: formData.get('collectedByPartnerId'),
      paymentDate: formData.get('paymentDate'),
      amountReceived: formData.get('amountReceived'),
      paymentReference: formData.get('paymentReference') || undefined,
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

    const payment = db.recordPayment(
      {
        billingPlanId: parsed.data.billingPlanId,
        collectedByPartnerId: parsed.data.collectedByPartnerId,
        paymentDate: parsed.data.paymentDate,
        amountReceived: parsed.data.amountReceived.toString(),
        paymentReference: parsed.data.paymentReference,
        notes: parsed.data.notes,
        idempotencyKey: parsed.data.idempotencyKey,
        createdByPartnerId: partner.id,
      },
      partner.id
    );

    revalidatePath('/payments');
    revalidatePath('/dashboard');
    revalidatePath('/settlements');
    revalidatePath('/billing');

    return { success: true, data: payment };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to record payment';
    return { success: false, error: { code: 'SERVER_ERROR', message } };
  }
}

export async function voidPaymentAction(paymentId: string, reason: string): Promise<ActionResult> {
  try {
    const { partner } = await requireAuthenticatedPartner();

    if (!reason || reason.trim() === '') {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'A reason is required to void a payment' },
      };
    }

    const voided = db.voidPayment(paymentId, partner.id, reason);

    revalidatePath('/payments');
    revalidatePath('/dashboard');
    revalidatePath('/settlements');
    revalidatePath('/billing');

    return { success: true, data: voided };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to void payment';
    return { success: false, error: { code: 'SERVER_ERROR', message } };
  }
}
