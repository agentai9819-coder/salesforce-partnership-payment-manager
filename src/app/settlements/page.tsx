import React from 'react';
import { db } from '@/db/repository';
import { requireAuthenticatedPartner } from '@/server/auth';
import { closePeriodAction, reopenPeriodAction, markSettlementPaidAction } from '@/server/actions/periods';
import { calculateMonthlySettlement, calculatePartnerPositions } from '@/domain/financial/engine';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AdjustmentModal } from '@/components/modals/AdjustmentModal';
import { Scale, Lock, Unlock, CheckCircle, AlertTriangle } from 'lucide-react';

interface SettlementsPageProps {
  searchParams?: {
    period?: string;
  };
}

export default async function SettlementsPage({ searchParams }: SettlementsPageProps) {
  const { organizationId } = await requireAuthenticatedPartner();

  const periods = db.getBillingPeriods(organizationId);
  const currentPeriodKey = searchParams?.period || '2026-09';
  const activePeriod = db.ensureBillingPeriod(organizationId, currentPeriodKey);

  const partners = db.getPartners(organizationId);
  const anurag = partners.find((p) => p.partnerCode === 'ANURAG') || partners[0];
  const vivek = partners.find((p) => p.partnerCode === 'VIVEK') || partners[1];

  const billingPlans = db.getBillingPlans(activePeriod.id);
  const payments = db.getPaymentsForPeriod(activePeriod.id);
  const disbursements = db.getExternalDisbursements(activePeriod.id);
  const adjustments = db.getBusinessAdjustments(activePeriod.id);
  const settlementSnapshot = db.getSettlementPeriod(activePeriod.id);

  const summary = calculateMonthlySettlement({
    periodKey: activePeriod.periodKey,
    anuragPartnerId: anurag.id,
    vivekPartnerId: vivek.id,
    billingPlans,
    payments,
    disbursements,
    adjustments,
  });

  const positions = calculatePartnerPositions({
    periodKey: activePeriod.periodKey,
    anuragPartnerId: anurag.id,
    vivekPartnerId: vivek.id,
    billingPlans,
    payments,
    disbursements,
    adjustments,
  });

  const isClosed = activePeriod.status === 'CLOSED';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-foreground">Equalization Settlement Statement</h2>
          <p className="text-xs text-muted-foreground">
            Complete mathematical reconciliation of partner entitlements, cash-in-hand, and carry-forwards.
          </p>
        </div>

        <div className="flex items-center gap-3">
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

          {!isClosed && (
            <AdjustmentModal billingPeriodId={activePeriod.id} partners={partners} />
          )}
        </div>
      </div>

      {/* Central Statement Card */}
      <Card className="border-2 border-border shadow-md">
        <CardHeader className="border-b border-border pb-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Scale className="h-5 w-5 text-accent" /> Monthly Settlement Statement: {activePeriod.periodKey}
                </CardTitle>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold ${
                    isClosed ? 'bg-muted text-muted-foreground' : 'bg-success/10 text-success'
                  }`}
                >
                  {activePeriod.status}
                </span>
                {settlementSnapshot?.isSettled && (
                  <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-extrabold text-success flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> SETTLED
                  </span>
                )}
              </div>
              <CardDescription>
                Auditable partnership balancing statement for Salesforce support consulting.
              </CardDescription>
            </div>

            {/* Period Closing & Settlement Actions */}
            <div className="flex items-center gap-2">
              {!isClosed ? (
                <form action={async () => { 'use server'; await closePeriodAction(activePeriod.id); }}>
                  <Button type="submit" size="sm" className="gap-1.5 bg-slate-900 text-white hover:bg-slate-800">
                    <Lock className="h-4 w-4" /> Close &amp; Lock Period
                  </Button>
                </form>
              ) : (
                <div className="flex items-center gap-2">
                  {!settlementSnapshot?.isSettled && (
                    <form
                      action={async () => {
                        'use server';
                        await markSettlementPaidAction(activePeriod.id, 'BANK-TRANSFER-CONFIRMED');
                      }}
                    >
                      <Button type="submit" size="sm" className="gap-1.5 bg-success text-white hover:bg-success/90">
                        <CheckCircle className="h-4 w-4" /> Mark Paid
                      </Button>
                    </form>
                  )}
                  <form action={async () => { 'use server'; await reopenPeriodAction(activePeriod.id, 'Reopened by partner'); }}>
                    <Button type="submit" size="sm" variant="outline" className="gap-1.5">
                      <Unlock className="h-4 w-4" /> Reopen
                    </Button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Step by Step Breakdown */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border p-3.5 bg-muted/20">
              <span className="text-[11px] font-bold text-muted-foreground uppercase">1. Gross Realized Collections</span>
              <div className="mt-1 text-xl font-black text-foreground">
                ₹{Number(summary.totalCollected).toLocaleString('en-IN')}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Anurag: ₹{Number(positions[0].grossCollections).toLocaleString('en-IN')} &bull; Vivek: ₹{Number(positions[1].grossCollections).toLocaleString('en-IN')}
              </p>
            </div>

            <div className="rounded-xl border border-border p-3.5 bg-muted/20">
              <span className="text-[11px] font-bold text-muted-foreground uppercase">2. External Disbursements Paid</span>
              <div className="mt-1 text-xl font-black text-danger">
                ₹{Number(summary.totalExternalDisbursed).toLocaleString('en-IN')}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Paid by Anurag: ₹{Number(positions[0].externalDisbursements).toLocaleString('en-IN')}
              </p>
            </div>

            <div className="rounded-xl border border-border p-3.5 bg-muted/20">
              <span className="text-[11px] font-bold text-muted-foreground uppercase">3. Realized Net Pool</span>
              <div className="mt-1 text-xl font-black text-success">
                ₹{Number(summary.netPartnershipIncome).toLocaleString('en-IN')}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">Collections minus Disbursements</p>
            </div>

            <div className="rounded-xl border border-border p-3.5 bg-muted/20">
              <span className="text-[11px] font-bold text-muted-foreground uppercase">4. 50% Entitlement Each</span>
              <div className="mt-1 text-xl font-black text-accent">
                ₹{Number(summary.anuragEntitlement).toLocaleString('en-IN')}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">50% of Realized Net Pool</p>
            </div>
          </div>

          {/* Liquid Cash Held Comparison */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
              Partner Physical Cash In Hand vs. Entitlements
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/30 text-muted-foreground">
                  <tr>
                    <th className="p-3">Partner</th>
                    <th className="p-3">Gross Collections</th>
                    <th className="p-3">External Disbursed</th>
                    <th className="p-3">Net Liquid Cash Held</th>
                    <th className="p-3">50% Entitlement</th>
                    <th className="p-3">Operational Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {positions.map((pos) => (
                    <tr key={pos.partnerId}>
                      <td className="p-3 font-bold text-foreground">{pos.partnerCode}</td>
                      <td className="p-3 font-medium text-foreground">₹{Number(pos.grossCollections).toLocaleString('en-IN')}</td>
                      <td className="p-3 font-medium text-danger">₹{Number(pos.externalDisbursements).toLocaleString('en-IN')}</td>
                      <td className="p-3 font-extrabold text-foreground">₹{Number(pos.netLiquidCashHeld).toLocaleString('en-IN')}</td>
                      <td className="p-3 font-medium text-muted-foreground">₹{Number(pos.entitlement).toLocaleString('en-IN')}</td>
                      <td className="p-3 font-bold">
                        {Number(pos.netVariance) > 0 ? (
                          <span className="text-amber-600">+₹{Number(pos.netVariance).toLocaleString('en-IN')} (Surplus)</span>
                        ) : Number(pos.netVariance) < 0 ? (
                          <span className="text-indigo-600">-₹{Math.abs(Number(pos.netVariance)).toLocaleString('en-IN')} (Deficit)</span>
                        ) : (
                          <span className="text-muted-foreground">₹0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Business Adjustments Table */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                Active Business Adjustments ({adjustments.length})
              </h4>
            </div>

            {adjustments.length === 0 ? (
              <p className="text-xs text-muted-foreground">No business adjustments applied to this period.</p>
            ) : (
              <div className="divide-y divide-border text-xs">
                {adjustments.map((a) => {
                  const fromP = partners.find((pt) => pt.id === a.fromPartnerId);
                  const toP = partners.find((pt) => pt.id === a.toPartnerId);
                  return (
                    <div key={a.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-foreground">
                          {fromP?.fullName} &rarr; {toP?.fullName}
                        </span>
                        <span className="ml-2 text-muted-foreground">{a.reason}</span>
                      </div>
                      <span className="font-bold text-danger">₹{Number(a.amount).toLocaleString('en-IN')}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Final Equalization Banner */}
          <div className="rounded-2xl border-2 border-accent bg-accent/5 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-accent">
                  Final Equalization Settlement Calculation
                </span>
                <div className="mt-1 text-3xl font-black text-foreground">
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
                    <span className="text-muted-foreground">Accounts are Balanced (₹0)</span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-2 border-t border-accent/20 pt-4 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Operational Cash Balancing (Vivek cash ₹20k − entitlement ₹17.5k):</span>
                <span className="font-bold text-foreground">
                  Vivek owes Anurag ₹{Number(summary.operationalBalancingTransfer).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Business Carry-Forward Adjustment (Old work balance):</span>
                <span className="font-bold text-danger">
                  Anurag owes Vivek ₹{Number(summary.businessAdjustmentsTotal).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-sm font-black text-foreground">
                <span>Final Realized Transfer Amount:</span>
                <span className="text-success">
                  ₹{Number(summary.finalSettlementAmount).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
