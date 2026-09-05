-- Threat monitoring and automatic user/IP bans.
create table if not exists public.banned_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  ip_address text,
  reason text not null,
  violation_count integer not null default 1 check (violation_count > 0),
  active boolean not null default false,
  banned_until timestamptz,
  last_violation_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (user_id is not null or ip_address is not null)
);

create index if not exists banned_users_user_active_idx on public.banned_users(user_id, active);
create index if not exists banned_users_ip_active_idx on public.banned_users(ip_address, active);

alter table public.banned_users enable row level security;
drop policy if exists "banned_users_admin_all" on public.banned_users;
create policy "banned_users_admin_all" on public.banned_users
  for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.is_request_banned(p_user_id uuid, p_ip_address text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_user_id is not null and p_user_id <> auth.uid() and not public.is_admin() then
    p_user_id := null;
  end if;

  return exists (
    select 1 from public.banned_users b
    where b.active = true
      and (b.banned_until is null or b.banned_until > now())
      and ((p_user_id is not null and b.user_id = p_user_id) or (p_ip_address is not null and b.ip_address = p_ip_address))
  );
end;
$$;

create or replace function public.record_security_violation(
  p_user_id uuid,
  p_ip_address text,
  p_reason text,
  p_immediate boolean default false
)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user uuid := p_user_id;
  clean_ip text := nullif(left(trim(p_ip_address), 64), '');
  clean_reason text := left(coalesce(p_reason, 'Suspicious request'), 500);
  current_record public.banned_users;
  next_count integer;
  should_ban boolean;
  expiry timestamptz;
begin
  -- Callers may only report themselves; anonymous callers may report the source IP.
  if target_user is not null and target_user <> auth.uid() and not public.is_admin() then
    target_user := null;
  end if;

  if target_user is null and clean_ip is null then
    return null;
  end if;

  select * into current_record
  from public.banned_users
  where ((target_user is not null and user_id = target_user) or (clean_ip is not null and ip_address = clean_ip))
  order by updated_at desc
  limit 1
  for update;

  if current_record.id is null or current_record.last_violation_at < now() - interval '10 minutes' then
    next_count := 1;
  else
    next_count := current_record.violation_count + 1;
  end if;

  should_ban := p_immediate or next_count >= 3;
  expiry := case when should_ban then now() + interval '24 hours' else null end;

  if current_record.id is null then
    insert into public.banned_users(user_id, ip_address, reason, violation_count, active, banned_until)
    values (target_user, clean_ip, clean_reason, next_count, should_ban, expiry);
  else
    update public.banned_users
    set user_id = coalesce(user_id, target_user),
        ip_address = coalesce(ip_address, clean_ip),
        reason = clean_reason,
        violation_count = next_count,
        active = should_ban or active,
        banned_until = case when should_ban then expiry else banned_until end,
        last_violation_at = now(),
        updated_at = now()
    where id = current_record.id;
  end if;

  return expiry;
end;
$$;

revoke all on function public.is_request_banned(uuid, text) from public, anon, authenticated;
revoke all on function public.record_security_violation(uuid, text, text, boolean) from public, anon, authenticated;
grant execute on function public.is_request_banned(uuid, text) to anon, authenticated;
grant execute on function public.record_security_violation(uuid, text, text, boolean) to anon, authenticated;