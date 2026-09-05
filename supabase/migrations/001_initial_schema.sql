-- ==============================================================================
-- InboxIQ Database Schema & Row Level Security (RLS) Migration
-- Architecture: Multi-tenant SaaS Control Plane (Profession-Aware)
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE (Supports permanent profession, country, and gender)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_user_id TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    name TEXT,
    gender TEXT CHECK (gender IN ('male', 'female', 'non_binary', 'prefer_not_to_say')),
    profession TEXT NOT NULL DEFAULT 'professor_teacher' CHECK (profession IN ('professor_teacher', 'student', 'others')),
    country TEXT NOT NULL DEFAULT 'India',
    image_url TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deactivated')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON public.users(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_profession ON public.users(profession);

-- 2. USER SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    report_time TEXT NOT NULL DEFAULT '08:00',
    timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    max_gmail_connections INT NOT NULL DEFAULT 2,
    onboarding_completed BOOLEAN NOT NULL DEFAULT false,
    report_category_focus JSONB DEFAULT '["Student Communication", "Department / Administration", "Teaching / Academic", "Research", "Student Activities", "Finance / HR", "External / Professional"]'::jsonb,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);

-- 3. GMAIL CONNECTIONS TABLE (Enforces max 2 connections via connection_slot 1 or 2)
CREATE TABLE IF NOT EXISTS public.gmail_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    account_email TEXT NOT NULL,
    google_account_id TEXT,
    provider TEXT NOT NULL DEFAULT 'google',
    connection_name TEXT NOT NULL DEFAULT 'Gmail Account',
    connection_slot INT NOT NULL CHECK (connection_slot IN (1, 2)),
    encrypted_refresh_token TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'connected' CHECK (status IN ('not_connected', 'connecting', 'connected', 'error', 'revoked', 'disconnected')),
    last_connected_at TIMESTAMPTZ DEFAULT now(),
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_user_connection_slot UNIQUE (user_id, connection_slot),
    CONSTRAINT unique_user_account_email UNIQUE (user_id, account_email)
);

CREATE INDEX IF NOT EXISTS idx_gmail_connections_user_id ON public.gmail_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_gmail_connections_status ON public.gmail_connections(status);

-- 4. GOOGLE DRIVE CONNECTIONS TABLE
CREATE TABLE IF NOT EXISTS public.google_drive_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    account_email TEXT NOT NULL,
    google_account_id TEXT,
    encrypted_refresh_token TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'error', 'revoked', 'disconnected')),
    inboxiq_folder_id TEXT,
    reports_folder_id TEXT,
    last_connected_at TIMESTAMPTZ DEFAULT now(),
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_drive_connections_user_id ON public.google_drive_connections(user_id);

-- 5. SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    plan_id TEXT NOT NULL DEFAULT 'plan_faculty_pro',
    plan_name TEXT NOT NULL DEFAULT 'InboxIQ Pro',
    amount NUMERIC NOT NULL DEFAULT 499,
    currency TEXT NOT NULL DEFAULT 'INR',
    razorpay_customer_id TEXT,
    razorpay_subscription_id TEXT UNIQUE,
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('inactive', 'created', 'active', 'past_due', 'cancelled', 'expired', 'failed')),
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_rzp_sub ON public.subscriptions(razorpay_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

-- 6. REPORTS METADATA TABLE
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    report_date DATE NOT NULL,
    report_type TEXT NOT NULL DEFAULT 'daily',
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'generated', 'delivered', 'archived', 'failed')),
    email_delivery_status TEXT DEFAULT 'pending' CHECK (email_delivery_status IN ('pending', 'delivered', 'failed', 'skipped')),
    drive_upload_status TEXT DEFAULT 'pending' CHECK (drive_upload_status IN ('pending', 'uploaded', 'failed', 'skipped')),
    report_reference TEXT,
    executive_summary TEXT,
    key_metrics JSONB DEFAULT '{}'::jsonb,
    generated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_user_report_date_type UNIQUE (user_id, report_date, report_type)
);

CREATE INDEX IF NOT EXISTS idx_reports_user_id ON public.reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_report_date ON public.reports(report_date);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);

-- 7. WORKFLOW EXECUTIONS TABLE
CREATE TABLE IF NOT EXISTS public.workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    execution_id TEXT NOT NULL,
    correlation_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
    started_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    duration_ms INT,
    emails_processed INT DEFAULT 0,
    error_category TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_executions_user_id ON public.workflow_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON public.workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_correlation ON public.workflow_executions(correlation_id);

-- 8. SYSTEM ERRORS TABLE
CREATE TABLE IF NOT EXISTS public.system_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    correlation_id TEXT,
    failure_category TEXT NOT NULL,
    error_status TEXT NOT NULL DEFAULT 'unresolved',
    error_message TEXT NOT NULL,
    context_data JSONB DEFAULT '{}'::jsonb,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_errors_category ON public.system_errors(failure_category);
CREATE INDEX IF NOT EXISTS idx_system_errors_status ON public.system_errors(error_status);
CREATE INDEX IF NOT EXISTS idx_system_errors_created ON public.system_errors(created_at DESC);

-- 9. ADMIN AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_resource TEXT NOT NULL,
    target_id TEXT,
    correlation_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON public.admin_audit_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON public.admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON public.admin_audit_logs(created_at DESC);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gmail_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_drive_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON public.users
    FOR SELECT USING (clerk_user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can read own settings" ON public.user_settings
    FOR SELECT USING (user_id IN (SELECT id FROM public.users WHERE clerk_user_id = auth.jwt() ->> 'sub'));

CREATE POLICY "Users can read own gmail connections" ON public.gmail_connections
    FOR SELECT USING (user_id IN (SELECT id FROM public.users WHERE clerk_user_id = auth.jwt() ->> 'sub'));

CREATE POLICY "Users can read own drive connections" ON public.google_drive_connections
    FOR SELECT USING (user_id IN (SELECT id FROM public.users WHERE clerk_user_id = auth.jwt() ->> 'sub'));

CREATE POLICY "Users can read own subscription" ON public.subscriptions
    FOR SELECT USING (user_id IN (SELECT id FROM public.users WHERE clerk_user_id = auth.jwt() ->> 'sub'));

CREATE POLICY "Users can read own reports" ON public.reports
    FOR SELECT USING (user_id IN (SELECT id FROM public.users WHERE clerk_user_id = auth.jwt() ->> 'sub'));

CREATE POLICY "Users can read own executions" ON public.workflow_executions
    FOR SELECT USING (user_id IN (SELECT id FROM public.users WHERE clerk_user_id = auth.jwt() ->> 'sub'));
