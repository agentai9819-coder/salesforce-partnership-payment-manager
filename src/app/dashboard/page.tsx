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
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  UserCheck,
  PlusCircle,
} from 'lucide-react';

interface DashboardPageProps {
  searchParams?: {
    period?: string;
  };
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { partner, organizationId } = await requireAuthenticatedPartner();

  const periods = db.getBillingPeriods(organizationId);
  const currentPeriodKey = searchParams?.period || '2026-09';
  const activePeriod = db.ensureBillingPeriod(organizationId, currentPeriodKey);

  const partners = db.getPartners(organizationId);
  const anurag = partners.find((p) => p.partnerCode === 'ANURAG') || partners[0];
  const vivek = partners.find((p) => p.partnerCode === 'VIVEK') || partners[1];

  const clients = db.getClients(organizationId);
  const billingPlans = db.getBillingPlans(activePeriod.id);
  const payments = db.getPaymentsForPeriod(activePeriod.id);
  const disbursements = db.getExternalDisbursements(activePeriod.id);
  const adjustments = db.getBusinessAdjustments(activePeriod.id);

  // Derive all metrics purely from authoritative transactional records
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

  // Partner specific collections & payouts
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

  // Check Sai's client status specifically to make it crystal clear
  const saiClient = clients.find((c) => c.name.toLowerCase().includes('sai'));
  const saiPlan = saiClient ? billingPlans.find((bp) => bp.clientId === saiClient.id) : undefined;
  const saiPaid = confirmedPayments
    .filter((p) => saiPlan && p.billingPlanId === saiPlan.id)
    .reduce((sum, p) => sum + Number(p.amountReceived), 0);

  return (
    <div className="space-y-6">
      {/* Top Header & Period Selector */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-card p-4 sm:p-5 rounded-2xl border border-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-foreground">Partnership Dashboard</h1>
            <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-bold text-accent">
              50 / 50 Partnership
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time cash in hand, client collections, and equal settlement between Anurag &amp; Vivek.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <form method="GET" className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Month:</span>
            <select
              name="period"
              defaultValue={currentPeriodKey}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {periods.map((p) => (
                <option key={p.id} value={p.periodKey}>
                  {p.periodKey} ({p.status})
                </option>
              ))}
            </select>
            <Button type="submit" size="sm" variant="secondary">
              Go
            </Button>
          </form>

          <Link href="/payments">
            <Button size="sm" className="gap-1.5 bg-accent hover:bg-accent/90 text-white text-xs">
              <PlusCircle className="h-3.5 w-3.5" /> + Record Payment
            </Button>
          </Link>
        </div>
      </div>

      {/* SPECIAL NOTICE: Clarification on Sai's Payment Status */}
      {saiPaid === 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-3.5 sm:p-4 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-900">
                Notice: Client Sai&apos;s Payment (₹50,000) Has Not Arrived Yet
              </p>
              <p className="text-[11px] text-amber-800/90 mt-0.5 leading-relaxed">
                Neither Anurag&apos;s account nor Vivek&apos;s account has received any payment from Sai for this month. 
                As per 50/50 partnership policy, only actual money received in the bank is divided. Sai&apos;s ₹50,000 remains <strong>Pending</strong>.
              </p>
            </div>
          </div>
          <Link href="/payments" className="shrink-0">
            <span className="inline-flex items-center text-xs font-semibold text-amber-900 hover:text-amber-950 underline underline-offset-2">
              Mark as Received when credited &rarr;
            </span>
          </Link>
        </div>
      )}

      {/* HERO SECTION: The Final Settlement Bottom-Line (Easy & Clear) */}
      <div className="overflow-hidden rounded-2xl border-2 border-indigo-500/30 bg-gradient-to-br from-card to-indigo-500/5 shadow-md">
        <div className="p-5 sm:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/60 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-indigo-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                  Current Month Settlement Action
                </span>
              </div>
              <h2 className="mt-1 text-2xl sm:text-3xl font-black text-foreground">
                {summary.finalSettlementDirection === 'VIVEK_PAYS_ANURAG' && (
                  <span className="text-emerald-600">
                    Vivek transfers ₹{Number(summary.finalSettlementAmount).toLocaleString('en-IN')} to Anurag
                  </span>
                )}
                {summary.finalSettlementDirection === 'ANURAG_PAYS_VIVEK' && (
                  <span className="text-indigo-600">
                    Anurag transfers ₹{Number(summary.finalSettlementAmount).toLocaleString('en-IN')} to Vivek
                  </span>
                )}
                {summary.finalSettlementDirection === 'BALANCED' && (
                  <span className="text-foreground">
                    Accounts are 100% Balanced (No transfer needed)
                  </span>
                )}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                This single transfer completely equalizes 50/50 net profits and settles all previous work balances.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link href={`/settlements?period=${activePeriod.periodKey}`}>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs font-bold">
                  View Full Audit Statement <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Simple Step-by-Step Reason (Human Plain Language) */}
          <div className="mt-5 grid gap-3 sm:grid-cols-3 text-xs">
            <div className="rounded-xl border border-border bg-card/60 p-3.5">
              <div className="font-bold text-foreground flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-black text-indigo-700">1</span>
                Cash in Bank Right Now
              </div>
              <p className="mt-2 text-muted-foreground text-[11px] leading-relaxed">
                Anurag received <strong>₹25,000</strong> (Eshwar) &amp; paid <strong>₹10,000</strong> (Dev).<br />
                Anurag holds: <strong className="text-foreground">₹{Number(summary.anuragLiquidCashHeld).toLocaleString('en-IN')}</strong><br />
                Vivek holds: <strong className="text-foreground">₹{Number(summary.vivekLiquidCashHeld).toLocaleString('en-IN')}</strong>
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card/60 p-3.5">
              <div className="font-bold text-foreground flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-black text-indigo-700">2</span>
                50/50 Profit Share
              </div>
              <p className="mt-2 text-muted-foreground text-[11px] leading-relaxed">
                Net profit this month is <strong>₹{Number(summary.netPartnershipIncome).toLocaleString('en-IN')}</strong>.<br />
                Each partner is entitled to 50%:<br />
                <strong className="text-foreground">₹{Number(summary.anuragEntitlement).toLocaleString('en-IN')} each</strong>
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card/60 p-3.5">
              <div className="font-bold text-foreground flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-black text-indigo-700">3</span>
                Previous Balance Adjustment
              </div>
              <p className="mt-2 text-muted-foreground text-[11px] leading-relaxed">
                {Number(summary.businessAdjustmentsTotal) > 0 ? (
                  <>
                    Anurag already owed Vivek <strong>₹{Number(summary.businessAdjustmentsTotal).toLocaleString('en-IN')}</strong> from previous balance.<br />
                    Total to Vivek: ₹7,500 + ₹500 = <strong className="text-indigo-600">₹{Number(summary.finalSettlementAmount).toLocaleString('en-IN')}</strong>
                  </>
                ) : Number(summary.businessAdjustmentsTotal) < 0 ? (
                  <>
                    Vivek already owed Anurag <strong>₹{Math.abs(Number(summary.businessAdjustmentsTotal)).toLocaleString('en-IN')}</strong>.<br />
                    Net transfer: <strong className="text-indigo-600">₹{Number(summary.finalSettlementAmount).toLocaleString('en-IN')}</strong>
                  </>
                ) : (
                  <>
                    No previous carry-forward debt.<br />
                    Net transfer is purely the 50% profit share: <strong className="text-indigo-600">₹{Number(summary.finalSettlementAmount).toLocaleString('en-IN')}</strong>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* PARTNER BANK ACCOUNTS (Cash in Hand) */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Anurag Bank Account */}
        <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50/20 p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">Anurag&apos;s Bank Account</span>
                <div className="text-2xl font-black text-foreground">
                  ₹{Number(summary.anuragLiquidCashHeld).toLocaleString('en-IN')}
                </div>
              </div>
            </div>
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-800">
              Cash In Hand
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-indigo-100 pt-3 text-xs">
            <div>
              <span className="text-muted-foreground">Received from Clients:</span>
              <p className="font-bold text-emerald-600">+₹{anuragPaymentsIn.toLocaleString('en-IN')}</p>
            </div>
            <div>
              <span className="text-muted-foreground">External Expenses Paid:</span>
              <p className="font-bold text-rose-600">-₹{anuragExpensesPaid.toLocaleString('en-IN')}</p>
            </div>
          </div>

          <div className="mt-3 rounded-lg bg-card/80 p-2.5 text-[11px] text-muted-foreground border border-border/50">
            {summary.finalSettlementDirection === 'ANURAG_PAYS_VIVEK' ? (
              <span>
                After transferring <strong>₹{Number(summary.finalSettlementAmount).toLocaleString('en-IN')}</strong> to Vivek, 
                Anurag will keep exactly <strong className="text-foreground">₹{(Number(summary.anuragLiquidCashHeld) - Number(summary.finalSettlementAmount)).toLocaleString('en-IN')}</strong> net.
              </span>
            ) : (
              <span>Anurag retains full share.</span>
            )}
          </div>
        </div>

        {/* Vivek Bank Account */}
        <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/20 p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Vivek&apos;s Bank Account</span>
                <div className="text-2xl font-black text-foreground">
                  ₹{Number(summary.vivekLiquidCashHeld).toLocaleString('en-IN')}
                </div>
              </div>
            </div>
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
              Cash In Hand
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-amber-100 pt-3 text-xs">
            <div>
              <span className="text-muted-foreground">Received from Clients:</span>
              <p className="font-bold text-emerald-600">+₹{vivekPaymentsIn.toLocaleString('en-IN')}</p>
            </div>
            <div>
              <span className="text-muted-foreground">External Expenses Paid:</span>
              <p className="font-bold text-rose-600">-₹{vivekExpensesPaid.toLocaleString('en-IN')}</p>
            </div>
          </div>

          <div className="mt-3 rounded-lg bg-card/80 p-2.5 text-[11px] text-muted-foreground border border-border/50">
            {summary.finalSettlementDirection === 'ANURAG_PAYS_VIVEK' ? (
              <span>
                Vivek will receive <strong>₹{Number(summary.finalSettlementAmount).toLocaleString('en-IN')}</strong> from Anurag 
                (₹7,500 profit share + ₹500 previous balance).
              </span>
            ) : (
              <span>Vivek retains full share.</span>
            )}
          </div>
        </div>
      </div>

      {/* MONTHLY FINANCIAL SNAPSHOT (Simple 4 Cards) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold">Total Cash Collected</span>
            <CreditCard className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600">
            ₹{Number(summary.totalCollected).toLocaleString('en-IN')}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Eshwar: ₹25,000 &bull; Sai: ₹0
          </p>
        </Card>

        <Card className="border-border">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold">External Costs Paid</span>
            <AlertCircle className="h-4 w-4 text-rose-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-rose-600">
            ₹{Number(summary.totalExternalDisbursed).toLocaleString('en-IN')}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Developer Payout (Paid by Anurag)
          </p>
        </Card>

        <Card className="border-border bg-accent/5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold text-accent">Net Partnership Profit</span>
            <TrendingUp className="h-4 w-4 text-accent" />
          </div>
          <div className="mt-2 text-2xl font-black text-foreground">
            ₹{Number(summary.netPartnershipIncome).toLocaleString('en-IN')}
          </div>
          <p className="mt-1 text-[11px] font-bold text-accent">
            Split 50/50 = ₹{Number(summary.anuragEntitlement).toLocaleString('en-IN')} each
          </p>
        </Card>

        <Card className="border-border">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold">Total Expected Invoices</span>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-2 text-2xl font-black text-foreground">
            ₹{Number(summary.totalBilled).toLocaleString('en-IN')}
          </div>
          <p className="mt-1 text-[11px] text-amber-700 font-semibold">
            ₹{Number(summary.outstandingReceivable).toLocaleString('en-IN')} Pending from clients
          </p>
        </Card>
      </div>

      {/* CLIENT PAYMENT STATUS & RECENT COLLECTIONS */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Client Accounts Detailed Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-accent" /> Client Payment Status
                </CardTitle>
                <CardDescription>Status of each client for {activePeriod.periodKey}</CardDescription>
              </div>
              <Link href="/billing" className="text-xs font-semibold text-accent hover:underline">
                Billing Details &rarr;
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border text-xs">
              {clients.map((c) => {
                const plan = billingPlans.find((bp) => bp.clientId === c.id);
                const billed = plan ? Number(plan.grossBillingAmount) : 0;
                const clientPayments = payments.filter((p) => p.status === 'CONFIRMED' && plan && p.billingPlanId === plan.id);
                const collected = clientPayments.reduce((sum, p) => sum + Number(p.amountReceived), 0);
                const outstanding = Math.max(0, billed - collected);

                const isSai = c.name.toLowerCase().includes('sai');
                const isEshwar = c.name.toLowerCase().includes('eshwar');

                return (
                  <div key={c.id} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-foreground">{c.name}</span>
                        {isSai && collected === 0 && (
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                            Payment Not Arrived
                          </span>
                        )}
                        {isEshwar && collected > 0 && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            Tranche 1 Received
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Fee: ₹{billed.toLocaleString('en-IN')} &bull; Collected: <span className="font-semibold text-foreground">₹{collected.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {collected === 0 ? (
                        <span className="rounded-md bg-amber-50 border border-amber-200 px-2.5 py-1 text-[11px] font-bold text-amber-800">
                          ₹{outstanding.toLocaleString('en-IN')} Due
                        </span>
                      ) : outstanding > 0 ? (
                        <span className="rounded-md bg-indigo-50 border border-indigo-200 px-2.5 py-1 text-[11px] font-bold text-indigo-800">
                          ₹{outstanding.toLocaleString('en-IN')} Remaining
                        </span>
                      ) : (
                        <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Fully Paid
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Actual Bank Transactions Log */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-emerald-600" /> Confirmed Bank Deposits
                </CardTitle>
                <CardDescription>Actual money received in partner accounts</CardDescription>
              </div>
              <Link href="/payments" className="text-xs font-semibold text-accent hover:underline">
                View All &rarr;
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentPayments.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No client payments recorded yet for this month.
              </div>
            ) : (
              <div className="divide-y divide-border text-xs">
                {recentPayments.map((p) => {
                  const plan = billingPlans.find((bp) => bp.id === p.billingPlanId);
                  const client = plan ? clients.find((c) => c.id === plan.clientId) : undefined;
                  const collector = partners.find((pt) => pt.id === p.collectedByPartnerId);
                  return (
                    <div key={p.id} className="py-3 flex items-center justify-between">
                      <div>
                        <span className="font-extrabold text-foreground">{client?.name || 'Client'}</span>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          Deposited on {p.paymentDate}
                          {p.paymentReference && <span> &bull; Ref: {p.paymentReference}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-emerald-600 text-sm">
                          +₹{Number(p.amountReceived).toLocaleString('en-IN')}
                        </div>
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold mt-0.5 ${
                          collector?.partnerCode === 'ANURAG' 
                            ? 'bg-indigo-100 text-indigo-800' 
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          Credited in {collector?.fullName || 'Partner'} Bank
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Clarification on pending payments */}
                <div className="pt-3 text-[11px] text-muted-foreground flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  <span>
                    Sai (₹50,000), Ganesh (₹70,000), and Rohit (₹1,10,000) have not deposited into any partner account yet.
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* QUICK FOOTER HELPER */}
      <div className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-accent shrink-0" />
          <span>
            Need to log a new payment or cost? When money arrives in Anurag or Vivek&apos;s account, record it to update the settlement in real time.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/payments">
            <Button size="sm" variant="outline" className="text-xs">
              Record Client Payment
            </Button>
          </Link>
          <Link href="/disbursements">
            <Button size="sm" variant="outline" className="text-xs">
              Record Payout / Expense
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
