'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { voidPaymentAction } from '@/server/actions/payments';
import { voidDisbursementAction } from '@/server/actions/expenses';
import { Ban, X } from 'lucide-react';

interface VoidModalProps {
  itemId: string;
  itemType: 'PAYMENT' | 'DISBURSEMENT';
  itemDescription: string;
}

export function VoidModal({ itemId, itemType, itemDescription }: VoidModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleVoid(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      setError('A mandatory reason is required to void this record');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result =
      itemType === 'PAYMENT'
        ? await voidPaymentAction(itemId, reason)
        : await voidDisbursementAction(itemId, reason);

    setIsSubmitting(false);
    if (!result.success) {
      setError(result.error?.message || 'Failed to void entry');
    } else {
      setIsOpen(false);
      setReason('');
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-danger hover:bg-danger/10 transition-colors"
      >
        <Ban className="h-3 w-3" /> Void
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-bold text-danger flex items-center gap-1.5">
                <Ban className="h-4 w-4" /> Void {itemType === 'PAYMENT' ? 'Payment Record' : 'Disbursement'}
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleVoid} className="mt-4 space-y-4 text-xs">
              <p className="text-muted-foreground">
                You are voiding: <span className="font-bold text-foreground">{itemDescription}</span>.
                This entry will be deactivated and excluded from all cash balances and settlement calculations, while preserving its permanent audit history.
              </p>

              {error && (
                <div className="rounded-lg bg-danger/10 p-2.5 text-danger font-medium">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Audit Reason for Voiding (Required)</label>
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  placeholder="e.g. Duplicate entry / Incorrect client allocated"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-danger"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" variant="danger" disabled={isSubmitting}>
                  {isSubmitting ? 'Voiding...' : 'Confirm Void'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
