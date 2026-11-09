-- Durable seller listings and product image storage.
-- Seller submissions are private to their owner until approved by a trusted moderation process.

create or replace function public.protect_seller_role_from_self_change()
returns trigger language plpgsql
as $$
begin
  if auth.uid() is not null and new.role is distinct from old.role then
    raise exception 'Account role changes require trusted review';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_seller_role on public.profiles;
create trigger profiles_protect_seller_role
before update on public.profiles
for each row execute function public.protect_seller_role_from_self_change();

create table if not exists public.seller_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 160),
  description text not null default '',
  category text not null,
  price numeric(18,2) not null check (price > 0),
  currency text not null default 'KES' check (currency in ('KES','USD')),
  quantity integer not null default 0 check (quantity >= 0),
  image_url text,
  status text not null default 'pending_review'
    check (status in ('pending_review','published','rejected','archived')),
  moderation_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists seller_listings_public_idx
  on public.seller_listings(status, created_at desc);
create index if not exists seller_listings_owner_idx
  on public.seller_listings(seller_id, created_at desc);

create or replace function public.guard_seller_listing_moderation()
returns trigger language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.status := 'pending_review';
    new.moderation_note := null;
    new.reviewed_at := null;
  else
    new.status := old.status;
    new.moderation_note := old.moderation_note;
    new.reviewed_at := old.reviewed_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists seller_listings_moderation_guard on public.seller_listings;
create trigger seller_listings_moderation_guard
before insert or update on public.seller_listings
for each row execute function public.guard_seller_listing_moderation();

alter table public.seller_listings enable row level security;
drop policy if exists "Public can view approved seller listings" on public.seller_listings;
create policy "Public can view approved seller listings"
  on public.seller_listings for select to anon, authenticated
  using (status = 'published');
drop policy if exists "Sellers can view their own listings" on public.seller_listings;
create policy "Sellers can view their own listings"
  on public.seller_listings for select to authenticated
  using (seller_id = auth.uid());
drop policy if exists "Seller roles can create their own listings" on public.seller_listings;
create policy "Seller roles can create their own listings"
  on public.seller_listings for insert to authenticated
  with check (
    seller_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('seller','distributor','retailer')
    )
  );
drop policy if exists "Sellers can update their own listing details" on public.seller_listings;
create policy "Sellers can update their own listing details"
  on public.seller_listings for update to authenticated
  using (seller_id = auth.uid())
  with check (seller_id = auth.uid());
drop policy if exists "Sellers can delete their own listings" on public.seller_listings;
create policy "Sellers can delete their own listings"
  on public.seller_listings for delete to authenticated
  using (seller_id = auth.uid());

grant select on public.seller_listings to anon, authenticated;
grant insert, update, delete on public.seller_listings to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  8388608,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view marketplace product photos" on storage.objects;
create policy "Public can view marketplace product photos"
  on storage.objects for select
  using (bucket_id = 'product-images');

drop policy if exists "Sellers upload photos to their own folder" on storage.objects;
create policy "Sellers upload photos to their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Sellers update photos in their own folder" on storage.objects;
create policy "Sellers update photos in their own folder"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Sellers delete photos in their own folder" on storage.objects;
create policy "Sellers delete photos in their own folder"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

grant usage on schema storage to anon, authenticated;
grant select on storage.objects to anon, authenticated;
grant insert, update, delete on storage.objects to authenticated;
