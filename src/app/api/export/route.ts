import { NextResponse } from 'next/server';
import { db } from '@/db/repository';
import { requireAuthenticatedPartner } from '@/server/auth';

export async function GET() {
  try {
    await requireAuthenticatedPartner();
    const data = db.getRawDatabase();

    return new NextResponse(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="partnership-ledger-snapshot-${Date.now()}.json"`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Export failed';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
