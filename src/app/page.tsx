import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LayoutDashboard, ShieldAlert, CheckCircle2, ArrowRight } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
            Phase 1 Foundation Active
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Salesforce Partnership Payment Manager
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Production-oriented financial management platform for Anurag and Vivek. 
            Migrated from the standalone single-file prototype to Next.js App Router, TypeScript, 
            and modern domain architecture.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <Link href="/dashboard">
              <Button className="gap-2">
                Open Dashboard <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-5 w-5 text-success" /> Architecture Foundation
            </CardTitle>
            <CardDescription>Modern full-stack TypeScript scaffold</CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-2">
            <p>&bull; Next.js 14 App Router with clean route boundaries</p>
            <p>&bull; Strict TypeScript domain models decoupled from UI</p>
            <p>&bull; Fixed-precision arithmetic with zero floating-point drift</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="h-5 w-5 text-accent" /> Reference Prototype Preserved
            </CardTitle>
            <CardDescription>Baseline data safely retained</CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-2">
            <p>&bull; Original prototype intact in <code>salesforce-partnership-app/</code></p>
            <p>&bull; Demo records preserved in <code>src/domain/seed/referenceData.ts</code></p>
            <p>&bull; Critical cash-held accounting bug identified and isolated</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LayoutDashboard className="h-5 w-5 text-warning" /> Next Implementation Stages
            </CardTitle>
            <CardDescription>Upcoming Prompt 5+ milestones</CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-2">
            <p>&bull; PostgreSQL database schema & migrations</p>
            <p>&bull; Supabase authentication for Anurag & Vivek</p>
            <p>&bull; Verified 9-step settlement engine</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
