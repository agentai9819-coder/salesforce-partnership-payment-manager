import React from 'react';
import Link from 'next/link';
import { db } from '@/db/repository';
import { requireAuthenticatedPartner } from '@/server/auth';
import { calculateMonthlySettlement } from '@/domain/financial/engine';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  TrendingUp,
  Receipt,
  Scale,
  CreditCard,
  ArrowRight,
  HelpCircle,
  AlertCircle,
  Wallet,
  CheckCircle2,
  Clock,
  Calendar,
  Building2,
  PlusCircle,
  Info,
  Database,
} from 'lucide-react';

interface DashboardPageProps {
  searchParams?: {
    period?: string;
  };
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { partner, organizationId } = await requireAuthenticatedPartner();

  const periods = db.getBillingPeriods(organizationId);
  // Default to Cycle 2 (Sep 16 - Sep 30)
  const currentPeriodKey = searchParams?.period || '2026-09-C2';
  const activePeriod = db.ensureBillingPeriod(organizationId, currentPeriodKey);

  const partners = db.getPartners(organizationId);
  const anurag = partners.find((p) => p.partnerCode === 'ANURAG') || partners[0];
  const vivek = partners.find((p) => p.partnerCode === 'VIVEK') || partners[1];

  const clients = db.getClients(organizationId);
  const billingPlans = db.getBillingPlans(activePeriod.id);
  const payments = db.getPaymentsForPeriod(activePeriod.id);
  const disbursements = db.getExternalDisbursements(activePeriod.id);
  const adjustments = db.getBusinessAdjustments(activePeriod.id);

  // Helper for period labels
  const getPeriodLabel = (key: string) => {
    if (key === '2026-09-C2') return 'Sep 16 - Sep 30 (Cycle 2 - Current)';
    if (key === '2026-09-C1') return 'Sep 1 - Sep 15 (Cycle 1)';
    if (key === '2026-09') return 'September 2026 (Consolidated)';
    if (key === '2026-08') return 'August 2026 (Closed)';
    return key;
  };

  // Derive metrics strictly from authoritative records
  const summary = calculateMonthlySettlement({
    periodKey: activePeriod.periodKey,
    anuragPartnerId: anurag.id,
    vivekPartnerId: vivek.id,
    billingPlans,
    payments,
    disbursements,
    adjustments,
  });

  const confirmedPayments = payments.filter((p) => p.status === 'CONFIRMED');
  const recentPayments = [...confirmedPayments].sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));

  const anuragPaymentsIn = confirmedPayments
    .filter((p) => p.collectedByPartnerId === anurag.id)
    .reduce((sum, p) => sum + Number(p.amountReceived), 0);

  const vivekPaymentsIn = confirmedPayments
    .filter((p) => p.collectedByPartnerId === vivek.id)
    .reduce((sum, p) => sum + Number(p.amountReceived), 0);

  const anuragExpensesPaid = disbursements
    .filter((d) => d.status === 'CONFIRMED' && d.disbursedByPartnerId === anurag.id)
    .reduce((sum, d) => sum + Number(d.amountPaid), 0);

  const vivekExpensesPaid = disbursements
    .filter((d) => d.status === 'CONFIRMED' && d.disbursedByPartnerId === vivek.id)
    .reduce((sum, d) => sum + Number(d.amountPaid), 0);

  // Cash currently held in bank accounts
  const anuragCash = Number(summary.anuragLiquidCashHeld);
  const vivekCash = Number(summary.vivekLiquidCashHeld);
  const netPool = Number(summary.netPartnershipIncome);
  const eachShare = Number(summary.anuragEntitlement);

  // Sai specific details
  const saiClient = clients.find((c) => c.name.toLowerCase().includes('sai'));
  const saiPlan = saiClient ? billingPlans.find((bp) => bp.clientId === saiClient.id) : undefined;
  const saiPaid = confirmedPayments
    .filter((p) => saiPlan && p.billingPlanId === saiPlan.id)
    .reduce((sum, p) => sum + Number(p.amountReceived), 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* 1. Top Header & 15-Day Cycle Selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-card p-4 sm:p-5 rounded-2xl border border-border shadow-xs">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-black tracking-tight text-foreground">Partnership Dashboard</h1>
            <span className="rounded-full bg-blue-100 text-blue-800 px-3 py-0.5 text-xs font-bold flex items-center gap-1">
              <Calendar className="h-3 w-3" /> 15-Day Payment Cycle
            </span>
            <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-xs font-bold">
              50 / 50 Split
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Current View: <strong>{getPeriodLabel(activePeriod.periodKey)}</strong> &bull; Anurag &amp; Vivek Shared Ledger
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <form method="GET" className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground">Cycle:</span>
            <select
              name="period"
              defaultValue={currentPeriodKey}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {periods.map((p) => (
                <option key={p.id} value={p.periodKey}>
                  {getPeriodLabel(p.periodKey)}
                </option>
              ))}
            </select>
            <Button type="submit" size="sm" variant="secondary" className="text-xs font-bold">
              View
            </Button>
          </form>

          <Link href="/admin">
            <Button size="sm" variant="outline" className="gap-1.5 border-accent text-accent hover:bg-accent/10 text-xs font-bold">
              <Database className="h-3.5 w-3.5" /> Admin Tables
            </Button>
          </Link>

          <Link href="/payments">
            <Button size="sm" className="gap-1.5 bg-accent hover:bg-accent/90 text-white text-xs font-bold">
              <PlusCircle className="h-3.5 w-3.5" /> Record Payment
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Notice: Cycle Status Banner */}
      {activePeriod.periodKey === '2026-09-C2' ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-4 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-900">
                Cycle 2 (Sep 16 &ndash; Sep 30) Status: Sai Payment of ₹30,000 is PENDING
              </p>
              <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                Sai&apos;s September contract is <strong>₹50,000</strong> total. Cycle 1 (Sep 1&ndash;15) was <strong>₹20,000</strong> (paid to Vivek). 
                The rest amount of <strong>₹30,000</strong> is <strong>pending</strong> and has not been received yet. Eshwar has paid his <strong>₹25,000</strong> for Cycle 2 to Anurag.
              </p>
            </div>
          </div>
          <Link href="/payments" className="shrink-0">
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold">
              + Record Sai Payment
            </Button>
          </Link>
        </div>
      ) : activePeriod.periodKey === '2026-09-C1' ? (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50/90 p-4 text-emerald-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <CreditCard className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-emerald-900">
                Cycle 1 (Sep 1 &ndash; Sep 15) Fully Received: ₹45,000 Total Collected
              </p>
              <p className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">
                Eshwar paid <strong>₹25,000</strong> (collected by Anurag) and Sai paid <strong>₹20,000</strong> (collected by Vivek). 
                Anurag disbursed ₹10,000 to external dev. Net profit: ₹35,000 (₹17,500 each partner). Vivek owes Anurag ₹2,500.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* 3. Simple 3-Box Overview (Cash In, Costs Out, Net Cash in Hand) */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4 border-emerald-200 bg-emerald-50/20">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold text-emerald-800">1. Total Cash Collected</span>
            <CreditCard className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600">
            ₹{Number(summary.totalCollected).toLocaleString('en-IN')}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {activePeriod.periodKey === '2026-09-C1'
              ? 'Eshwar (₹25k) & Sai (₹20k) collected'
              : activePeriod.periodKey === '2026-09-C2'
              ? 'Eshwar (₹25k) collected • Sai (₹30k) pending'
              : 'Total client collections recorded'}
          </p>
        </Card>

        <Card className="p-4 border-rose-200 bg-rose-50/20">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold text-rose-800">2. External Dev Paid</span>
            <AlertCircle className="h-4 w-4 text-rose-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-rose-600">
            ₹{Number(summary.totalExternalDisbursed).toLocaleString('en-IN')}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Resource payout paid by Anurag out of funds
          </p>
        </Card>

        <Card className="p-4 border-indigo-200 bg-indigo-50/20">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold text-indigo-800">3. Net Cash to Split (50/50)</span>
            <TrendingUp className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-indigo-600">
            ₹{netPool.toLocaleString('en-IN')}
          </div>
          <p className="mt-1 text-[11px] font-bold text-foreground">
            ₹{eachShare.toLocaleString('en-IN')} each for Anurag &amp; Vivek
          </p>
        </Card>
      </div>

      {/* 4. Partner Bank Accounts & Settlement Status (Clean & Intuitive) */}
      <div className="rounded-2xl border-2 border-border bg-card p-5 sm:p-6 shadow-xs space-y-6">
        <div>
          <h2 className="text-lg font-black text-foreground flex items-center gap-2">
            <Wallet className="h-5 w-5 text-accent" /> Actual Cash in Partner Bank Accounts
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real physical money currently sitting in each partner&apos;s personal bank account.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Anurag Bank Account */}
          <div className="rounded-xl border-2 border-indigo-200 bg-indigo-50/30 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-800">Anurag&apos;s Bank Account</span>
              <span className="rounded-full bg-indigo-100 text-indigo-800 px-2 py-0.5 text-[10px] font-bold">
                Holding Funds
              </span>
            </div>
            <div className="mt-2 text-3xl font-black text-foreground">
              ₹{anuragCash.toLocaleString('en-IN')}
            </div>
            <div className="mt-3 space-y-1 text-xs border-t border-indigo-100 pt-2.5 text-muted-foreground">
              <div className="flex justify-between">
                <span>Received from Eshwar:</span>
                <span className="font-bold text-emerald-600">+₹{anuragPaymentsIn.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span>Paid to Dev:</span>
                <span className="font-bold text-rose-600">-₹{anuragExpensesPaid.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between border-t border-indigo-100/60 pt-1 text-foreground font-bold">
                <span>Current Balance in Hand:</span>
                <span>₹{anuragCash.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Vivek Bank Account */}
          <div className="rounded-xl border-2 border-amber-200 bg-amber-50/30 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800">Vivek&apos;s Bank Account</span>
              <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-bold">
                Holding Funds
              </span>
            </div>
            <div className="mt-2 text-3xl font-black text-foreground">
              ₹{vivekCash.toLocaleString('en-IN')}
            </div>
            <div className="mt-3 space-y-1 text-xs border-t border-amber-100 pt-2.5 text-muted-foreground">
              <div className="flex justify-between">
                <span>Received from Clients:</span>
                <span className="font-bold text-emerald-600">+₹{vivekPaymentsIn.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span>Expenses Paid:</span>
                <span className="font-bold text-rose-600">-₹{vivekExpensesPaid.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between border-t border-amber-100/60 pt-1 text-foreground font-bold">
                <span>Current Balance in Hand:</span>
                <span>₹{vivekCash.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Profit Split Status */}
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-indigo-700" />
                <span className="text-xs font-bold text-indigo-900 uppercase tracking-wide">
                  15-Day Profit Share Summary (50 / 50)
                </span>
              </div>
              <div className="mt-1 text-base font-extrabold text-foreground">
                Total Net Profit to Split: ₹{netPool.toLocaleString('en-IN')} &bull; Each Partner: ₹{eachShare.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="shrink-0">
              <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-900 px-3 py-1 text-xs font-bold">
                ⏳ Unsettled &bull; In Bank Accounts
              </span>
            </div>
          </div>

          <div className="mt-3 text-xs text-muted-foreground space-y-2">
            <p>
              &bull; <strong>Anurag Bank:</strong> Holds ₹{anuragCash.toLocaleString('en-IN')} &bull; <strong>Vivek Bank:</strong> Holds ₹{vivekCash.toLocaleString('en-IN')}
            </p>
            <p>
              &bull; <strong>Each Partner&apos;s Equal 50% Share:</strong> <strong>₹{eachShare.toLocaleString('en-IN')} each</strong>
            </p>
            <p className="text-foreground font-medium">
              &bull; <strong>Equalization Action:</strong> {
                summary.finalSettlementDirection === 'VIVEK_PAYS_ANURAG'
                  ? `Vivek transfers ₹${Number(summary.finalSettlementAmount).toLocaleString('en-IN')} to Anurag so both have exactly ₹${eachShare.toLocaleString('en-IN')} each.`
                  : summary.finalSettlementDirection === 'ANURAG_PAYS_VIVEK'
                  ? `Anurag transfers ₹${Number(summary.finalSettlementAmount).toLocaleString('en-IN')} to Vivek so both have exactly ₹${eachShare.toLocaleString('en-IN')} each.`
                  : 'Partner accounts are 100% equalized!'
              }
            </p>
          </div>
        </div>
      </div>

      {/* 5. Clients Overview (15-Day Cycle Rates & Current Status) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-accent" /> Client Accounts (15-Day Billing Cycle)
              </CardTitle>
              <CardDescription>All clients on 15-day cycle rates and their payment status</CardDescription>
            </div>
            <Link href="/billing" className="text-xs font-bold text-accent hover:underline">
              Manage Client Billing &rarr;
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border text-xs">
            {/* Eshwar */}
            <div className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-foreground text-sm">Eshwar</span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    {activePeriod.periodKey === '2026-09-C2' ? 'Cycle 2 Paid' : 'Cycle 1 Paid'}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Contract: ₹50,000/month &bull; <strong>15-Day Cycle Rate: ₹25,000</strong>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
                  +₹25,000 Received (in Anurag Bank)
                </span>
              </div>
            </div>

            {/* Sai */}
            <div className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-foreground text-sm">Sai</span>
                  {activePeriod.periodKey === '2026-09-C2' ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                      Cycle 2 Pending (Rest Amount)
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                      Cycle 1 Paid (₹20,000)
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    (₹50k/month contract)
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Monthly: ₹50,000 &bull; <strong>{activePeriod.periodKey === '2026-09-C2' ? 'Cycle 2 Due: ₹30,000' : 'Cycle 1 Rate: ₹20,000'}</strong>
                </p>
              </div>
              <div className="flex items-center gap-3">
                {activePeriod.periodKey === '2026-09-C2' ? (
                  <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md">
                    ⏳ ₹30,000 Pending from Client
                  </span>
                ) : (
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
                    +₹20,000 Received (in Vivek Bank)
                  </span>
                )}
              </div>
            </div>

            {/* Ganesh */}
            <div className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-foreground text-sm">Ganesh</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                    New Project
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Monthly Rate: ₹70,000 &bull; <strong>15-Day Cycle: ₹35,000</strong>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-muted-foreground bg-muted/40 border border-border px-2.5 py-1 rounded-md">
                  Pending Invoice
                </span>
              </div>
            </div>

            {/* Rohit */}
            <div className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-foreground text-sm">Rohit</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                    Broker Project
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Monthly Rate: ₹1,10,000 &bull; <strong>15-Day Cycle: ₹55,000</strong>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-muted-foreground bg-muted/40 border border-border px-2.5 py-1 rounded-md">
                  Pending Invoice
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 6. Quick Help & Record Links */}
      <div className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-accent shrink-0" />
          <span>
            When a payment arrives from Sai or any other client, click <strong>Record Payment</strong> to instantly credit the partner&apos;s account.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/payments">
            <Button size="sm" variant="outline" className="text-xs font-bold">
              Record Client Payment
            </Button>
          </Link>
          <Link href="/expenses">
            <Button size="sm" variant="outline" className="text-xs font-bold">
              Record Dev / Expense
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
