import React from 'react';
import Link from 'next/link';
import { db } from '@/db/repository';
import { requireAuthenticatedPartner } from '@/server/auth';
import { AdminDataTable } from '@/components/admin/AdminDataTable';
import { Database, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default async function AdminDataPage() {
  const { organizationId } = await requireAuthenticatedPartner();

  const allData = db.getAllData();
  const partners = db.getPartners(organizationId);
  const billingPeriods = db.getBillingPeriods(organizationId);
  const clients = db.getClients(organizationId);
  const billingPlans = allData.clientBillingPlans;
  const payments = allData.clientPayments;
  const disbursements = allData.externalDisbursements;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-card p-4 sm:p-5 rounded-2xl border border-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-foreground">Admin Data Tables</h1>
              <p className="text-xs text-muted-foreground">
                Raw table view of all ledger rows. Directly edit, fix, add, or delete any record with all columns visible.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/dashboard">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs font-bold">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Data Control Table */}
      <AdminDataTable
        initialData={{
          payments,
          billingPlans,
          clients,
          disbursements,
          partners,
          billingPeriods,
        }}
      />
    </div>
  );
}
