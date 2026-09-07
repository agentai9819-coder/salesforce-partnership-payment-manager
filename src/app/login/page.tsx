import React from 'react';
import { redirect } from 'next/navigation';
import { db } from '@/db/repository';
import { getCurrentPartner } from '@/server/auth';
import { loginAction } from '@/server/actions/auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ShieldCheck, ArrowRight, AlertTriangle } from 'lucide-react';
import { Partner } from '@/domain/types/entities';

export default async function LoginPage() {
  const currentPartner = await getCurrentPartner();
  if (currentPartner) {
    redirect('/dashboard');
  }

  let partners: Partner[] = [];
  let configError: string | null = null;

  try {
    partners = db.getAllPartners();
  } catch (err: unknown) {
    configError = err instanceof Error ? err.message : 'Database initialization error';
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
    <div className="flex min-h-[70vh] items-center justify-center p-4">
      <Card className="w-full max-w-md border-2 border-border shadow-xl">
        <CardHeader className="text-center pb-4 border-b border-border">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground font-black text-xl mb-2">
            SP
          </div>
          <CardTitle className="text-xl">Partner Authentication</CardTitle>
          <CardDescription>
            Salesforce Support Partnership Payment Manager
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4 text-xs">
          {configError && (
            <div className="flex items-start gap-2 rounded-xl bg-destructive/10 border border-destructive/30 p-3 text-destructive text-xs">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Database Notice</p>
                <p className="text-[11px] mt-1">{configError}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 rounded-xl bg-accent/10 p-3 text-accent text-xs">
            <ShieldCheck className="h-5 w-5 shrink-0" />
            <span>
              This is a private operational ledger for <strong>Anurag</strong> and <strong>Vivek</strong>. Select your partner profile below to sign in:
            </span>
          </div>

          <div className="space-y-3 pt-2">
            {partners.map((p) => (
              <form
                key={p.id}
                action={async () => {
                  'use server';
                  await loginAction(p.partnerCode);
                  redirect('/dashboard');
                }}
              >
                <Button
                  type="submit"
                  variant="outline"
                  className="w-full justify-between py-3 h-auto text-left hover:border-accent hover:bg-accent/5 transition-all"
                >
                  <div>
                    <div className="font-extrabold text-foreground text-sm">{p.fullName}</div>
                    <div className="text-muted-foreground text-[11px]">{p.email} &bull; 50% Share</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-accent" />
                </Button>
              </form>
            ))}
          </div>

          <div className="border-t border-border pt-3 text-center text-[11px] text-muted-foreground">
            Sessions are secured with HTTP-only cryptographic cookies.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
