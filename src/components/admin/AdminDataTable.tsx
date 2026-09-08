'use client';

import React, { useState, useTransition } from 'react';
import {
  savePaymentAction,
  deletePaymentAction,
  saveBillingPlanAction,
  deleteBillingPlanAction,
  saveClientAction,
  deleteClientAction,
  saveDisbursementAction,
  deleteDisbursementAction,
} from '@/server/actions/admin';
import {
  CreditCard,
  Receipt,
  Users,
  Briefcase,
  UserCheck,
  Calendar,
  Edit2,
  Trash2,
  Plus,
  X,
  Search,
  CheckCircle2,
  AlertCircle,
  Database,
} from 'lucide-react';

interface AdminDataTableProps {
  initialData: {
    payments: any[];
    billingPlans: any[];
    clients: any[];
    disbursements: any[];
    partners: any[];
    billingPeriods: any[];
  };
}

export function AdminDataTable({ initialData }: AdminDataTableProps) {
  const [activeTab, setActiveTab] = useState<'payments' | 'plans' | 'clients' | 'disbursements' | 'partners' | 'periods'>('payments');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPending, startTransition] = useTransition();

  // Modal states
  const [editingRow, setEditingRow] = useState<{ type: string; data: any } | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const { payments, billingPlans, clients, disbursements, partners, billingPeriods } = initialData;

  const getClientName = (billingPlanId: string) => {
    const plan = billingPlans.find((bp) => bp.id === billingPlanId);
    if (!plan) return 'Unknown';
    const client = clients.find((c) => c.id === plan.clientId);
    return client?.name || 'Unknown Client';
  };

  const getPartnerName = (partnerId: string) => {
    const p = partners.find((pt) => pt.id === partnerId);
    return p?.fullName || p?.partnerCode || partnerId;
  };

  // Generic delete handler
  const handleDelete = (type: string, id: string) => {
    if (!confirm(`Are you sure you want to delete this row (${id})?`)) return;

    startTransition(async () => {
      try {
        if (type === 'payment') await deletePaymentAction(id);
        if (type === 'plan') await deleteBillingPlanAction(id);
        if (type === 'client') await deleteClientAction(id);
        if (type === 'disbursement') await deleteDisbursementAction(id);
        showNotification(`Record deleted successfully`);
      } catch (err: any) {
        showNotification(err.message || 'Failed to delete record', 'error');
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-bold shadow-lg transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-rose-600 text-white'
          }`}
        >
          {notification.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {notification.message}
        </div>
      )}

      {/* Tabs Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <button
            onClick={() => { setActiveTab('payments'); setSearchQuery(''); }}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'payments' ? 'bg-accent text-accent-foreground shadow-xs' : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
            }`}
          >
            <CreditCard className="h-4 w-4" /> Client Payments ({payments.length})
          </button>
          <button
            onClick={() => { setActiveTab('plans'); setSearchQuery(''); }}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'plans' ? 'bg-accent text-accent-foreground shadow-xs' : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
            }`}
          >
            <Receipt className="h-4 w-4" /> Billing Plans ({billingPlans.length})
          </button>
          <button
            onClick={() => { setActiveTab('clients'); setSearchQuery(''); }}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'clients' ? 'bg-accent text-accent-foreground shadow-xs' : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
            }`}
          >
            <Users className="h-4 w-4" /> Clients ({clients.length})
          </button>
          <button
            onClick={() => { setActiveTab('disbursements'); setSearchQuery(''); }}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'disbursements' ? 'bg-accent text-accent-foreground shadow-xs' : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
            }`}
          >
            <Briefcase className="h-4 w-4" /> External Disbursements ({disbursements.length})
          </button>
          <button
            onClick={() => { setActiveTab('partners'); setSearchQuery(''); }}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'partners' ? 'bg-accent text-accent-foreground shadow-xs' : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
            }`}
          >
            <UserCheck className="h-4 w-4" /> Partners ({partners.length})
          </button>
          <button
            onClick={() => { setActiveTab('periods'); setSearchQuery(''); }}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'periods' ? 'bg-accent text-accent-foreground shadow-xs' : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
            }`}
          >
            <Calendar className="h-4 w-4" /> Billing Periods ({billingPeriods.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab !== 'partners' && activeTab !== 'periods' && (
            <button
              onClick={() => { setEditingRow(null); setIsCreating(true); }}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors shrink-0"
            >
              <Plus className="h-3.5 w-3.5" /> Add New Row
            </button>
          )}
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center gap-2 bg-card rounded-xl border border-border px-3 py-2 text-xs">
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`Search all columns in ${activeTab}...`}
          className="w-full bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* TABLE 1: CLIENT PAYMENTS */}
      {activeTab === 'payments' && (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Collected By</th>
                <th className="px-4 py-3 text-right">Amount (₹)</th>
                <th className="px-4 py-3">Payment Date</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Notes</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {payments
                .filter((p) => {
                  const clientName = getClientName(p.billingPlanId);
                  const collectorName = getPartnerName(p.collectedByPartnerId);
                  const query = searchQuery.toLowerCase();
                  return (
                    p.id.toLowerCase().includes(query) ||
                    clientName.toLowerCase().includes(query) ||
                    collectorName.toLowerCase().includes(query) ||
                    p.amountReceived.includes(query) ||
                    (p.paymentReference || '').toLowerCase().includes(query) ||
                    (p.notes || '').toLowerCase().includes(query)
                  );
                })
                .map((p) => {
                  const clientName = getClientName(p.billingPlanId);
                  const collector = partners.find((pt) => pt.id === p.collectedByPartnerId);
                  return (
                    <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground">{p.id}</td>
                      <td className="px-4 py-3 font-extrabold text-foreground">{clientName}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          collector?.partnerCode === 'ANURAG' ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {collector?.fullName || p.collectedByPartnerId}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-black text-emerald-600 text-sm">
                        ₹{Number(p.amountReceived).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">{p.paymentDate}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">{p.paymentReference || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          p.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{p.notes || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => { setEditingRow({ type: 'payment', data: p }); setIsCreating(false); }}
                            className="rounded-lg border border-border p-1.5 text-accent hover:bg-accent/10 transition-colors"
                            title="Edit Payment"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete('payment', p.id)}
                            className="rounded-lg border border-border p-1.5 text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete Payment"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      {/* TABLE 2: BILLING PLANS */}
      {activeTab === 'plans' && (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Billing Period</th>
                <th className="px-4 py-3 text-right">Contract Gross Amount (₹)</th>
                <th className="px-4 py-3">Notes</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {billingPlans
                .filter((bp) => {
                  const client = clients.find((c) => c.id === bp.clientId);
                  const query = searchQuery.toLowerCase();
                  return (
                    bp.id.toLowerCase().includes(query) ||
                    (client?.name || '').toLowerCase().includes(query) ||
                    bp.grossBillingAmount.includes(query) ||
                    (bp.notes || '').toLowerCase().includes(query)
                  );
                })
                .map((bp) => {
                  const client = clients.find((c) => c.id === bp.clientId);
                  const period = billingPeriods.find((p) => p.id === bp.billingPeriodId);
                  return (
                    <tr key={bp.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground">{bp.id}</td>
                      <td className="px-4 py-3 font-extrabold text-foreground">{client?.name || bp.clientId}</td>
                      <td className="px-4 py-3 font-semibold text-foreground">{period?.periodKey || bp.billingPeriodId}</td>
                      <td className="px-4 py-3 text-right font-black text-foreground text-sm">
                        ₹{Number(bp.grossBillingAmount).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-sm truncate">{bp.notes || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => { setEditingRow({ type: 'plan', data: bp }); setIsCreating(false); }}
                            className="rounded-lg border border-border p-1.5 text-accent hover:bg-accent/10 transition-colors"
                            title="Edit Plan"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete('plan', bp.id)}
                            className="rounded-lg border border-border p-1.5 text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete Plan"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      {/* TABLE 3: CLIENTS */}
      {activeTab === 'clients' && (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Client Name</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Default Note</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {clients
                .filter((c) => {
                  const query = searchQuery.toLowerCase();
                  return (
                    c.id.toLowerCase().includes(query) ||
                    c.name.toLowerCase().includes(query) ||
                    (c.defaultNote || '').toLowerCase().includes(query)
                  );
                })
                .map((c) => (
                  <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground">{c.id}</td>
                    <td className="px-4 py-3 font-extrabold text-foreground text-sm">{c.name}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        c.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-muted text-muted-foreground'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-sm truncate">{c.defaultNote || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => { setEditingRow({ type: 'client', data: c }); setIsCreating(false); }}
                          className="rounded-lg border border-border p-1.5 text-accent hover:bg-accent/10 transition-colors"
                          title="Edit Client"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete('client', c.id)}
                          className="rounded-lg border border-border p-1.5 text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Client"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TABLE 4: EXTERNAL DISBURSEMENTS */}
      {activeTab === 'disbursements' && (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3">Paid By Partner</th>
                <th className="px-4 py-3 text-right">Amount Paid (₹)</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Notes</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {disbursements
                .filter((d) => {
                  const partnerName = getPartnerName(d.disbursedByPartnerId);
                  const query = searchQuery.toLowerCase();
                  return (
                    d.id.toLowerCase().includes(query) ||
                    partnerName.toLowerCase().includes(query) ||
                    d.amountPaid.includes(query) ||
                    (d.notes || '').toLowerCase().includes(query)
                  );
                })
                .map((d) => {
                  const partner = partners.find((p) => p.id === d.disbursedByPartnerId);
                  return (
                    <tr key={d.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground">{d.id}</td>
                      <td className="px-4 py-3 font-semibold text-foreground">{d.billingPeriodId}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          partner?.partnerCode === 'ANURAG' ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {partner?.fullName || d.disbursedByPartnerId}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-black text-rose-600 text-sm">
                        ₹{Number(d.amountPaid).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">{d.disbursementDate}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          d.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-sm truncate">{d.notes || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => { setEditingRow({ type: 'disbursement', data: d }); setIsCreating(false); }}
                            className="rounded-lg border border-border p-1.5 text-accent hover:bg-accent/10 transition-colors"
                            title="Edit Disbursement"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete('disbursement', d.id)}
                            className="rounded-lg border border-border p-1.5 text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete Disbursement"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      {/* TABLE 5: PARTNERS */}
      {activeTab === 'partners' && (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Partner ID</th>
                <th className="px-4 py-3">Partner Code</th>
                <th className="px-4 py-3">Full Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Share Percentage</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {partners.map((p) => (
                <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground">{p.id}</td>
                  <td className="px-4 py-3 font-bold text-foreground">{p.partnerCode}</td>
                  <td className="px-4 py-3 font-extrabold text-foreground text-sm">{p.fullName}</td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">{p.email}</td>
                  <td className="px-4 py-3 font-black text-accent">{p.sharePercentage}%</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                      {p.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TABLE 6: BILLING PERIODS */}
      {activeTab === 'periods' && (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Period ID</th>
                <th className="px-4 py-3">Period Key</th>
                <th className="px-4 py-3">Start Date</th>
                <th className="px-4 py-3">End Date</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {billingPeriods.map((bp) => (
                <tr key={bp.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground">{bp.id}</td>
                  <td className="px-4 py-3 font-extrabold text-foreground text-sm">{bp.periodKey}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{bp.startDate}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{bp.endDate}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      bp.status === 'OPEN' ? 'bg-emerald-100 text-emerald-800' : 'bg-muted text-muted-foreground'
                    }`}>
                      {bp.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* EDIT / CREATE MODAL */}
      {(editingRow || isCreating) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-black text-foreground">
                {isCreating ? `Add New ${activeTab.slice(0, -1).toUpperCase()}` : `Edit ${editingRow?.type.toUpperCase()} Record`}
              </h3>
              <button
                onClick={() => { setEditingRow(null); setIsCreating(false); }}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* FORM: PAYMENT */}
            {(activeTab === 'payments' || editingRow?.type === 'payment') && (
              <form
                action={async (formData) => {
                  startTransition(async () => {
                    await savePaymentAction(formData);
                    setEditingRow(null);
                    setIsCreating(false);
                    showNotification('Payment saved successfully');
                  });
                }}
                className="space-y-3 text-xs"
              >
                <input type="hidden" name="id" value={editingRow?.data?.id || ''} />

                <div>
                  <label className="font-bold text-foreground">Billing Plan / Client</label>
                  <select
                    name="billingPlanId"
                    defaultValue={editingRow?.data?.billingPlanId || billingPlans[0]?.id}
                    className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-xs font-semibold text-foreground focus:ring-2 focus:ring-accent"
                    required
                  >
                    {billingPlans.map((bp) => {
                      const client = clients.find((c) => c.id === bp.clientId);
                      return (
                        <option key={bp.id} value={bp.id}>
                          {client?.name || bp.clientId} &mdash; ₹{Number(bp.grossBillingAmount).toLocaleString('en-IN')} ({bp.id})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-foreground">Collected By Partner</label>
                    <select
                      name="collectedByPartnerId"
                      defaultValue={editingRow?.data?.collectedByPartnerId || partners[0]?.id}
                      className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-xs font-semibold text-foreground focus:ring-2 focus:ring-accent"
                      required
                    >
                      {partners.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.fullName} ({p.partnerCode})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-foreground">Amount Received (₹)</label>
                    <input
                      type="number"
                      name="amountReceived"
                      defaultValue={editingRow?.data?.amountReceived || ''}
                      placeholder="e.g. 25000"
                      className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-xs font-semibold text-foreground focus:ring-2 focus:ring-accent"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-foreground">Payment Date</label>
                    <input
                      type="date"
                      name="paymentDate"
                      defaultValue={editingRow?.data?.paymentDate || new Date().toISOString().split('T')[0]}
                      className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-xs font-semibold text-foreground focus:ring-2 focus:ring-accent"
                      required
                    />
                  </div>

                  <div>
                    <label className="font-bold text-foreground">Reference / Tranche</label>
                    <input
                      type="text"
                      name="paymentReference"
                      defaultValue={editingRow?.data?.paymentReference || ''}
                      placeholder="e.g. SAI-1-15-SEP"
                      className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-xs font-semibold text-foreground focus:ring-2 focus:ring-accent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-foreground">Status</label>
                    <select
                      name="status"
                      defaultValue={editingRow?.data?.status || 'CONFIRMED'}
                      className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-xs font-semibold text-foreground focus:ring-2 focus:ring-accent"
                    >
                      <option value="CONFIRMED">CONFIRMED</option>
                      <option value="VOIDED">VOIDED</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-foreground">Notes</label>
                    <input
                      type="text"
                      name="notes"
                      defaultValue={editingRow?.data?.notes || ''}
                      placeholder="Optional notes"
                      className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-xs font-semibold text-foreground focus:ring-2 focus:ring-accent"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => { setEditingRow(null); setIsCreating(false); }}
                    className="rounded-lg border border-border px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-lg bg-accent px-4 py-2 text-xs font-bold text-white hover:bg-accent/90 disabled:opacity-50"
                  >
                    {isPending ? 'Saving...' : 'Save Payment'}
                  </button>
                </div>
              </form>
            )}

            {/* FORM: BILLING PLAN */}
            {(activeTab === 'plans' || editingRow?.type === 'plan') && (
              <form
                action={async (formData) => {
                  startTransition(async () => {
                    await saveBillingPlanAction(formData);
                    setEditingRow(null);
                    setIsCreating(false);
                    showNotification('Billing plan saved successfully');
                  });
                }}
                className="space-y-3 text-xs"
              >
                <input type="hidden" name="id" value={editingRow?.data?.id || ''} />

                <div>
                  <label className="font-bold text-foreground">Client</label>
                  <select
                    name="clientId"
                    defaultValue={editingRow?.data?.clientId || clients[0]?.id}
                    className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-xs font-semibold text-foreground focus:ring-2 focus:ring-accent"
                    required
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-foreground">Billing Period</label>
                  <select
                    name="billingPeriodId"
                    defaultValue={editingRow?.data?.billingPeriodId || billingPeriods[0]?.id}
                    className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-xs font-semibold text-foreground focus:ring-2 focus:ring-accent"
                    required
                  >
                    {billingPeriods.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.periodKey} ({p.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-foreground">Gross Billing Amount (₹)</label>
                  <input
                    type="number"
                    name="grossBillingAmount"
                    defaultValue={editingRow?.data?.grossBillingAmount || ''}
                    placeholder="e.g. 50000"
                    className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-xs font-semibold text-foreground focus:ring-2 focus:ring-accent"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-foreground">Notes</label>
                  <input
                    type="text"
                    name="notes"
                    defaultValue={editingRow?.data?.notes || ''}
                    placeholder="e.g. September contractual billing"
                    className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-xs font-semibold text-foreground focus:ring-2 focus:ring-accent"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => { setEditingRow(null); setIsCreating(false); }}
                    className="rounded-lg border border-border px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-lg bg-accent px-4 py-2 text-xs font-bold text-white hover:bg-accent/90 disabled:opacity-50"
                  >
                    {isPending ? 'Saving...' : 'Save Plan'}
                  </button>
                </div>
              </form>
            )}

            {/* FORM: CLIENT */}
            {(activeTab === 'clients' || editingRow?.type === 'client') && (
              <form
                action={async (formData) => {
                  startTransition(async () => {
                    await saveClientAction(formData);
                    setEditingRow(null);
                    setIsCreating(false);
                    showNotification('Client saved successfully');
                  });
                }}
                className="space-y-3 text-xs"
              >
                <input type="hidden" name="id" value={editingRow?.data?.id || ''} />

                <div>
                  <label className="font-bold text-foreground">Client Name</label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={editingRow?.data?.name || ''}
                    placeholder="e.g. Sai Support Project"
                    className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-xs font-semibold text-foreground focus:ring-2 focus:ring-accent"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-foreground">Status</label>
                  <select
                    name="status"
                    defaultValue={editingRow?.data?.status || 'ACTIVE'}
                    className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-xs font-semibold text-foreground focus:ring-2 focus:ring-accent"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-foreground">Default Note</label>
                  <input
                    type="text"
                    name="defaultNote"
                    defaultValue={editingRow?.data?.defaultNote || ''}
                    placeholder="e.g. Full support package"
                    className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-xs font-semibold text-foreground focus:ring-2 focus:ring-accent"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => { setEditingRow(null); setIsCreating(false); }}
                    className="rounded-lg border border-border px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-lg bg-accent px-4 py-2 text-xs font-bold text-white hover:bg-accent/90 disabled:opacity-50"
                  >
                    {isPending ? 'Saving...' : 'Save Client'}
                  </button>
                </div>
              </form>
            )}

            {/* FORM: DISBURSEMENT */}
            {(activeTab === 'disbursements' || editingRow?.type === 'disbursement') && (
              <form
                action={async (formData) => {
                  startTransition(async () => {
                    await saveDisbursementAction(formData);
                    setEditingRow(null);
                    setIsCreating(false);
                    showNotification('Disbursement saved successfully');
                  });
                }}
                className="space-y-3 text-xs"
              >
                <input type="hidden" name="id" value={editingRow?.data?.id || ''} />

                <div>
                  <label className="font-bold text-foreground">Billing Period</label>
                  <select
                    name="billingPeriodId"
                    defaultValue={editingRow?.data?.billingPeriodId || billingPeriods[0]?.id}
                    className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-xs font-semibold text-foreground focus:ring-2 focus:ring-accent"
                    required
                  >
                    {billingPeriods.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.periodKey} ({p.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-foreground">Disbursed By Partner</label>
                    <select
                      name="disbursedByPartnerId"
                      defaultValue={editingRow?.data?.disbursedByPartnerId || partners[0]?.id}
                      className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-xs font-semibold text-foreground focus:ring-2 focus:ring-accent"
                      required
                    >
                      {partners.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.fullName} ({p.partnerCode})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-foreground">Amount Paid (₹)</label>
                    <input
                      type="number"
                      name="amountPaid"
                      defaultValue={editingRow?.data?.amountPaid || ''}
                      placeholder="e.g. 10000"
                      className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-xs font-semibold text-foreground focus:ring-2 focus:ring-accent"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-foreground">Disbursement Date</label>
                    <input
                      type="date"
                      name="disbursementDate"
                      defaultValue={editingRow?.data?.disbursementDate || new Date().toISOString().split('T')[0]}
                      className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-xs font-semibold text-foreground focus:ring-2 focus:ring-accent"
                      required
                    />
                  </div>

                  <div>
                    <label className="font-bold text-foreground">Status</label>
                    <select
                      name="status"
                      defaultValue={editingRow?.data?.status || 'CONFIRMED'}
                      className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-xs font-semibold text-foreground focus:ring-2 focus:ring-accent"
                    >
                      <option value="CONFIRMED">CONFIRMED</option>
                      <option value="VOIDED">VOIDED</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-foreground">Notes / Description</label>
                  <input
                    type="text"
                    name="notes"
                    defaultValue={editingRow?.data?.notes || ''}
                    placeholder="e.g. ₹10,000 paid to external resource"
                    className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-xs font-semibold text-foreground focus:ring-2 focus:ring-accent"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => { setEditingRow(null); setIsCreating(false); }}
                    className="rounded-lg border border-border px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-lg bg-accent px-4 py-2 text-xs font-bold text-white hover:bg-accent/90 disabled:opacity-50"
                  >
                    {isPending ? 'Saving...' : 'Save Disbursement'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
