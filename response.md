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
- **Result**: **62 passed, 0 failed** across 8 test files:
  - `src/tests/security.test.ts` (15 tests passed) — asserts modern `sb_publishable_` / `sb_secret_` resolution, strict server-only secret isolation, cookie security flags, and production fail-safe errors.
  - `src/tests/settlement_matrix.test.ts` (20 tests passed)
  - `src/tests/repository.test.ts` (7 tests passed)
  - `src/tests/gateway.test.ts` (6 tests passed)
  - `src/tests/money.test.ts` (6 tests passed)
  - `src/tests/engine.test.ts` (3 tests passed)
  - `src/tests/integration.test.ts` (3 tests passed)
  - `src/tests/sample.test.ts` (2 tests passed)

### TypeScript Compiler Check (`npm run type-check`)
- **Command**: `npm run type-check` (`tsc --noEmit`)
- **Result**: **PASSED** (Exit code 0, 0 compiler errors).

### Production Build (`npm run build`)
- **Command**: `npm run build` (`next build`)
- **Result**: **PASSED** (Exit code 0).
  - All application routes compiled and optimized.
  - Edge Middleware bundled successfully (26.6 kB).

---

## 8. How the System Works (End-to-End Architecture)

### A. Authentication & Front Door Security
1. **Passcode Gate**: The application is protected by a full-screen 3D door portal. Access requires the master key (`Salesforce2026!`).
2. **Session Cookies**: Upon unlocking, a secure HTTP cookie (`salesforce_partner_auth`) is issued with `SameSite=Lax`, `HttpOnly=true`, and `Secure` (in production).
3. **Partner Context**: Users operate as either **Anurag** or **Vivek**. Every financial action records the active partner ID (`actorPartnerId`) for accountability and audit compliance.

### B. Accounting Data Model & 15-Day Payment Cycles
Contracts in this partnership run on **15-day bi-monthly cycles**, not monthly lump sums:
- **Cycle 1 (`YYYY-MM-C1`)**: Covers **1st to 15th** of each month.
  - Example: `2026-09-C1` (2026-09-01 to 2026-09-15).
- **Cycle 2 (`YYYY-MM-C2`)**: Covers **16th to the last day** of each month (30th or 31st).
  - Example: `2026-09-C2` (2026-09-16 to 2026-09-30).
- **Consolidated Period (`YYYY-MM`)**: A full-month aggregate (1st to last day) for historical high-level reporting.
- **Closed Period (`YYYY-MM`)**: Prior months (e.g., `2026-08`) marked `CLOSED`. Mutations on closed periods are blocked at the repository level.

### C. The Authoritative Database Ledger (`DatabaseRepository`)
- **Single Source of Truth**: All numbers rendered on the dashboard are computed on-the-fly from the relational ledger. No figures are hardcoded.
- **Relational Tables**:
  - `clients`: Registered clients (Sai, Eshwar, Ganesh, Rohit).
  - `clientBillingPlans`: Expected billing amounts assigned per client for each 15-day cycle.
  - `clientPayments`: Physical cash receipts collected by either partner from clients.
  - `externalDisbursements`: Money paid to third-party resources (e.g., External Dev).
  - `businessAdjustments`: Discretionary adjustments between partners.
  - `auditLogs`: Append-only, tamper-proof audit trail of every `INSERT`, `UPDATE`, `VOID`, and `DELETE`.

---

## 9. What the Dashboard Shows (Detailed UI Breakdown)

The dashboard is designed for total clarity, eliminating confusion about who holds what money:

### 1. Cycle Selector & Active View Header
- **Cycle Dropdown**: Allows instant switching between:
  - `Sep 16 - Sep 30 (Cycle 2 - Current)` &mdash; default active view.
  - `Sep 1 - Sep 15 (Cycle 1)` &mdash; completed first half.
  - `September 2026 (Consolidated)` &mdash; whole month overview.
  - `August 2026 (Closed)` &mdash; historical closed period.
- **Cycle Badge**: Highlights `15-Day Payment Cycle` and `50 / 50 Split`.

### 2. Live Cycle Notice & Pending Alerts
- **Cycle 2 Alert**: Explicitly informs partners:
  > **Cycle 2 Status: Sai Payment of ₹30,000 is PENDING**
  > Sai's monthly contract is ₹50,000. Cycle 1 was ₹20,000 (paid to Vivek). The remaining ₹30,000 has not been received yet. Eshwar has paid his ₹25,000 to Anurag.
  - Includes a direct button: `+ Record Sai Payment` to log the receipt once credited.
- **Cycle 1 Summary**: Confirms ₹45,000 was collected (Eshwar ₹25,000 + Sai ₹20,000).

### 3. Top 3 Summary Cards
1. **Total Cash Collected**: Total confirmed money physically received from clients in this cycle.
2. **External Dev Paid**: Payouts made to external contractors (e.g., Eshwar project developer) out of partnership revenue.
3. **Net Cash to Split (50/50)**: Net distributable profit (`Collected − Dev Paid`) along with each partner's equal 50% entitlement.

### 4. Actual Physical Cash in Partner Bank Accounts
Shows real bank holdings so neither partner has to guess who has the cash:
- **Anurag's Bank Account**:
  - `+ Inflows`: Payments collected directly by Anurag (e.g., Eshwar).
  - `- Outflows`: External dev costs disbursed directly by Anurag.
  - `= Liquid Cash in Hand`: Actual cash currently in Anurag's account.
- **Vivek's Bank Account**:
  - `+ Inflows`: Payments collected directly by Vivek (e.g., Sai).
  - `- Outflows`: Expenses disbursed by Vivek.
  - `= Liquid Cash in Hand`: Actual cash currently in Vivek's account.

### 5. 50/50 Profit Share Summary & Equalization Action
Computes the exact bank transfer needed to reach an equal 50/50 split:
- Displays each partner's legal 50% entitlement.
- Clear instruction stating whether **Vivek pays Anurag** or **Anurag pays Vivek** and the exact rupee amount.

### 6. Client Accounts Status
Row-by-row card for each client:
- **Eshwar**: Shows ₹25,000 cycle rate, marked **Paid (in Anurag Bank)**.
- **Sai**:
  - In Cycle 1: Shows ₹20,000 marked **Cycle 1 Paid (in Vivek Bank)**.
  - In Cycle 2: Shows ₹30,000 marked **⏳ Pending from Client (Rest Amount)**.
- **Ganesh & Rohit**: Displays contractual pipeline estimates.

---

## 10. How Calculations Are Performed (The Financial Math Engine)

### A. Zero-Rounding Fixed-Precision Math (`Money` Domain Class)
Floating-point mathematics in standard JavaScript produces rounding errors (e.g., `0.1 + 0.2 = 0.30000000000000004`). In financial accounting, this is unacceptable.
- The `Money` class parses all amounts into exact integer cents/paise (e.g., `₹25,000.00` &rarr; `2500000`).
- All additions, subtractions, multiplications, and divisions occur on integer values.
- Results are formatted back to 2-decimal string representations (`0.00`).

### B. Core Mathematical Formulas
The settlement engine (`calculateMonthlySettlement`) calculates metrics using these formulas:

1. **Total Collections**:
   $$\text{Total Collected} = \sum \text{amountReceived of CONFIRMED payments in period}$$

2. **Total External Expenses**:
   $$\text{Total External Disbursed} = \sum \text{amountPaid of CONFIRMED disbursements in period}$$

3. **Net Partnership Income**:
   $$\text{Net Income} = \text{Total Collected} - \text{Total External Disbursed}$$

4. **Partner Entitlements (50 / 50)**:
   $$\text{Anurag Entitlement} = \text{Net Income} \times 50\%$$
   $$\text{Vivek Entitlement} = \text{Net Income} \times 50\%$$

5. **Physical Liquid Cash Held in Banks**:
   $$\text{Anurag Cash Held} = (\text{Payments Collected by Anurag}) - (\text{Expenses Paid by Anurag})$$
   $$\text{Vivek Cash Held} = (\text{Payments Collected by Vivek}) - (\text{Expenses Paid by Vivek})$$

6. **Equalization / Balancing Transfer**:
   $$\text{Anurag Surplus/Deficit} = \text{Anurag Cash Held} - \text{Anurag Entitlement}$$
   $$\text{Vivek Surplus/Deficit} = \text{Vivek Cash Held} - \text{Vivek Entitlement}$$
   - If $\text{Vivek Cash Held} > \text{Vivek Entitlement}$, Vivek holds excess cash and must transfer the difference to Anurag (`VIVEK_PAYS_ANURAG`).
   - If $\text{Anurag Cash Held} > \text{Anurag Entitlement}$, Anurag holds excess cash and must transfer the difference to Vivek (`ANURAG_PAYS_VIVEK`).

---

### C. Concrete Step-by-Step Examples

#### Case 1: Cycle 1 (Sep 1 &ndash; Sep 15) Live Walkthrough
- **Client Collections**:
  - Eshwar paid ₹25,000 to Anurag.
  - Sai paid ₹20,000 to Vivek.
  - $\text{Total Collected} = 25,000 + 20,000 = \mathbf{₹45,000}$.
- **External Costs**:
  - Anurag disbursed ₹10,000 to external dev.
  - $\text{Total External Disbursed} = \mathbf{₹10,000}$.
- **Net Distributable Profit**:
  - $\text{Net Income} = 45,000 - 10,000 = \mathbf{₹35,000}$.
- **50% Entitlements**:
  - Anurag Entitlement = $35,000 \times 50\% = \mathbf{₹17,500}$.
  - Vivek Entitlement = $35,000 \times 50\% = \mathbf{₹17,500}$.
- **Physical Bank Positions**:
  - Anurag holds: ₹25,000 (collected) &minus; ₹10,000 (paid dev) = **₹15,000 in hand**.
  - Vivek holds: ₹20,000 (collected) &minus; ₹0 = **₹20,000 in hand**.
- **Settlement Equalization**:
  - Vivek holds ₹20,000 but his 50% share is ₹17,500 (excess: +₹2,500).
  - Anurag holds ₹15,000 but his 50% share is ₹17,500 (deficit: &minus;₹2,500).
  - **Action**: Vivek transfers **₹2,500 to Anurag**.
  - **Post-Transfer Verification**:
    - Anurag: ₹15,000 + ₹2,500 = **₹17,500**.
    - Vivek: ₹20,000 &minus; ₹2,500 = **₹17,500**.
    - Ratio: 50.0% / 50.0% (Zero discrepancy).

---

#### Case 2: Cycle 2 (Sep 16 &ndash; Sep 30) Live Walkthrough (Current View)
- **Client Collections**:
  - Eshwar paid ₹25,000 to Anurag.
  - Sai's contract is ₹50,000 total. ₹20,000 was paid in Cycle 1, leaving **₹30,000 rest amount**.
  - Sai has **not paid** yet ($\text{Sai Received} = ₹0$, Pending = ₹30,000).
  - $\text{Total Collected} = 25,000 + 0 = \mathbf{₹25,000}$.
- **External Costs**:
  - Anurag disbursed ₹10,000 to external dev.
  - $\text{Total External Disbursed} = \mathbf{₹10,000}$.
- **Net Distributable Profit**:
  - $\text{Net Income} = 25,000 - 10,000 = \mathbf{₹15,000}$.
- **50% Entitlements**:
  - Anurag Entitlement = $15,000 \times 50\% = \mathbf{₹7,500}$.
  - Vivek Entitlement = $15,000 \times 50\% = \mathbf{₹7,500}$.
- **Physical Bank Positions**:
  - Anurag holds: ₹25,000 (collected) &minus; ₹10,000 (paid dev) = **₹15,000 in hand**.
  - Vivek holds: **₹0 in hand**.
- **Settlement Equalization**:
  - Anurag holds ₹15,000 but his share is ₹7,500 (excess: +₹7,500).
  - Vivek holds ₹0 but his share is ₹7,500 (deficit: &minus;₹7,500).
  - **Action**: Anurag owes Vivek **₹7,500** (or holds it pending Sai's ₹30,000 collection).

---

#### Case 3: When Sai Pays the Pending ₹30,000
As soon as Sai's ₹30,000 is recorded as received by Vivek:
- $\text{Total Collected} = 25,000 (\text{Eshwar}) + 30,000 (\text{Sai}) = \mathbf{₹55,000}$.
- $\text{External Dev Cost} = \mathbf{₹10,000}$.
- $\text{Net Distributable Profit} = 55,000 - 10,000 = \mathbf{₹45,000}$.
- **Each Partner's Share**: $45,000 \times 50\% = \mathbf{₹22,500 each}$.
- **Physical Bank Positions**:
  - Anurag holds: ₹25,000 &minus; ₹10,000 = **₹15,000**.
  - Vivek holds: **₹30,000**.
- **Settlement Equalization**:
  - Vivek holds ₹30,000 but his share is ₹22,500 (excess: +₹7,500).
  - Anurag holds ₹15,000 but his share is ₹22,500 (deficit: &minus;₹7,500).
  - **Action**: Vivek transfers **₹7,500 to Anurag**.
  - **Result**:
    - Anurag has: ₹15,000 + ₹7,500 = **₹22,500**.
    - Vivek has: ₹30,000 &minus; ₹7,500 = **₹22,500**.
    - Perfect 50/50 balance achieved.

---

## 11. Admin Data Tables Engine (`/admin`)

To give partners direct control over the ledger without needing technical intervention, the dedicated `/admin` portal provides:
- **Full Column Transparency**: Displays raw database columns (Row ID, Billing Period, Client Name, Collector Partner, Payment Date, Amount, Reference, Status, Notes).
- **Interactive Tabs**:
  1. `Client Payments` (`clientPayments`)
  2. `Billing Plans` (`clientBillingPlans`)
  3. `Clients` (`clients`)
  4. `External Disbursements` (`externalDisbursements`)
  5. `Partners` (`partners`)
  6. `Billing Periods` (`billingPeriods`)
- **Inline Editing Modal (✏️)**: Allows modifying amounts, dates, notes, or reassigning who collected the payment between Anurag and Vivek.
- **Row Deletion (🗑️)**: Delete errant or test entries with one click.
- **Add New Row (+)**: Add new payments, billing plans, clients, or expenses on the fly.
- **Instant Search (🔍)**: Real-time search filter across all fields in any table.

