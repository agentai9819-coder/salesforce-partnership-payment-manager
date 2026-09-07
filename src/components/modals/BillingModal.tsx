'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { saveBillingPlanAction } from '@/server/actions/billing';
import { Plus, Edit2, X } from 'lucide-react';
import { Client } from '@/domain/types/entities';

interface BillingModalProps {
  clients: Client[];
  currentPeriodKey: string;
  existingClientId?: string;
  existingGrossAmount?: string;
  existingNotes?: string;
  isEdit?: boolean;
}

export function BillingModal({
  clients,
  currentPeriodKey,
  existingClientId,
  existingGrossAmount,
  existingNotes,
  isEdit = false,
}: BillingModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await saveBillingPlanAction(formData);

    setIsSubmitting(false);
    if (!result.success) {
      setError(result.error?.message || 'Failed to save billing amount');
    } else {
      setIsOpen(false);
    }
  }

  return (
    <>
      {isEdit ? (
        <button
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-accent hover:bg-accent/10 transition-colors"
        >
          <Edit2 className="h-3 w-3" /> Edit
        </button>
      ) : (
        <Button onClick={() => setIsOpen(true)} className="gap-1.5" size="sm">
          <Plus className="h-4 w-4" /> Add / Set Billing
        </Button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-bold text-foreground">
                {isEdit ? 'Edit Monthly Billing Plan' : 'Set Monthly Billing Plan'}
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
              {error && (
                <div className="rounded-lg bg-danger/10 p-2.5 text-danger font-medium">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Accounting Period</label>
                <input
                  name="periodKey"
                  readOnly
                  value={currentPeriodKey}
                  className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-foreground font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Client</label>
                {isEdit ? (
                  <>
                    <input type="hidden" name="clientId" value={existingClientId} />
                    <input
                      disabled
                      value={clients.find((c) => c.id === existingClientId)?.name || existingClientId}
                      className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-foreground font-bold"
                    />
                  </>
                ) : (
                  <select
                    name="clientId"
                    required
                    defaultValue={existingClientId || ''}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value="" disabled>Select a client...</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Gross Contractual Billing Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="grossAmount"
                  required
                  defaultValue={existingGrossAmount ? Number(existingGrossAmount) : ''}
                  placeholder="e.g. 50000"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground font-semibold focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Audit Reason for Change (Required)</label>
                <input
                  name="reason"
                  required
                  placeholder="e.g. Monthly contract renewal / extra support hours"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Notes (Optional)</label>
                <input
                  name="notes"
                  defaultValue={existingNotes || ''}
                  placeholder="Additional contract terms"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Billing Amount'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
