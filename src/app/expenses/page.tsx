import React from 'react';
import { db } from '@/db/repository';
import { requireAuthenticatedPartner } from '@/server/auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DisbursementModal } from '@/components/modals/DisbursementModal';
import { VoidModal } from '@/components/modals/VoidModal';
import { Briefcase, AlertTriangle } from 'lucide-react';

interface ExpensesPageProps {
  searchParams?: {
    period?: string;
  };
}

export default async function ExpensesPage({ searchParams }: ExpensesPageProps) {
  const { partner, organizationId } = await requireAuthenticatedPartner();

  const periods = db.getBillingPeriods(organizationId);
  const currentPeriodKey = searchParams?.period || '2026-09';
  const activePeriod = db.ensureBillingPeriod(organizationId, currentPeriodKey);

  const partners = db.getPartners(organizationId);
  const externalParties = db.getExternalParties(organizationId);
  const obligations = db.getExternalObligations(activePeriod.id);
  const disbursements = db.getExternalDisbursements(activePeriod.id);

  const isClosed = activePeriod.status === 'CLOSED';
  const totalDisbursed = disbursements
    .filter((d) => d.status === 'CONFIRMED')
    .reduce((sum, d) => sum + Number(d.amountPaid), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-foreground">External Costs &amp; Disbursements</h2>
          <p className="text-xs text-muted-foreground">
            Resource and broker obligations with explicit paying partner attribution.
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
            <DisbursementModal
              billingPeriodId={activePeriod.id}
              externalParties={externalParties}
              partners={partners}
              activePartnerId={partner.id}
            />
          )}
        </div>
      </div>

      {isClosed && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <strong>Accounting Period is CLOSED:</strong> Adding or voiding external disbursements is disabled for {activePeriod.periodKey}.
          </div>
        </div>
      )}

      {/* Actual Disbursements Ledger */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-danger" /> Actual Disbursements: {activePeriod.periodKey}
              </CardTitle>
              <CardDescription>
                Physical cash leaving a partner&apos;s account. Total confirmed disbursed: ₹{totalDisbursed.toLocaleString('en-IN')}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {disbursements.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No external disbursements recorded for {activePeriod.periodKey}. Use &quot;Record External Payment&quot; above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">External Party</th>
                    <th className="p-3">Amount Paid</th>
                    <th className="p-3">Paid By Partner</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Notes</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {disbursements.map((d) => {
                    const party = externalParties.find((ep) => ep.id === d.externalPartyId);
                    const disburser = partners.find((pt) => pt.id === d.disbursedByPartnerId);
                    const isVoided = d.status === 'VOIDED';

                    return (
                      <tr
                        key={d.id}
                        className={`hover:bg-muted/20 transition-colors ${
                          isVoided ? 'opacity-50 line-through bg-muted/10' : ''
                        }`}
                      >
                        <td className="p-3 text-muted-foreground">{d.disbursementDate}</td>
                        <td className="p-3 font-bold text-foreground">
                          {party?.name || 'Party'} ({party?.partyType})
                        </td>
                        <td className="p-3 font-extrabold text-danger">
                          ₹{Number(d.amountPaid).toLocaleString('en-IN')}
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              disburser?.partnerCode === 'ANURAG'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {disburser?.fullName || d.disbursedByPartnerId}
                          </span>
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              d.status === 'CONFIRMED'
                                ? 'bg-success/10 text-success'
                                : 'bg-danger/10 text-danger'
                            }`}
                          >
                            {d.status}
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground">{d.notes || '—'}</td>
                        <td className="p-3 text-right">
                          {!isClosed && !isVoided && (
                            <VoidModal
                              itemId={d.id}
                              itemType="DISBURSEMENT"
                              itemDescription={`₹${Number(d.amountPaid).toLocaleString('en-IN')} to ${party?.name || 'Party'}`}
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

      {/* Contractual Obligations Directory */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Expected Project Cost Obligations</CardTitle>
          <CardDescription>
            Contractual liability baselines (e.g. Mokika ₹40k, Broker ₹70k). Not deducted until physically disbursed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="p-3">External Party</th>
                  <th className="p-3">Party Type</th>
                  <th className="p-3">Expected Contractual Obligation</th>
                  <th className="p-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {obligations.map((o) => {
                  const party = externalParties.find((ep) => ep.id === o.externalPartyId);
                  return (
                    <tr key={o.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-3 font-bold text-foreground">{party?.name}</td>
                      <td className="p-3">
                        <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          {party?.partyType}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-foreground">
                        ₹{Number(o.expectedAmount).toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 text-muted-foreground">{o.notes || '—'}</td>
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
