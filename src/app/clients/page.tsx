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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-foreground">Client Directory</h2>
          <p className="text-xs text-muted-foreground">
            Manage active client support contracts and billing configurations.
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
            Clients configured for the partnership. Both Anurag and Vivek have full operational access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="p-3">Client Name</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Contract / Billing Notes</th>
                  <th className="p-3">Created</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {clients.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-3 font-bold text-foreground">{c.name}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        c.status === 'ACTIVE' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground">{c.defaultNote || 'Standard retainership'}</td>
                    <td className="p-3 text-muted-foreground">{c.createdAt.split('T')[0]}</td>
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
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
