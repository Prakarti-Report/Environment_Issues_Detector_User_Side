-- =====================================================================
-- Earth Forward — teams, team ID, assignment, trigger fix, rejected status, realtime
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
-- auth.uid() IS NULL means the request has no end-user identity (service key / SQL editor).
-- Such requests can only reach this trigger by bypassing RLS, because every citizen UPDATE
-- policy requires auth.uid() = user_id. Citizens (auth.uid() set, not an NGO member) stay protected.
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
