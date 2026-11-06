-- ASKMarket wallet foundation.
-- Apply only after reviewing in the linked Supabase project. No client-side balance writes.
create extension if not exists pgcrypto;

create table if not exists public.wallet_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  asset_code text not null check (asset_code in ('KES','USDT','USDC','ETH','BTC')),
  available_balance numeric(30, 10) not null default 0 check (available_balance >= 0),
  reserved_balance numeric(30, 10) not null default 0 check (reserved_balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, asset_code)
);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.wallet_accounts(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  direction text not null check (direction in ('credit','debit','reserve','release')),
  method text not null check (method in ('mpesa','crypto','internal','adjustment')),
  asset_code text not null check (asset_code in ('KES','USDT','USDC','ETH','BTC')),
  amount numeric(30, 10) not null check (amount > 0),
  status text not null check (status in ('pending','processing','settled','failed','reversed','cancelled')),
  provider_reference text,
  idempotency_key text not null unique,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  settled_at timestamptz
);

create index if not exists wallet_transactions_user_created_idx
  on public.wallet_transactions(user_id, created_at desc);
create index if not exists wallet_transactions_provider_ref_idx
  on public.wallet_transactions(provider_reference) where provider_reference is not null;

alter table public.wallet_accounts enable row level security;
alter table public.wallet_transactions enable row level security;

drop policy if exists "Users can view own wallet accounts" on public.wallet_accounts;
create policy "Users can view own wallet accounts"
  on public.wallet_accounts for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can view own wallet transactions" on public.wallet_transactions;
create policy "Users can view own wallet transactions"
  on public.wallet_transactions for select to authenticated
  using (auth.uid() = user_id);

-- No authenticated INSERT/UPDATE/DELETE policies are intentionally defined.
-- Only trusted server-side services using the Supabase service role may write.
revoke insert, update, delete on public.wallet_accounts from anon, authenticated;
revoke insert, update, delete on public.wallet_transactions from anon, authenticated;
grant select on public.wallet_accounts, public.wallet_transactions to authenticated;
