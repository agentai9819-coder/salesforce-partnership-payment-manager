import React from 'react';
import { db } from '@/db/repository';
import { requireAuthenticatedPartner } from '@/server/auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { BillingModal } from '@/components/modals/BillingModal';
import { Receipt, AlertTriangle, Calendar } from 'lucide-react';

interface BillingPageProps {
  searchParams?: {
    month?: string;
    period?: string;
  };
}

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const { organizationId } = await requireAuthenticatedPartner();

  const periods = db.getBillingPeriods(organizationId);

  // Derive the active base month (e.g. 2026-09 or 2026-08)
  const rawParam = searchParams?.month || searchParams?.period || '2026-09';
  const baseMonthKey = rawParam.includes('-C') ? rawParam.split('-C')[0] : rawParam;

  const monthPeriod = db.ensureBillingPeriod(organizationId, baseMonthKey);
  const c1Period = db.getBillingPeriodByKey(organizationId, `${baseMonthKey}-C1`);
  const c2Period = db.getBillingPeriodByKey(organizationId, `${baseMonthKey}-C2`);

  const clients = db.getClients(organizationId);

  // Month-level data
  const monthlyPlans = db.getBillingPlans(monthPeriod.id);
  const monthlyPayments = db.getPaymentsForPeriod(monthPeriod.id);

  // Cycle 1 data
  const c1Plans = c1Period ? db.getBillingPlans(c1Period.id) : [];
  const c1Payments = c1Period ? db.getPaymentsForPeriod(c1Period.id) : [];

  // Cycle 2 data
  const c2Plans = c2Period ? db.getBillingPlans(c2Period.id) : [];
  const c2Payments = c2Period ? db.getPaymentsForPeriod(c2Period.id) : [];

  const isClosed = monthPeriod.status === 'CLOSED';

  // Extract unique distinct month keys for dropdown
  const monthKeys = Array.from(
    new Set(
      periods.map((p) => (p.periodKey.includes('-C') ? p.periodKey.split('-C')[0] : p.periodKey))
    )
  ).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-foreground">15-Day Cycle Client Billing Matrix</h2>
          <p className="text-xs text-muted-foreground">
            Contractual client billing broken into Cycle 1 (1st&ndash;15th) and Cycle 2 (16th&ndash;End). Strictly decoupled from actual cash received.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <form method="GET" className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Month:</span>
            <select
              name="month"
              defaultValue={baseMonthKey}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {monthKeys.map((key) => {
                const p = periods.find((x) => x.periodKey === key);
                return (
                  <option key={key} value={key}>
                    {key} {p?.status === 'CLOSED' ? '(Closed)' : '(Open)'}
                  </option>
                );
              })}
            </select>
            <Button type="submit" size="sm" variant="secondary">
              Filter
            </Button>
          </form>

          {!isClosed && (
            <BillingModal clients={clients} currentPeriodKey={monthPeriod.periodKey} />
          )}
        </div>
      </div>

      {isClosed && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <strong>Month is CLOSED:</strong> Historical billing records for {baseMonthKey} are locked against direct mutations.
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="h-4 w-4 text-accent" /> Billing &amp; Collections Ledger: {baseMonthKey}
              </CardTitle>
              <CardDescription>
                Showing 15-day cycle expected vs received per client (Section 8 Standard)
              </CardDescription>
            </div>
            <span className="text-xs font-bold text-accent bg-accent/10 px-2.5 py-1 rounded-md flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Two 15-Day Cycles
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="p-3 font-bold text-foreground">Client</th>
                  <th className="p-3 font-bold text-foreground">Monthly Billing</th>
                  <th className="p-3">Cycle 1 Expected</th>
                  <th className="p-3">Cycle 1 Received</th>
                  <th className="p-3">Cycle 1 Outstanding</th>
                  <th className="p-3">Cycle 2 Expected</th>
                  <th className="p-3">Cycle 2 Received</th>
                  <th className="p-3">Cycle 2 Outstanding</th>
                  <th className="p-3 font-bold text-emerald-800">Monthly Total Received</th>
                  <th className="p-3 font-bold text-amber-800">Monthly Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {clients.map((c) => {
                  const mPlan = monthlyPlans.find((bp) => bp.clientId === c.id);
                  const c1Plan = c1Plans.find((bp) => bp.clientId === c.id);
                  const c2Plan = c2Plans.find((bp) => bp.clientId === c.id);

                  // 1. Cycle 1
                  const c1Expected = c1Plan ? Number(c1Plan.grossBillingAmount) : (mPlan ? Number(mPlan.grossBillingAmount) / 2 : 0);
                  const c1PaymentsList = c1Payments.filter((p) => p.status === 'CONFIRMED' && c1Plan && p.billingPlanId === c1Plan.id);
                  const c1Received = c1PaymentsList.reduce((sum, p) => sum + Number(p.amountReceived), 0);
                  const c1Outstanding = Math.max(0, c1Expected - c1Received);

                  // 2. Cycle 2
                  const c2Expected = c2Plan ? Number(c2Plan.grossBillingAmount) : (mPlan ? Number(mPlan.grossBillingAmount) / 2 : 0);
                  const c2PaymentsList = c2Payments.filter((p) => p.status === 'CONFIRMED' && c2Plan && p.billingPlanId === c2Plan.id);
                  const c2Received = c2PaymentsList.reduce((sum, p) => sum + Number(p.amountReceived), 0);
                  const c2Outstanding = Math.max(0, c2Expected - c2Received);

                  // 3. Monthly Total
                  const monthlyBilling = mPlan ? Number(mPlan.grossBillingAmount) : (c1Expected + c2Expected);
                  const mDirectPayments = monthlyPayments.filter((p) => p.status === 'CONFIRMED' && mPlan && p.billingPlanId === mPlan.id);
                  const directReceived = mDirectPayments.reduce((sum, p) => sum + Number(p.amountReceived), 0);
                  const monthlyTotalReceived = c1Received + c2Received + (mDirectPayments.length > 0 && c1Received === 0 && c2Received === 0 ? directReceived : 0);
                  const monthlyOutstanding = Math.max(0, monthlyBilling - monthlyTotalReceived);

                  return (
                    <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-3 font-extrabold text-foreground">
                        {c.name}
                      </td>
                      <td className="p-3 font-black text-foreground">
                        ₹{monthlyBilling.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 font-semibold text-muted-foreground">
                        ₹{c1Expected.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 font-bold text-emerald-600">
                        ₹{c1Received.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 font-bold">
                        {c1Outstanding > 0 ? (
                          <span className="text-amber-600">₹{c1Outstanding.toLocaleString('en-IN')}</span>
                        ) : (
                          <span className="text-muted-foreground">₹0</span>
                        )}
                      </td>
                      <td className="p-3 font-semibold text-muted-foreground">
                        ₹{c2Expected.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 font-bold text-emerald-600">
                        ₹{c2Received.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 font-bold">
                        {c2Outstanding > 0 ? (
                          <span className="text-amber-600">₹{c2Outstanding.toLocaleString('en-IN')}</span>
                        ) : (
                          <span className="text-muted-foreground">₹0</span>
                        )}
                      </td>
                      <td className="p-3 font-black text-emerald-600 bg-emerald-50/20">
                        ₹{monthlyTotalReceived.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 font-black bg-amber-50/20">
                        {monthlyOutstanding > 0 ? (
                          <span className="text-amber-600">₹{monthlyOutstanding.toLocaleString('en-IN')}</span>
                        ) : (
                          <span className="text-emerald-700 font-bold">₹0 (Paid)</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
