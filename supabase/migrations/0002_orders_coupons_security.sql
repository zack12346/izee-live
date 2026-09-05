-- Human-readable order numbers, coupon start dates, cancelled payments, tighter RPCs

do $$ begin
  alter type public.payment_status add value if not exists 'cancelled';
exception
  when duplicate_object then null;
end $$;

alter table public.orders
  add column if not exists order_number text;

create unique index if not exists orders_order_number_idx
  on public.orders (order_number)
  where order_number is not null;

alter table public.coupons
  add column if not exists starts_at timestamptz;

create or replace function public.generate_order_number()
returns text
language plpgsql
as $$
declare
  candidate text;
begin
  loop
    candidate := 'DS-' || to_char(now() at time zone 'utc', 'YYYYMMDD') || '-' ||
      upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    exit when not exists (select 1 from public.orders where order_number = candidate);
  end loop;
  return candidate;
end;
$$;

create or replace function public.set_order_number()
returns trigger
language plpgsql
as $$
begin
  if new.order_number is null or new.order_number = '' then
    new.order_number := public.generate_order_number();
  end if;
  return new;
end;
$$;

drop trigger if exists orders_set_order_number on public.orders;
create trigger orders_set_order_number
before insert on public.orders
for each row execute function public.set_order_number();

revoke all on function public.increment_product_sales(uuid, integer) from public, anon, authenticated;
revoke all on function public.refresh_product_rating(uuid) from public, anon, authenticated;
grant execute on function public.increment_product_sales(uuid, integer) to service_role;
grant execute on function public.refresh_product_rating(uuid) to service_role;

-- Product files are private storage objects. Never expose their object path to browser roles.
revoke select on public.products from anon, authenticated;
grant select (
  id, name, slug, description, short_description, price, compare_price,
  category_id, file_name, file_type, file_size, version, tags, featured,
  published, sales_count, rating_avg, rating_count, created_at, updated_at
) on public.products to anon, authenticated;

-- Orders and payments are created only by the trusted checkout server action.
drop policy if exists "orders_insert_own" on public.orders;
drop policy if exists "order_items_insert_own" on public.order_items;
drop policy if exists "payments_insert_own" on public.payments;
