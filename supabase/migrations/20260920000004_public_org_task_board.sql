-- =====================================================================
-- Migration: Self-Sufficient Public Org Directory & Task Board Views
-- 0. Ensure all required columns exist first
-- 1. Create views with safe columns only
-- 2. Grant permissions & configure RLS
-- 3. Enable realtime publication
-- 4. Reload PostgREST schema cache
-- =====================================================================

-- 0. Make sure every column the views need exists (no-ops if the dashboard migration already added them)
alter table public.organizations add column if not exists member_count integer default 1;
alter table public.organizations add column if not exists team_code    text;
alter table public.reports       add column if not exists organization_id   uuid;
alter table public.reports       add column if not exists assigned_priority text;
alter table public.reports       add column if not exists due_date          date;
alter table public.reports       add column if not exists assigned_at       timestamptz;
alter table public.reports       add column if not exists updated_at        timestamptz default now();
alter table public.reports       add column if not exists severity          text;
alter table public.reports       add column if not exists address           text;

-- 1. Views (safe columns only — no emails, phones, worker names, user ids or exact coordinates)
create or replace view public.org_directory as
select o.id as organization_id, o.name as organization_name, o.team_code, o.member_count, o.created_at
from public.organizations o;

create or replace view public.org_task_board as
select
  r.id as report_id, r.organization_id, o.name as organization_name, o.team_code, o.member_count,
  case when r.category = 'pending_ai' then coalesce(nullif(r.ai_category,''), 'Environmental incident')
       else r.category end as task_title,
  r.status, r.severity, r.assigned_priority as priority, r.due_date, r.assigned_at, r.updated_at, r.address,
  round(r.latitude::numeric, 2)  as approx_lat,
  round(r.longitude::numeric, 2) as approx_lng
from public.reports r
join public.organizations o on o.id = r.organization_id
where r.status <> 'rejected';

-- 2. Permissions
grant select on public.org_directory, public.org_task_board to anon, authenticated;

drop policy if exists "Allow anon select organizations" on public.organizations;
create policy "Allow anon select organizations" on public.organizations
  for select to anon, authenticated using (true);

-- 3. Realtime
do $$ begin
  begin alter publication supabase_realtime add table public.reports;       exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.organizations; exception when duplicate_object then null; end;
end $$;

-- 4. Refresh PostgREST so the new views are visible to the API immediately
notify pgrst, 'reload schema';
