import React from 'react';
import Link from 'next/link';
import { db } from '@/db/repository';
import { requireAuthenticatedPartner } from '@/server/auth';
import { calculateMonthlySettlement } from '@/domain/financial/engine';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  Calendar,
  CreditCard,
  Receipt,
  Scale,
  TrendingUp,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';

interface DashboardPageProps {
  searchParams?: {
    period?: string;
  };
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { organizationId } = await requireAuthenticatedPartner();

  const periods = db.getBillingPeriods(organizationId);
  // Default to Cycle 1 of September 2026
  const currentPeriodKey = searchParams?.period || '2026-09-C1';
  const activePeriod = db.ensureBillingPeriod(organizationId, currentPeriodKey);

  const partners = db.getPartners(organizationId);
  const anurag = partners.find((p) => p.partnerCode === 'ANURAG') || partners[0];
  const vivek = partners.find((p) => p.partnerCode === 'VIVEK') || partners[1];

  const clients = db.getClients(organizationId);
  const clientMap = new Map(clients.map((c) => [c.id, c]));

  const billingPlans = db.getBillingPlans(activePeriod.id);
  const payments = db.getPaymentsForPeriod(activePeriod.id);
  const disbursements = db.getExternalDisbursements(activePeriod.id);
  const adjustments = db.getBusinessAdjustments(activePeriod.id);
  const settlementRecord = db.getSettlementPeriod(activePeriod.id);

  // Period label helper
  const getPeriodLabel = (key: string) => {
    if (key === '2026-09-C1') return 'Sep 1 – Sep 15 (Cycle 1 - Current)';
    if (key === '2026-09-C2') return 'Sep 16 – Sep 30 (Cycle 2)';
    if (key === '2026-09') return 'September 2026 (Consolidated Month)';
    if (key === '2026-08-C1') return 'Aug 1 – Aug 15 (Cycle 1 - Settled)';
    if (key === '2026-08-C2') return 'Aug 16 – Aug 31 (Cycle 2 - Open)';
    if (key === '2026-08') return 'August 2026 (Consolidated Month)';
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
  const anuragCollected = confirmedPayments
    .filter((p) => p.collectedByPartnerId === anurag.id)
    .reduce((sum, p) => sum + Number(p.amountReceived), 0);

  const vivekCollected = confirmedPayments
    .filter((p) => p.collectedByPartnerId === vivek.id)
    .reduce((sum, p) => sum + Number(p.amountReceived), 0);

  const confirmedDisbursements = disbursements.filter((d) => d.status === 'CONFIRMED');
  const anuragDisbursed = confirmedDisbursements
    .filter((d) => d.disbursedByPartnerId === anurag.id)
    .reduce((sum, d) => sum + Number(d.amountPaid), 0);

  const vivekDisbursed = confirmedDisbursements
    .filter((d) => d.disbursedByPartnerId === vivek.id)
    .reduce((sum, d) => sum + Number(d.amountPaid), 0);

  // Formatted numbers
  const totalReceived = Number(summary.totalCollected);
  const totalDisbursed = Number(summary.totalExternalDisbursed);
  const netPool = Number(summary.netPartnershipIncome);
  const anuragEntitlement = Number(summary.anuragEntitlement);
  const vivekEntitlement = Number(summary.vivekEntitlement);

  const isAlreadySettled = Boolean(settlementRecord?.isSettled);

  // Settlement direction & sentence
  const opBalancingAmt = Number(summary.operationalBalancingTransfer);
  let settlementSentence = 'No settlement required';
  if (isAlreadySettled) {
    settlementSentence = 'Already Settled (No further transfer required)';
  } else if (summary.operationalBalancingDirection === 'VIVEK_OWES_ANURAG' && opBalancingAmt > 0) {
    settlementSentence = `Vivek pays Anurag ₹${opBalancingAmt.toLocaleString('en-IN')}`;
  } else if (summary.operationalBalancingDirection === 'ANURAG_OWES_VIVEK' && opBalancingAmt > 0) {
    settlementSentence = `Anurag pays Vivek ₹${opBalancingAmt.toLocaleString('en-IN')}`;
  }

  // Client billing rows
  const clientBillingRows = billingPlans.map((plan) => {
    const client = clientMap.get(plan.clientId);
    const planPayments = payments.filter((p) => p.billingPlanId === plan.id && p.status === 'CONFIRMED');
    const received = planPayments.reduce((sum, p) => sum + Number(p.amountReceived), 0);
    const expected = Number(plan.grossBillingAmount);
    const outstanding = Math.max(0, expected - received);
    return {
      clientId: plan.clientId,
      clientName: client?.name || 'Unknown Client',
      expected,
      received,
      outstanding,
    };
  });

  const totalBillingExpected = clientBillingRows.reduce((sum, r) => sum + r.expected, 0);
  const totalBillingReceived = clientBillingRows.reduce((sum, r) => sum + r.received, 0);
  const totalBillingOutstanding = clientBillingRows.reduce((sum, r) => sum + r.outstanding, 0);

  const isSeptember = activePeriod.periodKey.startsWith('2026-09');

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* 1. CURRENT PERIOD */}
      <Card className="border-border bg-card shadow-xs">
        <CardHeader className="pb-3 border-b border-border/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg font-black tracking-tight text-foreground flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-accent" /> CURRENT PERIOD
                </CardTitle>
                <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-xs font-bold">
                  Anurag 50% &bull; Vivek 50%
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Two 15-day cycles per month: Cycle 1 (1st&ndash;15th) &bull; Cycle 2 (16th&ndash;End)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <form method="GET" className="flex items-center gap-2">
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
                  Switch
                </Button>
              </form>
              <Link href="/payments">
                <Button size="sm" className="gap-1 bg-accent hover:bg-accent/90 text-white text-xs font-bold">
                  <PlusCircle className="h-3.5 w-3.5" /> Record Payment
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>

        {isSeptember && (
          <CardContent className="pt-3 pb-3">
            <div className="rounded-lg bg-blue-50/80 border border-blue-200 p-3 text-xs text-blue-900 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-blue-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">₹20,000 August Cycle 2 payment expected on 11 Sep</p>
                <p className="text-[11px] text-blue-700 mt-0.5">
                  This is an August receivable, not September revenue. It will credit cash to August Cycle 2 when recorded.
                </p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* 2. BILLING */}
      <Card className="border-border">
        <CardHeader className="pb-3 border-b border-border/50">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-accent" /> BILLING
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border/60 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                  <th className="pb-2">Client</th>
                  <th className="pb-2 text-right">Expected</th>
                  <th className="pb-2 text-right">Received</th>
                  <th className="pb-2 text-right">Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {clientBillingRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-muted-foreground">
                      No billing plans configured for this period.
                    </td>
                  </tr>
                ) : (
                  clientBillingRows.map((row) => (
                    <tr key={row.clientId} className="hover:bg-muted/30">
                      <td className="py-2.5 font-bold text-foreground">{row.clientName}</td>
                      <td className="py-2.5 text-right font-medium text-foreground">
                        ₹{row.expected.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 text-right font-bold text-emerald-600">
                        ₹{row.received.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 text-right font-bold text-amber-600">
                        ₹{row.outstanding.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {clientBillingRows.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-border font-black text-xs text-foreground bg-muted/20">
                    <td className="py-2.5 font-bold">Total</td>
                    <td className="py-2.5 text-right">₹{totalBillingExpected.toLocaleString('en-IN')}</td>
                    <td className="py-2.5 text-right text-emerald-600">₹{totalBillingReceived.toLocaleString('en-IN')}</td>
                    <td className="py-2.5 text-right text-amber-600">₹{totalBillingOutstanding.toLocaleString('en-IN')}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 3. CASH */}
      <Card className="border-border">
        <CardHeader className="pb-3 border-b border-border/50">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-emerald-600" /> CASH (Actual Received Money)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200">
              <span className="text-[11px] font-bold text-emerald-900 uppercase">Total Received</span>
              <p className="text-2xl font-black text-emerald-700 mt-1">₹{totalReceived.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Confirmed collections only</p>
            </div>
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border">
              <span className="text-[11px] font-bold text-foreground uppercase">Anurag Received</span>
              <p className="text-xl font-black text-foreground mt-1">₹{anuragCollected.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Deposited with Anurag</p>
            </div>
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border">
              <span className="text-[11px] font-bold text-foreground uppercase">Vivek Received</span>
              <p className="text-xl font-black text-foreground mt-1">₹{vivekCollected.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Deposited with Vivek</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. EXPENSES */}
      <Card className="border-border">
        <CardHeader className="pb-3 border-b border-border/50">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Receipt className="h-4 w-4 text-rose-600" /> EXPENSES (Actual External Paid)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-200">
              <span className="text-[11px] font-bold text-rose-900 uppercase">Total External Paid</span>
              <p className="text-2xl font-black text-rose-700 mt-1">₹{totalDisbursed.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Confirmed disbursements</p>
            </div>
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border">
              <span className="text-[11px] font-bold text-foreground uppercase">Anurag Paid</span>
              <p className="text-xl font-black text-rose-600 mt-1">₹{anuragDisbursed.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Paid by Anurag</p>
            </div>
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border">
              <span className="text-[11px] font-bold text-foreground uppercase">Vivek Paid</span>
              <p className="text-xl font-black text-rose-600 mt-1">₹{vivekDisbursed.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Paid by Vivek</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 5. 50/50 PARTNERSHIP */}
      <Card className="border-border">
        <CardHeader className="pb-3 border-b border-border/50">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Scale className="h-4 w-4 text-indigo-600" /> 50/50 PARTNERSHIP
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-200">
              <span className="text-[11px] font-bold text-indigo-900 uppercase">Net Pool</span>
              <p className="text-2xl font-black text-indigo-700 mt-1">₹{netPool.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Actual Collections &minus; Actual External Paid</p>
            </div>
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border">
              <span className="text-[11px] font-bold text-foreground uppercase">Anurag Share (50%)</span>
              <p className="text-xl font-black text-indigo-700 mt-1">₹{anuragEntitlement.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">50% entitlement</p>
            </div>
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border">
              <span className="text-[11px] font-bold text-foreground uppercase">Vivek Share (50%)</span>
              <p className="text-xl font-black text-indigo-700 mt-1">₹{vivekEntitlement.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">50% entitlement</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 6. FINAL SETTLEMENT */}
      <Card className="border-2 border-accent/40 bg-card shadow-xs">
        <CardHeader className="pb-3 border-b border-border/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-accent flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-accent" /> FINAL SETTLEMENT
            </CardTitle>
            {isAlreadySettled && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 px-3 py-0.5 text-xs font-bold">
                <CheckCircle2 className="h-3.5 w-3.5" /> Already Settled 50/50
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="p-4 rounded-xl bg-accent/5 border border-accent/20">
            <p className="text-xl sm:text-2xl font-black text-foreground">
              {settlementSentence}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Balances actual cash held against 50% partner entitlement.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-muted/30 border border-border/60 text-xs text-muted-foreground flex items-center gap-2">
            <span className="font-bold text-foreground">Business carry-forward:</span> Anurag owes Vivek ₹500
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

