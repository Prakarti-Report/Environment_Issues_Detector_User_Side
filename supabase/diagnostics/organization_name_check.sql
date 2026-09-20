-- Column exists?
select column_name, data_type from information_schema.columns
 where table_schema='public' and table_name='reports' and column_name='organization_name';

-- Any mismatches? (expect 0 rows)
select r.id, r.organization_id, r.organization_name, o.name as expected
  from public.reports r left join public.organizations o on o.id = r.organization_id
 where r.organization_name is distinct from o.name;

-- Triggers present?
select tgname from pg_trigger
 where tgname in ('sync_report_organization_name','propagate_organization_rename') and not tgisinternal;
