-- Only the signed server-side security report route may record bans.
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
  if auth.role() <> 'service_role' and target_user is not null and target_user <> auth.uid() and not public.is_admin() then
    target_user := null;
  end if;
  if target_user is null and clean_ip is null then return null; end if;

  select * into current_record
  from public.banned_users
  where ((target_user is not null and user_id = target_user) or (clean_ip is not null and ip_address = clean_ip))
  order by updated_at desc limit 1 for update;

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
    set user_id = coalesce(user_id, target_user), ip_address = coalesce(ip_address, clean_ip),
        reason = clean_reason, violation_count = next_count, active = should_ban or active,
        banned_until = case when should_ban then expiry else banned_until end,
        last_violation_at = now(), updated_at = now()
    where id = current_record.id;
  end if;
  return expiry;
end;
$$;

revoke all on function public.record_security_violation(uuid, text, text, boolean) from public, anon, authenticated;
grant execute on function public.record_security_violation(uuid, text, text, boolean) to service_role;
