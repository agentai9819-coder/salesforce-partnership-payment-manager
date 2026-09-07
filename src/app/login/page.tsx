import React from 'react';
import { db } from '@/db/repository';
import { loginAction } from '@/server/actions/auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ShieldCheck, ArrowRight } from 'lucide-react';

export default async function LoginPage() {
  const partners = db.getAllPartners();

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
          <div className="flex items-center gap-2 rounded-xl bg-accent/10 p-3 text-accent text-xs">
            <ShieldCheck className="h-5 w-5 shrink-0" />
            <span>
              This is a private operational ledger for <strong>Anurag</strong> and <strong>Vivek</strong>. Select your partner profile below to sign in:
            </span>
          </div>

          <div className="space-y-3 pt-2">
            {partners.map((p) => (
              <form key={p.id} action={async () => { 'use server'; await loginAction(p.partnerCode); }}>
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
