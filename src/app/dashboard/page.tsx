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
  const recentPayments = [...confirmedPayments].sort((a, b) => b.paymentDate.localeCompare(a.paymentDate)).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Top Header & Period Selector */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-foreground">Partnership Dashboard</h2>
          <p className="text-xs text-muted-foreground">
            Authoritative financial operations for Anurag &amp; Vivek.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <form method="GET" className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Period:</span>
            <select
              name="period"
              defaultValue={currentPeriodKey}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {periods.map((p) => (
                <option key={p.id} value={p.periodKey}>
                  {p.periodKey} ({p.status})
                </option>
              ))}
            </select>
            <Button type="submit" size="sm" variant="secondary">
              Filter
            </Button>
          </form>
        </div>
      </div>

      {/* Primary Key Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Total Billed (Accrual)</span>
            <Receipt className="h-4 w-4 text-accent" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-foreground">
            ₹{Number(summary.totalBilled).toLocaleString('en-IN')}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Outstanding: ₹{Number(summary.outstandingReceivable).toLocaleString('en-IN')}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Realized Collections</span>
            <CreditCard className="h-4 w-4 text-success" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-success">
            ₹{Number(summary.totalCollected).toLocaleString('en-IN')}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Actual cash received in bank
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">External Disbursements</span>
            <AlertCircle className="h-4 w-4 text-danger" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-danger">
            ₹{Number(summary.totalExternalDisbursed).toLocaleString('en-IN')}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Resource &amp; broker fees paid
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Realized Net Profit (50/50)</span>
            <TrendingUp className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-foreground">
            ₹{Number(summary.netPartnershipIncome).toLocaleString('en-IN')}
          </div>
          <div className="mt-1 text-[11px] font-semibold text-accent">
            Share: ₹{Number(summary.anuragEntitlement).toLocaleString('en-IN')} each
          </div>
        </Card>
      </div>

      {/* Dynamic Partner Cash & Settlement Cockpit */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Partner Cash Position Cards */}
        <div className="space-y-4 lg:col-span-1">
          <Card className="border-indigo-100 bg-indigo-50/30">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-semibold text-indigo-700">Anurag Liquid Cash Held</span>
                <div className="mt-1 text-2xl font-black text-foreground">
                  ₹{Number(summary.anuragLiquidCashHeld).toLocaleString('en-IN')}
                </div>
              </div>
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800">
                Partner
              </span>
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground">
              Entitlement: ₹{Number(summary.anuragEntitlement).toLocaleString('en-IN')}
            </div>
          </Card>

          <Card className="border-amber-100 bg-amber-50/30">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-semibold text-amber-700">Vivek Liquid Cash Held</span>
                <div className="mt-1 text-2xl font-black text-foreground">
                  ₹{Number(summary.vivekLiquidCashHeld).toLocaleString('en-IN')}
                </div>
              </div>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                Partner
              </span>
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground">
              Entitlement: ₹{Number(summary.vivekEntitlement).toLocaleString('en-IN')}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-muted-foreground">Period Status:</span>
              <span className={`rounded-full px-2.5 py-0.5 font-bold ${
                activePeriod.status === 'OPEN'
                  ? 'bg-success/10 text-success'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {activePeriod.status}
              </span>
            </div>
          </Card>
        </div>

        {/* The Central Settlement Equalization Banner */}
        <Card className="lg:col-span-2 flex flex-col justify-between border-2 border-accent/20">
          <div>
            <CardHeader className="border-b border-border pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base text-foreground">
                  <Scale className="h-5 w-5 text-accent" /> Equalization Settlement Summary
                </CardTitle>
                <Link href={`/settlements?period=${activePeriod.periodKey}`}>
                  <Button variant="outline" size="sm" className="gap-1 text-xs">
                    Full Statement <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
              <CardDescription>
                Calculated strictly from cash inflows, external disbursements, and auditable carry-forwards.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
              {/* The Primary Answer: Who owes whom, how much, and why */}
              <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4 sm:p-5">
                <div className="text-xs font-bold uppercase tracking-wider text-accent">
                  Final Equalizing Action Required
                </div>
                <div className="mt-1 text-2xl sm:text-3xl font-black text-foreground">
                  {summary.finalSettlementDirection === 'VIVEK_PAYS_ANURAG' && (
                    <span className="text-success">
                      Vivek pays Anurag ₹{Number(summary.finalSettlementAmount).toLocaleString('en-IN')}
                    </span>
                  )}
                  {summary.finalSettlementDirection === 'ANURAG_PAYS_VIVEK' && (
                    <span className="text-danger">
                      Anurag pays Vivek ₹{Number(summary.finalSettlementAmount).toLocaleString('en-IN')}
                    </span>
                  )}
                  {summary.finalSettlementDirection === 'BALANCED' && (
                    <span className="text-muted-foreground">Accounts are Perfectly Balanced (₹0 Due)</span>
                  )}
                </div>

                {/* Clear Breakdown */}
                <div className="mt-4 grid gap-2 border-t border-accent/20 pt-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">1. Operational Balancing Transfer:</span>
                    <span className="font-bold text-foreground">
                      {summary.operationalBalancingDirection === 'VIVEK_OWES_ANURAG'
                        ? `Vivek owes Anurag ₹${Number(summary.operationalBalancingTransfer).toLocaleString('en-IN')}`
                        : summary.operationalBalancingDirection === 'ANURAG_OWES_VIVEK'
                        ? `Anurag owes Vivek ₹${Number(summary.operationalBalancingTransfer).toLocaleString('en-IN')}`
                        : 'Balanced'}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">2. Business Carry-Forward Adjustments:</span>
                    <span className="font-bold text-danger">
                      Anurag owes Vivek ₹{Number(summary.businessAdjustmentsTotal).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex justify-between border-t border-border pt-1 font-extrabold text-foreground">
                    <span>Net Equalization Amount:</span>
                    <span>₹{Number(summary.finalSettlementAmount).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/30 p-2.5 rounded-lg">
                <HelpCircle className="h-4 w-4 text-accent shrink-0" />
                <span>
                  <strong>Accounting Rule:</strong> Uncollected billing (₹{Number(summary.outstandingReceivable).toLocaleString('en-IN')}) is excluded from settlement to guarantee no phantom profits are distributed before client payment arrives.
                </span>
              </div>
            </CardContent>
          </div>
        </Card>
      </div>

      {/* Recent Payments & Client Ledger Breakdown */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Collections</CardTitle>
              <Link href="/payments" className="text-xs font-semibold text-accent hover:underline">
                View all
              </Link>
            </div>
            <CardDescription>Latest client payments confirmed this period</CardDescription>
          </CardHeader>
          <CardContent>
            {recentPayments.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">No payments recorded for this period.</div>
            ) : (
              <div className="divide-y divide-border text-xs">
                {recentPayments.map((p) => {
                  const plan = billingPlans.find((bp) => bp.id === p.billingPlanId);
                  const client = plan ? clients.find((c) => c.id === plan.clientId) : undefined;
                  const collector = partners.find((pt) => pt.id === p.collectedByPartnerId);
                  return (
                    <div key={p.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-foreground">{client?.name || 'Client'}</span>
                        <span className="ml-2 text-muted-foreground">{p.paymentDate}</span>
                        {p.paymentReference && (
                          <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                            ({p.paymentReference})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">
                          ₹{Number(p.amountReceived).toLocaleString('en-IN')}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          collector?.partnerCode === 'ANURAG' ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {collector?.fullName || 'Partner'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Client Accounts Status</CardTitle>
              <Link href="/billing" className="text-xs font-semibold text-accent hover:underline">
                Manage billing
              </Link>
            </div>
            <CardDescription>Contractual billing vs payments received</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border text-xs">
              {clients.map((c) => {
                const plan = billingPlans.find((bp) => bp.clientId === c.id);
                const billed = plan ? Number(plan.grossBillingAmount) : 0;
                const clientPayments = payments.filter((p) => p.status === 'CONFIRMED' && plan && p.billingPlanId === plan.id);
                const collected = clientPayments.reduce((sum, p) => sum + Number(p.amountReceived), 0);
                const outstanding = Math.max(0, billed - collected);

                return (
                  <div key={c.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-foreground">{c.name}</span>
                      <div className="text-[11px] text-muted-foreground">
                        Billed: ₹{billed.toLocaleString('en-IN')} &bull; Collected: ₹{collected.toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div>
                      {outstanding > 0 ? (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                          Due: ₹{outstanding.toLocaleString('en-IN')}
                        </span>
                      ) : billed > 0 ? (
                        <span className="rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-bold text-success">
                          Paid in Full
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">Unbilled</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
