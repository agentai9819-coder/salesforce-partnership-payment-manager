'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { recordBusinessAdjustmentAction } from '@/server/actions/adjustments';
import { Plus, X } from 'lucide-react';
import { Partner } from '@/domain/types/entities';

interface AdjustmentModalProps {
  billingPeriodId: string;
  partners: Partner[];
}

export function AdjustmentModal({ billingPeriodId, partners }: AdjustmentModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [idempotencyKey] = useState(() => `idem-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await recordBusinessAdjustmentAction(formData);

    setIsSubmitting(false);
    if (!result.success) {
      setError(result.error?.message || 'Failed to record adjustment');
    } else {
      setIsOpen(false);
    }
  }

  const anurag = partners.find((p) => p.partnerCode === 'ANURAG');
  const vivek = partners.find((p) => p.partnerCode === 'VIVEK');

  return (
    <>
      <Button onClick={() => setIsOpen(true)} className="gap-1.5" size="sm" variant="outline">
        <Plus className="h-4 w-4" /> Add Business Adjustment
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-bold text-foreground">Record Business Carry-Forward</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
              <input type="hidden" name="effectiveBillingPeriodId" value={billingPeriodId} />
              <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

              {error && (
                <div className="rounded-lg bg-danger/10 p-2.5 text-danger font-medium">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Debtor (Owes Money)</label>
                  <select
                    name="fromPartnerId"
                    required
                    defaultValue={anurag?.id}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    {partners.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.fullName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Creditor (Receives Money)</label>
                  <select
                    name="toPartnerId"
                    required
                    defaultValue={vivek?.id}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    {partners.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.fullName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Adjustment Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  name="amount"
                  required
                  placeholder="e.g. 500"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground font-semibold focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Business Justification / Reason</label>
                <input
                  name="reason"
                  required
                  placeholder="e.g. Balance remaining from older work transaction"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <p className="text-[10px] text-muted-foreground">
                  *Note: This is a legitimate business carry-forward balance, not a personal debt.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Recording...' : 'Record Adjustment'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
