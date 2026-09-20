-- =====================================================================
-- Migration: Enable Supabase Realtime for reports and report_images
-- Idempotent publication alteration
-- =====================================================================

do $$ begin
  begin alter publication supabase_realtime add table public.reports;       exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.report_images; exception when duplicate_object then null; end;
end $$;

-- Verify/ensure PostgREST schema cache reload
notify pgrst, 'reload schema';
