-- =====================================================================
-- Migration: Add auto-synced organization_name to public.reports
-- Description:
--   - Adds organization_name column to public.reports
--   - BEFORE INSERT OR UPDATE OF organization_id trigger sets organization_name from organizations.name
--   - AFTER UPDATE OF name ON organizations trigger propagates name changes to reports
--   - Backfills existing rows
--   - Indexes reports.organization_id
-- =====================================================================

-- rollback:
-- drop trigger if exists propagate_organization_rename on public.organizations;
-- drop trigger if exists sync_report_organization_name on public.reports;
-- drop function if exists public.propagate_organization_rename();
-- drop function if exists public.sync_report_organization_name();
-- alter table public.reports drop column if exists organization_name;

-- 1. Column
alter table public.reports add column if not exists organization_name text;

-- 2. Keep it derived from organization_id (never trust client-sent values)
create or replace function public.sync_report_organization_name()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.organization_id is null then
    new.organization_name := null;
  else
    select o.name into new.organization_name
    from public.organizations o
    where o.id = new.organization_id;
  end if;
  return new;
end;
$$;

-- Trigger name sorts AFTER 'enforce_citizen_protected_fields', so it always uses the already-protected organization_id
drop trigger if exists sync_report_organization_name on public.reports;
create trigger sync_report_organization_name
  before insert or update of organization_id on public.reports
  for each row execute function public.sync_report_organization_name();

-- 3. Propagate organization renames to their reports
create or replace function public.propagate_organization_rename()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.name is distinct from old.name then
    update public.reports set organization_name = new.name where organization_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists propagate_organization_rename on public.organizations;
create trigger propagate_organization_rename
  after update of name on public.organizations
  for each row execute function public.propagate_organization_rename();

-- 4. Backfill existing rows
update public.reports r
   set organization_name = o.name
  from public.organizations o
 where o.id = r.organization_id
   and r.organization_name is distinct from o.name;

update public.reports set organization_name = null
 where organization_id is null and organization_name is not null;

-- 5. Lookup performance + API cache
create index if not exists reports_organization_id_idx on public.reports (organization_id);
notify pgrst, 'reload schema';
