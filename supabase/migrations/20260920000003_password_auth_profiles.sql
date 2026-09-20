-- =====================================================================
-- Migration: Password Auth & Auto-Profile Generation
-- 1. Private profile_details table with owner-only RLS
-- 2. handle_new_user trigger on auth.users to auto-create profiles + details
-- 3. Idempotent backfill for existing users
-- =====================================================================

-- 5.1 Private per-user details (owner-only). Keeps email/gender OFF the public profiles table.
create table if not exists public.profile_details (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text,
  gender     text check (gender in ('male','female','non-binary','prefer-not-to-say')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.profile_details enable row level security;

drop policy if exists "Users read own details"   on public.profile_details;
drop policy if exists "Users insert own details" on public.profile_details;
drop policy if exists "Users update own details" on public.profile_details;
create policy "Users read own details"   on public.profile_details for select using (auth.uid() = user_id);
create policy "Users insert own details" on public.profile_details for insert with check (auth.uid() = user_id);
create policy "Users update own details" on public.profile_details for update using (auth.uid() = user_id);

-- 5.2 Auto-create profile + details when a user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name   text := nullif(trim(coalesce(new.raw_user_meta_data->>'full_name','')), '');
  v_gender text := new.raw_user_meta_data->>'gender';
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(v_name, split_part(new.email, '@', 1)))
  on conflict (id) do nothing;

  insert into public.profile_details (user_id, email, gender)
  values (
    new.id,
    new.email,
    case when v_gender in ('male','female','non-binary','prefer-not-to-say') then v_gender else null end
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5.3 Backfill users that already exist (e.g. created by magic link)
insert into public.profiles (id, full_name)
select u.id, coalesce(nullif(trim(u.raw_user_meta_data->>'full_name'), ''), split_part(u.email, '@', 1))
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

insert into public.profile_details (user_id, email)
select u.id, u.email
from auth.users u
where not exists (select 1 from public.profile_details d where d.user_id = u.id);

-- Reload PostgREST schema cache
notify pgrst, 'reload schema';
