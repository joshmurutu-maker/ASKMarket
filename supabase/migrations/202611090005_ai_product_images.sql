-- AI-generated product image storage. Apply to staging before production.
alter table public.products add column if not exists image_url text;
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('product-images','product-images',true,12582912,array['image/png'])
on conflict (id) do update set public=true,file_size_limit=12582912,allowed_mime_types=array['image/png'];
drop policy if exists "Sellers upload own product images" on storage.objects;
create policy "Sellers upload own product images"
on storage.objects for insert to authenticated
with check (
  bucket_id='product-images'
  and (storage.foldername(name))[1]=auth.uid()::text
  and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('seller','distributor','retailer'))
);
drop policy if exists "Public can view product images" on storage.objects;
create policy "Public can view product images"
on storage.objects for select to public
using (bucket_id='product-images');

-- Durable per-user generation quota: five images per rolling 24 hours.
create table if not exists public.ai_product_image_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists ai_product_image_usage_user_time_idx
  on public.ai_product_image_usage(user_id, created_at desc);
alter table public.ai_product_image_usage enable row level security;
revoke all on public.ai_product_image_usage from anon, authenticated;

create or replace function public.consume_product_image_quota()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  used_count integer;
  caller uuid := auth.uid();
begin
  if caller is null then return false; end if;
  perform pg_advisory_xact_lock(hashtextextended(caller::text, 0));
  select count(*) into used_count
  from public.ai_product_image_usage
  where user_id = caller and created_at > now() - interval '24 hours';
  if used_count >= 5 then return false; end if;
  insert into public.ai_product_image_usage(user_id) values (caller);
  return true;
end;
$$;
revoke all on function public.consume_product_image_quota() from public, anon;
grant execute on function public.consume_product_image_quota() to authenticated;
