import React from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { db } from '@/db/repository';
import { getCurrentPartner } from '@/server/auth';
import { GATEWAY_COOKIE_NAME } from '@/server/constants';
import { Partner } from '@/domain/types/entities';
import { DoorGateway } from '@/components/auth/DoorGateway';

export default async function LoginPage() {
  const currentPartner = await getCurrentPartner();
  if (currentPartner) {
    redirect('/dashboard');
  }

  const gatewayCookie = cookies().get(GATEWAY_COOKIE_NAME);
  const isInitiallyUnlocked = gatewayCookie?.value === 'unlocked';

  let partners: Partner[] = [];

  try {
    partners = db.getAllPartners();
  } catch (err: unknown) {
    console.error('LoginPage database error:', err);
    partners = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        organizationId: '00000000-0000-0000-0000-000000000001',
        authUserId: '11111111-1111-1111-1111-aaaaaaaaaaaa',
        partnerCode: 'ANURAG',
        fullName: 'Anurag',
        email: 'anurag@partnership.internal',
        profitSharePercentage: 50,
        isActive: true,
        createdAt: '2026-08-01T00:00:00Z',
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        organizationId: '00000000-0000-0000-0000-000000000001',
        authUserId: '22222222-2222-2222-2222-bbbbbbbbbbbb',
        partnerCode: 'VIVEK',
        fullName: 'Vivek',
        email: 'vivek@partnership.internal',
        profitSharePercentage: 50,
        isActive: true,
        createdAt: '2026-08-01T00:00:00Z',
      },
    ];
  }

  return (
    <div className="flex min-h-[75vh] items-center justify-center py-6">
      <DoorGateway
        partners={partners}
        isInitiallyUnlocked={isInitiallyUnlocked}
      />
    </div>
  );
}
