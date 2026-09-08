'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db/repository';
import { requireAuthenticatedPartner } from '@/server/auth';

export async function savePaymentAction(formData: FormData) {
  const { partner } = await requireAuthenticatedPartner();
  const id = formData.get('id') as string | null;
  const billingPlanId = formData.get('billingPlanId') as string;
  const collectedByPartnerId = formData.get('collectedByPartnerId') as string;
  const amountReceived = formData.get('amountReceived') as string;
  const paymentDate = (formData.get('paymentDate') as string) || new Date().toISOString().split('T')[0];
  const paymentReference = formData.get('paymentReference') as string;
  const status = (formData.get('status') as 'CONFIRMED' | 'VOIDED') || 'CONFIRMED';
  const notes = formData.get('notes') as string;

  if (id) {
    db.updatePayment(
      id,
      {
        billingPlanId,
        collectedByPartnerId,
        amountReceived,
        paymentDate,
        paymentReference,
        status,
        notes,
      },
      partner.id
    );
  } else {
    db.recordPayment(
      {
        billingPlanId,
        collectedByPartnerId,
        amountReceived,
        paymentDate,
        paymentReference,
        notes,
        createdByPartnerId: partner.id,
      },
      partner.id
    );
  }

  revalidatePath('/admin');
  revalidatePath('/dashboard');
  revalidatePath('/payments');
  revalidatePath('/settlements');
  return { success: true };
}

export async function deletePaymentAction(id: string) {
  const { partner } = await requireAuthenticatedPartner();
  db.deletePayment(id, partner.id);
  revalidatePath('/admin');
  revalidatePath('/dashboard');
  revalidatePath('/payments');
  revalidatePath('/settlements');
  return { success: true };
}

export async function saveBillingPlanAction(formData: FormData) {
  const { partner } = await requireAuthenticatedPartner();
  const id = formData.get('id') as string | null;
  const clientId = formData.get('clientId') as string;
  const billingPeriodId = formData.get('billingPeriodId') as string;
  const grossBillingAmount = formData.get('grossBillingAmount') as string;
  const notes = formData.get('notes') as string;

  if (id) {
    db.updateBillingPlan(
      id,
      {
        grossBillingAmount,
        notes,
      },
      partner.id
    );
  } else {
    db.setBillingPlan(clientId, billingPeriodId, grossBillingAmount, partner.id, notes);
  }

  revalidatePath('/admin');
  revalidatePath('/dashboard');
  revalidatePath('/billing');
  return { success: true };
}

export async function deleteBillingPlanAction(id: string) {
  const { partner } = await requireAuthenticatedPartner();
  db.deleteBillingPlan(id, partner.id);
  revalidatePath('/admin');
  revalidatePath('/dashboard');
  revalidatePath('/billing');
  return { success: true };
}

export async function saveClientAction(formData: FormData) {
  const { partner, organizationId } = await requireAuthenticatedPartner();
  const id = formData.get('id') as string | null;
  const name = formData.get('name') as string;
  const status = (formData.get('status') as 'ACTIVE' | 'INACTIVE') || 'ACTIVE';
  const defaultNote = formData.get('defaultNote') as string;

  if (id) {
    db.updateClient(id, { name, status, defaultNote }, partner.id, 'Admin updated client');
  } else {
    db.createClient({ organizationId, name, status, defaultNote }, partner.id);
  }

  revalidatePath('/admin');
  revalidatePath('/dashboard');
  revalidatePath('/clients');
  return { success: true };
}

export async function deleteClientAction(id: string) {
  const { partner } = await requireAuthenticatedPartner();
  db.deleteClient(id, partner.id);
  revalidatePath('/admin');
  revalidatePath('/dashboard');
  revalidatePath('/clients');
  return { success: true };
}

export async function saveDisbursementAction(formData: FormData) {
  const { partner } = await requireAuthenticatedPartner();
  const id = formData.get('id') as string | null;
  const billingPeriodId = formData.get('billingPeriodId') as string;
  const externalPartyId = formData.get('externalPartyId') as string;
  const disbursedByPartnerId = formData.get('disbursedByPartnerId') as string;
  const amountPaid = formData.get('amountPaid') as string;
  const disbursementDate = (formData.get('disbursementDate') as string) || new Date().toISOString().split('T')[0];
  const notes = formData.get('notes') as string;
  const status = (formData.get('status') as 'CONFIRMED' | 'VOIDED') || 'CONFIRMED';

  if (id) {
    db.updateExternalDisbursement(
      id,
      {
        disbursedByPartnerId,
        amountPaid,
        disbursementDate,
        notes,
        status,
      },
      partner.id
    );
  } else {
    db.recordExternalDisbursement(
      {
        billingPeriodId,
        externalPartyId,
        disbursedByPartnerId,
        amountPaid,
        disbursementDate,
        notes,
        createdByPartnerId: partner.id,
      },
      partner.id
    );
  }

  revalidatePath('/admin');
  revalidatePath('/dashboard');
  revalidatePath('/expenses');
  revalidatePath('/settlements');
  return { success: true };
}

export async function deleteDisbursementAction(id: string) {
  const { partner } = await requireAuthenticatedPartner();
  db.deleteExternalDisbursement(id, partner.id);
  revalidatePath('/admin');
  revalidatePath('/dashboard');
  revalidatePath('/expenses');
  revalidatePath('/settlements');
  return { success: true };
}
