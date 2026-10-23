-- Allow public reads for product images
create policy "Public read access for product images"
on storage.objects
for select
using (bucket_id = 'products');

-- Allow authenticated users to upload images to the products bucket
create policy "Authenticated users can upload product images"
on storage.objects
for insert
with check (
  bucket_id = 'products'
  and auth.role() = 'authenticated'
);

-- Allow authenticated users to update product images
create policy "Authenticated users can update product images"
on storage.objects
for update
using (
  bucket_id = 'products'
  and auth.role() = 'authenticated'
)
with check (
  bucket_id = 'products'
  and auth.role() = 'authenticated'
);

-- Allow authenticated users to delete product images
create policy "Authenticated users can delete product images"
on storage.objects
for delete
using (
  bucket_id = 'products'
  and auth.role() = 'authenticated'
);

-- Allow signed-in users to add products to each catalog table
create policy "Authenticated users can insert category products"
on public.cat_products
for insert
to authenticated
with check (true);

create policy "Authenticated users can insert new products"
on public.new_products
for insert
to authenticated
with check (true);

create policy "Authenticated users can insert popular products"
on public.pop_products
for insert
to authenticated
with check (true);
