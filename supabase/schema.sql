-- Portal Inmobiliario: ejecutar una vez en Supabase > SQL Editor.
-- No usar ni publicar la service_role key en la web.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'user' check (role in ('owner', 'admin', 'manager', 'secretary', 'user')),
  created_at timestamptz not null default now()
);
alter table public.profiles alter column role set default 'user';
alter table public.profiles drop constraint if exists profiles_role_check;
update public.profiles set role = 'manager' where role = 'agent';
alter table public.profiles add constraint profiles_role_check check (role in ('owner', 'admin', 'manager', 'secretary', 'user'));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''), 'user')
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('owner', 'admin', 'manager', 'secretary')
  );
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('owner', 'admin')
  );
$$;

create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner');
$$;

create or replace function public.can_manage_properties()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('owner', 'admin', 'manager'));
$$;

create or replace function public.can_manage_team()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_admin();
$$;

create or replace function public.set_team_role(target_user_id uuid, new_role text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  actor_role text;
  target_role text;
  owner_count integer;
begin
  lock table public.profiles in share row exclusive mode;
  select p.role into actor_role from public.profiles p where p.id = auth.uid();
  if actor_role is null or actor_role not in ('owner', 'admin') then
    raise exception 'No tenés permiso para administrar roles';
  end if;
  if new_role is null or new_role not in ('owner', 'admin', 'manager', 'secretary', 'user') then
    raise exception 'Rol no válido';
  end if;
  if target_user_id = auth.uid() then
    raise exception 'No podés cambiar tu propio rol desde el panel';
  end if;
  select p.role into target_role from public.profiles p where p.id = target_user_id;
  if target_role is null then
    raise exception 'No se encontró el usuario';
  end if;
  if actor_role = 'admin' and (new_role in ('owner', 'admin') or target_role in ('owner', 'admin')) then
    raise exception 'Sólo el dueño puede asignar o modificar roles de dueño/administrador';
  end if;
  if actor_role = 'owner' and target_role = 'owner' and new_role <> 'owner' then
    select count(*) into owner_count from public.profiles p where p.role = 'owner';
    if owner_count <= 1 then
      raise exception 'Debe quedar al menos un dueño activo';
    end if;
  end if;
  update public.profiles set role = new_role where id = target_user_id;
end;
$$;
revoke all on function public.set_team_role(uuid, text) from public, anon;
grant execute on function public.set_team_role(uuid, text) to authenticated;

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  operation text not null check (operation in ('Venta', 'Alquiler')),
  title text not null,
  category text not null check (category in ('Campo', 'Casa', 'Terreno', 'Departamento', 'Local', 'Otro')),
  location text not null,
  region text not null,
  price numeric(16,2) not null check (price >= 0),
  currency text not null check (currency in ('USD', 'ARS')),
  price_frequency text,
  surface numeric(14,2) not null check (surface > 0),
  covered_surface numeric(14,2) check (covered_surface is null or covered_surface > 0),
  surface_unit text not null check (surface_unit in ('ha', 'm²')),
  bedrooms integer check (bedrooms is null or bedrooms >= 0),
  bathrooms integer check (bathrooms is null or bathrooms >= 0),
  rooms integer check (rooms is null or rooms >= 0),
  legal_status text not null default 'A confirmar',
  features text[] not null default '{}',
  description text not null default '',
  images text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'published', 'sold', 'rented', 'archived')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.properties add column if not exists covered_surface numeric(14,2) check (covered_surface is null or covered_surface > 0);
create index if not exists properties_status_created_idx on public.properties(status, created_at desc);
create index if not exists properties_slug_idx on public.properties(slug);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 120),
  email text,
  phone text,
  message text not null check (length(trim(message)) between 3 and 4000),
  property_id uuid references public.properties(id) on delete set null,
  stage text not null default 'new' check (stage in ('new', 'contacted', 'visit', 'negotiation', 'won', 'lost')),
  source text not null default 'website' check (source in ('website', 'manual', 'phone', 'whatsapp', 'other')),
  assigned_to uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists leads_stage_created_idx on public.leads(stage, created_at desc);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  author_name text not null check (length(trim(author_name)) between 2 and 100),
  rating integer not null check (rating between 1 and 5),
  comment text not null check (length(trim(comment)) between 10 and 1200),
  is_approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists reviews_public_created_idx on public.reviews(is_approved, created_at desc);

-- Rate limiting para la Edge Function pública. Sólo almacena hashes HMAC de IP,
-- nunca direcciones IP en claro, y no puede consultarse desde el navegador.
create table if not exists public.lead_submission_limits (
  bucket_key text primary key check (bucket_key ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0)
);
alter table public.lead_submission_limits enable row level security;
revoke all on table public.lead_submission_limits from public, anon, authenticated;

create or replace function public.consume_lead_submission_limit(
  p_key text,
  p_limit integer default 5,
  p_window_seconds integer default 900
)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  current_count integer;
  current_window timestamptz;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Sólo el servicio de consultas puede consumir límites';
  end if;
  if p_key is null or p_key !~ '^[0-9a-f]{64}$'
     or p_limit < 1 or p_limit > 20
     or p_window_seconds < 60 or p_window_seconds > 86400 then
    raise exception 'Parámetros de límite no válidos';
  end if;
  insert into public.lead_submission_limits (bucket_key, window_started_at, request_count)
  values (p_key, now(), 1)
  on conflict (bucket_key) do update set
    window_started_at = case
      when public.lead_submission_limits.window_started_at + pg_catalog.make_interval(secs => p_window_seconds) <= now()
        then now() else public.lead_submission_limits.window_started_at end,
    request_count = case
      when public.lead_submission_limits.window_started_at + pg_catalog.make_interval(secs => p_window_seconds) <= now()
        then 1 else least(public.lead_submission_limits.request_count + 1, p_limit + 1) end
  returning request_count, window_started_at into current_count, current_window;
  if pg_catalog.random() < 0.01 then
    delete from public.lead_submission_limits where window_started_at < now() - interval '2 days';
  end if;
  return current_count <= p_limit and current_window + pg_catalog.make_interval(secs => p_window_seconds) > now();
end;
$$;
revoke all on function public.consume_lead_submission_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_lead_submission_limit(text, integer, integer) to service_role;

create table if not exists public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 2 and 180),
  notes text not null default '',
  due_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'done', 'cancelled')),
  lead_id uuid references public.leads(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  assigned_to uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists follow_ups_due_idx on public.follow_ups(status, due_at);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  entity_table text not null,
  entity_id text not null,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_created_idx on public.audit_logs(created_at desc);

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists properties_touch_updated_at on public.properties;
create trigger properties_touch_updated_at before update on public.properties
for each row execute procedure public.touch_updated_at();
drop trigger if exists leads_touch_updated_at on public.leads;
create trigger leads_touch_updated_at before update on public.leads
for each row execute procedure public.touch_updated_at();
drop trigger if exists follow_ups_touch_updated_at on public.follow_ups;
create trigger follow_ups_touch_updated_at before update on public.follow_ups
for each row execute procedure public.touch_updated_at();
drop trigger if exists reviews_touch_updated_at on public.reviews;
create trigger reviews_touch_updated_at before update on public.reviews
for each row execute procedure public.touch_updated_at();

create or replace function public.write_audit_log()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  old_json jsonb;
  new_json jsonb;
  row_id text;
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
  insert into public.audit_logs (actor_id, action, entity_table, entity_id, old_values, new_values)
  values (auth.uid(), tg_op, tg_table_name, row_id, old_json, new_json);
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists properties_audit on public.properties;
create trigger properties_audit after insert or update or delete on public.properties
for each row execute procedure public.write_audit_log();
drop trigger if exists leads_audit on public.leads;
create trigger leads_audit after insert or update or delete on public.leads
for each row execute procedure public.write_audit_log();
drop trigger if exists follow_ups_audit on public.follow_ups;
create trigger follow_ups_audit after insert or update or delete on public.follow_ups
for each row execute procedure public.write_audit_log();
drop trigger if exists reviews_audit on public.reviews;
create trigger reviews_audit after insert or update or delete on public.reviews
for each row execute procedure public.write_audit_log();
drop trigger if exists profiles_audit on public.profiles;
create trigger profiles_audit after insert or update or delete on public.profiles
for each row execute procedure public.write_audit_log();

alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.leads enable row level security;
alter table public.follow_ups enable row level security;
alter table public.audit_logs enable row level security;
alter table public.reviews enable row level security;

drop policy if exists "profiles_read_self_or_admin" on public.profiles;
create policy "profiles_read_self_or_admin" on public.profiles for select to authenticated
using (id = auth.uid() or public.can_manage_team());
-- Role changes are only possible through the guarded set_team_role RPC.

drop policy if exists "properties_public_read_active" on public.properties;
create policy "properties_public_read_active" on public.properties for select to anon, authenticated
using (status in ('published', 'sold', 'rented') or public.is_staff());
drop policy if exists "properties_staff_insert" on public.properties;
create policy "properties_staff_insert" on public.properties for insert to authenticated
with check (public.can_manage_properties());
drop policy if exists "properties_staff_update" on public.properties;
create policy "properties_staff_update" on public.properties for update to authenticated
using (public.can_manage_properties()) with check (public.can_manage_properties());
drop policy if exists "properties_staff_delete" on public.properties;
create policy "properties_staff_delete" on public.properties for delete to authenticated
using (public.is_admin());

drop policy if exists "reviews_public_read_approved" on public.reviews;
create policy "reviews_public_read_approved" on public.reviews for select to anon, authenticated
using (is_approved or public.is_staff());
drop policy if exists "reviews_public_insert_pending" on public.reviews;
create policy "reviews_public_insert_pending" on public.reviews for insert to anon, authenticated
with check (is_approved = false);
drop policy if exists "reviews_staff_update" on public.reviews;
create policy "reviews_staff_update" on public.reviews for update to authenticated
using (public.is_staff()) with check (public.is_staff());
drop policy if exists "reviews_admin_delete" on public.reviews;
create policy "reviews_admin_delete" on public.reviews for delete to authenticated
using (public.is_admin());

drop policy if exists "leads_public_insert" on public.leads;
drop policy if exists "leads_staff_insert" on public.leads;
create policy "leads_staff_insert" on public.leads for insert to authenticated
with check (public.is_staff());
drop policy if exists "leads_staff_read" on public.leads;
create policy "leads_staff_read" on public.leads for select to authenticated using (public.is_staff());
drop policy if exists "leads_staff_update" on public.leads;
create policy "leads_staff_update" on public.leads for update to authenticated using (public.is_staff()) with check (public.is_staff());
drop policy if exists "leads_staff_delete" on public.leads;
create policy "leads_staff_delete" on public.leads for delete to authenticated
using (public.is_admin());

drop policy if exists "follow_ups_staff_all" on public.follow_ups;
drop policy if exists "follow_ups_staff_read" on public.follow_ups;
create policy "follow_ups_staff_read" on public.follow_ups for select to authenticated using (public.is_staff());
drop policy if exists "follow_ups_staff_insert" on public.follow_ups;
create policy "follow_ups_staff_insert" on public.follow_ups for insert to authenticated with check (public.is_staff());
drop policy if exists "follow_ups_staff_update" on public.follow_ups;
create policy "follow_ups_staff_update" on public.follow_ups for update to authenticated using (public.is_staff()) with check (public.is_staff());
drop policy if exists "follow_ups_admin_delete" on public.follow_ups;
create policy "follow_ups_admin_delete" on public.follow_ups for delete to authenticated using (public.is_admin());

drop policy if exists "audit_admin_read" on public.audit_logs;
create policy "audit_admin_read" on public.audit_logs for select to authenticated using (public.is_admin());
-- No direct INSERT/UPDATE/DELETE policy exists for audit_logs. Only the SECURITY DEFINER trigger writes it.

grant select on public.profiles to authenticated;
grant select on public.properties to anon, authenticated;
grant insert, update, delete on public.properties to authenticated;
revoke insert on public.leads from public, anon;
grant insert on public.leads to authenticated;
grant select, update, delete on public.leads to authenticated;
grant select, insert, update, delete on public.follow_ups to authenticated;
grant select on public.audit_logs to authenticated;
grant select, insert on public.reviews to anon, authenticated;
grant update, delete on public.reviews to authenticated;

-- Las imágenes nuevas viven en un bucket privado. Las fichas públicas reciben
-- URLs firmadas sólo si la propiedad está publicada/vendida/alquilada.
update public.properties p
set images = (
  select pg_catalog.array_agg(
    case when pg_catalog.strpos(u.image, '/storage/v1/object/public/property-images/') > 0 then
      pg_catalog.split_part(
        pg_catalog.substr(
          u.image,
          pg_catalog.strpos(u.image, '/storage/v1/object/public/property-images/')
          + pg_catalog.length('/storage/v1/object/public/property-images/')
        ), '?', 1
      )
    else u.image end
    order by u.ordinality
  )
  from pg_catalog.unnest(p.images) with ordinality as u(image, ordinality)
)
where exists (
  select 1 from pg_catalog.unnest(p.images) as u(image)
  where pg_catalog.strpos(u.image, '/storage/v1/object/public/property-images/') > 0
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('property-images', 'property-images', false, 8388608, array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "property_images_public_read" on storage.objects;
drop policy if exists "property_images_staff_read" on storage.objects;
create policy "property_images_staff_read" on storage.objects for select to authenticated
using (bucket_id = 'property-images' and public.is_staff());
drop policy if exists "property_images_staff_upload" on storage.objects;
create policy "property_images_staff_upload" on storage.objects for insert to authenticated
 with check (bucket_id = 'property-images' and public.can_manage_properties()
   and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "property_images_staff_update" on storage.objects;
create policy "property_images_staff_update" on storage.objects for update to authenticated
using (bucket_id = 'property-images' and public.can_manage_properties()
  and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'property-images' and public.can_manage_properties()
  and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "property_images_staff_delete" on storage.objects;
create policy "property_images_staff_delete" on storage.objects for delete to authenticated
using (
  bucket_id = 'property-images'
  and (public.is_admin() or (public.can_manage_properties() and (storage.foldername(name))[1] = auth.uid()::text))
);

-- Alta inicial: cree primero al dueño desde Supabase Auth > Users y luego ejecute,
-- cambiando el email. Las demás cuentas empiezan como 'user'; dueño/admin pueden asignar
-- roles desde Equipo. Los perfiles no se crean desde el panel y no se usa service_role.
-- insert into public.profiles (id, email, full_name, role)
-- select id, email, 'Dueño', 'owner' from auth.users where email = 'dueno@tu-dominio.com'
-- on conflict (id) do update set role = excluded.role, email = excluded.email;
