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
