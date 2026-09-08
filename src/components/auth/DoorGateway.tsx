'use client';

import React, { useState, useTransition } from 'react';
import { Partner } from '@/domain/types/entities';
import { verifyGatewayPasscodeAction, lockGatewayAction, loginAction } from '@/server/actions/auth';
import {
  Lock,
  Unlock,
  ShieldCheck,
  ArrowRight,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

interface DoorGatewayProps {
  partners: Partner[];
  isInitiallyUnlocked: boolean;
}

export function DoorGateway({ partners, isInitiallyUnlocked }: DoorGatewayProps) {
  const [passcode, setPasscode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(isInitiallyUnlocked);
  const [isDoorOpen, setIsDoorOpen] = useState(isInitiallyUnlocked);
  const [isPending, startTransition] = useTransition();
  const [loggingInCode, setLoggingInCode] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = passcode.trim();
    if (!trimmed) {
      setError('Please enter the security gateway passcode');
      triggerShake();
      return;
    }

    startTransition(async () => {
      const res = await verifyGatewayPasscodeAction(trimmed);
      if (!res.success) {
        setError(res.error?.message || 'Access Denied: Incorrect passcode');
        triggerShake();
      } else {
        // Correct passcode! Trigger 3D door opening animation
        setIsUnlocked(true);
        setTimeout(() => {
          setIsDoorOpen(true);
        }, 220);
      }
    });
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  };

  const handleLock = () => {
    setIsDoorOpen(false);
    setTimeout(() => {
      setIsUnlocked(false);
      setPasscode('');
      setError(null);
      startTransition(async () => {
        await lockGatewayAction();
      });
    }, 400);
  };

  const handlePartnerSelect = (code: 'ANURAG' | 'VIVEK') => {
    setLoggingInCode(code);
    startTransition(async () => {
      const res = await loginAction(code);
      if (res.success) {
        window.location.href = '/dashboard';
      } else {
        setError(res.error?.message || 'Login failed');
        setLoggingInCode(null);
      }
    });
  };

  return (
    <div className="relative w-full min-h-screen flex flex-col items-center justify-center p-3 sm:p-6 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black select-none">
      {/* Background Ambience & Grid Lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      {/* Vault Container Card */}
      <div className="relative w-full max-w-3xl z-10">
        {/* Top Vault Security Bevel Bar */}
        <div className="flex items-center justify-between mb-3 px-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-3 h-3 rounded-full transition-all duration-500 ${
                isDoorOpen
                  ? 'bg-emerald-400 shadow-[0_0_12px_#34d399]'
                  : 'bg-red-500 shadow-[0_0_10px_#ef4444] animate-pulse'
              }`}
            />
            <span className="text-xs font-mono font-bold tracking-wider text-slate-300 uppercase">
              {isDoorOpen ? 'VAULT GATEWAY: UNLOCKED' : 'VAULT GATEWAY: SECURE LOCKED'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-[11px] font-mono text-slate-500 uppercase tracking-widest">
              50/50 FINANCIAL LEDGER
            </span>
            {isDoorOpen && (
              <button
                onClick={handleLock}
                className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-red-400 transition-colors font-medium px-2.5 py-1 rounded-lg border border-slate-700 hover:border-red-500/50 bg-slate-800/80 cursor-pointer"
                title="Lock the vault doors again"
              >
                <Lock className="w-3.5 h-3.5" />
                Lock Vault
              </button>
            )}
          </div>
        </div>

        {/* 3D Scene Viewport with Deep Perspective */}
        <div
          className="relative w-full rounded-2xl overflow-hidden border-2 border-slate-700/80 shadow-[0_0_50px_rgba(0,0,0,0.9)] bg-slate-950"
          style={{
            perspective: '1400px',
            minHeight: '560px',
          }}
        >
          {/* INNER CHAMBER: The Partner Selection Screen (Revealed behind the Doors) */}
          <div
            className={`w-full h-full p-6 sm:p-10 flex flex-col justify-center transition-all duration-700 ${
              isDoorOpen
                ? 'opacity-100 scale-100 filter-none pointer-events-auto'
                : 'opacity-20 scale-95 blur-sm pointer-events-none'
            }`}
            style={{ minHeight: '560px' }}
          >
            {/* Internal SP Vault Crest */}
            <div className="text-center pb-5 border-b border-slate-800/80">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white font-black text-2xl shadow-xl shadow-indigo-600/30 mb-2 border border-indigo-400/30">
                SP
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">Partner Authentication</h2>
              <p className="text-xs text-slate-400 mt-1 font-medium">
                Salesforce Support Partnership Payment Manager &bull; 50/50 Operational Ledger
              </p>
            </div>

            <div className="mt-5 space-y-4 max-w-md mx-auto w-full text-xs">
              <div className="flex items-center gap-2.5 rounded-xl bg-indigo-950/60 border border-indigo-500/40 p-3.5 text-indigo-200">
                <ShieldCheck className="h-5 w-5 shrink-0 text-indigo-400" />
                <span>
                  Access Granted. Select your partner profile below to sign in directly:
                </span>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-xl bg-red-950/60 border border-red-500/50 p-3 text-red-300 text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-3 pt-2">
                {partners.map((p) => {
                  const isLoggingIn = loggingInCode === p.partnerCode;
                  return (
                    <button
                      key={p.id}
                      onClick={() => handlePartnerSelect(p.partnerCode as 'ANURAG' | 'VIVEK')}
                      disabled={loggingInCode !== null}
                      className="w-full text-left p-4 rounded-xl border border-slate-700/80 bg-slate-900 hover:bg-slate-800 hover:border-indigo-500 transition-all duration-200 flex items-center justify-between group shadow-lg hover:shadow-indigo-500/10 cursor-pointer disabled:opacity-50"
                    >
                      <div>
                        <div className="font-bold text-slate-100 text-base group-hover:text-indigo-300 transition-colors">
                          {p.fullName}
                        </div>
                        <div className="text-slate-400 text-xs mt-0.5">
                          {p.email} &bull; <span className="text-indigo-400 font-semibold">50% Profit Share</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isLoggingIn ? (
                          <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center group-hover:bg-indigo-600 transition-colors">
                            <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-white transition-colors" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="border-t border-slate-800/80 pt-4 text-center text-[11px] text-slate-500 font-mono">
                Cryptographic session established via HTTP-only partitioned cookies.
              </div>
            </div>
          </div>

          {/* 3D DOUBLE VAULT DOORS (Left Leaf & Right Leaf) */}
          <div
            className={`absolute inset-0 pointer-events-none transition-all duration-700 ${
              isDoorOpen ? 'pointer-events-none' : 'pointer-events-auto'
            }`}
            style={{
              transformStyle: 'preserve-3d',
            }}
          >
            {/* LEFT DOOR LEAF */}
            <div
              className="absolute top-0 bottom-0 left-0 w-1/2 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-850 border-r border-slate-700 shadow-2xl flex flex-col justify-between p-5"
              style={{
                transformOrigin: 'left center',
                transform: isDoorOpen ? 'rotateY(-115deg)' : 'rotateY(0deg)',
                transition: 'transform 1.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 1.25s ease',
                boxShadow: isDoorOpen
                  ? 'none'
                  : 'inset 0 0 50px rgba(0,0,0,0.85), 15px 0 35px rgba(0,0,0,0.8)',
                backfaceVisibility: 'hidden',
              }}
            >
              {/* Structural Rivets & Top Hinges */}
              <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono">
                <span className="flex items-center gap-1.5 font-bold">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-700 border border-slate-500 shadow-inner" />
                  VAULT-L
                </span>
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-700 border border-slate-500 shadow-inner" />
              </div>

              {/* Left Door Center Handle & Steel Bars */}
              <div className="flex flex-col items-end pr-4">
                <div className="w-20 h-40 rounded-xl border-2 border-slate-700 bg-gradient-to-br from-slate-800 via-slate-850 to-slate-900 p-2.5 flex flex-col items-center justify-center gap-2.5 shadow-2xl">
                  {/* Heavy Steel Vertical Handle */}
                  <div className="w-3.5 h-24 rounded-full bg-gradient-to-r from-slate-400 via-slate-100 to-slate-500 shadow-lg border border-slate-300/40" />
                  <div className="text-[9px] font-mono text-slate-400 font-bold uppercase tracking-widest">
                    PULL
                  </div>
                </div>
              </div>

              {/* Bottom Hinges & Rivets */}
              <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-700 border border-slate-500 shadow-inner" />
                <span className="text-[10px] tracking-widest text-slate-400 font-bold uppercase">SFDC-SEC</span>
              </div>
            </div>

            {/* RIGHT DOOR LEAF */}
            <div
              className="absolute top-0 bottom-0 right-0 w-1/2 bg-gradient-to-l from-slate-900 via-slate-800 to-slate-850 border-l border-slate-700 shadow-2xl flex flex-col justify-between p-5"
              style={{
                transformOrigin: 'right center',
                transform: isDoorOpen ? 'rotateY(115deg)' : 'rotateY(0deg)',
                transition: 'transform 1.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 1.25s ease',
                boxShadow: isDoorOpen
                  ? 'none'
                  : 'inset 0 0 50px rgba(0,0,0,0.85), -15px 0 35px rgba(0,0,0,0.8)',
                backfaceVisibility: 'hidden',
              }}
            >
              {/* Structural Rivets & Top Hinges */}
              <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-700 border border-slate-500 shadow-inner" />
                <span className="flex items-center gap-1.5 font-bold">
                  VAULT-R
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-700 border border-slate-500 shadow-inner" />
                </span>
              </div>

              {/* Right Door Center Handle & Steel Bars */}
              <div className="flex flex-col items-start pl-4">
                <div className="w-20 h-40 rounded-xl border-2 border-slate-700 bg-gradient-to-bl from-slate-800 via-slate-850 to-slate-900 p-2.5 flex flex-col items-center justify-center gap-2.5 shadow-2xl">
                  {/* Heavy Steel Vertical Handle */}
                  <div className="w-3.5 h-24 rounded-full bg-gradient-to-l from-slate-400 via-slate-100 to-slate-500 shadow-lg border border-slate-300/40" />
                  <div className="text-[9px] font-mono text-slate-400 font-bold uppercase tracking-widest">
                    PULL
                  </div>
                </div>
              </div>

              {/* Bottom Hinges & Rivets */}
              <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono">
                <span className="text-[10px] tracking-widest text-slate-400 font-bold uppercase">PARTNER</span>
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-700 border border-slate-500 shadow-inner" />
              </div>
            </div>

            {/* CENTER ACCESS CONSOLE OVERLAY (Visible when doors are closed) */}
            {!isDoorOpen && (
              <div
                className={`absolute inset-0 flex items-center justify-center p-4 transition-opacity duration-300 z-10 ${
                  shake ? 'animate-bounce' : ''
                }`}
              >
                <div className="w-full max-w-sm bg-slate-900/95 backdrop-blur-md rounded-2xl border-2 border-slate-600 shadow-2xl p-6 text-center space-y-4">
                  {/* Vault Door Center Lock Dial / Logo */}
                  <div className="relative mx-auto w-16 h-16 rounded-full bg-gradient-to-tr from-slate-800 via-slate-700 to-slate-600 border-2 border-slate-500 flex items-center justify-center shadow-xl">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isUnlocked
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {isUnlocked ? (
                        <Unlock className="w-6 h-6 animate-pulse" />
                      ) : (
                        <Lock className="w-6 h-6" />
                      )}
                    </div>
                    {/* Status Indicator LED */}
                    <div
                      className={`absolute top-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-slate-900 transition-colors ${
                        isUnlocked
                          ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                          : 'bg-red-500 shadow-[0_0_8px_#ef4444]'
                      }`}
                    />
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white tracking-wide">
                      SECURITY ACCESS GATEWAY
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Enter master passcode to unlock the partnership portal
                    </p>
                  </div>

                  <form onSubmit={handleUnlock} className="space-y-3">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <KeyRound className="h-4 w-4" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={passcode}
                        onChange={(e) => setPasscode(e.target.value)}
                        placeholder="Enter Gateway Passcode..."
                        disabled={isPending || isUnlocked}
                        autoFocus
                        className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl py-2.5 pl-9 pr-10 text-sm text-white placeholder-slate-500 outline-none transition-all font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>

                    {error && (
                      <div className="flex items-center justify-center gap-1.5 text-xs text-red-400 bg-red-950/50 border border-red-800/50 rounded-lg p-2 font-medium">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isPending || isUnlocked}
                      className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl font-semibold text-xs tracking-wide uppercase transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Verifying Passcode...</span>
                        </>
                      ) : isUnlocked ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                          <span>Opening Doors...</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="w-4 h-4" />
                          <span>Unlock Vault</span>
                        </>
                      )}
                    </button>
                  </form>

                  <div className="pt-2 text-[11px] text-slate-500 font-mono">
                    Authorized Personnel Only &bull; Access Logged
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
