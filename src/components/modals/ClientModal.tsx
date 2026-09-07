'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { createClientAction } from '@/server/actions/clients';
import { Plus, X } from 'lucide-react';

export function ClientModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await createClientAction(formData);

    setIsSubmitting(false);
    if (!result.success) {
      setError(result.error?.message || 'Failed to create client');
    } else {
      setIsOpen(false);
    }
  }

  return (
    <>
      <Button onClick={() => setIsOpen(true)} className="gap-1.5" size="sm">
        <Plus className="h-4 w-4" /> Add Client
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-bold text-foreground">Add New Client</h3>
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
                <label className="font-semibold text-foreground">Client Name</label>
                <input
                  name="name"
                  required
                  placeholder="e.g. Acme Corp"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Notes / Retainer Terms</label>
                <input
                  name="defaultNote"
                  placeholder="e.g. Payments every 15 days"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Client'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
