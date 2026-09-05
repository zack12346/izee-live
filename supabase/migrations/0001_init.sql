-- DigiSouq marketplace schema, storage, triggers, and RLS

create extension if not exists "pgcrypto";

do $$ begin
  create type public.user_role as enum ('customer', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_status as enum ('pending', 'paid', 'failed', 'cancelled', 'refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum ('pending', 'confirmed', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_provider as enum ('test', 'manual', 'cib', 'edahabia', 'baridimob', 'ccp', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.coupon_type as enum ('percentage', 'fixed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.review_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text,
  avatar_url text,
  phone text,
  role public.user_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  parent_id uuid references public.categories (id) on delete set null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  short_description text not null default '',
  price numeric(12, 2) not null check (price >= 0),
  compare_price numeric(12, 2) check (compare_price is null or compare_price >= 0),
  category_id uuid references public.categories (id) on delete set null,
  file_path text,
  file_name text,
  file_type text not null default 'other',
  file_size bigint not null default 0 check (file_size >= 0),
  version text not null default '1.0',
  tags text[] not null default '{}',
  featured boolean not null default false,
  published boolean not null default false,
  sales_count integer not null default 0 check (sales_count >= 0),
  rating_avg numeric(3, 2) not null default 0 check (rating_avg >= 0 and rating_avg <= 5),
  rating_count integer not null default 0 check (rating_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  url text not null,
  alt text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  type public.coupon_type not null,
  value numeric(12, 2) not null check (value >= 0),
  expires_at timestamptz,
  usage_limit integer,
  usage_count integer not null default 0 check (usage_count >= 0),
  min_order numeric(12, 2) not null default 0 check (min_order >= 0),
  active boolean not null default true,
  product_ids uuid[] not null default '{}',
  category_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coupons_percentage_max check (type <> 'percentage' or value <= 100)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete restrict,
  status public.order_status not null default 'pending',
  subtotal numeric(12, 2) not null default 0 check (subtotal >= 0),
  discount numeric(12, 2) not null default 0 check (discount >= 0),
  total numeric(12, 2) not null default 0 check (total >= 0),
  coupon_id uuid references public.coupons (id) on delete set null,
  coupon_code text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  name text not null,
  price numeric(12, 2) not null check (price >= 0),
  quantity integer not null default 1 check (quantity > 0),
  total numeric(12, 2) not null check (total >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  provider public.payment_provider not null,
  status public.payment_status not null default 'pending',
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null default 'DZD',
  reference text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.downloads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  download_count integer not null default 0 check (download_count >= 0),
  last_downloaded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, product_id, order_id)
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text not null default '',
  status public.review_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create table if not exists public.coupon_usage (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists products_published_idx on public.products (published, created_at desc);
create index if not exists products_featured_idx on public.products (featured) where featured = true;
create index if not exists products_category_idx on public.products (category_id);
create index if not exists products_tags_idx on public.products using gin (tags);
create index if not exists products_sales_idx on public.products (sales_count desc);
create index if not exists product_images_product_idx on public.product_images (product_id, sort_order);
create index if not exists orders_user_idx on public.orders (user_id, created_at desc);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists order_items_order_idx on public.order_items (order_id);
create index if not exists order_items_product_idx on public.order_items (product_id);
create index if not exists payments_order_idx on public.payments (order_id);
create index if not exists downloads_user_idx on public.downloads (user_id);
create index if not exists reviews_product_idx on public.reviews (product_id, status);
create index if not exists favorites_user_idx on public.favorites (user_id);
create index if not exists coupons_code_idx on public.coupons (code);
create index if not exists notifications_user_idx on public.notifications (user_id, read);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at before update on public.categories
for each row execute function public.set_updated_at();

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists coupons_set_updated_at on public.coupons;
create trigger coupons_set_updated_at before update on public.coupons
for each row execute function public.set_updated_at();

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at before update on public.orders
for each row execute function public.set_updated_at();

drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at before update on public.payments
for each row execute function public.set_updated_at();

drop trigger if exists reviews_set_updated_at on public.reviews;
create trigger reviews_set_updated_at before update on public.reviews
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.increment_product_sales(p_product_id uuid, p_quantity integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.products
  set sales_count = sales_count + greatest(p_quantity, 1)
  where id = p_product_id;
end;
$$;

create or replace function public.refresh_product_rating(p_product_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.products p
  set
    rating_avg = coalesce((
      select round(avg(r.rating)::numeric, 2)
      from public.reviews r
      where r.product_id = p_product_id and r.status = 'approved'
    ), 0),
    rating_count = (
      select count(*) from public.reviews r
      where r.product_id = p_product_id and r.status = 'approved'
    )
  where p.id = p_product_id;
end;
$$;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.downloads enable row level security;
alter table public.reviews enable row level security;
alter table public.favorites enable row level security;
alter table public.coupons enable row level security;
alter table public.coupon_usage enable row level security;
alter table public.notifications enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.site_settings enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id and role = (select p.role from public.profiles p where p.id = auth.uid()));

drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "categories_public_read" on public.categories;
create policy "categories_public_read" on public.categories
  for select using (true);

drop policy if exists "categories_admin_all" on public.categories;
create policy "categories_admin_all" on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "products_public_read_published" on public.products;
create policy "products_public_read_published" on public.products
  for select using (published = true or public.is_admin());

drop policy if exists "products_admin_all" on public.products;
create policy "products_admin_all" on public.products
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "product_images_public_read" on public.product_images;
create policy "product_images_public_read" on public.product_images
  for select using (
    exists (
      select 1 from public.products p
      where p.id = product_id and (p.published = true or public.is_admin())
    )
  );

drop policy if exists "product_images_admin_all" on public.product_images;
create policy "product_images_admin_all" on public.product_images
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "orders_select_own" on public.orders;
create policy "orders_select_own" on public.orders
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "orders_admin_update" on public.orders;
create policy "orders_admin_update" on public.orders
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "order_items_select_own" on public.order_items;
create policy "order_items_select_own" on public.order_items
  for select using (
    exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin()))
  );

drop policy if exists "payments_select_own" on public.payments;
create policy "payments_select_own" on public.payments
  for select using (
    exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin()))
  );

drop policy if exists "payments_admin_update" on public.payments;
create policy "payments_admin_update" on public.payments
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "downloads_select_own" on public.downloads;
create policy "downloads_select_own" on public.downloads
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "downloads_update_own" on public.downloads;
create policy "downloads_update_own" on public.downloads
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "reviews_public_approved" on public.reviews;
create policy "reviews_public_approved" on public.reviews
  for select using (status = 'approved' or user_id = auth.uid() or public.is_admin());

drop policy if exists "reviews_insert_own" on public.reviews;
create policy "reviews_insert_own" on public.reviews
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.downloads d
      where d.user_id = auth.uid() and d.product_id = reviews.product_id
    )
  );

drop policy if exists "reviews_update_own_pending" on public.reviews;
create policy "reviews_update_own_pending" on public.reviews
  for update using (user_id = auth.uid() and status = 'pending')
  with check (user_id = auth.uid());

drop policy if exists "reviews_admin_all" on public.reviews;
create policy "reviews_admin_all" on public.reviews
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "favorites_own" on public.favorites;
create policy "favorites_own" on public.favorites
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "favorites_admin_read" on public.favorites;
create policy "favorites_admin_read" on public.favorites
  for select using (public.is_admin());

drop policy if exists "coupons_admin_all" on public.coupons;
create policy "coupons_admin_all" on public.coupons
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "coupon_usage_own_or_admin" on public.coupon_usage;
create policy "coupon_usage_own_or_admin" on public.coupon_usage
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "notifications_own" on public.notifications;
create policy "notifications_own" on public.notifications
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "newsletter_insert" on public.newsletter_subscribers;
create policy "newsletter_insert" on public.newsletter_subscribers
  for insert with check (true);

drop policy if exists "newsletter_admin_read" on public.newsletter_subscribers;
create policy "newsletter_admin_read" on public.newsletter_subscribers
  for select using (public.is_admin());

drop policy if exists "settings_public_read" on public.site_settings;
create policy "settings_public_read" on public.site_settings
  for select using (true);

drop policy if exists "settings_admin_all" on public.site_settings;
create policy "settings_admin_all" on public.site_settings
  for all using (public.is_admin()) with check (public.is_admin());

insert into public.site_settings (key, value)
values
  ('general', '{"store_name":"DigiSouq","currency":"DZD","support_email":"support@digisouq.dz","phone":"+213 555 00 00 00"}'::jsonb),
  ('payments', '{"enabled":["test","manual"],"manual_instructions":"حوّل المبلغ عبر CCP أو بريدي موب ثم أدخل رقم العملية. سيتم تفعيل التحميل بعد تأكيد الإدارة."}'::jsonb)
on conflict (key) do nothing;

insert into storage.buckets (id, name, public)
values
  ('product-images', 'product-images', true),
  ('product-files', 'product-files', false)
on conflict (id) do nothing;

drop policy if exists "product_images_public_select" on storage.objects;
create policy "product_images_public_select" on storage.objects
  for select using (bucket_id = 'product-images');

drop policy if exists "product_images_admin_write" on storage.objects;
create policy "product_images_admin_write" on storage.objects
  for all using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "product_files_admin_write" on storage.objects;
create policy "product_files_admin_write" on storage.objects
  for all using (bucket_id = 'product-files' and public.is_admin())
  with check (bucket_id = 'product-files' and public.is_admin());
