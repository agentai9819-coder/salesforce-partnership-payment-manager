'use client';

import React, { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application Runtime Error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center shadow-lg">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/20 text-destructive mb-4">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Application Notice</h2>
        <p className="text-xs text-muted-foreground mb-4">
          {error.message || 'An unexpected server configuration or runtime issue occurred.'}
        </p>
        <div className="flex justify-center gap-3">
          <Button onClick={() => reset()} variant="outline" className="gap-2 text-xs">
            <RefreshCw className="h-4 w-4" /> Try Again
          </Button>
          <Button onClick={() => window.location.href = '/login'} className="gap-2 text-xs">
            Go to Login
          </Button>
        </div>
      </div>
    </div>
  );
}
