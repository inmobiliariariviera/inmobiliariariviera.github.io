-- The audit log remains read-only for admins; only the owner role may permanently delete audit entries.
-- Deleting audit entries never cascades to business/operational records.
create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'owner'
  );
$$;
revoke all on function public.is_owner() from public;
grant execute on function public.is_owner() to authenticated;

revoke insert, update, delete on public.audit_logs from public, anon, authenticated;
grant select, delete on public.audit_logs to authenticated;
drop policy if exists audit_owner_delete on public.audit_logs;
create policy audit_owner_delete on public.audit_logs for delete to authenticated
using (public.is_owner());
