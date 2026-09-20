-- Supabase NGO Integration Migration
-- Designed to be safely run against the existing database.

-- 1. UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_reports_updated_at ON public.reports;
CREATE TRIGGER update_reports_updated_at
BEFORE UPDATE ON public.reports
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 2. ORGANIZATIONS
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 3. ORGANIZATION MEMBERS
CREATE TABLE IF NOT EXISTS public.organization_members (
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('ngo', 'admin')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (organization_id, user_id)
);
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own organization memberships." ON public.organization_members FOR SELECT USING (user_id = auth.uid());

-- NOW CREATE ORGANIZATION POLICIES
CREATE POLICY "NGOs can view their organization." ON public.organizations FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.organization_members WHERE organization_members.organization_id = organizations.id AND organization_members.user_id = auth.uid())
);

-- 4. FIELD WORKERS
CREATE TABLE IF NOT EXISTS public.field_workers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.field_workers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "NGOs can manage their field workers." ON public.field_workers FOR ALL USING (
    EXISTS (SELECT 1 FROM public.organization_members WHERE organization_members.organization_id = field_workers.organization_id AND organization_members.user_id = auth.uid())
);

-- 5. REPORTS UPDATES
-- Add assigned_worker_id and organization_id safely
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS assigned_worker_id UUID REFERENCES public.field_workers(id) ON DELETE SET NULL;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Enforce standard status values using a check constraint
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_status_check;
ALTER TABLE public.reports ADD CONSTRAINT reports_status_check CHECK (status IN ('reported', 'ai_analyzed', 'under_review', 'verified', 'action_initiated', 'resolved'));

-- Safely restrict citizen update policy and allow NGO updates
DROP POLICY IF EXISTS "Users can update their own reports." ON public.reports;
CREATE POLICY "Users can update their own reports." ON public.reports FOR UPDATE USING (
    auth.uid() = user_id
) WITH CHECK (
    auth.uid() = user_id
);

DROP POLICY IF EXISTS "NGOs can update reports." ON public.reports;
-- NGO Policy for Reports
CREATE POLICY "NGOs can update reports." ON public.reports FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.organization_members WHERE organization_members.user_id = auth.uid())
    AND (
        organization_id IS NULL OR
        EXISTS (SELECT 1 FROM public.organization_members WHERE organization_members.organization_id = reports.organization_id AND organization_members.user_id = auth.uid())
    )
);

-- Protect specific fields from citizen updates via trigger
CREATE OR REPLACE FUNCTION prevent_citizen_protected_field_update()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = auth.uid()) THEN
        RETURN NEW;
    END IF;

    NEW.status = OLD.status;
    NEW.severity = OLD.severity;
    NEW.assigned_worker_id = OLD.assigned_worker_id;
    NEW.ai_category = OLD.ai_category;
    NEW.ai_confidence = OLD.ai_confidence;
    NEW.ai_description = OLD.ai_description;
    NEW.organization_id = OLD.organization_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_citizen_protected_fields ON public.reports;
CREATE TRIGGER enforce_citizen_protected_fields
BEFORE UPDATE ON public.reports
FOR EACH ROW
EXECUTE FUNCTION prevent_citizen_protected_field_update();


-- 6. REPORT NOTES
CREATE TABLE IF NOT EXISTS public.report_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES public.reports(id) ON DELETE CASCADE,
    author_id UUID REFERENCES auth.users ON DELETE CASCADE,
    note TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.report_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "NGOs can view report notes." ON public.report_notes FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.organization_members WHERE organization_members.user_id = auth.uid())
);
CREATE POLICY "NGOs can create report notes." ON public.report_notes FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.organization_members WHERE organization_members.user_id = auth.uid()) AND auth.uid() = author_id
);

-- 7. USEFUL INDEXES
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports(created_at);
CREATE INDEX IF NOT EXISTS idx_reports_assigned_worker ON public.reports(assigned_worker_id);
CREATE INDEX IF NOT EXISTS idx_report_notes_report_id ON public.report_notes(report_id);
CREATE INDEX IF NOT EXISTS idx_field_workers_org_id ON public.field_workers(organization_id);
CREATE INDEX IF NOT EXISTS idx_reports_organization_id ON public.reports(organization_id);
