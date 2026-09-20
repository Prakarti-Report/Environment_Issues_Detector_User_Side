-- Diagnostic script to check organization visibility and RLS in Supabase SQL Editor

select count(*) as organizations_in_table from public.organizations;      -- as postgres: is the table really empty?
set role anon;
select id, name from public.organizations limit 5;                        -- what a visitor can read
reset role;
select has_table_privilege('anon','public.org_names','select') as anon_can_read_view;
select tablename from pg_publication_tables where pubname='supabase_realtime' and tablename='organizations';
