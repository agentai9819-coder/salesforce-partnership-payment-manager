# Salesforce Partnership Payment Manager

A production-grade, auditable financial operations and partner equalization ledger engineered specifically for managing Salesforce support projects, client collections, external disbursements (resources & brokers), and automated 50/50 partnership profit equalization between **Anurag** and **Vivek**.

---

## 1. Core Financial Capabilities

- **Dynamic Client Billing**: Flexible, period-by-period client retainership billing (e.g. Sai August ₹40,000, September ₹50,000; Eshwar September ₹50,000; Ganesh ₹70,000; Rohit ₹1,10,000). Never hardcoded.
- **Client Cash Collections**: Realized payment receipts attributed to the collecting partner (`collected_by_partner_id`) with transaction references, payment dates, and voiding audit trails.
- **External Disbursements**: Independent tracking of external obligations and disbursements to resources (e.g., Eshwar resource ₹10k paid of ₹20k expected, Ganesh → Mokika ₹40k) and brokers (Rohit → ₹70k broker) with disbursing partner attribution (`disbursed_by_partner_id`).
- **Advance / Pre-Funding Support**: Correctly models situations where a partner disburses cash to external resources before client cash arrives, resulting in safe, non-fictional operational rebalancing.
- **Business Adjustments & Carry-Forwards**: Auditable business accounting adjustments (such as the Anurag → Vivek ₹500 carry-forward) integrated directly into the final equalization model without treating them as personal loans.
- **Automated Settlement Engine**: Deterministic calculation of Net Realized Partnership Pool, individual partner entitlements (50/50), partner liquid cash held, operational differences, and final net equalization.
- **Period Locking**: Accounting periods (`OPEN` vs `CLOSED`) with immutable snapshots upon closure and safe, auditable reopening mechanisms.
- **Complete Audit Trail**: Immutable audit ledger recording before/after states, acting partner, timestamp, and modification reasons for all financial and operational mutations.

---

## 2. Architecture & Tech Stack

- **Framework**: Next.js 14.2 (App Router, Server Actions, React Server Components)
- **Language**: TypeScript 5.6 (Strict mode with zero `any`)
- **Financial Math Engine**: Fixed-precision `Money` class in `src/domain/precision/` using integer paise (1/100 INR) to guarantee exact decimal arithmetic without IEEE 754 floating-point drift.
- **Domain Layer**: Pure TypeScript financial engine (`src/domain/financial/engine.ts`) with 100% test isolation.
- **Persistence Layer**:
  - **Local / Self-Contained**: ACID-compliant, file-backed transactional repository (`src/db/repository.ts`) with schema constraints, closed-period mutation protection, and automated audit triggers.
  - **Cloud / Supabase Migration**: Complete PostgreSQL 16 migration (`supabase/migrations/20260907000001_initial_schema.sql`) equipped with Row-Level Security (RLS), check constraints, foreign keys, and trigger functions.
- **Validation**: Strict schema validation with Zod (`src/domain/types/schemas.ts`).
- **Styling**: Tailwind CSS with sleek financial tokens, responsive tables, cards, and interactive modal dialogs.
- **Testing**: Vitest with comprehensive unit, domain, repository, and integration test coverage.

---

## 3. Getting Started & Local Setup

### Prerequisites
- Node.js 18.17+ or 20+
- npm 9+

### Installation & Execution
```bash
# Clone and enter directory
cd salesforce-partnership-app-corrected

# Install dependencies
npm install

# Verify type safety (0 errors)
npm run type-check

# Run complete test suite (20 tests)
npm test

# Run ESLint (0 warnings/errors)
npm run lint

# Build for production
npm run build

# Start production server
npm start
```

Default local server URL: `http://localhost:3000`

---

## 4. Environment Variables

Create `.env.local` based on `.env.example`:

```env
# Application Environment
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Cloud PostgreSQL / Supabase Configuration (Optional for cloud deploy)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

*Note: The application operates out-of-the-box locally using the local transactional repository (`.data/database.json`). No external cloud accounts are required to run, test, or verify the system.*

---

## 5. Database Schema & Supabase Setup

The complete PostgreSQL migration script is located at:
`supabase/migrations/20260907000001_initial_schema.sql`

To apply to a Supabase project:
1. Log into your Supabase Dashboard or install the Supabase CLI (`npx supabase login`).
2. Run migrations:
   ```bash
   npx supabase db push
   ```
3. The migration configures:
   - Tables: `organizations`, `partners`, `clients`, `billing_periods`, `client_billing_plans`, `client_payments`, `external_parties`, `external_obligations`, `external_disbursements`, `business_adjustments`, `settlement_periods`, `audit_logs`.
   - NUMERIC(14,2) exact money types on all monetary columns.
   - Closed-period mutation prevention trigger `fn_guard_closed_period_mutation()`.
   - Comprehensive Row-Level Security (RLS) policies isolating tenant data per `organization_id`.

---

## 6. Seed Data & Reference Verification

The system includes the reference dataset reflecting current September 2026 operations:
- **Partners**: Anurag & Vivek (50% / 50% split)
- **Clients**: Sai, Eshwar, Ganesh, Rohit
- **September 2026 Baseline**:
  - Sai: ₹50,000 billed; ₹20,000 collected by Vivek
  - Eshwar: ₹50,000 billed; ₹25,000 collected by Anurag; ₹10,000 resource disbursement paid by Anurag
  - Business Adjustment: Anurag owes Vivek ₹500
- **Equalization Calculation (September 2026)**:
  - Total collections: ₹45,000
  - External disbursements: ₹10,000
  - Net partnership pool: ₹35,000
  - 50/50 entitlement: ₹17,500 each
  - Anurag liquid cash: ₹15,000 (₹25k collected - ₹10k paid)
  - Vivek liquid cash: ₹20,000 (₹20k collected - ₹0k paid)
  - Operational balancing: Vivek owes Anurag ₹2,500
  - Business carry-forward: Anurag owes Vivek ₹500
  - **Final Equalization**: **Vivek pays Anurag ₹2,000**

To restore seed data anytime, use the "Restore Baseline Seed Data" button on `/settings` or call `db.resetToSeed()`.

---

## 7. Security & Concurrency Notes

1. **Server-Side Identity**: The authenticated partner identity is read securely server-side via cookies and context. Mutation inputs cannot spoof `collected_by_partner_id` or `disbursed_by_partner_id`.
2. **Double-Click & Idempotency Guard**: All financial mutations (payments, disbursements, billing) validate against existing identical submissions within a duplicate-submission threshold.
3. **No Hard Deletes**: Financial transactions are voided with mandatory reason logging (`VOIDED` status), never erased from the database.
4. **Closed Period Locking**: When a period is closed, its financial state is locked and a permanent `SettlementPeriod` snapshot is preserved.
5. **No Secret Leaks**: All secrets remain server-side. No service keys or DB credentials are sent to client bundles.

---

## 8. Backup and Recovery

- **Local Persistence**: Database is stored synchronously at `.data/database.json` and can be exported as a complete JSON dump via the Settings page or `/api/export`.
- **Cloud PostgreSQL (Supabase)**: Daily point-in-time recovery (PITR) and automated WAL archiving are supported when connected to Supabase.
- **Safe Recovery**: To revert corrupted local state, backup copies of `.data/database.json` can be restored directly or re-initialized using the deterministic seed baseline.
