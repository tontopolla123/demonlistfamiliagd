-- Friends Demon List — run this entire file in Supabase → SQL Editor.
-- SECURITY: RLS is enabled on every application table. Do not disable it.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  role text not null default 'member' check (role in ('member','admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.levels (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 100),
  creator text check (creator is null or char_length(creator) <= 100),
  difficulty text not null check (difficulty in ('Easy Demon','Medium Demon','Hard Demon','Insane Demon','Extreme Demon')),
  position integer not null unique check (position > 0),
  gd_url text check (gd_url is null or gd_url ~ '^https?://'),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  level_id uuid not null references public.levels(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  proof_url text check (proof_url is null or proof_url ~ '^https?://'),
  attempts integer check (attempts is null or attempts > 0),
  notes text check (notes is null or char_length(notes) <= 300),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, level_id)
);

create index if not exists levels_position_idx on public.levels(position);
create index if not exists completions_level_status_idx on public.completions(level_id, status);
create index if not exists completions_user_idx on public.completions(user_id);

-- A profile is created automatically for each invited/authenticated account.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'username',''), split_part(coalesce(new.email,''),'@',1)),
    'member'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- SECURITY DEFINER avoids recursive RLS checks when asking whether a user is an admin.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

alter table public.profiles enable row level security;
alter table public.levels enable row level security;
alter table public.completions enable row level security;

-- Authenticated members can see the roster; only admins can change profiles/roles.
drop policy if exists "profiles readable by members" on public.profiles;
create policy "profiles readable by members" on public.profiles
for select to authenticated using (true);
drop policy if exists "profiles managed by admins" on public.profiles;
create policy "profiles managed by admins" on public.profiles
for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Everyone in the invited group can read the list; only admins can change its contents.
drop policy if exists "levels readable by members" on public.levels;
create policy "levels readable by members" on public.levels
for select to authenticated using (true);
drop policy if exists "levels inserted by admins" on public.levels;
create policy "levels inserted by admins" on public.levels
for insert to authenticated with check (public.is_admin() and (created_by is null or created_by = (select auth.uid())));
drop policy if exists "levels updated by admins" on public.levels;
create policy "levels updated by admins" on public.levels
for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "levels deleted by admins" on public.levels;
create policy "levels deleted by admins" on public.levels
for delete to authenticated using (public.is_admin());

-- Members may submit their own pending record. Only admins can approve/reject/edit it.
-- Members can see approved records plus their own submissions; admins see all.
drop policy if exists "approved records and own submissions readable" on public.completions;
create policy "approved records and own submissions readable" on public.completions
for select to authenticated
using (status = 'approved' or user_id = (select auth.uid()) or public.is_admin());
drop policy if exists "members submit own pending records" on public.completions;
create policy "members submit own pending records" on public.completions
for insert to authenticated
with check (user_id = (select auth.uid()) and status = 'pending' and reviewed_by is null and reviewed_at is null);
drop policy if exists "records moderated by admins" on public.completions;
create policy "records moderated by admins" on public.completions
for update to authenticated
using (public.is_admin()) with check (public.is_admin());
drop policy if exists "records deleted by admins" on public.completions;
create policy "records deleted by admins" on public.completions
for delete to authenticated using (public.is_admin());

-- Optional starter levels. Position is the community's own order, not an official list rank.
insert into public.levels (name, creator, difficulty, position, gd_url) values
  ('Windy Landscape', 'WOOGI1411', 'Insane Demon', 1, null),
  ('Supersonic', 'ZenthicAlpha', 'Insane Demon', 2, null),
  ('8o', 'Zobros', 'Insane Demon', 3, null),
  ('Denouement', null, 'Insane Demon', 4, null)
on conflict do nothing;
