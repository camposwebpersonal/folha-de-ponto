create table public.fp_time_off_balances (
  employee_id uuid primary key references public.fp_employees(id) on update cascade on delete cascade,
  balance_days integer not null default 0,
  observation text,
  observation_mode text not null default 'individual' check (observation_mode in ('individual', 'group')),
  observation_group_id uuid,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fp_time_off_balance_days_valid check (balance_days between 0 and 3660),
  constraint fp_time_off_observation_length check (observation is null or length(observation) <= 2000),
  constraint fp_time_off_group_consistency check (
    (observation_mode = 'individual' and observation_group_id is null)
    or (observation_mode = 'group' and observation_group_id is not null)
  )
);

create index fp_time_off_balances_updated_at_idx on public.fp_time_off_balances (updated_at desc);
create index fp_time_off_balances_group_idx on public.fp_time_off_balances (observation_group_id)
where observation_group_id is not null;

create table public.fp_time_off_generation_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  employee_ids uuid[] not null,
  employee_count integer not null check (employee_count > 0),
  copies_total integer not null check (copies_total > 0),
  pages_total integer not null check (pages_total > 0),
  file_name text not null,
  created_at timestamptz not null default now()
);

create index fp_time_off_generation_logs_created_at_idx
on public.fp_time_off_generation_logs (created_at desc);

create trigger fp_time_off_balances_touch_updated_at before update on public.fp_time_off_balances
for each row execute function public.fp_touch_updated_at();

alter table public.fp_time_off_balances enable row level security;
alter table public.fp_time_off_generation_logs enable row level security;

create policy "fp admins manage time off balances" on public.fp_time_off_balances
for all to authenticated
using ((select private.fp_is_admin()))
with check ((select private.fp_is_admin()));

create policy "fp admins manage time off generation logs" on public.fp_time_off_generation_logs
for all to authenticated
using ((select private.fp_is_admin()))
with check ((select private.fp_is_admin()));

revoke all on public.fp_time_off_balances, public.fp_time_off_generation_logs from anon;
grant select, insert, update, delete on public.fp_time_off_balances, public.fp_time_off_generation_logs to authenticated;
