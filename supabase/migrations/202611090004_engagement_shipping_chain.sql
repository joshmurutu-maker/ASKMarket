-- Community, shipping and on-chain activity foundation.
-- Apply only to a staging Supabase project after reviewing the economic-engine migration.
-- This migration creates data structures and access controls; it does NOT activate
-- carrier booking, payments, token transfers, smart contracts or production settlement.

create extension if not exists pgcrypto;

-- Seller-published delivery options. Fees are quoted server-side and snapshotted
-- into orders; clients must not calculate or settle shipping charges authoritatively.
create table if not exists public.seller_shipping_options (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete restrict,
  name text not null check (char_length(name) between 2 and 80),
  carrier_name text,
  service_level text not null default 'standard'
    check (service_level in ('standard','express','same_day','pickup')),
  currency text not null default 'KES' check (currency in ('KES','USD')),
  base_fee numeric(18,2) not null default 0 check (base_fee >= 0),
  fee_per_kg numeric(18,2) not null default 0 check (fee_per_kg >= 0),
  free_shipping_threshold numeric(18,2) check (free_shipping_threshold is null or free_shipping_threshold >= 0),
  estimated_min_days integer not null default 2 check (estimated_min_days between 0 and 90),
  estimated_max_days integer not null default 5 check (estimated_max_days between estimated_min_days and 120),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists seller_shipping_options_seller_idx
  on public.seller_shipping_options(seller_id, enabled);
drop trigger if exists seller_shipping_options_set_updated_at on public.seller_shipping_options;
create trigger seller_shipping_options_set_updated_at
before update on public.seller_shipping_options
for each row execute function public.set_updated_at();

alter table public.seller_shipping_options enable row level security;
drop policy if exists "Shipping options are publicly readable when enabled" on public.seller_shipping_options;
create policy "Shipping options are publicly readable when enabled"
  on public.seller_shipping_options for select
  using (enabled or auth.uid() = seller_id);
drop policy if exists "Sellers manage own shipping options" on public.seller_shipping_options;
create policy "Sellers manage own shipping options"
  on public.seller_shipping_options for all to authenticated
  using (auth.uid() = seller_id)
  with check (
    auth.uid() = seller_id and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('seller','distributor','retailer')
    )
  );
grant select on public.seller_shipping_options to anon, authenticated;
grant insert, update, delete on public.seller_shipping_options to authenticated;

-- Buyer-visible quote snapshot. Only trusted server code may issue or expire a quote.
create table if not exists public.delivery_quotes (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id) on delete restrict,
  seller_id uuid not null references public.profiles(id) on delete restrict,
  shipping_option_id uuid references public.seller_shipping_options(id) on delete set null,
  currency text not null check (currency in ('KES','USD')),
  item_subtotal numeric(18,2) not null check (item_subtotal >= 0),
  shipping_fee numeric(18,2) not null check (shipping_fee >= 0),
  tax_amount numeric(18,2) not null default 0 check (tax_amount >= 0),
  total_amount numeric(18,2) not null check (total_amount = item_subtotal + shipping_fee + tax_amount),
  destination_region text not null,
  estimated_min_days integer not null check (estimated_min_days between 0 and 90),
  estimated_max_days integer not null check (estimated_max_days between estimated_min_days and 120),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists delivery_quotes_buyer_created_idx
  on public.delivery_quotes(buyer_id, created_at desc);
alter table public.delivery_quotes enable row level security;
drop policy if exists "Participants can view own delivery quotes" on public.delivery_quotes;
create policy "Participants can view own delivery quotes"
  on public.delivery_quotes for select to authenticated
  using (auth.uid() = buyer_id or auth.uid() = seller_id);
revoke insert, update, delete on public.delivery_quotes from anon, authenticated;
grant select on public.delivery_quotes to authenticated;

-- Shipment and tracking timeline. Provider updates are server-side only.
create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null,
  buyer_id uuid not null references public.profiles(id) on delete restrict,
  seller_id uuid not null references public.profiles(id) on delete restrict,
  carrier_name text,
  tracking_number text,
  tracking_url text,
  status text not null default 'pending'
    check (status in ('pending','label_created','picked_up','in_transit','out_for_delivery','delivered','delivery_failed','returned','cancelled')),
  shipping_fee numeric(18,2) not null check (shipping_fee >= 0),
  currency text not null check (currency in ('KES','USD')),
  dispatched_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists shipments_buyer_created_idx on public.shipments(buyer_id, created_at desc);
create index if not exists shipments_seller_created_idx on public.shipments(seller_id, created_at desc);
drop trigger if exists shipments_set_updated_at on public.shipments;
create trigger shipments_set_updated_at
before update on public.shipments
for each row execute function public.set_updated_at();
alter table public.shipments enable row level security;
drop policy if exists "Shipment participants can view shipment" on public.shipments;
create policy "Shipment participants can view shipment"
  on public.shipments for select to authenticated
  using (auth.uid() = buyer_id or auth.uid() = seller_id);
revoke insert, update, delete on public.shipments from anon, authenticated;
grant select on public.shipments to authenticated;

create table if not exists public.shipment_events (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete restrict,
  status text not null check (status in ('pending','label_created','picked_up','in_transit','out_for_delivery','delivered','delivery_failed','returned','cancelled')),
  location_label text,
  description text not null default '',
  source text not null default 'platform' check (source in ('platform','carrier_webhook','admin')),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists shipment_events_timeline_idx
  on public.shipment_events(shipment_id, occurred_at);
alter table public.shipment_events enable row level security;
drop policy if exists "Shipment participants can view tracking events" on public.shipment_events;
create policy "Shipment participants can view tracking events"
  on public.shipment_events for select to authenticated
  using (exists (
    select 1 from public.shipments s
    where s.id = shipment_id and (s.buyer_id = auth.uid() or s.seller_id = auth.uid())
  ));
revoke insert, update, delete on public.shipment_events from anon, authenticated;
grant select on public.shipment_events to authenticated;

-- Community discussions. Posts/comments are user-generated and must be moderated.
create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete restrict,
  product_id uuid references public.products(id) on delete set null,
  title text not null check (char_length(title) between 3 and 180),
  body text not null check (char_length(body) between 1 and 10000),
  status text not null default 'published'
    check (status in ('published','hidden','removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists community_posts_created_idx on public.community_posts(status, created_at desc);
drop trigger if exists community_posts_set_updated_at on public.community_posts;
create trigger community_posts_set_updated_at
before update on public.community_posts
for each row execute function public.set_updated_at();
alter table public.community_posts enable row level security;
drop policy if exists "Published community posts are readable" on public.community_posts;
create policy "Published community posts are readable"
  on public.community_posts for select
  using (status = 'published' or auth.uid() = author_id);
drop policy if exists "Users create own community posts" on public.community_posts;
create policy "Users create own community posts"
  on public.community_posts for insert to authenticated
  with check (auth.uid() = author_id);
drop policy if exists "Authors edit own community posts" on public.community_posts;
create policy "Authors edit own community posts"
  on public.community_posts for update to authenticated
  using (auth.uid() = author_id and status <> 'removed')
  with check (auth.uid() = author_id and status in ('published','hidden'));
grant select on public.community_posts to anon, authenticated;
grant insert, update on public.community_posts to authenticated;

create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete restrict,
  author_id uuid not null references public.profiles(id) on delete restrict,
  body text not null check (char_length(body) between 1 and 4000),
  status text not null default 'published' check (status in ('published','hidden','removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists community_comments_post_created_idx
  on public.community_comments(post_id, created_at);
drop trigger if exists community_comments_set_updated_at on public.community_comments;
create trigger community_comments_set_updated_at
before update on public.community_comments
for each row execute function public.set_updated_at();
alter table public.community_comments enable row level security;
drop policy if exists "Published comments are readable" on public.community_comments;
create policy "Published comments are readable"
  on public.community_comments for select
  using (status = 'published' or auth.uid() = author_id);
drop policy if exists "Users comment on published posts" on public.community_comments;
create policy "Users comment on published posts"
  on public.community_comments for insert to authenticated
  with check (
    auth.uid() = author_id and exists (
      select 1 from public.community_posts p
      where p.id = post_id and p.status = 'published'
    )
  );
drop policy if exists "Authors edit own comments" on public.community_comments;
create policy "Authors edit own comments"
  on public.community_comments for update to authenticated
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);
grant select on public.community_comments to anon, authenticated;
grant insert, update on public.community_comments to authenticated;

-- Reviews are created only by trusted server code after verifying a completed order.
create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  seller_id uuid not null references public.profiles(id) on delete restrict,
  buyer_id uuid not null references public.profiles(id) on delete restrict,
  order_id uuid not null,
  rating smallint not null check (rating between 1 and 5),
  review_text text not null default '' check (char_length(review_text) <= 3000),
  verified_purchase boolean not null default false check (verified_purchase = true),
  status text not null default 'published' check (status in ('published','hidden','removed')),
  created_at timestamptz not null default now(),
  unique(order_id, product_id, buyer_id)
);
create index if not exists product_reviews_product_created_idx
  on public.product_reviews(product_id, status, created_at desc);
alter table public.product_reviews enable row level security;
drop policy if exists "Published product reviews are readable" on public.product_reviews;
create policy "Published product reviews are readable"
  on public.product_reviews for select
  using (status = 'published' or auth.uid() = buyer_id or auth.uid() = seller_id);
revoke insert, update, delete on public.product_reviews from anon, authenticated;
grant select on public.product_reviews to anon, authenticated;

-- On-chain activity index: stores public transaction/event metadata only.
-- It never stores seed phrases, private keys, signing material or custody secrets.
create table if not exists public.onchain_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  chain_id bigint not null check (chain_id > 0),
  transaction_hash text not null check (transaction_hash ~ '^0x[0-9a-fA-F]{64}$'),
  event_type text not null
    check (event_type in ('order_anchor','shipment_anchor','review_attestation','wallet_deposit','wallet_withdrawal','wallet_transfer')),
  contract_address text check (contract_address is null or contract_address ~ '^0x[0-9a-fA-F]{40}$'),
  event_reference uuid,
  block_number bigint check (block_number is null or block_number >= 0),
  confirmations integer not null default 0 check (confirmations >= 0),
  status text not null default 'submitted'
    check (status in ('submitted','confirmed','failed','reorged')),
  explorer_url text,
  occurred_at timestamptz,
  created_at timestamptz not null default now(),
  unique(chain_id, transaction_hash, event_type)
);
create index if not exists onchain_activity_user_created_idx
  on public.onchain_activity(user_id, created_at desc);
create index if not exists onchain_activity_reference_idx
  on public.onchain_activity(event_reference) where event_reference is not null;
alter table public.onchain_activity enable row level security;
drop policy if exists "Users view own onchain activity" on public.onchain_activity;
create policy "Users view own onchain activity"
  on public.onchain_activity for select to authenticated
  using (auth.uid() = user_id);
revoke insert, update, delete on public.onchain_activity from anon, authenticated;
grant select on public.onchain_activity to authenticated;

-- Append-only engagement events for operational analytics. No message or payment
-- secrets should be written here; event properties must be schema-validated server-side.
create table if not exists public.marketplace_engagement_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null check (event_type in (
    'product_view','search','add_to_cart','checkout_started','order_completed',
    'community_post_created','community_comment_created','review_published',
    'shipping_quote_viewed','shipment_delivered'
  )),
  entity_id uuid,
  category text,
  occurred_at timestamptz not null default now(),
  properties jsonb not null default '{}'::jsonb
);
create index if not exists marketplace_engagement_events_type_time_idx
  on public.marketplace_engagement_events(event_type, occurred_at desc);
create index if not exists marketplace_engagement_events_actor_time_idx
  on public.marketplace_engagement_events(actor_id, occurred_at desc);
alter table public.marketplace_engagement_events enable row level security;
revoke all on public.marketplace_engagement_events from anon, authenticated;

-- Explicitly deny browser writes to quote, shipment, review, chain and analytics
-- records. Server endpoints must authenticate, authorize, validate, rate-limit,
-- and audit each write before using the service role.
