-- ==============================================================================
-- SALESFORCE PARTNERSHIP PAYMENT MANAGER - PRODUCTION POSTGRESQL SCHEMA
-- Migration: 20260907000001_initial_schema.sql
-- Compatible with Supabase PostgreSQL 16
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Organizations (Tenancy Container)
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    default_currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Partners (Business Principals)
CREATE TABLE IF NOT EXISTS public.partners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    auth_user_id UUID UNIQUE NOT NULL,
    partner_code VARCHAR(20) UNIQUE NOT NULL CHECK (partner_code IN ('ANURAG', 'VIVEK')),
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    profit_share_percentage NUMERIC(5, 2) NOT NULL DEFAULT 50.00 CHECK (profit_share_percentage >= 0 AND profit_share_percentage <= 100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Clients
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
    default_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_clients_org_status ON public.clients(organization_id, status);

-- 4. Billing Periods (Accounting Months)
CREATE TABLE IF NOT EXISTS public.billing_periods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    period_key VARCHAR(7) NOT NULL CHECK (period_key ~ '^\d{4}-\d{2}$'), -- Format: YYYY-MM
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'REVIEW', 'CLOSED')),
    closed_at TIMESTAMPTZ,
    closed_by_partner_id UUID REFERENCES public.partners(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_org_period UNIQUE (organization_id, period_key),
    CONSTRAINT ck_period_dates CHECK (end_date >= start_date)
);

-- 5. Client Billing Plans (Dynamic Period-Specific Billing)
CREATE TABLE IF NOT EXISTS public.client_billing_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    billing_period_id UUID NOT NULL REFERENCES public.billing_periods(id) ON DELETE RESTRICT,
    gross_billing_amount NUMERIC(12, 2) NOT NULL CHECK (gross_billing_amount >= 0),
    notes TEXT,
    created_by_partner_id UUID NOT NULL REFERENCES public.partners(id),
    updated_by_partner_id UUID NOT NULL REFERENCES public.partners(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_client_period_billing UNIQUE (client_id, billing_period_id)
);
CREATE INDEX IF NOT EXISTS idx_cbp_period_client ON public.client_billing_plans(billing_period_id, client_id);

-- 6. Client Payments (Cash Collections)
CREATE TABLE IF NOT EXISTS public.client_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    billing_plan_id UUID NOT NULL REFERENCES public.client_billing_plans(id) ON DELETE RESTRICT,
    collected_by_partner_id UUID NOT NULL REFERENCES public.partners(id),
    payment_date DATE NOT NULL,
    amount_received NUMERIC(12, 2) NOT NULL CHECK (amount_received > 0),
    payment_reference VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('CONFIRMED', 'VOIDED')),
    notes TEXT,
    idempotency_key UUID UNIQUE,
    created_by_partner_id UUID NOT NULL REFERENCES public.partners(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cp_billing_plan ON public.client_payments(billing_plan_id);
CREATE INDEX IF NOT EXISTS idx_cp_collector_date ON public.client_payments(collected_by_partner_id, payment_date);

-- 7. External Parties (Resources & Brokers)
CREATE TABLE IF NOT EXISTS public.external_parties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    party_type VARCHAR(20) NOT NULL CHECK (party_type IN ('RESOURCE', 'BROKER', 'VENDOR', 'OTHER')),
    contact_info TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. External Obligations (Expected Costs)
CREATE TABLE IF NOT EXISTS public.external_obligations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    billing_plan_id UUID NOT NULL REFERENCES public.client_billing_plans(id) ON DELETE RESTRICT,
    external_party_id UUID NOT NULL REFERENCES public.external_parties(id) ON DELETE RESTRICT,
    expected_amount NUMERIC(12, 2) NOT NULL CHECK (expected_amount >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. External Disbursements (Cash Outflows)
CREATE TABLE IF NOT EXISTS public.external_disbursements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    obligation_id UUID REFERENCES public.external_obligations(id) ON DELETE SET NULL,
    billing_period_id UUID NOT NULL REFERENCES public.billing_periods(id) ON DELETE RESTRICT,
    external_party_id UUID NOT NULL REFERENCES public.external_parties(id) ON DELETE RESTRICT,
    disbursed_by_partner_id UUID NOT NULL REFERENCES public.partners(id),
    amount_paid NUMERIC(12, 2) NOT NULL CHECK (amount_paid > 0),
    disbursement_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('CONFIRMED', 'VOIDED')),
    notes TEXT,
    idempotency_key UUID UNIQUE,
    created_by_partner_id UUID NOT NULL REFERENCES public.partners(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ed_period_disburser ON public.external_disbursements(billing_period_id, disbursed_by_partner_id);

-- 10. Business Adjustments (Carry-Forward Ledger)
CREATE TABLE IF NOT EXISTS public.business_adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    effective_billing_period_id UUID NOT NULL REFERENCES public.billing_periods(id) ON DELETE RESTRICT,
    from_partner_id UUID NOT NULL REFERENCES public.partners(id),
    to_partner_id UUID NOT NULL REFERENCES public.partners(id),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    reason TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'APPLIED' CHECK (status IN ('APPLIED', 'VOIDED')),
    idempotency_key UUID UNIQUE,
    created_by_partner_id UUID NOT NULL REFERENCES public.partners(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_adj_distinct_partners CHECK (from_partner_id <> to_partner_id)
);

-- 11. Settlement Periods (Finalized Snapshots)
CREATE TABLE IF NOT EXISTS public.settlement_periods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    billing_period_id UUID UNIQUE NOT NULL REFERENCES public.billing_periods(id) ON DELETE RESTRICT,
    total_collections NUMERIC(12, 2) NOT NULL,
    total_disbursements NUMERIC(12, 2) NOT NULL,
    net_partnership_pool NUMERIC(12, 2) NOT NULL,
    anurag_entitlement NUMERIC(12, 2) NOT NULL,
    vivek_entitlement NUMERIC(12, 2) NOT NULL,
    anurag_cash_held NUMERIC(12, 2) NOT NULL,
    vivek_cash_held NUMERIC(12, 2) NOT NULL,
    business_adjustments_net NUMERIC(12, 2) NOT NULL DEFAULT 0,
    settlement_direction VARCHAR(30) NOT NULL CHECK (settlement_direction IN ('VIVEK_PAYS_ANURAG', 'ANURAG_PAYS_VIVEK', 'BALANCED')),
    settlement_amount NUMERIC(12, 2) NOT NULL CHECK (settlement_amount >= 0),
    is_settled BOOLEAN NOT NULL DEFAULT FALSE,
    settled_at TIMESTAMPTZ,
    payment_reference VARCHAR(100),
    idempotency_key UUID UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Audit Logs (Immutable Append-Only Audit Trail)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    actor_partner_id UUID REFERENCES public.partners(id),
    entity_name VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'VOID', 'STATUS_CHANGE')),
    old_data JSONB,
    new_data JSONB,
    change_reason TEXT,
    ip_address INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON public.audit_logs(entity_name, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON public.audit_logs(created_at DESC);

-- ==============================================================================
-- DATABASE LEVEL TRIGGERS & CONSTRAINTS
-- ==============================================================================

-- Prevent mutation of audit logs (Immutability guarantee)
CREATE OR REPLACE FUNCTION public.fn_protect_audit_logs() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable. UPDATE and DELETE operations are prohibited.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON public.audit_logs;
CREATE TRIGGER trg_audit_logs_immutable
BEFORE UPDATE OR DELETE ON public.audit_logs
FOR EACH ROW EXECUTE FUNCTION public.fn_protect_audit_logs();

-- Prevent mutations in closed periods
CREATE OR REPLACE FUNCTION public.fn_prevent_closed_period_mutation() RETURNS TRIGGER AS $$
DECLARE
  v_period_status VARCHAR(20);
  v_period_id UUID;
BEGIN
  IF TG_TABLE_NAME = 'client_billing_plans' THEN
    v_period_id := COALESCE(NEW.billing_period_id, OLD.billing_period_id);
  ELSIF TG_TABLE_NAME = 'client_payments' THEN
    SELECT billing_period_id INTO v_period_id FROM public.client_billing_plans WHERE id = COALESCE(NEW.billing_plan_id, OLD.billing_plan_id);
  ELSIF TG_TABLE_NAME = 'external_disbursements' THEN
    v_period_id := COALESCE(NEW.billing_period_id, OLD.billing_period_id);
  ELSIF TG_TABLE_NAME = 'business_adjustments' THEN
    v_period_id := COALESCE(NEW.effective_billing_period_id, OLD.effective_billing_period_id);
  END IF;

  SELECT status INTO v_period_status FROM public.billing_periods WHERE id = v_period_id;

  IF v_period_status = 'CLOSED' THEN
    RAISE EXCEPTION 'Cannot modify financial records for closed accounting period %', v_period_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cbp_closed_guard ON public.client_billing_plans;
CREATE TRIGGER trg_cbp_closed_guard BEFORE INSERT OR UPDATE OR DELETE ON public.client_billing_plans FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_closed_period_mutation();

DROP TRIGGER IF EXISTS trg_cp_closed_guard ON public.client_payments;
CREATE TRIGGER trg_cp_closed_guard BEFORE INSERT OR UPDATE OR DELETE ON public.client_payments FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_closed_period_mutation();

DROP TRIGGER IF EXISTS trg_ed_closed_guard ON public.external_disbursements;
CREATE TRIGGER trg_ed_closed_guard BEFORE INSERT OR UPDATE OR DELETE ON public.external_disbursements FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_closed_period_mutation();

DROP TRIGGER IF EXISTS trg_ba_closed_guard ON public.business_adjustments;
CREATE TRIGGER trg_ba_closed_guard BEFORE INSERT OR UPDATE OR DELETE ON public.business_adjustments FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_closed_period_mutation();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_billing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_disbursements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlement_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_partner_org_id() RETURNS UUID AS $$
  SELECT organization_id FROM public.partners WHERE auth_user_id = auth.uid() AND is_active = TRUE;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Select policies
CREATE POLICY "Partners can view organization clients" ON public.clients FOR SELECT USING (organization_id = public.current_partner_org_id());
CREATE POLICY "Partners can view organization periods" ON public.billing_periods FOR SELECT USING (organization_id = public.current_partner_org_id());
CREATE POLICY "Partners can view billing plans" ON public.client_billing_plans FOR SELECT USING (client_id IN (SELECT id FROM public.clients WHERE organization_id = public.current_partner_org_id()));
CREATE POLICY "Partners can view payments" ON public.client_payments FOR SELECT USING (billing_plan_id IN (SELECT cbp.id FROM public.client_billing_plans cbp JOIN public.clients c ON cbp.client_id = c.id WHERE c.organization_id = public.current_partner_org_id()));
CREATE POLICY "Partners can view external parties" ON public.external_parties FOR SELECT USING (organization_id = public.current_partner_org_id());
CREATE POLICY "Partners can view external disbursements" ON public.external_disbursements FOR SELECT USING (billing_period_id IN (SELECT id FROM public.billing_periods WHERE organization_id = public.current_partner_org_id()));
CREATE POLICY "Partners can view business adjustments" ON public.business_adjustments FOR SELECT USING (organization_id = public.current_partner_org_id());
CREATE POLICY "Partners can view settlements" ON public.settlement_periods FOR SELECT USING (billing_period_id IN (SELECT id FROM public.billing_periods WHERE organization_id = public.current_partner_org_id()));
CREATE POLICY "Partners can view audit logs" ON public.audit_logs FOR SELECT USING (organization_id = public.current_partner_org_id());
