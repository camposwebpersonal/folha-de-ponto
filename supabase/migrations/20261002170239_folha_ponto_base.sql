create extension if not exists pgcrypto with schema extensions;

create table public.fp_units (
  id uuid primary key default gen_random_uuid(),
  secretariat text not null,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fp_units_secretariat_not_blank check (length(btrim(secretariat)) > 0),
  constraint fp_units_name_not_blank check (length(btrim(name)) > 0)
);

create unique index fp_units_name_unique on public.fp_units (lower(name));

create table public.fp_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  display_name text not null,
  role text not null default 'admin' check (role in ('admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fp_profiles_username_not_blank check (length(btrim(username)) > 0)
);

create unique index fp_profiles_username_unique on public.fp_profiles (lower(username));

create table public.fp_employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  registration text,
  job_title text not null,
  employment_status text not null,
  unit_id uuid not null references public.fp_units(id) on update cascade on delete restrict,
  observations text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fp_employees_name_not_blank check (length(btrim(name)) > 0),
  constraint fp_employees_job_not_blank check (length(btrim(job_title)) > 0),
  constraint fp_employees_status_not_blank check (length(btrim(employment_status)) > 0)
);

create unique index fp_employees_name_unique on public.fp_employees (lower(name));
create index fp_employees_unit_id_idx on public.fp_employees (unit_id);
create index fp_employees_active_idx on public.fp_employees (active) where active;

create table public.fp_generation_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  generation_type text not null check (generation_type in ('individual','unified')),
  reference_month date not null,
  employee_ids uuid[] not null,
  employee_count integer not null check (employee_count > 0),
  file_name text not null,
  created_at timestamptz not null default now(),
  constraint fp_generation_reference_first_day check (extract(day from reference_month) = 1)
);

create index fp_generation_logs_created_at_idx on public.fp_generation_logs (created_at desc);
create index fp_generation_logs_user_id_idx on public.fp_generation_logs (user_id);

create function public.fp_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger fp_units_touch_updated_at before update on public.fp_units
for each row execute function public.fp_touch_updated_at();
create trigger fp_profiles_touch_updated_at before update on public.fp_profiles
for each row execute function public.fp_touch_updated_at();
create trigger fp_employees_touch_updated_at before update on public.fp_employees
for each row execute function public.fp_touch_updated_at();

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create function private.fp_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.fp_profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

revoke all on function private.fp_is_admin() from public, anon;
grant execute on function private.fp_is_admin() to authenticated;

alter table public.fp_units enable row level security;
alter table public.fp_profiles enable row level security;
alter table public.fp_employees enable row level security;
alter table public.fp_generation_logs enable row level security;

create policy "fp admins manage units" on public.fp_units
for all to authenticated using ((select private.fp_is_admin())) with check ((select private.fp_is_admin()));
create policy "fp admins manage profiles" on public.fp_profiles
for all to authenticated using ((select private.fp_is_admin())) with check ((select private.fp_is_admin()));
create policy "fp admins manage employees" on public.fp_employees
for all to authenticated using ((select private.fp_is_admin())) with check ((select private.fp_is_admin()));
create policy "fp admins manage logs" on public.fp_generation_logs
for all to authenticated using ((select private.fp_is_admin())) with check ((select private.fp_is_admin()));

revoke all on public.fp_units, public.fp_profiles, public.fp_employees, public.fp_generation_logs from anon;
grant select, insert, update, delete on public.fp_units, public.fp_profiles, public.fp_employees, public.fp_generation_logs to authenticated;

with unit as (
  insert into public.fp_units (secretariat, name)
  values ('SECRETARIA DE SAÚDE', 'UBSF NOVA SERTÂNIA')
  returning id
)
insert into public.fp_employees (name, job_title, employment_status, unit_id)
select employee.name, employee.job_title, employee.employment_status, unit.id
from unit
cross join (values
  ('MARIA LAURA PHAELANTE COSTA GUERRA', 'MÉDICA', 'EFETIVO'),
  ('JUNIO HENRIQUE NUNES EUZEBIO', 'TÉCNICO DE ENFERMAGEM', 'CONTRATO'),
  ('ADRIANA SILVA GUIMARÃES AMORIM', 'RECEPCIONISTA', 'BCC'),
  ('MÉRCIA FEITOSA E SILVA', 'SERVIÇOS GERAIS', 'BCC'),
  ('DIVIANE BATISTA MARQUES', 'ENFERMEIRA', 'EFETIVO'),
  ('TALITA FREIRE DE SIQUEIRA', 'AUXILIAR DE SAÚDE BUCAL', 'EFETIVO'),
  ('ROBERTA MASCENA AMORIM PIRES', 'DENTISTA', 'EFETIVO'),
  ('THYALLE LAIS GOIS DE REZENDE', 'MÉDICA', 'CONTRATO'),
  ('MARIA FERNANDA PAULINO NOGUEIRA NUNES', 'ENFERMEIRA', 'CONTRATO'),
  ('MATHEUS ANDRADE DE SOUZA', 'MÉDICO', 'PROGRAMA MAIS MÉDICO')
) as employee(name, job_title, employment_status);
