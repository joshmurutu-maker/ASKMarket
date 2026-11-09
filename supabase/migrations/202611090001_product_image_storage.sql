-- Durable seller product photos and public marketplace image delivery.
-- Apply this migration to the linked Supabase project before deploying the API changes.

alter table public.products
  add column if not exists image_url text;

create index if not exists products_published_created_idx
  on public.products(status, created_at desc);

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
