'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { recordDisbursementAction } from '@/server/actions/expenses';
import { Plus, X } from 'lucide-react';
import { ExternalParty, Partner } from '@/domain/types/entities';

interface DisbursementModalProps {
  billingPeriodId: string;
  externalParties: ExternalParty[];
  partners: Partner[];
  activePartnerId: string;
}

export function DisbursementModal({
  billingPeriodId,
  externalParties,
  partners,
  activePartnerId,
}: DisbursementModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [idempotencyKey] = useState(() => `idem-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await recordDisbursementAction(formData);

    setIsSubmitting(false);
    if (!result.success) {
      setError(result.error?.message || 'Failed to record disbursement');
    } else {
      setIsOpen(false);
    }
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <>
      <Button onClick={() => setIsOpen(true)} className="gap-1.5" size="sm">
        <Plus className="h-4 w-4" /> Record External Payment
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-bold text-foreground">Record External Disbursement</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
              <input type="hidden" name="billingPeriodId" value={billingPeriodId} />
              <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

              {error && (
                <div className="rounded-lg bg-danger/10 p-2.5 text-danger font-medium">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">External Party (Resource / Broker)</label>
                <select
                  name="externalPartyId"
                  required
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="" disabled selected>Select resource or broker...</option>
                  {externalParties.map((ep) => (
                    <option key={ep.id} value={ep.id}>
                      {ep.name} ({ep.partyType})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Payment Date</label>
                  <input
                    type="date"
                    name="disbursementDate"
                    required
                    defaultValue={today}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Amount Paid (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    name="amountPaid"
                    required
                    placeholder="e.g. 10000"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground font-semibold focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Paid By Partner (Physical Outflow)</label>
                <select
                  name="disbursedByPartnerId"
                  required
                  defaultValue={activePartnerId}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent font-medium"
                >
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} ({p.partnerCode})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-muted-foreground">
                  *Crucial: Deducts this cash outflow directly from this partner&apos;s liquid cash held.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Notes / Purpose (Optional)</label>
                <input
                  name="notes"
                  placeholder="e.g. Eshwar project external dev payment"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Recording...' : 'Record Disbursement'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
