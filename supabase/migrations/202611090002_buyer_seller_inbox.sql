-- ASKMarket buyer/seller inbox. Apply after 202611060002_marketplace_core.sql.
create extension if not exists pgcrypto;

create table if not exists public.marketplace_conversations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  buyer_id uuid not null references public.profiles(id) on delete restrict,
  seller_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  last_message_preview text not null default '',
  constraint marketplace_conversations_distinct_participants check (buyer_id <> seller_id),
  constraint marketplace_conversations_one_buyer_per_product unique (product_id, buyer_id)
);
create index if not exists marketplace_conversations_buyer_recent_idx
  on public.marketplace_conversations(buyer_id, last_message_at desc);
create index if not exists marketplace_conversations_seller_recent_idx
  on public.marketplace_conversations(seller_id, last_message_at desc);

create table if not exists public.marketplace_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.marketplace_conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete restrict,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index if not exists marketplace_messages_conversation_time_idx
  on public.marketplace_messages(conversation_id, created_at);

alter table public.marketplace_conversations enable row level security;
alter table public.marketplace_messages enable row level security;

drop policy if exists "Conversation participants can read their conversations" on public.marketplace_conversations;
create policy "Conversation participants can read their conversations"
  on public.marketplace_conversations for select to authenticated
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

drop policy if exists "Buyers can start a conversation for a published product" on public.marketplace_conversations;
create policy "Buyers can start a conversation for a published product"
  on public.marketplace_conversations for insert to authenticated
  with check (
    auth.uid() = buyer_id
    and buyer_id <> seller_id
    and exists (
      select 1 from public.products p
      where p.id = product_id
        and p.seller_id = seller_id
        and p.status = 'published'
    )
    and exists (
      select 1 from public.profiles buyer
      where buyer.id = auth.uid() and buyer.role = 'buyer'
    )
  );

drop policy if exists "Participants can read conversation messages" on public.marketplace_messages;
create policy "Participants can read conversation messages"
  on public.marketplace_messages for select to authenticated
  using (
    exists (
      select 1 from public.marketplace_conversations c
      where c.id = conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

drop policy if exists "Participants can send conversation messages" on public.marketplace_messages;
create policy "Participants can send conversation messages"
  on public.marketplace_messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.marketplace_conversations c
      where c.id = conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

grant select, insert on public.marketplace_conversations to authenticated;
grant select, insert on public.marketplace_messages to authenticated;
revoke update, delete on public.marketplace_conversations from anon, authenticated;
revoke update, delete on public.marketplace_messages from anon, authenticated;

-- Expose only safe display fields; never expose email, phone or street address.
create or replace view public.marketplace_member_directory
with (security_barrier = true)
as
  select id, full_name, business_name, role
  from public.profiles;
grant select on public.marketplace_member_directory to authenticated;

create or replace function public.touch_marketplace_conversation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.marketplace_conversations
     set last_message_at = new.created_at,
         last_message_preview = left(new.body, 160)
   where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists marketplace_message_touch_conversation on public.marketplace_messages;
create trigger marketplace_message_touch_conversation
after insert on public.marketplace_messages
for each row execute function public.touch_marketplace_conversation();

-- Enable Realtime delivery where the Supabase publication is available.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'marketplace_messages'
     ) then
    alter publication supabase_realtime add table public.marketplace_messages;
  end if;
end $$;
