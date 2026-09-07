import React from 'react';
import { db } from '@/db/repository';
import { requireAuthenticatedPartner } from '@/server/auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { BillingModal } from '@/components/modals/BillingModal';
import { Receipt, AlertTriangle } from 'lucide-react';

interface BillingPageProps {
  searchParams?: {
    period?: string;
  };
}

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const { organizationId } = await requireAuthenticatedPartner();

  const periods = db.getBillingPeriods(organizationId);
  const currentPeriodKey = searchParams?.period || '2026-09';
  const activePeriod = db.ensureBillingPeriod(organizationId, currentPeriodKey);

  const clients = db.getClients(organizationId);
  const billingPlans = db.getBillingPlans(activePeriod.id);
  const payments = db.getPaymentsForPeriod(activePeriod.id);

  const isClosed = activePeriod.status === 'CLOSED';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-foreground">Dynamic Client Billing</h2>
          <p className="text-xs text-muted-foreground">
            Period-specific contractual billing amounts decoupled from cash receipts.
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
            <BillingModal clients={clients} currentPeriodKey={activePeriod.periodKey} />
          )}
        </div>
      </div>

      {isClosed && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <strong>Accounting Period is CLOSED:</strong> Financial records for {activePeriod.periodKey} are locked against direct edits. Any retroactive rate corrections must be logged as compensating adjustments in the next active open period.
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4 text-accent" /> Billing Matrix: {activePeriod.periodKey}
          </CardTitle>
          <CardDescription>
            Contractual amounts agreed with clients for this specific accounting month.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="p-3">Client</th>
                  <th className="p-3">Gross Contractual Billing</th>
                  <th className="p-3">Collected to Date</th>
                  <th className="p-3">Outstanding Balance</th>
                  <th className="p-3">Contract Notes</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {clients.map((c) => {
                  const plan = billingPlans.find((bp) => bp.clientId === c.id);
                  const billed = plan ? Number(plan.grossBillingAmount) : 0;
                  const clientPayments = payments.filter((p) => p.status === 'CONFIRMED' && plan && p.billingPlanId === plan.id);
                  const collected = clientPayments.reduce((sum, p) => sum + Number(p.amountReceived), 0);
                  const outstanding = Math.max(0, billed - collected);

                  return (
                    <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-3 font-bold text-foreground">{c.name}</td>
                      <td className="p-3 font-semibold text-foreground">
                        {plan ? `₹${billed.toLocaleString('en-IN')}` : '— (Unbilled)'}
                      </td>
                      <td className="p-3 text-success font-semibold">
                        ₹{collected.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3">
                        {outstanding > 0 ? (
                          <span className="font-bold text-amber-600">₹{outstanding.toLocaleString('en-IN')}</span>
                        ) : billed > 0 ? (
                          <span className="font-bold text-success">₹0 (Paid)</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground">{plan?.notes || c.defaultNote || '—'}</td>
                      <td className="p-3 text-right">
                        {!isClosed && (
                          <BillingModal
                            clients={clients}
                            currentPeriodKey={activePeriod.periodKey}
                            existingClientId={c.id}
                            existingGrossAmount={plan?.grossBillingAmount}
                            existingNotes={plan?.notes}
                            isEdit={!!plan}
                          />
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
