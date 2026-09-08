import type { Metadata } from 'next';
import './globals.css';
import { AppHeader } from '@/components/shell/AppHeader';
import { AppNavigation } from '@/components/shell/AppNavigation';
import { getCurrentPartner } from '@/server/auth';

export const metadata: Metadata = {
  title: 'Salesforce Partnership Payment Manager',
  description: 'Shared 50/50 partnership ledger for Salesforce support engagements.',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const partner = await getCurrentPartner();

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 font-sans antialiased text-foreground">
        {partner ? (
          <div className="flex min-h-screen flex-col bg-background text-foreground">
            <AppHeader />
            <AppNavigation />
            <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
              {children}
            </main>
            <footer className="border-t border-border bg-card py-4 text-center text-xs text-muted-foreground">
              Salesforce Partnership Payment Manager &bull; Internal Financial Operations
            </footer>
          </div>
        ) : (
          <main className="min-h-screen w-full bg-slate-950 flex flex-col">
            {children}
          </main>
        )}
      </body>
    </html>
  );
}
