-- E-commerce marketplace core schema.
-- Apply to a staging Supabase project first. Wallet tables are in the separate
-- 202611060003_wallet.sql migration and remain read-only to authenticated clients.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'buyer' check (role in ('buyer','seller','distributor','retailer')),
  business_name text,
  phone text,
  address text,
  verification_status text not null default 'not_started'
    check (verification_status in ('not_started','pending','verified','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Create a profile when Supabase Auth creates a user. Role is validated against
-- the allowed account types; verification status is never accepted from metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role text;
begin
  requested_role := coalesce(new.raw_user_meta_data ->> 'role', 'buyer');
  if requested_role not in ('buyer','seller','distributor','retailer') then
    requested_role := 'buyer';
  end if;

  insert into public.profiles (id, full_name, role, business_name, phone, address)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    requested_role,
    nullif(new.raw_user_meta_data ->> 'business_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    nullif(new.raw_user_meta_data ->> 'address', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Prevent users from changing privileged profile fields themselves.
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null then
    if new.role is distinct from old.role
       or new.verification_status is distinct from old.verification_status then
      raise exception 'Role and verification status can only be changed by trusted server processes';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_privileged_fields on public.profiles;
create trigger profiles_protect_privileged_fields
before update on public.profiles
for each row execute function public.protect_profile_fields();

alter table public.profiles enable row level security;
drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select to authenticated
  using (auth.uid() = id);
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

grant select, update on public.profiles to authenticated;
revoke insert, delete on public.profiles from anon, authenticated;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete restrict,
  name text not null check (char_length(name) between 2 and 160),
  description text not null default '',
  category text not null,
  price numeric(18,2) not null check (price > 0),
  currency text not null default 'KES' check (currency in ('KES','USD')),
  quantity integer not null default 0 check (quantity >= 0),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_status_created_idx
  on public.products(status, created_at desc);
create index if not exists products_seller_created_idx
  on public.products(seller_id, created_at desc);

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

alter table public.products enable row level security;
drop policy if exists "Anyone can view published products" on public.products;
create policy "Anyone can view published products"
  on public.products for select
  using (status = 'published' or auth.uid() = seller_id);
drop policy if exists "Sellers can create their own products" on public.products;
create policy "Sellers can create their own products"
  on public.products for insert to authenticated
  with check (
    auth.uid() = seller_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('seller','distributor','retailer')
    )
  );
drop policy if exists "Sellers can update their own products" on public.products;
create policy "Sellers can update their own products"
  on public.products for update to authenticated
  using (auth.uid() = seller_id)
  with check (auth.uid() = seller_id);
drop policy if exists "Sellers can delete their own products" on public.products;
create policy "Sellers can delete their own products"
  on public.products for delete to authenticated
  using (auth.uid() = seller_id);

grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;

-- Verification decisions are written only by trusted server-side webhook code.
create table if not exists public.verification_cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  verification_type text not null check (verification_type in ('kyc','kyb')),
  provider text not null default 'sumsub',
  provider_applicant_id text,
  status text not null default 'pending'
    check (status in ('pending','verified','rejected','on_hold')),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, verification_type)
);

create index if not exists verification_cases_user_idx
  on public.verification_cases(user_id, created_at desc);
drop trigger if exists verification_cases_set_updated_at on public.verification_cases;
create trigger verification_cases_set_updated_at
before update on public.verification_cases
for each row execute function public.set_updated_at();

alter table public.verification_cases enable row level security;
drop policy if exists "Users can view their own verification cases" on public.verification_cases;
create policy "Users can view their own verification cases"
  on public.verification_cases for select to authenticated
  using (auth.uid() = user_id);

grant select on public.verification_cases to authenticated;
revoke insert, update, delete on public.verification_cases from anon, authenticated;

-- No client-side wallet balance or transaction writes are granted by this migration.
