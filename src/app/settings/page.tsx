import React from 'react';
import { db } from '@/db/repository';
import { requireAuthenticatedPartner } from '@/server/auth';
import { switchPartnerAction, resetDatabaseAction } from '@/server/actions/auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Settings, Download, RotateCcw, UserCheck, Shield, Lock } from 'lucide-react';

export default async function SettingsPage() {
  const { partner: currentPartner, organizationId } = await requireAuthenticatedPartner();
  const org = db.getOrganization(organizationId);
  const partners = db.getPartners(organizationId);
  const isDev = process.env.NODE_ENV !== 'production';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-foreground">Partnership Settings</h2>
        <p className="text-xs text-muted-foreground">
          Manage partner profiles, active session identities, and system backups.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Active Identity Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-accent" /> Active Partner Identity
            </CardTitle>
            <CardDescription>
              Currently authenticated actor for all mutations and audit logging.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="rounded-xl border border-border p-4 space-y-2 bg-muted/20">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Partner Name:</span>
                <span className="font-bold text-foreground">{currentPartner.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Partner Code:</span>
                <span className="font-bold text-foreground font-mono">{currentPartner.partnerCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span className="font-bold text-foreground">{currentPartner.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Profit Share:</span>
                <span className="font-bold text-success">{currentPartner.profitSharePercentage}%</span>
              </div>
            </div>

            {isDev ? (
              <div className="space-y-2">
                <span className="font-semibold text-warning text-xs flex items-center gap-1.5">
                  Development Partner Switcher:
                </span>
                <div className="flex gap-2">
                  {partners.map((p) => (
                    <form key={p.id} action={async () => { 'use server'; await switchPartnerAction(p.partnerCode); }} className="flex-1">
                      <Button
                        type="submit"
                        variant={currentPartner.id === p.id ? 'primary' : 'outline'}
                        className="w-full text-xs"
                      >
                        Switch to {p.fullName}
                      </Button>
                    </form>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-lg bg-muted/50 p-2.5 text-muted-foreground text-[11px] flex items-center gap-2">
                <Lock className="h-3.5 w-3.5 text-accent" />
                <span>Session locked to authenticated identity. Partner switching is disabled in production.</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Organization & Tenancy Scoping */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-accent" /> Business Partnership Scoping
            </CardTitle>
            <CardDescription>
              Tenant container isolating data records across the partnership.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="rounded-xl border border-border p-4 space-y-2 bg-muted/20">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Organization:</span>
                <span className="font-bold text-foreground">{org?.name || 'Salesforce Support Partnership'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tenant ID:</span>
                <span className="font-mono text-[11px] text-muted-foreground">{organizationId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className="font-bold text-success">ACTIVE</span>
              </div>
            </div>

            <p className="text-muted-foreground">
              All financial queries and mutations are isolated to this tenant identifier at both repository and database levels.
            </p>
          </CardContent>
        </Card>

        {/* Database Export */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Download className="h-4 w-4 text-accent" /> Export Data Backup
            </CardTitle>
            <CardDescription>
              Download a complete snapshot of all partnership ledger records.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <p className="text-muted-foreground">
              Generates a timestamped JSON file containing all clients, billing plans, payments, external disbursements, settlements, and immutable audit logs.
            </p>
            <a
              href="/api/export"
              download
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 font-bold text-accent-foreground shadow-xs hover:bg-accent/90 transition-all text-xs"
            >
              <Download className="h-4 w-4" /> Download Complete JSON Dump
            </a>
          </CardContent>
        </Card>

        {/* Development & Reference Data Management */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-danger">
              <RotateCcw className="h-4 w-4" /> Reference Baseline Management
            </CardTitle>
            <CardDescription>
              Manage initial reference dataset and test fixture states.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            {isDev ? (
              <>
                <p className="text-muted-foreground">
                  Resets all tables to the initial verified reference dataset (September Sai, Eshwar, Ganesh, Rohit &amp; ₹500 balance). Only available in development mode.
                </p>
                <form action={async () => { 'use server'; await resetDatabaseAction(); }}>
                  <Button type="submit" variant="danger" className="gap-2 text-xs">
                    <RotateCcw className="h-4 w-4" /> Restore Reference Seed Data (Dev)
                  </Button>
                </form>
              </>
            ) : (
              <div className="rounded-lg bg-muted/40 p-3 text-muted-foreground text-xs flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>Production Mode Active: Database reset endpoint is permanently disabled in production.</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
