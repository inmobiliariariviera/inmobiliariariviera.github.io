-- Protect profit and commission transaction rows at the database layer until an admin/owner validates the Vault PIN.
create table if not exists public.profit_pin_unlocks (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  unlocked_until timestamptz not null,
  updated_at timestamptz not null default now()
);
alter table public.profit_pin_unlocks enable row level security;
revoke all on public.profit_pin_unlocks from public, anon, authenticated;

create or replace function public.can_view_private_profit()
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and public.is_admin() and exists (
    select 1 from public.profit_pin_unlocks u
    where u.user_id = auth.uid() and u.unlocked_until > now()
  );
$$;
revoke all on function public.can_view_private_profit() from public;
grant execute on function public.can_view_private_profit() to authenticated;

create or replace function public.unlock_profit_view(p_pin text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_admin() or not public.verify_profit_pin(p_pin) then
    return false;
  end if;
  insert into public.profit_pin_unlocks (user_id, unlocked_until, updated_at)
  values (auth.uid(), now() + interval '15 minutes', now())
  on conflict (user_id) do update
    set unlocked_until = excluded.unlocked_until, updated_at = excluded.updated_at;
  return true;
end;
$$;
revoke all on function public.unlock_profit_view(text) from public;
grant execute on function public.unlock_profit_view(text) to authenticated;

create or replace function public.lock_profit_view()
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_admin() then return false; end if;
  update public.profit_pin_unlocks set unlocked_until = now(), updated_at = now() where user_id = auth.uid();
  return true;
end;
$$;
revoke all on function public.lock_profit_view() from public;
grant execute on function public.lock_profit_view() to authenticated;

-- Replace the broad ALL policy so confidential profit rows are filtered at read time.
drop policy if exists finance_admin_all on public.financial_transactions;
drop policy if exists finance_admin_select on public.financial_transactions;
drop policy if exists finance_admin_insert on public.financial_transactions;
drop policy if exists finance_admin_update on public.financial_transactions;
drop policy if exists finance_admin_delete on public.financial_transactions;
create policy finance_admin_select on public.financial_transactions for select to authenticated
using (public.is_admin() and (type not in ('agency_profit', 'commission') or public.can_view_private_profit()));
create policy finance_admin_insert on public.financial_transactions for insert to authenticated
with check (public.is_admin());
create policy finance_admin_update on public.financial_transactions for update to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy finance_admin_delete on public.financial_transactions for delete to authenticated
using (public.is_admin());
