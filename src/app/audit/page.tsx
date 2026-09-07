import React from 'react';
import { db } from '@/db/repository';
import { requireAuthenticatedPartner } from '@/server/auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { History, ShieldCheck } from 'lucide-react';

export default async function AuditPage() {
  const { organizationId } = await requireAuthenticatedPartner();
  const partners = db.getPartners(organizationId);
  const auditLogs = db.getAuditLogs(organizationId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-foreground">Immutable Audit Trail</h2>
        <p className="text-xs text-muted-foreground">
          Permanent chronological record of all financial mutations, billing changes, and voided entries.
        </p>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4 text-accent shrink-0" />
        <span>
          <strong>Audit Invariant:</strong> Audit logs are append-only. Any attempt to mutate or delete audit log entries is rejected by database constraints.
        </span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4 text-accent" /> Audit History ({auditLogs.length} Events)
          </CardTitle>
          <CardDescription>
            Recorded actions with actor attribution derived from secure server session tokens.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {auditLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">No audit logs recorded yet.</div>
          ) : (
            <div className="space-y-4">
              {auditLogs.map((log) => {
                const actor = partners.find((p) => p.id === log.actorPartnerId);
                const isVoid = log.action === 'VOID';
                const isUpdate = log.action === 'UPDATE';
                const isInsert = log.action === 'INSERT';

                return (
                  <div key={log.id} className="rounded-xl border border-border p-4 text-xs space-y-2 bg-card">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            isVoid
                              ? 'bg-danger/10 text-danger'
                              : isUpdate
                              ? 'bg-amber-100 text-amber-800'
                              : isInsert
                              ? 'bg-success/10 text-success'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}
                        >
                          {log.action}
                        </span>
                        <span className="font-bold text-foreground capitalize">
                          {log.entityName.replace(/_/g, ' ')}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          (ID: {log.entityId})
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span>Actor:</span>
                        <span className="font-bold text-foreground">
                          {actor?.fullName || 'System'}
                        </span>
                        <span>&bull;</span>
                        <span>{new Date(log.createdAt).toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <div className="text-muted-foreground font-medium">
                      <strong>Reason:</strong> {log.changeReason || 'Direct operational change'}
                    </div>

                    {(log.oldData || log.newData) && (
                      <div className="grid gap-2 sm:grid-cols-2 pt-2">
                        {log.oldData && (
                          <div className="rounded-lg bg-muted/40 p-2 font-mono text-[10px]">
                            <span className="font-bold text-muted-foreground">Previous State:</span>
                            <pre className="mt-1 overflow-x-auto">{JSON.stringify(log.oldData, null, 2)}</pre>
                          </div>
                        )}
                        {log.newData && (
                          <div className="rounded-lg bg-accent/5 p-2 font-mono text-[10px]">
                            <span className="font-bold text-accent">New State:</span>
                            <pre className="mt-1 overflow-x-auto">{JSON.stringify(log.newData, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
