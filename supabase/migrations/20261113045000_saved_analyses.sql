create table public.saved_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  analysis jsonb not null,
  constraint saved_analyses_analysis_is_object check (jsonb_typeof(analysis) = 'object'),
  constraint saved_analyses_analysis_size check (octet_length(analysis::text) <= 100000)
);

create index saved_analyses_user_created_idx
  on public.saved_analyses (user_id, created_at desc);

revoke all on table public.saved_analyses from public;
revoke all on table public.saved_analyses from anon;
grant select, insert on table public.saved_analyses to authenticated;
grant select, insert on table public.saved_analyses to service_role;

alter table public.saved_analyses enable row level security;

create policy "Students read their own analyses"
  on public.saved_analyses
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Students insert their own analyses"
  on public.saved_analyses
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
