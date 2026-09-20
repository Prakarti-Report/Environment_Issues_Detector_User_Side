-- =====================================================================
-- Earth Forward — Step 1 Migration + 16-Point Verification Query
-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/dclohnhshcmdvmwfxecl/sql/new
-- =====================================================================

-- ---------- A1. organizations: new columns ----------
alter table public.organizations
  add column if not exists email        text,
  add column if not exists member_count integer;

-- ---------- A2. unique Team ID: TEAM-0001, TEAM-0002, ... ----------
create sequence if not exists public.organizations_team_seq start 1;

alter table public.organizations add column if not exists team_code text;

-- backfill existing teams (oldest first) that have no code yet
do $$
declare r record;
begin
  for r in select id from public.organizations where team_code is null order by created_at, id loop
    update public.organizations
       set team_code = 'TEAM-' || lpad(nextval('public.organizations_team_seq')::text, 4, '0')
     where id = r.id;
  end loop;
end $$;

-- the database generates it for every new team
alter table public.organizations
  alter column team_code set default ('TEAM-' || lpad(nextval('public.organizations_team_seq')::text, 4, '0'));
alter table public.organizations alter column team_code set not null;
alter sequence public.organizations_team_seq owned by public.organizations.team_code;

-- inserting roles must be allowed to draw from the sequence
grant usage, select on sequence public.organizations_team_seq to authenticated, service_role;

create unique index if not exists organizations_team_code_uidx on public.organizations (team_code);

-- team_code can never change after creation
create or replace function public.organizations_lock_team_code()
returns trigger language plpgsql as $$
begin
  if new.team_code is distinct from old.team_code then
    raise exception 'team_code is immutable';
  end if;
  return new;
end $$;

drop trigger if exists organizations_lock_team_code on public.organizations;
create trigger organizations_lock_team_code
  before update on public.organizations
  for each row execute function public.organizations_lock_team_code();

-- ---------- A3. team name unique (case-insensitive) + validation ----------
create unique index if not exists organizations_name_lower_uidx on public.organizations (lower(name));

do $$ begin
  begin
    alter table public.organizations add constraint organizations_member_count_chk
      check (member_count is null or member_count between 1 and 10000);
  exception when duplicate_object then null; end;
  begin
    alter table public.organizations add constraint organizations_email_chk
      check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');
  exception when duplicate_object then null; end;
end $$;

-- ---------- A4. reports: assignment details ----------
alter table public.reports
  add column if not exists assigned_priority text,
  add column if not exists due_date          date,
  add column if not exists assigned_at       timestamptz;

do $$ begin
  begin
    alter table public.reports add constraint reports_assigned_priority_chk
      check (assigned_priority is null or assigned_priority in ('High','Medium','Low'));
  exception when duplicate_object then null; end;
end $$;

-- ---------- A5. FIX F1: let trusted callers write protected fields; protect the new columns too ----------
create or replace function public.prevent_citizen_protected_field_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null
     or exists (select 1 from public.organization_members where user_id = auth.uid()) then
    return new;
  end if;

  new.status             = old.status;
  new.severity           = old.severity;
  new.assigned_worker_id = old.assigned_worker_id;
  new.ai_category        = old.ai_category;
  new.ai_confidence      = old.ai_confidence;
  new.ai_description     = old.ai_description;
  new.organization_id    = old.organization_id;
  new.assigned_priority  = old.assigned_priority;   -- new
  new.due_date           = old.due_date;            -- new
  new.assigned_at        = old.assigned_at;         -- new
  return new;
end $$;

-- ---------- A6. FIX F2: allow 'rejected' ----------
alter table public.reports drop constraint if exists reports_status_check;
alter table public.reports add constraint reports_status_check
  check (status in ('reported','ai_analyzed','under_review','verified','action_initiated','resolved','rejected'));

-- ---------- A7. realtime ----------
do $$ begin
  begin alter publication supabase_realtime add table public.reports;       exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.organizations; exception when duplicate_object then null; end;
end $$;

notify pgrst, 'reload schema';

-- =====================================================================
-- 16-POINT VERIFICATION QUERY
-- =====================================================================
select check_name,
       case when ok then '✅ PASS' else '❌ FAIL' end as result
from (
  select 1 as n, 'organizations.email column' as check_name,
    exists (select 1 from information_schema.columns
            where table_schema='public' and table_name='organizations' and column_name='email') as ok
  union all select 2, 'organizations.member_count column',
    exists (select 1 from information_schema.columns
            where table_schema='public' and table_name='organizations' and column_name='member_count')
  union all select 3, 'organizations.team_code column',
    exists (select 1 from information_schema.columns
            where table_schema='public' and table_name='organizations' and column_name='team_code')
  union all select 4, 'team_code has a default (auto-generated)',
    exists (select 1 from information_schema.columns
            where table_schema='public' and table_name='organizations'
              and column_name='team_code' and column_default is not null)
  union all select 5, 'every existing team has a team_code',
    (select count(*) = 0 from public.organizations where team_code is null)
    and exists (select 1 from information_schema.columns
                where table_schema='public' and table_name='organizations' and column_name='team_code')
  union all select 6, 'team_code unique index',
    exists (select 1 from pg_indexes where schemaname='public' and indexname='organizations_team_code_uidx')
  union all select 7, 'team name unique (case-insensitive) index',
    exists (select 1 from pg_indexes where schemaname='public' and indexname='organizations_name_lower_uidx')
  union all select 8, 'team_code immutable trigger',
    exists (select 1 from pg_trigger where tgname='organizations_lock_team_code' and not tgisinternal)
  union all select 9, 'reports.assigned_priority column',
    exists (select 1 from information_schema.columns
            where table_schema='public' and table_name='reports' and column_name='assigned_priority')
  union all select 10, 'reports.due_date column',
    exists (select 1 from information_schema.columns
            where table_schema='public' and table_name='reports' and column_name='due_date')
  union all select 11, 'reports.assigned_at column',
    exists (select 1 from information_schema.columns
            where table_schema='public' and table_name='reports' and column_name='assigned_at')
  union all select 12, 'status allows ''rejected''',
    exists (select 1 from pg_constraint
            where conrelid='public.reports'::regclass and conname='reports_status_check'
              and pg_get_constraintdef(oid) ilike '%rejected%')
  union all select 13, 'trigger fix: service/SQL callers allowed through',
    pg_get_functiondef('public.prevent_citizen_protected_field_update'::regproc) ilike '%auth.uid() is null%'
  union all select 14, 'trigger fix: new assignment columns protected from citizens',
    pg_get_functiondef('public.prevent_citizen_protected_field_update'::regproc) ilike '%assigned_priority%'
  union all select 15, 'realtime enabled: reports',
    exists (select 1 from pg_publication_tables
            where pubname='supabase_realtime' and schemaname='public' and tablename='reports')
  union all select 16, 'realtime enabled: organizations',
    exists (select 1 from pg_publication_tables
            where pubname='supabase_realtime' and schemaname='public' and tablename='organizations')
) t
order by n;
