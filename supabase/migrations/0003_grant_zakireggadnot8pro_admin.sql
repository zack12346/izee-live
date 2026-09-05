-- Grant the requested account admin access in the database.
-- Run this migration in the target Supabase project after 0001 and 0002.

update public.profiles
set role = 'admin', updated_at = now()
where lower(email) = 'zakireggadnot8pro@gmail.com';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', ''),
    case
      when lower(coalesce(new.email, '')) = 'zakireggadnot8pro@gmail.com' then 'admin'::public.user_role
      else 'customer'::public.user_role
    end
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        role = case
          when lower(excluded.email) = 'zakireggadnot8pro@gmail.com' then 'admin'::public.user_role
          else public.profiles.role
        end;
  return new;
end;
$$;

-- Ensure the database-side admin predicate uses the persisted role.
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

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.is_admin() from public, anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
