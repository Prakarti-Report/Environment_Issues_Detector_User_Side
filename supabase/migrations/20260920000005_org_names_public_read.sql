-- =====================================================================
-- Migration: Organizations Public Read & Fallback View
-- Ensures anon users can read organizations, creates org_names view,
-- and ensures realtime publication.
-- =====================================================================

-- Visitors (anon) and logged-in users may read organizations (same policy the dashboard already relies on)
alter table public.organizations enable row level security;
drop policy if exists "Allow anon select organizations" on public.organizations;
create policy "Allow anon select organizations" on public.organizations
  for select to anon, authenticated using (true);

-- Safe fallback view: names only, no emails
create or replace view public.org_names as
select o.id, o.name, o.created_at from public.organizations o;
grant select on public.org_names to anon, authenticated;

-- Realtime
do $$ begin
  begin alter publication supabase_realtime add table public.organizations; exception when duplicate_object then null; end;
end $$;

notify pgrst, 'reload schema';
