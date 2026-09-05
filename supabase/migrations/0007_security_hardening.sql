-- Final explicit RLS hardening. This migration is non-destructive and safe to re-run.
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.digital_inventory enable row level security;

-- Profiles: users can see/update their own profile without changing their role; admins can manage all.
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select p.role from public.profiles p where p.id = auth.uid()));
drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- Products: public catalog access is limited to published rows; all writes are admin-only.
drop policy if exists "products_public_read_published" on public.products;
create policy "products_public_read_published" on public.products
  for select using (published = true or public.is_admin());
drop policy if exists "products_admin_all" on public.products;
create policy "products_admin_all" on public.products
  for all using (public.is_admin()) with check (public.is_admin());

-- Orders, items, and payments are isolated by the owning user; only admins can mutate them.
drop policy if exists "orders_select_own" on public.orders;
create policy "orders_select_own" on public.orders
  for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "orders_admin_update" on public.orders;
create policy "orders_admin_update" on public.orders
  for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "order_items_select_own" on public.order_items;
create policy "order_items_select_own" on public.order_items
  for select using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())));
drop policy if exists "payments_select_own" on public.payments;
create policy "payments_select_own" on public.payments
  for select using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())));
drop policy if exists "payments_admin_update" on public.payments;
create policy "payments_admin_update" on public.payments
  for update using (public.is_admin()) with check (public.is_admin());

-- Credentials are only visible after assignment to the authenticated owner or to admins.
drop policy if exists "digital_inventory_admin_all" on public.digital_inventory;
create policy "digital_inventory_admin_all" on public.digital_inventory
  for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "digital_inventory_customer_own" on public.digital_inventory;
create policy "digital_inventory_customer_own" on public.digital_inventory
  for select using (delivered_to = auth.uid() and status = 'delivered');

-- Receipts stay private. Uploads happen only through the trusted server action using service_role.
insert into storage.buckets (id, name, public)
values ('payment-receipts', 'payment-receipts', false)
on conflict (id) do update set public = false;
drop policy if exists "payment_receipts_admin_all" on storage.objects;
create policy "payment_receipts_admin_all" on storage.objects
  for all using (bucket_id = 'payment-receipts' and public.is_admin())
  with check (bucket_id = 'payment-receipts' and public.is_admin());