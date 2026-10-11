create table public.fp_ultrasound_counters (
  id text primary key,
  unit_name text not null,
  counts jsonb not null default '{}'::jsonb,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fp_ultrasound_counter_id check (id = 'nova-sertania'),
  constraint fp_ultrasound_counter_unit_not_blank check (length(btrim(unit_name)) > 0),
  constraint fp_ultrasound_counter_counts_object check (jsonb_typeof(counts) = 'object')
);

create trigger fp_ultrasound_counters_touch_updated_at
before update on public.fp_ultrasound_counters
for each row execute function public.fp_touch_updated_at();

alter table public.fp_ultrasound_counters enable row level security;

create policy "fp admins manage ultrasound counters" on public.fp_ultrasound_counters
for all to authenticated
using ((select private.fp_is_admin()))
with check ((select private.fp_is_admin()));

revoke all on public.fp_ultrasound_counters from anon;
grant select, insert, update, delete on public.fp_ultrasound_counters to authenticated;
