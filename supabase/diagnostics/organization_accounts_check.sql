select column_name from information_schema.columns
 where table_schema='public' and table_name='organizations' and column_name='user_id';
select tgname from pg_trigger where tgname='on_auth_organization_created' and not tgisinternal;
select public.is_organization_name_available('Some Test Org') as available;
select id, name, email, team_code, user_id from public.organizations order by created_at desc limit 5;
