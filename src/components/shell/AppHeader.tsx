import React from 'react';
import Link from 'next/link';
import { getCurrentPartner } from '@/server/auth';
import { logoutAction, switchPartnerAction } from '@/server/actions/auth';
import { LogOut } from 'lucide-react';

export async function AppHeader() {
  const currentPartner = await getCurrentPartner();
  const isDev = process.env.NODE_ENV !== 'production';

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground font-black text-sm shadow-xs">
              SP
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-accent">
                50 / 50 Partnership Ledger
              </div>
              <h1 className="text-sm sm:text-base font-extrabold text-foreground leading-tight">
                Salesforce Support Payments
              </h1>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {currentPartner ? (
            <>
              {isDev ? (
                /* Development-Only Partner Switcher */
                <div className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/5 p-1 text-xs">
                  <span className="hidden sm:inline px-2 font-bold text-[10px] text-warning uppercase">
                    DEV SWITCH:
                  </span>
                  <form action={async () => { 'use server'; await switchPartnerAction('ANURAG'); }} className="inline">
                    <button
                      type="submit"
                      className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                        currentPartner.partnerCode === 'ANURAG'
                          ? 'bg-accent text-accent-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Anurag
                    </button>
                  </form>
                  <form action={async () => { 'use server'; await switchPartnerAction('VIVEK'); }} className="inline">
                    <button
                      type="submit"
                      className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                        currentPartner.partnerCode === 'VIVEK'
                          ? 'bg-accent text-accent-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Vivek
                    </button>
                  </form>
                </div>
              ) : (
                /* Production: Immutable Authenticated Partner Identity */
                <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-1.5 text-xs font-bold text-foreground">
                  <span className="h-2 w-2 rounded-full bg-success"></span>
                  <span>{currentPartner.fullName}</span>
                  <span className="text-muted-foreground font-normal">({currentPartner.profitSharePercentage}%)</span>
                </div>
              )}

              <Link
                href="/settings"
                className="hidden sm:inline rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/40 transition-colors"
              >
                Settings
              </Link>

              <form action={async () => { 'use server'; await logoutAction(); }} className="inline">
                <button
                  type="submit"
                  title="Logout"
                  className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground shadow-xs"
            >
              Partner Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
