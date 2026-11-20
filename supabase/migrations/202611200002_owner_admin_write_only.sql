-- Tighten operational update policies and strengthen deletion audit history.
-- No existing business rows or audit rows are deleted by this migration.

drop policy if exists properties_staff_update on public.properties;
drop policy if exists properties_admin_update on public.properties;
create policy properties_admin_update on public.properties for update to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists leads_staff_update on public.leads;
drop policy if exists leads_admin_update on public.leads;
create policy leads_admin_update on public.leads for update to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists follow_ups_staff_update on public.follow_ups;
drop policy if exists follow_ups_admin_update on public.follow_ups;
create policy follow_ups_admin_update on public.follow_ups for update to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists reviews_staff_update on public.reviews;
drop policy if exists reviews_admin_update on public.reviews;
create policy reviews_admin_update on public.reviews for update to authenticated
using (public.is_admin()) with check (public.is_admin());

-- Snapshot the actor identity so audit history survives profile/account deletion.
alter table public.audit_logs add column if not exists actor_name text;
alter table public.audit_logs add column if not exists actor_email text;

create or replace function public.write_audit_log()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  old_json jsonb;
  new_json jsonb;
  row_id text;
  actor_name_snapshot text;
  actor_email_snapshot text;
begin
  if tg_op = 'INSERT' then
    new_json := to_jsonb(new);
    row_id := new_json ->> 'id';
  elsif tg_op = 'UPDATE' then
    old_json := to_jsonb(old);
    new_json := to_jsonb(new);
    row_id := new_json ->> 'id';
  else
    old_json := to_jsonb(old);
    row_id := old_json ->> 'id';
  end if;

  select p.full_name, p.email into actor_name_snapshot, actor_email_snapshot
  from public.profiles p where p.id = auth.uid();
  if tg_table_name = 'profiles' and tg_op = 'DELETE' then
    actor_name_snapshot := coalesce(actor_name_snapshot, old_json ->> 'full_name');
    actor_email_snapshot := coalesce(actor_email_snapshot, old_json ->> 'email');
  end if;

  insert into public.audit_logs (actor_id, actor_name, actor_email, action, entity_table, entity_id, old_values, new_values)
  values (auth.uid(), actor_name_snapshot, actor_email_snapshot, tg_op, tg_table_name, row_id, old_json, new_json);

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

-- Financial transactions were missing an audit trigger; capture create/edit/delete as well.
drop trigger if exists financial_transactions_audit on public.financial_transactions;
create trigger financial_transactions_audit
after insert or update or delete on public.financial_transactions
for each row execute procedure public.write_audit_log();

-- Audit rows are written only by SECURITY DEFINER triggers, never directly via the client.
revoke insert, update, delete on public.audit_logs from public, anon, authenticated;
grant select on public.audit_logs to authenticated;


-- Store a small per-user throttle for the private profit card PIN check.
create table if not exists public.profit_pin_attempts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  failed_attempts integer not null default 0 check (failed_attempts >= 0),
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.profit_pin_attempts enable row level security;
revoke all on public.profit_pin_attempts from public, anon, authenticated;

create or replace function public.verify_profit_pin(p_pin text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  failed_count integer;
  lock_time timestamptz;
  stored_pin text;
begin
  if auth.uid() is null or not public.is_admin() or p_pin is null or length(p_pin) > 128 then
    return false;
  end if;

  insert into public.profit_pin_attempts (user_id) values (auth.uid()) on conflict (user_id) do nothing;
  select failed_attempts, locked_until into failed_count, lock_time
  from public.profit_pin_attempts where user_id = auth.uid() for update;
  if lock_time is not null and lock_time > now() then return false; end if;

  select v.decrypted_secret into stored_pin
  from vault.decrypted_secrets v where v.name = 'rivierainmobiliaria_profit_pin' limit 1;
  if stored_pin is null then return false; end if;

  if p_pin = stored_pin then
    update public.profit_pin_attempts set failed_attempts = 0, locked_until = null, updated_at = now() where user_id = auth.uid();
    return true;
  end if;

  failed_count := coalesce(failed_count, 0) + 1;
  update public.profit_pin_attempts
  set failed_attempts = failed_count,
      locked_until = case when failed_count >= 5 then now() + interval '5 minutes' else null end,
      updated_at = now()
  where user_id = auth.uid();
  return false;
end;
$$;
revoke all on function public.verify_profit_pin(text) from public;
grant execute on function public.verify_profit_pin(text) to authenticated;
