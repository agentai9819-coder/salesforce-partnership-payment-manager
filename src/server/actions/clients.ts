'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db/repository';
import { requireAuthenticatedPartner } from '@/server/auth';
import { ActionResult } from '@/server/boundaries';
import { z } from 'zod';

const ClientSchema = z.object({
  name: z.string().trim().min(2, 'Client name must be at least 2 characters'),
  defaultNote: z.string().trim().optional(),
});

export async function createClientAction(formData: FormData): Promise<ActionResult> {
  try {
    const { partner, organizationId } = await requireAuthenticatedPartner();

    const parsed = ClientSchema.safeParse({
      name: formData.get('name'),
      defaultNote: formData.get('defaultNote') || undefined,
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

    // Check for duplicate active client name in organization
    const existingClients = db.getClients(organizationId);
    const isDuplicate = existingClients.some(
      (c) => c.status === 'ACTIVE' && c.name.toLowerCase() === parsed.data.name.toLowerCase()
    );
    if (isDuplicate) {
      return {
        success: false,
        error: {
          code: 'CONFLICT',
          message: `An active client named "${parsed.data.name}" already exists.`,
        },
      };
    }

    const client = db.createClient(
      {
        organizationId,
        name: parsed.data.name,
        status: 'ACTIVE',
        defaultNote: parsed.data.defaultNote,
      },
      partner.id
    );

    revalidatePath('/clients');
    revalidatePath('/dashboard');
    revalidatePath('/billing');

    return { success: true, data: client };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create client';
    return { success: false, error: { code: 'SERVER_ERROR', message } };
  }
}

export async function archiveClientAction(clientId: string): Promise<ActionResult> {
  try {
    const { partner, organizationId } = await requireAuthenticatedPartner();

    const client = db.getClientById(clientId);
    if (!client || client.organizationId !== organizationId) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Client not found' } };
    }

    const updated = db.updateClient(
      clientId,
      { status: 'ARCHIVED' },
      partner.id,
      'Archived client contract'
    );

    revalidatePath('/clients');
    revalidatePath('/billing');

    return { success: true, data: updated };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to archive client';
    return { success: false, error: { code: 'SERVER_ERROR', message } };
  }
}
