# RESPONSE 9

## 1. Every `process.env` Variable Found Across Repository

A comprehensive search of the codebase identified the following `process.env.*` references:

| Variable Name | Code Locations | Purpose in Codebase |
|---|---|---|
| `process.env.NODE_ENV` | `src/server/actions/auth.ts`<br>`src/db/repository.ts`<br>`src/components/shell/AppHeader.tsx`<br>`src/app/settings/page.tsx` | Enforces cookie `Secure` flag in production; disables dev partner switching & DB reset in production; prevents local JSON fallback in production. |
| `process.env.NEXT_PHASE` | `src/db/repository.ts` | Allows static page data collection during `next build` (`phase-production-build`) while strictly blocking local file fallback at server runtime (`phase-production-server`). |
| `process.env.NEXT_PUBLIC_SUPABASE_URL` | `src/db/supabase.ts` | Base API endpoint of the Supabase PostgreSQL instance. |
| `process.env.SUPABASE_URL` | `src/db/supabase.ts` | Fallback alias for the Supabase instance URL. |
| `process.env.SUPABASE_SECRET_KEY` | `src/db/supabase.ts` | Modern server-only administrative secret key (`sb_secret_...`) for PostgreSQL ledger mutations and repository queries. |
| `process.env.SUPABASE_SERVICE_ROLE_KEY` | `src/db/supabase.ts` | Legacy fallback for `SUPABASE_SECRET_KEY` (used only if legacy JWT service keys are supplied). |
| `process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `src/db/supabase.ts` | Modern client-safe publishable key (`sb_publishable_...`) for browser and RLS-scoped operations. |
| `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY` | `src/db/supabase.ts` | Legacy fallback for `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (used only if legacy JWT anon keys are supplied). |
| `process.env.NEXT_PUBLIC_APP_URL` | `.env.example`<br>`README.md` | Config template entry for local base URL; not directly read by core runtime code. |

---

## 2. Exact Production Variables Required (Vercel)

For a production deployment on Vercel, exactly **3 environment variables** must be configured in **Vercel Project Settings -> Environment Variables**:

1. **`NEXT_PUBLIC_SUPABASE_URL`**
   - **Value**: Your Supabase project URL (e.g., `https://ujnfzjjpybynlsdmwhvs.supabase.co`).
   - **Scope**: Production, Preview, Development.
2. **`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`**
   - **Value**: Modern publishable key starting with `sb_publishable_...`.
   - **Scope**: Production, Preview, Development.
   - **Security**: Safe for browser client bundles; protected by PostgreSQL Row-Level Security (RLS).
3. **`SUPABASE_SECRET_KEY`**
   - **Value**: Modern secret key starting with `sb_secret_...`.
   - **Scope**: Production, Preview.
   - **Security**: **STRICTLY SERVER-SIDE ONLY.** Lacks `NEXT_PUBLIC_` prefix, guaranteeing Next.js never leaks or bundles it into client-side JavaScript.

---

## 3. Optional Variables (Backward-Compatible Fallbacks)

These variables are **NOT** required for production when the 3 modern variables above are configured. The code supports them strictly as backward-compatible fallbacks:

- **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**: Fallback for `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` if using legacy JWT keys. (Not needed).
- **`SUPABASE_SERVICE_ROLE_KEY`**: Fallback for `SUPABASE_SECRET_KEY` if using legacy JWT service role keys. (Not needed).
- **`SUPABASE_URL`**: Server-only alias fallback for `NEXT_PUBLIC_SUPABASE_URL`. (Not needed).
- **`NEXT_PUBLIC_APP_URL`**: Optional base URL metadata (e.g., `https://your-domain.vercel.app`). (Not needed for core runtime).

---

## 4. Development / Test-Only Variables

- **`NODE_ENV=development`**:
  - Used only in local `.env.local` or development scripts.
  - Activates dev-only UI banners, partner switching toolbar, and database reset controls.
  - Allows local JSON database fallback (`.data/database.json`) during offline development.

---

## 5. Variables That Should NOT Be Manually Configured

Do **NOT** set these variables in Vercel:

- **`NODE_ENV`**: Vercel automatically injects `NODE_ENV=production` for production builds and deployments.
- **`NEXT_PHASE`**: Next.js automatically sets this internally during build, static generation, and server phases.
- **`VERCEL_*`**: System environment variables automatically managed and injected by the Vercel hosting runtime.

---

## 6. Verification of `.env.example`

The template [.env.example](file:///c:/Users/dell/Projects/salesforce-partnership-app-corrected/.env.example) has been structured into 4 distinct, unambiguous sections:
1. **Section 1: Required in Production (Vercel)** — lists `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_...`), and `SUPABASE_SECRET_KEY` (`sb_secret_...`).
2. **Section 2: Optional Backward-Compatibility Fallbacks** — documents legacy JWT variables as commented-out fallbacks.
3. **Section 3: Local Development Only** — documents local development values.
4. **Section 4: Managed Automatically by Vercel & Next.js** — explicitly warns not to configure `NODE_ENV` or `NEXT_PHASE` manually.

---

## 7. Exact Tests, Type-Check & Build Results

### Automated Unit & Security Tests (`npm test`)
- **Command**: `npm test` (`vitest run`)
- **Result**: **55 passed, 0 failed** across 7 test files:
  - `src/tests/security.test.ts` (15 tests passed) — asserts modern `sb_publishable_` / `sb_secret_` resolution, strict server-only secret isolation, cookie security flags, and production fail-safe errors.
  - `src/tests/settlement_matrix.test.ts` (20 tests passed)
  - `src/tests/engine.test.ts` (3 tests passed)
  - `src/tests/money.test.ts` (6 tests passed)
  - `src/tests/repository.test.ts` (6 tests passed)
  - `src/tests/integration.test.ts` (3 tests passed)
  - `src/tests/sample.test.ts` (2 tests passed)

### TypeScript Compiler Check (`npm run type-check`)
- **Command**: `npm run type-check` (`tsc --noEmit`)
- **Result**: **PASSED** (Exit code 0, 0 compiler errors).

### Production Build (`npm run build`)
- **Command**: `npm run build` (`next build`)
- **Result**: **PASSED** (Exit code 0).
  - All 14 application routes compiled and optimized.
  - 14/14 static pages generated cleanly.
  - Edge Middleware bundled successfully (26.6 kB).
