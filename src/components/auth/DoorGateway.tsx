'use client';

import React, { useState, useTransition } from 'react';
import { Partner } from '@/domain/types/entities';
import { loginAction } from '@/server/actions/auth';
import {
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ArrowRight,
  UserCheck,
} from 'lucide-react';

interface DoorGatewayProps {
  partners: Partner[];
  isInitiallyUnlocked?: boolean;
}

export function DoorGateway({ partners }: DoorGatewayProps) {
  const [selectedPartnerCode, setSelectedPartnerCode] = useState<'ANURAG' | 'VIVEK'>('ANURAG');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [shake, setShake] = useState(false);
  const [isPending, startTransition] = useTransition();

  const selectedPartner =
    partners.find((p) => p.partnerCode === selectedPartnerCode) ||
    partners[0] || {
      id: '1',
      fullName: selectedPartnerCode === 'ANURAG' ? 'Anurag' : 'Vivek',
      partnerCode: selectedPartnerCode,
      email: selectedPartnerCode === 'ANURAG' ? 'anurag@partnership.internal' : 'vivek@partnership.internal',
    };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handlePartnerSelect = (code: 'ANURAG' | 'VIVEK') => {
    setSelectedPartnerCode(code);
    setPassword('');
    setError(null);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = password.trim();
    if (!trimmed) {
      setError(`Please enter the passcode for ${selectedPartner.fullName}`);
      triggerShake();
      return;
    }

    startTransition(async () => {
      const res = await loginAction(selectedPartnerCode, trimmed);
      if (!res.success) {
        setError(res.error?.message || `Incorrect passcode for ${selectedPartner.fullName}`);
        triggerShake();
      } else {
        setIsSuccess(true);
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 600);
      }
    });
  };

  return (
    <div className="relative w-full min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black select-none">
      {/* Background Ambience & Grid Lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      {/* Main Login Card */}
      <div className="relative w-full max-w-lg z-10">
        <div
          className={`w-full bg-slate-900/90 backdrop-blur-xl rounded-3xl border border-slate-800 shadow-[0_0_60px_rgba(0,0,0,0.8)] p-6 sm:p-8 transition-transform duration-300 ${
            shake ? 'animate-bounce' : ''
          }`}
        >
          {/* Header & Logo */}
          <div className="text-center pb-6 border-b border-slate-800/80">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-500 text-white font-black text-2xl shadow-xl shadow-indigo-600/30 mb-3 border border-indigo-400/30">
              SP
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Salesforce Partnership Ledger
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              50/50 Operational Account &bull; Select your user profile to login
            </p>
          </div>

          {/* STEP 1: Select User (Anurag or Vivek) */}
          <div className="mt-6 space-y-3">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>Step 1: Choose Your Account</span>
              <span className="text-[11px] text-indigo-400 lowercase font-normal">Click to switch</span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              {/* Anurag Card */}
              <button
                type="button"
                onClick={() => handlePartnerSelect('ANURAG')}
                className={`relative p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                  selectedPartnerCode === 'ANURAG'
                    ? 'bg-indigo-950/60 border-indigo-500 shadow-lg shadow-indigo-500/20 ring-2 ring-indigo-500/30'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center font-extrabold text-sm shadow-md transition-colors ${
                      selectedPartnerCode === 'ANURAG'
                        ? 'bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    AT
                  </div>
                  {selectedPartnerCode === 'ANURAG' && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-white shadow-sm">
                      <UserCheck className="w-3 h-3" />
                    </span>
                  )}
                </div>

                <div>
                  <div className="font-bold text-white text-base">Anurag</div>
                  <div className="text-[11px] text-indigo-300 font-medium">50% Partner</div>
                </div>
              </button>

              {/* Vivek Card */}
              <button
                type="button"
                onClick={() => handlePartnerSelect('VIVEK')}
                className={`relative p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                  selectedPartnerCode === 'VIVEK'
                    ? 'bg-indigo-950/60 border-indigo-500 shadow-lg shadow-indigo-500/20 ring-2 ring-indigo-500/30'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center font-extrabold text-sm shadow-md transition-colors ${
                      selectedPartnerCode === 'VIVEK'
                        ? 'bg-gradient-to-tr from-cyan-600 to-blue-500 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    VT
                  </div>
                  {selectedPartnerCode === 'VIVEK' && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500 text-white shadow-sm">
                      <UserCheck className="w-3 h-3" />
                    </span>
                  )}
                </div>

                <div>
                  <div className="font-bold text-white text-base">Vivek</div>
                  <div className="text-[11px] text-cyan-300 font-medium">50% Partner</div>
                </div>
              </button>
            </div>
          </div>

          {/* STEP 2: Password Form for Selected User */}
          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>
                  Step 2: Enter Passcode for{' '}
                  <span className="text-indigo-400 font-bold">{selectedPartner.fullName}</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Confidential</span>
              </label>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={`Enter ${selectedPartnerCode === 'ANURAG' ? 'Anurag' : 'Vivek'}'s passcode...`}
                  disabled={isPending || isSuccess}
                  autoFocus
                  className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl py-3 pl-10 pr-11 text-sm text-white placeholder-slate-500 outline-none transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-red-950/60 border border-red-500/50 p-3 text-red-300 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Success Message */}
            {isSuccess && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-950/60 border border-emerald-500/50 p-3 text-emerald-300 text-xs">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>Access Granted! Redirecting to Dashboard...</span>
              </div>
            )}

            {/* Login Submit Button */}
            <button
              type="submit"
              disabled={isPending || isSuccess || !password.trim()}
              className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-xl font-bold text-xs tracking-wider uppercase transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Passcode...</span>
                </>
              ) : isSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Entering Dashboard...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Login as {selectedPartner.fullName}</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </form>

          {/* Footer Note */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 text-center text-[11px] text-slate-500 font-mono">
            Direct User Authentication &bull; Partitioned Secure Session
          </div>
        </div>
      </div>
    </div>
  );
}
