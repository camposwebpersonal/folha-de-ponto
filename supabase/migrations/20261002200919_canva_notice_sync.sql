create extension if not exists pg_net;
create extension if not exists pg_cron;

create table public.fp_canva_connections (
  id text primary key default 'primary' check (id = 'primary'),
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  scope text,
  connected_by uuid references auth.users(id) on delete set null,
  last_sync_at timestamptz,
  last_error text,
  sync_locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.fp_canva_oauth_states (
  state text primary key,
  code_verifier text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.fp_notice_assets (
  id text primary key,
  title text not null,
  description text not null,
  format text not null,
  design_id text not null,
  canva_edit_url text not null,
  storage_bucket text not null,
  image_path text not null,
  pdf_path text not null,
  version bigint not null default 0,
  source_updated_at bigint,
  synced_at timestamptz,
  sync_status text not null default 'pending'
    check (sync_status in ('pending', 'syncing', 'ready', 'error')),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.fp_notice_assets (
  id,
  title,
  description,
  format,
  design_id,
  canva_edit_url,
  storage_bucket,
  image_path,
  pdf_path
) values (
  'renovacao-receitas',
  'Renovação de receitas',
  'Orientações sobre entrega, renovação e retirada de receitas na UBSF Nova Sertânia.',
  'A4 retrato',
  'DAHW4szl_h0',
  'https://www.canva.com/d/szDFoM-Jyf3gA-m',
  'notice-assets',
  'renovacao-receitas/aviso.png',
  'renovacao-receitas/aviso.pdf'
)
on conflict (id) do update set
  design_id = excluded.design_id,
  canva_edit_url = excluded.canva_edit_url,
  storage_bucket = excluded.storage_bucket,
  image_path = excluded.image_path,
  pdf_path = excluded.pdf_path;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'notice-assets',
  'notice-assets',
  true,
  52428800,
  array['image/png', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create trigger fp_canva_connections_touch_updated_at
before update on public.fp_canva_connections
for each row execute function public.fp_touch_updated_at();

create trigger fp_notice_assets_touch_updated_at
before update on public.fp_notice_assets
for each row execute function public.fp_touch_updated_at();

alter table public.fp_canva_connections enable row level security;
alter table public.fp_canva_oauth_states enable row level security;
alter table public.fp_notice_assets enable row level security;

create policy "fp admins view notice assets" on public.fp_notice_assets
for select to authenticated using ((select private.fp_is_admin()));

revoke all on public.fp_canva_connections, public.fp_canva_oauth_states from anon, authenticated;
revoke all on public.fp_notice_assets from anon;
grant select on public.fp_notice_assets to authenticated;

grant select, insert, update, delete on public.fp_canva_connections to service_role;
grant select, insert, update, delete on public.fp_canva_oauth_states to service_role;
grant select, insert, update, delete on public.fp_notice_assets to service_role;

create function public.fp_set_canva_credentials(
  p_client_id text,
  p_client_secret text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  client_id_secret uuid;
  client_secret_secret uuid;
begin
  if length(btrim(p_client_id)) < 3 or length(btrim(p_client_secret)) < 8 then
    raise exception 'Credenciais do Canva inválidas';
  end if;

  select id into client_id_secret
  from vault.secrets
  where name = 'canva_client_id';

  if client_id_secret is null then
    perform vault.create_secret(btrim(p_client_id), 'canva_client_id', 'Canva OAuth Client ID');
  else
    perform vault.update_secret(client_id_secret, btrim(p_client_id));
  end if;

  select id into client_secret_secret
  from vault.secrets
  where name = 'canva_client_secret';

  if client_secret_secret is null then
    perform vault.create_secret(btrim(p_client_secret), 'canva_client_secret', 'Canva OAuth Client Secret');
  else
    perform vault.update_secret(client_secret_secret, btrim(p_client_secret));
  end if;
end;
$$;

create function public.fp_get_canva_secret(p_name text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = p_name
  limit 1;
$$;

create function public.fp_claim_canva_sync()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed boolean := false;
begin
  update public.fp_canva_connections
  set sync_locked_until = now() + interval '3 minutes'
  where id = 'primary'
    and (sync_locked_until is null or sync_locked_until < now())
  returning true into claimed;

  return coalesce(claimed, false);
end;
$$;

revoke all on function public.fp_set_canva_credentials(text, text) from public, anon, authenticated;
revoke all on function public.fp_get_canva_secret(text) from public, anon, authenticated;
revoke all on function public.fp_claim_canva_sync() from public, anon, authenticated;
grant execute on function public.fp_set_canva_credentials(text, text) to service_role;
grant execute on function public.fp_get_canva_secret(text) to service_role;
grant execute on function public.fp_claim_canva_sync() to service_role;

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'canva_sync_cron_secret') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'canva_sync_cron_secret',
      'Autorização interna do agendador Canva'
    );
  end if;
end;
$$;

select cron.unschedule(jobid)
from cron.job
where jobname = 'canva-notice-sync-every-minute';

select cron.schedule(
  'canva-notice-sync-every-minute',
  '* * * * *',
  $job$
    select net.http_post(
      url := 'https://xwlmpxypjheuhbxyfplo.supabase.co/functions/v1/canva-sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'canva_sync_cron_secret'
          limit 1
        )
      ),
      body := '{"action":"sync"}'::jsonb,
      timeout_milliseconds := 120000
    );
  $job$
);
