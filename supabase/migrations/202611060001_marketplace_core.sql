-- ASKMarket marketplace foundation
-- Apply only after reviewing this migration in a non-production Supabase project.
-- Financial writes and verification decisions are server/provider-only; browser clients never write ledger entries.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  role text not null default 'buyer' check (role in ('buyer','seller','distributor','retailer')),
  phone text,
  address text,
  country_code char(2) not null default 'KE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  display_name text not null,
  registration_number text,
  country_code char(2) not null,
  verification_status text not null default 'pending'
    check (verification_status in ('pending','in_review','approved','rejected','suspended')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  member_role text not null default 'owner' check (member_role in ('owner','admin','catalog_manager','fulfilment')),
  status text not null default 'active' check (status in ('invited','active','suspended')),
  created_at timestamptz not null default now(),
  unique (business_id, user_id)
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  sku text,
  name text not null check (length(trim(name)) between 2 and 180),
  description text not null default '',
  category text not null,
  currency char(3) not null default 'KES',
  unit_price_minor bigint not null check (unit_price_minor > 0),
  available_quantity integer not null default 0 check (available_quantity >= 0),
  minimum_order_quantity integer not null default 1 check (minimum_order_quantity > 0),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  moderation_status text not null default 'pending' check (moderation_status in ('pending','approved','rejected')),
  image_urls text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  buyer_id uuid not null references auth.users(id),
  seller_business_id uuid not null references public.businesses(id),
  status text not null default 'pending_payment'
    check (status in ('pending_payment','paid','processing','shipped','delivered','cancelled','refunded','disputed')),
  currency char(3) not null,
  subtotal_minor bigint not null check (subtotal_minor >= 0),
  shipping_minor bigint not null default 0 check (shipping_minor >= 0),
  platform_fee_minor bigint not null default 0 check (platform_fee_minor >= 0),
  total_minor bigint not null check (total_minor >= 0),
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (buyer_id, idempotency_key)
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id),
  product_name_snapshot text not null,
  sku_snapshot text,
  quantity integer not null check (quantity > 0),
  unit_price_minor bigint not null check (unit_price_minor > 0),
  line_total_minor bigint not null check (line_total_minor > 0)
);

create table if not exists public.payment_intents (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  provider text not null,
  provider_reference text unique,
  status text not null default 'created'
    check (status in ('created','requires_action','processing','succeeded','failed','cancelled','refunded')),
  amount_minor bigint not null check (amount_minor > 0),
  currency char(3) not null,
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ledger_accounts (
  id uuid primary key default gen_random_uuid(),
  account_type text not null check (account_type in ('customer_payable','seller_payable','platform_revenue','payment_clearing','refund_reserve')),
  user_id uuid references auth.users(id),
  business_id uuid references public.businesses(id),
  currency char(3) not null,
  created_at timestamptz not null default now(),
  check (num_nonnulls(user_id, business_id) <= 1)
);

create table if not exists public.ledger_transactions (
  id uuid primary key default gen_random_uuid(),
  reference_type text not null,
  reference_id uuid,
  provider_event_id text unique,
  description text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.ledger_transactions(id),
  account_id uuid not null references public.ledger_accounts(id),
  direction text not null check (direction in ('debit','credit')),
  amount_minor bigint not null check (amount_minor > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.verification_cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  business_id uuid references public.businesses(id),
  provider text not null,
  provider_applicant_id text,
  verification_type text not null check (verification_type in ('kyc','kyb')),
  status text not null default 'not_started'
    check (status in ('not_started','pending','in_review','approved','rejected','expired','needs_information')),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.provider_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  signature_verified boolean not null default false,
  payload_hash text not null,
  processed_at timestamptz,
  received_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id),
  action text not null,
  resource_type text not null,
  resource_id text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists products_public_catalog_idx on public.products (status, moderation_status, category);
create index if not exists products_business_idx on public.products (business_id, created_at desc);
create index if not exists orders_buyer_idx on public.orders (buyer_id, created_at desc);
create index if not exists orders_seller_idx on public.orders (seller_business_id, created_at desc);
create index if not exists ledger_entries_account_idx on public.ledger_entries (account_id, created_at desc);
create index if not exists verification_cases_user_idx on public.verification_cases (user_id, verification_type, status);

create or replace function public.askmarket_is_business_member(target_business uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.business_members m
    where m.business_id = target_business and m.user_id = auth.uid() and m.status = 'active'
  );
$$;

create or replace function public.askmarket_is_business_approved(target_business uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.businesses b
    where b.id = target_business and b.verification_status = 'approved'
  );
$$;

create or replace function public.askmarket_create_profile()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (user_id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    case when new.raw_user_meta_data->>'role' in ('buyer','seller','distributor','retailer')
      then new.raw_user_meta_data->>'role' else 'buyer' end
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists askmarket_auth_user_profile on auth.users;
create trigger askmarket_auth_user_profile
after insert on auth.users
for each row execute function public.askmarket_create_profile();

create or replace function public.askmarket_lock_product_moderation()
returns trigger language plpgsql set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    new.moderation_status := 'pending';
    new.status := 'draft';
  else
    new.moderation_status := old.moderation_status;
    if old.status = 'published' and new.status <> 'archived' then
      new.status := 'published';
    elsif new.status not in ('draft','archived') then
      new.status := old.status;
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists askmarket_product_moderation_guard on public.products;
create trigger askmarket_product_moderation_guard
before insert or update on public.products
for each row execute function public.askmarket_lock_product_moderation();

create or replace function public.askmarket_assert_balanced_ledger()
returns trigger language plpgsql set search_path = public, pg_temp
as $$
declare
  debit_total numeric;
  credit_total numeric;
  entry_count integer;
begin
  select
    coalesce(sum(amount_minor) filter (where direction = 'debit'), 0),
    coalesce(sum(amount_minor) filter (where direction = 'credit'), 0),
    count(*)
  into debit_total, credit_total, entry_count
  from public.ledger_entries
  where transaction_id = new.transaction_id;

  if entry_count < 2 or debit_total <> credit_total then
    raise exception 'Ledger transaction % is not balanced', new.transaction_id;
  end if;
  return null;
end;
$$;

drop trigger if exists askmarket_ledger_balance_guard on public.ledger_entries;
create constraint trigger askmarket_ledger_balance_guard
after insert on public.ledger_entries
deferrable initially deferred
for each row execute function public.askmarket_assert_balanced_ledger();

alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payment_intents enable row level security;
alter table public.ledger_accounts enable row level security;
alter table public.ledger_transactions enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.verification_cases enable row level security;
alter table public.provider_webhook_events enable row level security;
alter table public.audit_events enable row level security;

drop policy if exists "profiles_read_own" on public.profiles;
create policy "profiles_read_own" on public.profiles for select to authenticated using (user_id = auth.uid());
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "business_members_read" on public.business_members;
create policy "business_members_read" on public.business_members for select to authenticated
using (user_id = auth.uid() or public.askmarket_is_business_member(business_id));
drop policy if exists "businesses_read_member" on public.businesses;
create policy "businesses_read_member" on public.businesses for select to authenticated
using (public.askmarket_is_business_member(id));

drop policy if exists "products_public_read" on public.products;
create policy "products_public_read" on public.products for select to anon, authenticated
using (status = 'published' and moderation_status = 'approved' and public.askmarket_is_business_approved(business_id));
drop policy if exists "products_member_read" on public.products;
create policy "products_member_read" on public.products for select to authenticated
using (public.askmarket_is_business_member(business_id));
drop policy if exists "products_member_insert" on public.products;
create policy "products_member_insert" on public.products for insert to authenticated
with check (public.askmarket_is_business_member(business_id) and public.askmarket_is_business_approved(business_id));
drop policy if exists "products_member_update" on public.products;
create policy "products_member_update" on public.products for update to authenticated
using (public.askmarket_is_business_member(business_id) and public.askmarket_is_business_approved(business_id))
with check (public.askmarket_is_business_member(business_id) and public.askmarket_is_business_approved(business_id));

drop policy if exists "orders_party_read" on public.orders;
create policy "orders_party_read" on public.orders for select to authenticated
using (buyer_id = auth.uid() or public.askmarket_is_business_member(seller_business_id));
drop policy if exists "order_items_party_read" on public.order_items;
create policy "order_items_party_read" on public.order_items for select to authenticated
using (exists (
  select 1 from public.orders o where o.id = order_id
  and (o.buyer_id = auth.uid() or public.askmarket_is_business_member(o.seller_business_id))
));
drop policy if exists "payment_intents_party_read" on public.payment_intents;
create policy "payment_intents_party_read" on public.payment_intents for select to authenticated
using (exists (
  select 1 from public.orders o where o.id = order_id
  and (o.buyer_id = auth.uid() or public.askmarket_is_business_member(o.seller_business_id))
));

drop policy if exists "ledger_accounts_owner_read" on public.ledger_accounts;
create policy "ledger_accounts_owner_read" on public.ledger_accounts for select to authenticated
using (
  user_id = auth.uid() or
  (business_id is not null and public.askmarket_is_business_member(business_id))
);
drop policy if exists "ledger_entries_owner_read" on public.ledger_entries;
create policy "ledger_entries_owner_read" on public.ledger_entries for select to authenticated
using (exists (
  select 1 from public.ledger_accounts a where a.id = account_id
  and (a.user_id = auth.uid() or (a.business_id is not null and public.askmarket_is_business_member(a.business_id)))
));

drop policy if exists "verification_cases_read_own" on public.verification_cases;
create policy "verification_cases_read_own" on public.verification_cases for select to authenticated
using (user_id = auth.uid() or (business_id is not null and public.askmarket_is_business_member(business_id)));

-- Intentionally no browser write policies for orders, payment intents, ledger, verification,
-- provider webhook events or audit events. Use authenticated server routes with service-role
-- credentials stored only in server-side environment variables.
