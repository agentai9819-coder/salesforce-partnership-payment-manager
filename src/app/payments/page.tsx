import React from 'react';
import { db } from '@/db/repository';
import { requireAuthenticatedPartner } from '@/server/auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PaymentModal } from '@/components/modals/PaymentModal';
import { VoidModal } from '@/components/modals/VoidModal';
import { CreditCard, AlertTriangle } from 'lucide-react';

interface PaymentsPageProps {
  searchParams?: {
    period?: string;
  };
}

export default async function PaymentsPage({ searchParams }: PaymentsPageProps) {
  const { partner, organizationId } = await requireAuthenticatedPartner();

  const periods = db.getBillingPeriods(organizationId);
  const currentPeriodKey = searchParams?.period || '2026-09';
  const activePeriod = db.ensureBillingPeriod(organizationId, currentPeriodKey);

  const clients = db.getClients(organizationId);
  const partners = db.getPartners(organizationId);
  const billingPlans = db.getBillingPlans(activePeriod.id);
  const payments = db.getPaymentsForPeriod(activePeriod.id);

  const isClosed = activePeriod.status === 'CLOSED';
  const totalReceived = payments
    .filter((p) => p.status === 'CONFIRMED')
    .reduce((sum, p) => sum + Number(p.amountReceived), 0);

  // Gather billing plans from active period plus any open periods for late cycle payments
  const openPeriods = periods.filter((p) => p.status === 'OPEN');
  const openPlanIds = new Set<string>();
  const selectablePlans = db.getAllData().clientBillingPlans.filter((p) => {
    const period = db.getBillingPeriodById(p.billingPeriodId);
    return period && period.status === 'OPEN';
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-foreground">Actual Client Payments</h2>
          <p className="text-xs text-muted-foreground">
            Authoritative cash inflows credited strictly to the partner who physically received the funds.
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

          <PaymentModal
            billingPlans={selectablePlans}
            clients={clients}
            partners={partners}
            activePartnerId={partner.id}
          />
        </div>
      </div>

      {isClosed && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <strong>Accounting Period is CLOSED:</strong> Adding or voiding payment entries directly for {activePeriod.periodKey} is restricted.
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-accent" /> Collections Ledger: {activePeriod.periodKey}
              </CardTitle>
              <CardDescription>
                Confirmed cash deposited in partner accounts. Total confirmed: ₹{totalReceived.toLocaleString('en-IN')}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No payments recorded for period {activePeriod.periodKey}. Use &quot;Record Payment&quot; above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="p-3 font-bold text-foreground">Client</th>
                    <th className="p-3 font-bold text-foreground">Amount</th>
                    <th className="p-3">Receipt Date</th>
                    <th className="p-3">Accounting Cycle</th>
                    <th className="p-3">Collected By</th>
                    <th className="p-3">Reference</th>
                    <th className="p-3">Notes</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payments.map((p) => {
                    const plan = db.getAllData().clientBillingPlans.find((bp) => bp.id === p.billingPlanId);
                    const planPeriod = plan ? db.getBillingPeriodById(plan.billingPeriodId) : undefined;
                    const client = plan ? clients.find((c) => c.id === plan.clientId) : undefined;
                    const collector = partners.find((pt) => pt.id === p.collectedByPartnerId);
                    const isVoided = p.status === 'VOIDED';

                    return (
                      <tr
                        key={p.id}
                        className={`hover:bg-muted/20 transition-colors ${
                          isVoided ? 'opacity-50 line-through bg-muted/10' : ''
                        }`}
                      >
                        <td className="p-3 font-extrabold text-foreground">{client?.name || 'Client'}</td>
                        <td className="p-3 font-black text-emerald-600">
                          ₹{Number(p.amountReceived).toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 text-foreground font-medium">{p.paymentDate}</td>
                        <td className="p-3">
                          <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-bold text-foreground">
                            {planPeriod?.periodKey || activePeriod.periodKey}
                          </span>
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              collector?.partnerCode === 'ANURAG'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {collector?.fullName || p.collectedByPartnerId}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-muted-foreground">
                          {p.paymentReference || '—'}
                        </td>
                        <td className="p-3 text-muted-foreground">{p.notes || '—'}</td>
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              p.status === 'CONFIRMED'
                                ? 'bg-success/10 text-success'
                                : 'bg-danger/10 text-danger'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          {!isClosed && !isVoided && (
                            <VoidModal
                              itemId={p.id}
                              itemType="PAYMENT"
                              itemDescription={`₹${Number(p.amountReceived).toLocaleString('en-IN')} from ${client?.name || 'Client'}`}
                            />
                          )}
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
    </div>
  );
}
