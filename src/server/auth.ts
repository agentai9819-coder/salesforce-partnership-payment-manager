/**
 * Server Authentication & Partner Session Management
 * Extracts authenticated partner identity from secure cookies server-side.
 * Enforces organization scoping derived dynamically from the authenticated partner.
 */

import { cookies } from 'next/headers';
import { db } from '@/db/repository';
import { Partner } from '@/domain/types/entities';
import { SESSION_COOKIE_NAME } from './constants';

export { SESSION_COOKIE_NAME };

export interface AuthenticatedUser {
  partner: Partner;
  organizationId: string;
}

export async function getCurrentPartner(): Promise<Partner | null> {
  const cookieStore = cookies();
  const sessionValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionValue) {
    return null;
  }

  // Look up partner dynamically by ID, partnerCode, or email
  const partner = db.getPartnerById(sessionValue) || db.getAllPartners().find(
    (p) => p.partnerCode === sessionValue || p.email === sessionValue
  );

  if (partner && partner.isActive) {
    return partner;
  }

  return null;
}

export async function requireAuthenticatedPartner(): Promise<AuthenticatedUser> {
  const partner = await getCurrentPartner();
  if (!partner || !partner.isActive) {
    throw new Error('UNAUTHORIZED: Valid active partner session required');
  }
  return {
    partner,
    organizationId: partner.organizationId,
  };
}
