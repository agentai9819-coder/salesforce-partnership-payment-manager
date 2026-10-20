'use client';

import React, { useTransition } from 'react';
import { logoutAction } from '@/server/actions/auth';
import { LogOut, Loader2 } from 'lucide-react';

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        await logoutAction();
      } catch (err) {
        console.error('Logout error:', err);
      }
      // Force hard navigation to /login to flush all cached states
      window.location.href = '/login';
    });
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isPending}
      title="Exit / Logout"
      className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-950/20 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-900/40 hover:text-red-300 hover:border-red-500/60 transition-all cursor-pointer shadow-xs"
    >
      {isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-red-400" />
      ) : (
        <LogOut className="h-3.5 w-3.5" />
      )}
      <span>Exit</span>
    </button>
  );
}
