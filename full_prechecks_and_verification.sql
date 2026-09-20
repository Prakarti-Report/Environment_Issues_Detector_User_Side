-- =====================================================================
-- STEP 0: PRE-CHECKS
-- =====================================================================

-- P1 live trigger function (compare with the repo: it resets status/severity/assigned_worker_id/ai_*/organization_id)
select pg_get_functiondef('public.prevent_citizen_protected_field_update'::regproc);

-- P2 live status constraint
select conname, pg_get_constraintdef(oid) from pg_constraint
where conrelid='public.reports'::regclass and conname='reports_status_check';

-- P3 id types (expected: both uuid)
select table_name, column_name, data_type from information_schema.columns
where table_schema='public' and ((table_name='organizations' and column_name='id')
                              or (table_name='reports' and column_name='organization_id'));

-- P4 foreign keys on reports (expected: organization_id -> organizations ON DELETE SET NULL)
select conname, pg_get_constraintdef(oid) from pg_constraint
where conrelid='public.reports'::regclass and contype='f';

-- P5 duplicate team names ignoring case (must return 0 rows)
select lower(name), count(*) from public.organizations group by 1 having count(*) > 1;

-- P6 current teams and columns
select * from public.organizations;

-- P7 current policies on the two tables
select tablename, policyname, cmd, qual, with_check from pg_policies
where schemaname='public' and tablename in ('organizations','reports');

-- P8 REPRODUCE the bug (safe — rolled back). Expect BEFORE the fix: organization_id comes back NULL.
begin;
update public.reports
   set organization_id = (select id from public.organizations limit 1)
 where id = (select id from public.reports where organization_id is null limit 1)
returning id, organization_id;
rollback;


-- =====================================================================
-- STEP 2: VERIFICATION (run after Step 1 migration)
-- =====================================================================

-- V1 every team has a unique code
select id, team_code, name, email, member_count, created_at from public.organizations order by team_code;

-- V2 code is generated + returned; duplicate name and immutability are enforced (rolled back)
begin;
insert into public.organizations (name, email, member_count) values ('__test team__','t@example.com',5)
  returning id, team_code;                                            -- expect TEAM-000N
-- expect ERROR 23505 (case-insensitive duplicate):
-- insert into public.organizations (name) values ('__TEST TEAM__');
-- expect ERROR "team_code is immutable":
-- update public.organizations set team_code='TEAM-9999' where name='__test team__';
rollback;

-- V3 the bug is fixed: NGO-side write now PERSISTS (compare with P8; organization_id must be non-null)
begin;
update public.reports
   set organization_id = (select id from public.organizations limit 1),
       assigned_priority='High', due_date=current_date+5, assigned_at=now()
 where id = (select id from public.reports where organization_id is null limit 1)
returning id, organization_id, assigned_priority, due_date;
rollback;

-- V4 'rejected' is accepted (expect 1 row, no constraint error)
begin;
update public.reports set status='rejected' where id=(select id from public.reports limit 1) returning id, status;
rollback;

-- V5 citizens are STILL protected (using live user_id 175a0635-f357-4376-9ace-6f8045d287bb)
--    Expect status / organization_id / assigned_priority to come back UNCHANGED.
begin;
select set_config('request.jwt.claims', json_build_object('sub','175a0635-f357-4376-9ace-6f8045d287bb','role','authenticated')::text, true);
set local role authenticated;
update public.reports set status='resolved', organization_id=null, assigned_priority='High'
 where user_id='175a0635-f357-4376-9ace-6f8045d287bb' returning id, status, organization_id, assigned_priority;
rollback;

-- V6 realtime (expect both rows)
select tablename from pg_publication_tables
where pubname='supabase_realtime' and schemaname='public' and tablename in ('reports','organizations');
