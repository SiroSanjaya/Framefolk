create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  subscription_status text not null default 'inactive'
    check (subscription_status in ('inactive', 'active', 'past_due', 'cancelled')),
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function public.create_framefolk_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke all on function public.create_framefolk_profile() from public, anon, authenticated;

create trigger on_auth_user_created_framefolk
  after insert on auth.users
  for each row execute function public.create_framefolk_profile();

insert into public.profiles (user_id)
select id from auth.users
on conflict (user_id) do nothing;

create table public.user_projects (
  user_id uuid primary key references auth.users (id) on delete cascade,
  project jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.user_assets (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null unique,
  name text not null check (char_length(name) <= 300),
  content_type text not null,
  byte_size bigint not null check (byte_size >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.monthly_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  month_start date not null,
  completed_exports integer not null default 0 check (completed_exports >= 0),
  primary key (user_id, month_start),
  check (extract(day from month_start) = 1)
);

create table public.render_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  idempotency_key text not null check (char_length(idempotency_key) between 8 and 128),
  month_start date not null,
  duration_seconds integer not null check (duration_seconds > 0),
  resolution text not null check (resolution in ('720p', '1080p')),
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'completed', 'failed', 'cancelled')),
  object_path text,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, idempotency_key),
  check (extract(day from month_start) = 1)
);

create table public.ai_cost_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  month_start date not null,
  idempotency_key text not null check (char_length(idempotency_key) between 8 and 128),
  provider text not null check (provider in ('anthropic', 'gemini', 'runway', 'elevenlabs')),
  estimated_cost_idr bigint not null check (estimated_cost_idr > 0),
  actual_cost_idr bigint check (actual_cost_idr >= 0),
  status text not null default 'reserved'
    check (status in ('reserved', 'completed', 'released', 'reconciliation_required')),
  provider_task_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month_start, idempotency_key),
  check (extract(day from month_start) = 1)
);

create table public.payment_webhook_events (
  provider_event_id text primary key,
  user_id uuid references auth.users (id) on delete set null,
  event_type text not null,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.user_projects enable row level security;
alter table public.user_assets enable row level security;
alter table public.monthly_usage enable row level security;
alter table public.render_jobs enable row level security;
alter table public.ai_cost_reservations enable row level security;
alter table public.payment_webhook_events enable row level security;

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
create policy "Users can read their own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.user_projects from anon, authenticated;
grant select, insert, update, delete on public.user_projects to authenticated;
create policy "Users can manage their own project"
  on public.user_projects for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.user_assets from anon, authenticated;
grant select, insert, update, delete on public.user_assets to authenticated;
create policy "Users can manage their own assets"
  on public.user_assets for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.monthly_usage from anon, authenticated;
grant select on public.monthly_usage to authenticated;
create policy "Users can read their own usage"
  on public.monthly_usage for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.render_jobs from anon, authenticated;
grant select on public.render_jobs to authenticated;
create policy "Users can read their own render jobs"
  on public.render_jobs for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.ai_cost_reservations from anon, authenticated;
grant select on public.ai_cost_reservations to authenticated;
create policy "Users can read their own AI reservations"
  on public.ai_cost_reservations for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.payment_webhook_events from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'framefolk-assets',
  'framefolk-assets',
  false,
  157286400,
  array[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska',
    'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/m4a', 'audio/x-m4a',
    'audio/ogg', 'audio/aac', 'audio/flac', 'audio/x-flac'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Users can read assets in their own folder"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'framefolk-assets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "Users can upload assets in their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'framefolk-assets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "Users can update assets in their own folder"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'framefolk-assets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'framefolk-assets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "Users can delete assets in their own folder"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'framefolk-assets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
