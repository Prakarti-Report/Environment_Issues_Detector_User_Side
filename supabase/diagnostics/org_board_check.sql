-- Diagnostic script to verify the views and permissions in Supabase SQL Editor

select table_name from information_schema.views
 where table_schema='public' and table_name in ('org_task_board','org_directory');

select has_table_privilege('anon','public.org_task_board','select') as anon_can_read_board,
       has_table_privilege('anon','public.org_directory','select')  as anon_can_read_directory;

select count(*) as assigned_reports from public.reports where organization_id is not null;
select count(*) as organizations     from public.organizations;

set role anon;  select * from public.org_task_board limit 3;  reset role;
