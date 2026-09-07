'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db/repository';
import { requireAuthenticatedPartner } from '@/server/auth';
import { ActionResult } from '@/server/boundaries';
import { z } from 'zod';

const SetBillingPlanSchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  periodKey: z.string().regex(/^\d{4}-\d{2}$/, 'Valid period key (YYYY-MM) is required'),
  grossAmount: z.coerce.number().min(0, 'Billing amount must be zero or positive'),
  notes: z.string().optional(),
  reason: z.string().min(1, 'A reason for setting or changing billing is required'),
  idempotencyKey: z.string().optional(),
});

export async function saveBillingPlanAction(formData: FormData): Promise<ActionResult> {
  try {
    const { partner, organizationId } = await requireAuthenticatedPartner();

    const parsed = SetBillingPlanSchema.safeParse({
      clientId: formData.get('clientId'),
      periodKey: formData.get('periodKey'),
      grossAmount: formData.get('grossAmount'),
      notes: formData.get('notes') || undefined,
      reason: formData.get('reason') || 'Updated monthly billing amount',
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

    const { clientId, periodKey, grossAmount, notes, reason, idempotencyKey } = parsed.data;

    // Verify client belongs to partner organization
    const client = db.getClientById(clientId);
    if (!client || client.organizationId !== organizationId) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Client not found in organization' },
      };
    }

    const period = db.ensureBillingPeriod(organizationId, periodKey);

    const plan = db.setBillingPlan(
      clientId,
      period.id,
      grossAmount.toString(),
      partner.id,
      notes,
      reason,
      idempotencyKey
    );

    revalidatePath('/billing');
    revalidatePath('/dashboard');
    revalidatePath('/settlements');

    return { success: true, data: plan };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save billing plan';
    return { success: false, error: { code: 'SERVER_ERROR', message } };
  }
}
