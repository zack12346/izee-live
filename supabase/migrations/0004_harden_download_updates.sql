-- Download counters are maintained by the trusted server action, not by clients.
drop policy if exists "downloads_update_own" on public.downloads;