-- Cronología comercial: registra altas y cambios de etapa en la base.
-- Aditiva, no reescribe eventos previos y no altera datos de leads existentes.
create or replace function public.record_lead_timeline()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.lead_events (lead_id, event_type, from_stage, to_stage, note, actor_id)
    values (new.id, 'created', null, new.stage, 'Consulta creada', auth.uid());
    return new;
  end if;

  if new.stage is distinct from old.stage then
    insert into public.lead_events (lead_id, event_type, from_stage, to_stage, note, actor_id)
    values (new.id, 'stage_changed', old.stage, new.stage, 'Cambio de etapa registrado', auth.uid());
  end if;
  return new;
end;
$$;

revoke all on function public.record_lead_timeline() from public, anon, authenticated;

drop trigger if exists leads_timeline_after_insert on public.leads;
create trigger leads_timeline_after_insert
after insert on public.leads
for each row execute function public.record_lead_timeline();

drop trigger if exists leads_timeline_after_stage_change on public.leads;
create trigger leads_timeline_after_stage_change
after update of stage on public.leads
for each row when (old.stage is distinct from new.stage)
execute function public.record_lead_timeline();

-- La cronología la escribe el trigger y la Edge Function privilegiada; los clientes
-- autenticados sólo consultan eventos y no pueden falsificar transiciones.
drop policy if exists lead_events_staff_insert on public.lead_events;
revoke insert, update, delete on public.lead_events from anon, authenticated;
grant select on public.lead_events to authenticated;
grant insert on public.lead_events to service_role;
