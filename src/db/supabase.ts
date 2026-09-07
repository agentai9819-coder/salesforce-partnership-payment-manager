/**
 * Production Supabase PostgreSQL Client
 * 
 * Supports both:
 * 1. Modern Supabase API Key Model:
 *    - Client/Browser: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (sb_publishable_...)
 *    - Server-only:    SUPABASE_SECRET_KEY (sb_secret_...)
 * 2. Legacy API Key Model:
 *    - Client/Browser: NEXT_PUBLIC_SUPABASE_ANON_KEY (JWT)
 *    - Server-only:    SUPABASE_SERVICE_ROLE_KEY (JWT)
 * 
 * SECURITY RULES:
 * - Secret keys (SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY) MUST NEVER have NEXT_PUBLIC_
 *   prefix and MUST NEVER be exposed in client bundles or browser contexts.
 * - Publishable keys (NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY)
 *   are safe for public client distribution under Row-Level Security (RLS).
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export function getSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
}

/**
 * Server-only Secret Key (sb_secret_... or legacy service_role JWT).
 * Strictly server-side only. MUST NEVER have a NEXT_PUBLIC_ prefix.
 */
export function getSupabaseSecretKey(): string {
  return (
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ''
  );
}

/**
 * Public Publishable Key (sb_publishable_... or legacy anon JWT).
 * Safe for client-side / browser distribution.
 */
export function getSupabasePublishableKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ''
  );
}

let serverClientInstance: SupabaseClient | null = null;
let browserClientInstance: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  const url = getSupabaseUrl();
  const key = getSupabaseSecretKey() || getSupabasePublishableKey();
  return Boolean(url && key && url.startsWith('http'));
}

export function isSupabaseSecretConfigured(): boolean {
  const url = getSupabaseUrl();
  const secret = getSupabaseSecretKey();
  return Boolean(url && secret && url.startsWith('http'));
}

/**
 * Returns an authenticated Supabase client for server-side persistence and queries.
 * Prefers SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY for server operations.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase PostgreSQL is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) in production environment.'
    );
  }

  const url = getSupabaseUrl();
  const key = getSupabaseSecretKey() || getSupabasePublishableKey();

  if (!serverClientInstance) {
    serverClientInstance = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return serverClientInstance;
}

/**
 * Returns a client using the public publishable key, safe for browser/client scopes.
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  const url = getSupabaseUrl();
  const publishableKey = getSupabasePublishableKey();

  if (!url || !publishableKey) {
    throw new Error(
      'Supabase browser client is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.'
    );
  }

  if (!browserClientInstance) {
    browserClientInstance = createClient(url, publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }

  return browserClientInstance;
}
