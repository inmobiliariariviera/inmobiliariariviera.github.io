-- Keep staff read/create access where it is part of the workflow, but reserve updates/deletes for owner/admin.
-- Add immutable audit-trigger coverage for every operational table that can be deleted.

drop policy if exists welcome_staff_all on public.welcome_automations;
drop policy if exists welcome_staff_read on public.welcome_automations;
drop policy if exists welcome_staff_insert on public.welcome_automations;
drop policy if exists welcome_admin_update on public.welcome_automations;
drop policy if exists welcome_admin_delete on public.welcome_automations;
create policy welcome_staff_read on public.welcome_automations for select to authenticated
using (public.is_staff());
create policy welcome_staff_insert on public.welcome_automations for insert to authenticated
with check (public.is_staff());
create policy welcome_admin_update on public.welcome_automations for update to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy welcome_admin_delete on public.welcome_automations for delete to authenticated
using (public.is_admin());

drop policy if exists calculator_staff_all on public.calculator_runs;
drop policy if exists calculator_admin_all on public.calculator_runs;
create policy calculator_admin_all on public.calculator_runs for all to authenticated
using (public.is_admin()) with check (public.is_admin());

-- Capture deleted operational rows (and other changes) before PostgreSQL removes them.
drop trigger if exists lead_events_audit on public.lead_events;
create trigger lead_events_audit after insert or update or delete on public.lead_events
for each row execute procedure public.write_audit_log();

drop trigger if exists welcome_automations_audit on public.welcome_automations;
create trigger welcome_automations_audit after insert or update or delete on public.welcome_automations
for each row execute procedure public.write_audit_log();

drop trigger if exists faq_entries_audit on public.faq_entries;
create trigger faq_entries_audit after insert or update or delete on public.faq_entries
for each row execute procedure public.write_audit_log();

drop trigger if exists calculator_runs_audit on public.calculator_runs;
create trigger calculator_runs_audit after insert or update or delete on public.calculator_runs
for each row execute procedure public.write_audit_log();
