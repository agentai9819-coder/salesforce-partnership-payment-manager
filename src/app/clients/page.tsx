import React from 'react';
import { db } from '@/db/repository';
import { requireAuthenticatedPartner } from '@/server/auth';
import { archiveClientAction } from '@/server/actions/clients';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { ClientModal } from '@/components/modals/ClientModal';
import { Users, Archive } from 'lucide-react';

export default async function ClientsPage() {
  const { organizationId } = await requireAuthenticatedPartner();
  const clients = db.getClients(organizationId);

  // Helper metadata based on client configuration
  const getClientDetails = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('sai')) {
      return {
        billing: '₹50,000 / month (August was ₹40k)',
        schedule: 'Twice a month: ₹25k Cycle 1, ₹25k Cycle 2',
        resource: 'None (100% partnership)',
      };
    }
    if (lower.includes('eshwar')) {
      return {
        billing: '₹50,000 / month',
        schedule: 'Twice a month: ₹25k Cycle 1, ₹25k Cycle 2',
        resource: 'External Dev: ₹10,000 per 15-day cycle (₹20,000/mo)',
      };
    }
    if (lower.includes('ganesh')) {
      return {
        billing: '₹70,000 (Example contract)',
        schedule: 'Billing not started yet',
        resource: 'Mokika: ₹40,000 obligation',
      };
    }
    if (lower.includes('rohit')) {
      return {
        billing: '₹1,10,000 (Contractual total)',
        schedule: 'Billing not started yet',
        resource: 'Broker: ₹70,000 obligation (Partnership: ₹40,000)',
      };
    }
    return {
      billing: 'Custom',
      schedule: '15-day cycles',
      resource: 'None',
    };
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-foreground">Client Directory</h2>
          <p className="text-xs text-muted-foreground">
            Active client accounts, contractual monthly billing, 15-day schedules, and external obligations.
          </p>
        </div>
        <ClientModal />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-accent" /> Active Client Accounts ({clients.length})
          </CardTitle>
          <CardDescription>
            Strict 50/50 partnership client portfolio.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="p-3 font-bold text-foreground">Client</th>
                  <th className="p-3 font-bold text-foreground">Monthly Billing</th>
                  <th className="p-3 font-bold text-foreground">Payment Schedule</th>
                  <th className="p-3 font-bold text-foreground">External Resource / Cost</th>
                  <th className="p-3 font-bold text-foreground">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {clients.map((c) => {
                  const details = getClientDetails(c.name);
                  return (
                    <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-3 font-extrabold text-foreground">{c.name}</td>
                      <td className="p-3 font-bold text-foreground">{details.billing}</td>
                      <td className="p-3 text-muted-foreground">{details.schedule}</td>
                      <td className="p-3 text-muted-foreground">{details.resource}</td>
                      <td className="p-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          c.status === 'ACTIVE' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {c.status === 'ACTIVE' && (
                          <form action={async () => { 'use server'; await archiveClientAction(c.id); }} className="inline">
                            <button
                              type="submit"
                              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors"
                            >
                              <Archive className="h-3 w-3" /> Archive
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
