-- Manual Algerian payments, private receipts, subscription metadata, and digital inventory.
do $$ begin alter type public.payment_provider add value if not exists 'flexy'; exception when duplicate_object then null; end $$;
do $$ begin alter type public.payment_status add value if not exists 'under_review'; exception when duplicate_object then null; end $$;
do $$ begin alter type public.payment_status add value if not exists 'rejected'; exception when duplicate_object then null; end $$;
do $$ begin alter type public.order_status add value if not exists 'processing'; exception when duplicate_object then null; end $$;
do $$ begin alter type public.order_status add value if not exists 'completed'; exception when duplicate_object then null; end $$;

alter table public.products
  add column if not exists account_type text not null default 'shared_profile',
  add column if not exists duration_value integer,
  add column if not exists duration_unit text;

alter table public.products drop constraint if exists products_account_type_check;
alter table public.products add constraint products_account_type_check
  check (account_type in ('shared_profile', 'full_private_account'));
alter table public.products drop constraint if exists products_duration_check;
alter table public.products add constraint products_duration_check
  check (duration_value is null or duration_value > 0);

alter table public.orders
  add column if not exists payment_method public.payment_provider,
  add column if not exists payment_status public.payment_status not null default 'pending';

alter table public.payments
  add column if not exists receipt_path text,
  add column if not exists transaction_reference text,
  add column if not exists customer_phone text;

create table if not exists public.digital_inventory (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  email text,
  password text,
  profile_name text,
  pin text,
  activation_code text,
  activation_link text,
  instructions text,
  status text not null default 'available' check (status in ('available', 'reserved', 'sold', 'delivered')),
  order_id uuid references public.orders(id) on delete set null,
  delivered_to uuid references public.profiles(id) on delete set null,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists digital_inventory_product_status_idx on public.digital_inventory(product_id, status);
create index if not exists digital_inventory_order_idx on public.digital_inventory(order_id);

alter table public.digital_inventory enable row level security;
drop policy if exists "digital_inventory_admin_all" on public.digital_inventory;
create policy "digital_inventory_admin_all" on public.digital_inventory
  for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "digital_inventory_customer_own" on public.digital_inventory;
create policy "digital_inventory_customer_own" on public.digital_inventory
  for select using (delivered_to = auth.uid());

-- These fields are safe catalog metadata; credential fields remain in digital_inventory.
revoke select on public.products from anon, authenticated;
grant select (
  id, name, slug, description, short_description, price, compare_price,
  category_id, file_name, file_type, file_size, version, tags, subscription_type,
  account_type, duration_value, duration_unit, featured, published, sales_count,
  rating_avg, rating_count, created_at, updated_at
) on public.products to anon, authenticated;

update public.products
set duration_value = 1, duration_unit = 'month', account_type = case
  when slug in ('shahid-vip', 'disney-plus', 'canva-pro') then 'full_private_account'
  else 'shared_profile'
end
where slug in ('netflix-premium', 'shahid-vip', 'prime-video', 'disney-plus', 'chatgpt-plus', 'canva-pro');

insert into storage.buckets (id, name, public)
values ('payment-receipts', 'payment-receipts', false)
on conflict (id) do update set public = false;

drop policy if exists "payment_receipts_admin_all" on storage.objects;
create policy "payment_receipts_admin_all" on storage.objects
  for all using (bucket_id = 'payment-receipts' and public.is_admin())
  with check (bucket_id = 'payment-receipts' and public.is_admin());

-- Receipts are uploaded by the trusted checkout action and never exposed to browser roles.
revoke select on public.payments from anon, authenticated;
grant select on public.payments to authenticated;