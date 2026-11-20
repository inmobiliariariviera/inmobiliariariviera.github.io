-- CRM operativo Riviera: migración aditiva e idempotente
alter table public.leads add column if not exists budget_min numeric(16,2);
alter table public.leads add column if not exists budget_max numeric(16,2);
alter table public.leads add column if not exists budget_currency text;
alter table public.leads add column if not exists financing text;
alter table public.leads add column if not exists urgency text;
alter table public.leads add column if not exists purchase_horizon text;
alter table public.leads add column if not exists preferred_operation text;
alter table public.leads add column if not exists preferred_zone text;
alter table public.leads add column if not exists tags text[] not null default '{}';
alter table public.leads add column if not exists priority text not null default 'normal';
alter table public.leads add column if not exists contact_consent boolean not null default false;
alter table public.leads add column if not exists last_contacted_at timestamptz;
alter table public.leads add column if not exists next_action_at timestamptz;
alter table public.leads add column if not exists archived_at timestamptz;
alter table public.leads drop constraint if exists leads_budget_currency_check;
alter table public.leads add constraint leads_budget_currency_check check (budget_currency is null or budget_currency in ('USD','ARS'));
alter table public.leads drop constraint if exists leads_financing_check;
alter table public.leads add constraint leads_financing_check check (financing is null or financing in ('cash','mortgage','installments','to_define'));
alter table public.leads drop constraint if exists leads_urgency_check;
alter table public.leads add constraint leads_urgency_check check (urgency is null or urgency in ('high','medium','low'));
alter table public.leads drop constraint if exists leads_priority_check;
alter table public.leads add constraint leads_priority_check check (priority in ('high','normal','low'));
create index if not exists leads_priority_created_idx on public.leads(priority, created_at desc);
create index if not exists leads_next_action_idx on public.leads(next_action_at) where next_action_at is not null;

alter table public.properties add column if not exists published_at timestamptz;
alter table public.properties add column if not exists review_90_day_notified_at timestamptz;
alter table public.properties add column if not exists archived_at timestamptz;
update public.properties set published_at = coalesce(published_at, updated_at) where status in ('published','sold','rented') and published_at is null;
create index if not exists properties_90_day_alert_idx on public.properties(status, published_at) where published_at is not null;

create table if not exists public.lead_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  event_type text not null check (event_type in ('created','stage_changed','contacted','note','welcome_queued','welcome_sent','welcome_failed','assigned')),
  from_stage text,
  to_stage text,
  note text not null default '',
  actor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists lead_events_lead_created_idx on public.lead_events(lead_id, created_at desc);

create table if not exists public.welcome_automations (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  channel text not null check (channel in ('email','whatsapp')),
  template_key text not null default 'welcome_inquiry',
  status text not null default 'queued' check (status in ('queued','sent','failed','cancelled')),
  provider_message_id text,
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  scheduled_at timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (lead_id, channel, template_key)
);
create index if not exists welcome_automations_status_idx on public.welcome_automations(status, scheduled_at);

create table if not exists public.faq_entries (
  id uuid primary key default gen_random_uuid(),
  question text not null check (length(trim(question)) between 5 and 240),
  answer text not null check (length(trim(answer)) between 10 and 4000),
  category text not null default 'general',
  is_active boolean not null default true,
  usage_count integer not null default 0 check (usage_count >= 0),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists faq_entries_active_idx on public.faq_entries(is_active, category);

create table if not exists public.calculator_runs (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete set null,
  title text not null default 'Cálculo interno',
  sale_price numeric(16,2) not null default 0 check (sale_price >= 0),
  currency text not null default 'USD' check (currency in ('USD','ARS')),
  owner_amount numeric(16,2) not null default 0 check (owner_amount >= 0),
  expenses numeric(16,2) not null default 0 check (expenses >= 0),
  commission_percent numeric(7,4) not null default 0 check (commission_percent between 0 and 100),
  commission_amount numeric(16,2) not null default 0 check (commission_amount >= 0),
  agency_profit numeric(16,2) not null default 0,
  notes text not null default '',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists calculator_runs_created_idx on public.calculator_runs(created_at desc);

create table if not exists public.financial_transactions (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  type text not null check (type in ('income','expense','owner_payment','agency_profit','commission')),
  description text not null check (length(trim(description)) between 2 and 240),
  amount numeric(16,2) not null check (amount >= 0),
  currency text not null default 'USD' check (currency in ('USD','ARS')),
  status text not null default 'pending' check (status in ('pending','completed','voided')),
  occurred_at timestamptz not null default now(),
  completed_at timestamptz,
  notes text not null default '',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists financial_transactions_status_date_idx on public.financial_transactions(status, occurred_at desc);

create or replace function public.crm_touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end; $$;
drop trigger if exists faq_entries_touch_updated_at on public.faq_entries;
create trigger faq_entries_touch_updated_at before update on public.faq_entries for each row execute procedure public.crm_touch_updated_at();
drop trigger if exists financial_transactions_touch_updated_at on public.financial_transactions;
create trigger financial_transactions_touch_updated_at before update on public.financial_transactions for each row execute procedure public.crm_touch_updated_at();

alter table public.lead_events enable row level security;
alter table public.welcome_automations enable row level security;
alter table public.faq_entries enable row level security;
alter table public.calculator_runs enable row level security;
alter table public.financial_transactions enable row level security;

drop policy if exists lead_events_staff_read on public.lead_events;
create policy lead_events_staff_read on public.lead_events for select to authenticated using (public.is_staff());
drop policy if exists lead_events_staff_insert on public.lead_events;
create policy lead_events_staff_insert on public.lead_events for insert to authenticated with check (public.is_staff());
drop policy if exists welcome_staff_all on public.welcome_automations;
create policy welcome_staff_all on public.welcome_automations for all to authenticated using (public.is_staff()) with check (public.is_staff());
drop policy if exists faq_public_read_active on public.faq_entries;
create policy faq_public_read_active on public.faq_entries for select to anon, authenticated using (is_active or public.is_staff());
drop policy if exists faq_admin_write on public.faq_entries;
create policy faq_admin_write on public.faq_entries for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists calculator_staff_all on public.calculator_runs;
create policy calculator_staff_all on public.calculator_runs for all to authenticated using (public.is_staff()) with check (public.is_staff());
drop policy if exists finance_admin_all on public.financial_transactions;
create policy finance_admin_all on public.financial_transactions for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select, insert on public.lead_events to authenticated;
grant select, insert, update, delete on public.welcome_automations to authenticated;
grant select on public.faq_entries to anon, authenticated;
grant insert, update, delete on public.faq_entries to authenticated;
grant select, insert, update, delete on public.calculator_runs to authenticated;
grant select, insert, update, delete on public.financial_transactions to authenticated;

-- No se eliminan propiedades: se conserva el histórico y el panel usará archivado/anulación.
drop policy if exists properties_staff_delete on public.properties;
revoke delete on public.properties from authenticated;
