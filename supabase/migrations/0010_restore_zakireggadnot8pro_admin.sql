-- Restore the confirmed administrator and grant complete RLS-backed access.
-- Non-destructive and safe to apply after migrations 0001 through 0009.

update public.profiles
set role = 'admin'::public.user_role,
    updated_at = now()
where lower(email) = 'zakireggadnot8pro@gmail.com';

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'::public.user_role
  );
$$;

revoke all on function public.is_admin() from public, anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.banned_users enable row level security;

-- Keep customer access narrow while giving persisted admins full table access through RLS.
drop policy if exists "products_admin_all" on public.products;
create policy "products_admin_all" on public.products
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "orders_admin_all" on public.orders;
create policy "orders_admin_all" on public.orders
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "order_items_admin_all" on public.order_items;
create policy "order_items_admin_all" on public.order_items
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "payments_admin_all" on public.payments;
create policy "payments_admin_all" on public.payments
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "banned_users_admin_all" on public.banned_users;
create policy "banned_users_admin_all" on public.banned_users
  for all using (public.is_admin()) with check (public.is_admin());

-- RLS policies are still the authorization boundary for authenticated clients.
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.products to authenticated;
grant select, insert, update, delete on public.orders to authenticated;
grant select, insert, update, delete on public.order_items to authenticated;
grant select, insert, update, delete on public.payments to authenticated;
grant select, insert, update, delete on public.banned_users to authenticated;
