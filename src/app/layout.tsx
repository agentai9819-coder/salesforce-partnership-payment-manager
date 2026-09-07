import type { Metadata } from 'next';
import './globals.css';
import { AppHeader } from '@/components/shell/AppHeader';
import { AppNavigation } from '@/components/shell/AppNavigation';

export const metadata: Metadata = {
  title: 'Salesforce Partnership Payment Manager',
  description: 'Shared 50/50 partnership ledger for Salesforce support engagements.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased text-foreground">
        <div className="flex min-h-screen flex-col">
          <AppHeader />
          <AppNavigation />
          <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
            {children}
          </main>
          <footer className="border-t border-border bg-card py-4 text-center text-xs text-muted-foreground">
            Salesforce Partnership Payment Manager &bull; Internal Financial Operations
          </footer>
        </div>
      </body>
    </html>
  );
}
