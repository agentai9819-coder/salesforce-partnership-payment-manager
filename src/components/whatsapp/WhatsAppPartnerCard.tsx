'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  MessageSquare,
  Send,
  Copy,
  Check,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  Smartphone,
} from 'lucide-react';
import { VIVEK_WHATSAPP_NUMBER } from '@/server/constants';

interface WhatsAppPartnerCardProps {
  isAnurag: boolean;
  netSettlementSentence: string;
  absFinalNet: number;
  totalVivekHoldsForAnurag: number;
  totalAnuragHoldsForVivek: number;
  recentPayments?: Array<{
    id: string;
    clientName: string;
    received: number;
    collector: 'ANURAG' | 'VIVEK';
    anuragShare: number;
    vivekShare: number;
  }>;
}

export function WhatsAppPartnerCard({
  isAnurag,
  netSettlementSentence,
  absFinalNet,
  totalVivekHoldsForAnurag,
  totalAnuragHoldsForVivek,
  recentPayments = [],
}: WhatsAppPartnerCardProps) {
  // CRITICAL PRIVACY GUARD: Never render anything for Vivek
  if (!isAnurag) {
    return null;
  }

  const [selectedTemplate, setSelectedTemplate] = useState<'balance' | 'latest' | 'custom'>('balance');
  const [copied, setCopied] = useState(false);
  const [customClient, setCustomClient] = useState('Sai - September 16-30 (Cycle 2)');
  const [customAmount, setCustomAmount] = useState('25000');
  const [customCollector, setCustomCollector] = useState<'ANURAG' | 'VIVEK'>('ANURAG');

  const latestPayment = recentPayments[0] || {
    clientName: 'Sai - Sep 16-30',
    received: 25000,
    collector: 'ANURAG',
    anuragShare: 12500,
    vivekShare: 12500,
  };

  const todayStr = new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date());

  // Generate Message Text based on selected template
  const getMessageText = () => {
    if (selectedTemplate === 'balance') {
      return (
`💼 *SALESFORCE PARTNERSHIP — HISAAB UPDATE*
━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 *Date:* ${todayStr}
👤 *Partner:* Vivek Tripathi

⚖️ *CURRENT NET SETTLEMENT STATUS:*
👉 *${netSettlementSentence}*

📊 *50/50 Breakdown:*
• Vivek ke paas Anurag ke: ₹${totalVivekHoldsForAnurag.toLocaleString('en-IN')}
• Anurag ke paas Vivek ke: ₹${totalAnuragHoldsForVivek.toLocaleString('en-IN')}

🔗 _Updated live on Salesforce Partnership Ledger_`
      );
    }

    if (selectedTemplate === 'latest') {
      const collectorName = latestPayment.collector === 'ANURAG' ? "Anurag's Bank Account" : "Vivek's Bank Account";
      return (
`💼 *NEW PAYMENT RECEIVED — 50/50 SPLIT*
━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 *Date:* ${todayStr}
🏢 *Client / Work:* ${latestPayment.clientName}
💰 *Total Received:* ₹${Number(latestPayment.received).toLocaleString('en-IN')}
📥 *Received In:* ${collectorName}

🤝 *50/50 Share:*
• Anurag Share: ₹${Number(latestPayment.anuragShare).toLocaleString('en-IN')}
• Vivek Share: ₹${Number(latestPayment.vivekShare).toLocaleString('en-IN')}

⚖️ *Updated Net Hisaab:*
👉 *${netSettlementSentence}*

🔗 _Logged into Salesforce Partnership Ledger_`
      );
    }

    // Custom
    const gross = Number(customAmount) || 0;
    const split = gross / 2;
    const collectorName = customCollector === 'ANURAG' ? "Anurag's Bank Account" : "Vivek's Bank Account";

    return (
`💼 *PAYMENT UPDATE — SALESFORCE PARTNERSHIP*
━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 *Date:* ${todayStr}
🏢 *Client / Work:* ${customClient}
💰 *Total Received:* ₹${gross.toLocaleString('en-IN')}
📥 *Received In:* ${collectorName}

🤝 *50/50 Split:*
• Anurag Share: ₹${split.toLocaleString('en-IN')}
• Vivek Share: ₹${split.toLocaleString('en-IN')}

⚖️ *Updated Net Hisaab:*
👉 *${netSettlementSentence}*

🔗 _Salesforce Support Ledger_`
    );
  };

  const messageText = getMessageText();
  const whatsappUrl = `https://wa.me/${VIVEK_WHATSAPP_NUMBER}?text=${encodeURIComponent(messageText)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 via-background to-card shadow-lg relative overflow-hidden">
      {/* Privacy Watermark Badge */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-400">
        <ShieldAlert className="h-3 w-3" />
        <span>ANURAG ONLY &bull; HIDDEN FROM VIVEK</span>
      </div>

      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
          <MessageSquare className="h-4 w-4" />
          <span>WhatsApp Partner Card Dispatcher</span>
        </div>
        <CardTitle className="text-base text-foreground flex items-center gap-2">
          <span>Send Instant Payment Card to Vivek</span>
          <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-mono font-semibold">
            +91 99323 81467
          </span>
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Generates a clean, formatted WhatsApp card with live 50/50 hisaab, prefilled directly to Vivek&apos;s number.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Template Selector */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedTemplate('balance')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              selectedTemplate === 'balance'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-muted/50 text-muted-foreground hover:text-foreground border border-border'
            }`}
          >
            ⚖️ Net Settlement Status (₹{absFinalNet.toLocaleString('en-IN')})
          </button>
          <button
            type="button"
            onClick={() => setSelectedTemplate('latest')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              selectedTemplate === 'latest'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-muted/50 text-muted-foreground hover:text-foreground border border-border'
            }`}
          >
            💰 Latest Payment ({latestPayment.clientName})
          </button>
          <button
            type="button"
            onClick={() => setSelectedTemplate('custom')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              selectedTemplate === 'custom'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-muted/50 text-muted-foreground hover:text-foreground border border-border'
            }`}
          >
            ✏️ Custom Payment Card
          </button>
        </div>

        {/* Custom Input Fields if Custom selected */}
        {selectedTemplate === 'custom' && (
          <div className="p-3 rounded-xl border border-border bg-muted/20 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs animate-in fade-in">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Client / Work Name:</label>
              <input
                type="text"
                value={customClient}
                onChange={(e) => setCustomClient(e.target.value)}
                className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-background border border-border text-foreground text-xs font-medium"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Gross Amount (₹):</label>
              <input
                type="number"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-background border border-border text-foreground text-xs font-mono font-medium"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Received In Account:</label>
              <select
                value={customCollector}
                onChange={(e) => setCustomCollector(e.target.value as 'ANURAG' | 'VIVEK')}
                className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-background border border-border text-foreground text-xs font-medium"
              >
                <option value="ANURAG">Anurag&apos;s Account</option>
                <option value="VIVEK">Vivek&apos;s Account</option>
              </select>
            </div>
          </div>
        )}

        {/* Live Card Preview (WhatsApp Style) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
            <span className="flex items-center gap-1.5">
              <Smartphone className="h-3.5 w-3.5 text-emerald-400" />
              WhatsApp Message Preview:
            </span>
            <span>Target: Vivek (+91 99323 81467)</span>
          </div>
          <pre className="p-3.5 rounded-xl border border-emerald-500/20 bg-slate-950/80 text-emerald-200/90 font-mono text-[11px] sm:text-xs leading-relaxed whitespace-pre-wrap select-all overflow-x-auto shadow-inner">
            {messageText}
          </pre>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
          >
            <Send className="h-4 w-4" />
            <span>Send to Vivek on WhatsApp</span>
            <ExternalLink className="h-3 w-3 opacity-70" />
          </a>

          <Button
            type="button"
            variant="outline"
            onClick={handleCopy}
            className="flex items-center justify-center gap-2 text-xs border-border hover:bg-muted/50"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-400" />
                <span className="text-emerald-400 font-bold">Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span>Copy Message Text</span>
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
