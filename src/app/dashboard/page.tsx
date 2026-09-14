import React from 'react';
import Link from 'next/link';
import { db } from '@/db/repository';
import { requireAuthenticatedPartner } from '@/server/auth';
import { calculateMonthlySettlement } from '@/domain/financial/engine';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  CreditCard,
  Receipt,
  Scale,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  ArrowRight,
  UserCheck,
} from 'lucide-react';

interface DashboardPageProps {
  searchParams?: {
    period?: string;
  };
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { organizationId } = await requireAuthenticatedPartner();

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

  // Period Tabs
  const periodTabs = [
    { key: '2026-09-C1', label: 'Sep 1 – 15 (Current)' },
    { key: '2026-08-C2', label: 'Aug 16 – 31' },
    { key: '2026-08-C1', label: 'Aug 1 – 15 (Settled)' },
    { key: '2026-08', label: 'August Full Month' },
    { key: '2026-09-C2', label: 'Sep 16 – 30' },
    { key: '2026-09', label: 'September Full Month' },
  ];

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

  // Settlement direction & sentence (Incorporating business carry-forward)
  const opBalancingAmt = Number(summary.operationalBalancingTransfer);
  const finalSettlementAmt = Number(summary.finalSettlementAmount);
  const businessAdjustmentAmt = Number(summary.businessAdjustmentsTotal);

  let settlementSentence = 'No settlement required (Balanced)';
  let settlementSubtext = 'Both partners have equal cash entitlement.';
  let isVivekPays = false;
  let isAnuragPays = false;

  if (isAlreadySettled) {
    settlementSentence = 'Already Settled 50/50';
    settlementSubtext = 'This period was already settled. No further payment transfer required.';
  } else if (summary.finalSettlementDirection === 'VIVEK_PAYS_ANURAG' && finalSettlementAmt > 0) {
    settlementSentence = `Vivek pays Anurag ₹${finalSettlementAmt.toLocaleString('en-IN')} (Net)`;
    if (businessAdjustmentAmt > 0) {
      settlementSubtext = `Operational split ke ₹${opBalancingAmt.toLocaleString('en-IN')} me se purane ₹${businessAdjustmentAmt.toLocaleString('en-IN')} kaat kar, Vivek Anurag ko net ₹${finalSettlementAmt.toLocaleString('en-IN')} dega.`;
    } else {
      settlementSubtext = `Vivek gives Anurag ₹${finalSettlementAmt.toLocaleString('en-IN')} to equalize the 50/50 partnership share.`;
    }
    isVivekPays = true;
  } else if (summary.finalSettlementDirection === 'ANURAG_PAYS_VIVEK' && finalSettlementAmt > 0) {
    settlementSentence = `Anurag pays Vivek ₹${finalSettlementAmt.toLocaleString('en-IN')} (Net)`;
    if (businessAdjustmentAmt > 0) {
      settlementSubtext = `Operational split + purana hisaab ₹${businessAdjustmentAmt.toLocaleString('en-IN')}, Anurag Vivek ko net ₹${finalSettlementAmt.toLocaleString('en-IN')} dega.`;
    } else {
      settlementSubtext = `Anurag gives Vivek ₹${finalSettlementAmt.toLocaleString('en-IN')} to equalize the 50/50 partnership share.`;
    }
    isAnuragPays = true;
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

  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-12">
      {/* 1. ONE-CLICK PERIOD FILTER TABS */}
      <div className="bg-card p-3 rounded-2xl border border-border shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {periodTabs.map((tab) => {
              const isActive = currentPeriodKey === tab.key;
              return (
                <Link
                  key={tab.key}
                  href={`/dashboard?period=${tab.key}`}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>

          <Link href="/payments" className="shrink-0">
            <Button size="sm" className="gap-1.5 bg-accent hover:bg-accent/90 text-white text-xs font-bold w-full sm:w-auto">
              <PlusCircle className="h-3.5 w-3.5" /> Record Payment
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. THE MAIN ANSWER: KISKO KITNA PAYMENT DENA HAI? */}
      <div
        className={`p-5 rounded-2xl border-2 shadow-sm ${
          isAlreadySettled
            ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
            : isVivekPays
            ? 'bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-300 text-indigo-950'
            : isAnuragPays
            ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300 text-amber-950'
            : 'bg-muted/40 border-border text-foreground'
        }`}
      >
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Scale className="h-4 w-4 text-indigo-600" /> FINAL SETTLEMENT &bull; Kisko Kitna Dena Hai
          </span>
          {isAlreadySettled ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-xs font-bold">
              <CheckCircle2 className="h-3.5 w-3.5" /> Settled
            </span>
          ) : (
            <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
              50 / 50 Equal Split
            </span>
          )}
        </div>

        <p className="text-2xl sm:text-3xl font-black mt-2 text-foreground">
          {settlementSentence}
        </p>
        <p className="text-xs text-muted-foreground mt-1 font-medium">
          {settlementSubtext}
        </p>

        {businessAdjustmentAmt > 0 && !isAlreadySettled && (
          <div className="mt-3 p-3 rounded-xl bg-background/80 border border-border text-xs text-foreground space-y-1.5">
            <div className="flex justify-between text-muted-foreground">
              <span>Current Cycle Hisaab (Operational):</span>
              <span className="font-semibold text-foreground">Vivek owes Anurag ₹{opBalancingAmt.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-amber-700">
              <span>Minus Purana Carry-forward:</span>
              <span className="font-semibold text-amber-700">&minus; ₹{businessAdjustmentAmt.toLocaleString('en-IN')} (Anurag owes Vivek)</span>
            </div>
            <div className="flex justify-between font-black text-emerald-600 pt-1.5 border-t border-border text-sm">
              <span>Net Final Transfer (Asli Lena / Dena):</span>
              <span>Vivek pays Anurag ₹{finalSettlementAmt.toLocaleString('en-IN')}</span>
            </div>
          </div>
        )}
      </div>

      {/* 3. CASH OVERVIEW: KAUNSA KITNA PAISA AAYA */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total Collected */}
        <Card className="border-border">
          <CardContent className="p-4">
            <span className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1">
              <CreditCard className="h-3.5 w-3.5 text-emerald-600" /> Total Received (In Bank)
            </span>
            <p className="text-2xl font-black text-emerald-700 mt-1">₹{totalReceived.toLocaleString('en-IN')}</p>
            <div className="mt-2 pt-2 border-t border-border/40 text-[11px] text-muted-foreground space-y-0.5">
              <div className="flex justify-between">
                <span>Anurag received:</span>
                <span className="font-bold text-foreground">₹{anuragCollected.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span>Vivek received:</span>
                <span className="font-bold text-foreground">₹{vivekCollected.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total External Paid */}
        <Card className="border-border">
          <CardContent className="p-4">
            <span className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1">
              <Receipt className="h-3.5 w-3.5 text-rose-600" /> Resource / Dev Paid
            </span>
            <p className="text-2xl font-black text-rose-700 mt-1">₹{totalDisbursed.toLocaleString('en-IN')}</p>
            <div className="mt-2 pt-2 border-t border-border/40 text-[11px] text-muted-foreground space-y-0.5">
              <div className="flex justify-between">
                <span>Paid by Anurag:</span>
                <span className="font-bold text-foreground">₹{anuragDisbursed.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span>Paid by Vivek:</span>
                <span className="font-bold text-foreground">₹{vivekDisbursed.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Net 50/50 Pool */}
        <Card className="border-border">
          <CardContent className="p-4">
            <span className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1">
              <Scale className="h-3.5 w-3.5 text-indigo-600" /> Net 50/50 Profit
            </span>
            <p className="text-2xl font-black text-indigo-700 mt-1">₹{netPool.toLocaleString('en-IN')}</p>
            <div className="mt-2 pt-2 border-t border-border/40 text-[11px] text-muted-foreground space-y-0.5">
              <div className="flex justify-between">
                <span>Anurag 50% Share:</span>
                <span className="font-bold text-foreground">₹{anuragEntitlement.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span>Vivek 50% Share:</span>
                <span className="font-bold text-foreground">₹{vivekEntitlement.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. EXACT RECEIVED PAYMENTS: KITNA KISKA KAB AAYA */}
      <Card className="border-border">
        <CardHeader className="pb-3 border-b border-border/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-600" /> Actual Payments Received &bull; Kitna Kiska Kab Aaya
            </CardTitle>
            <span className="text-[11px] font-bold text-muted-foreground">
              {confirmedPayments.length} Payment{confirmedPayments.length !== 1 ? 's' : ''} Confirmed
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {confirmedPayments.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-xs">
              <p className="font-semibold">No actual client payments received yet in this period.</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                When a client pays, click &quot;Record Payment&quot; above to log it.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/60 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                    <th className="pb-2">Client</th>
                    <th className="pb-2 text-right">Amount Received</th>
                    <th className="pb-2 text-center">In Whose Account?</th>
                    <th className="pb-2">Date Received</th>
                    <th className="pb-2">Notes / Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {confirmedPayments.map((p) => {
                    const plan = billingPlans.find((bp) => bp.id === p.billingPlanId);
                    const client = plan ? clientMap.get(plan.clientId) : null;
                    const isAnurag = p.collectedByPartnerId === anurag.id;
                    return (
                      <tr key={p.id} className="hover:bg-muted/30">
                        <td className="py-2.5 font-bold text-foreground">
                          {client?.name || 'Client Payment'}
                        </td>
                        <td className="py-2.5 text-right font-black text-emerald-600 text-sm">
                          ₹{Number(p.amountReceived).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              isAnurag
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            <UserCheck className="h-3 w-3" />
                            {isAnurag ? 'Anurag' : 'Vivek'}
                          </span>
                        </td>
                        <td className="py-2.5 text-muted-foreground font-medium">
                          {p.paymentDate}
                        </td>
                        <td className="py-2.5 text-muted-foreground text-[11px]">
                          {p.notes || p.paymentReference || 'Confirmed bank receipt'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 5. CLIENT BILLING & PENDING INVOICES */}
      <Card className="border-border">
        <CardHeader className="pb-3 border-b border-border/50">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-accent" /> Client Billing &amp; Pending Balance
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border/60 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                  <th className="pb-2">Client</th>
                  <th className="pb-2 text-right">Contract Expected</th>
                  <th className="pb-2 text-right">Received</th>
                  <th className="pb-2 text-right">Pending / Outstanding</th>
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
    </div>
  );
}


