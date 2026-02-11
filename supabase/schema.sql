-- Forsig schema (Supabase / Postgres)
-- Run in Supabase SQL editor.

create extension if not exists pgcrypto;

-- Users are in auth.users (Supabase Auth). We'll store app profile + role.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- One OpenAI key per user for now.
create table if not exists public.provider_keys (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  provider text not null default 'openai',
  encrypted_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  status text not null default 'active', -- active|frozen
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Allowance keys (store only hash)
create table if not exists public.allowance_keys (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  key_hash text not null unique,
  prefix text not null, -- first 8 chars to help identify
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

-- Policy per agent
create table if not exists public.agent_policies (
  agent_id uuid primary key references public.agents(id) on delete cascade,
  balance_cents int not null default 0,
  currency text not null default 'USD',
  allowed_models text[] not null default array[]::text[],
  circuit_breaker_n int not null default 10,
  velocity_window_seconds int not null default 3600,
  velocity_cap_cents int not null default 50,
  webhook_url text,
  webhook_secret text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Spend events (optional analytics)
create table if not exists public.spend_events (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  user_id uuid not null,
  provider text not null default 'openai',
  ts timestamptz not null default now(),
  model text,
  prompt_tokens int,
  completion_tokens int,
  cost_cents int not null,
  request_id text
);
-- RLS
alter table public.profiles enable row level security;
alter table public.provider_keys enable row level security;
alter table public.agents enable row level security;
alter table public.allowance_keys enable row level security;
alter table public.agent_policies enable row level security;
alter table public.spend_events enable row level security;

-- Profiles: user can read/update own profile.
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- Provider keys: user can CRUD own provider key.
create policy "provider_keys_select_own" on public.provider_keys
  for select using (auth.uid() = user_id);
create policy "provider_keys_insert_own" on public.provider_keys
  for insert with check (auth.uid() = user_id);
create policy "provider_keys_update_own" on public.provider_keys
  for update using (auth.uid() = user_id);
create policy "provider_keys_delete_own" on public.provider_keys
  for delete using (auth.uid() = user_id);

-- Agents
create policy "agents_select_own" on public.agents
  for select using (auth.uid() = user_id);
create policy "agents_insert_own" on public.agents
  for insert with check (auth.uid() = user_id);
create policy "agents_update_own" on public.agents
  for update using (auth.uid() = user_id);
create policy "agents_delete_own" on public.agents
  for delete using (auth.uid() = user_id);

-- Allowance keys
create policy "allowance_keys_select_own" on public.allowance_keys
  for select using (
    exists (
      select 1 from public.agents a
      where a.id = allowance_keys.agent_id and a.user_id = auth.uid()
    )
  );
create policy "allowance_keys_insert_own" on public.allowance_keys
  for insert with check (
    exists (
      select 1 from public.agents a
      where a.id = allowance_keys.agent_id and a.user_id = auth.uid()
    )
  );
create policy "allowance_keys_update_own" on public.allowance_keys
  for update using (
    exists (
      select 1 from public.agents a
      where a.id = allowance_keys.agent_id and a.user_id = auth.uid()
    )
  );

-- Agent policies
create policy "agent_policies_select_own" on public.agent_policies
  for select using (
    exists (
      select 1 from public.agents a
      where a.id = agent_policies.agent_id and a.user_id = auth.uid()
    )
  );
create policy "agent_policies_upsert_own" on public.agent_policies
  for insert with check (
    exists (
      select 1 from public.agents a
      where a.id = agent_policies.agent_id and a.user_id = auth.uid()
    )
  );
create policy "agent_policies_update_own" on public.agent_policies
  for update using (
    exists (
      select 1 from public.agents a
      where a.id = agent_policies.agent_id and a.user_id = auth.uid()
    )
  );

-- Spend events select own
create policy "spend_events_select_own" on public.spend_events
  for select using (
    exists (
      select 1 from public.agents a
      where a.id = spend_events.agent_id and a.user_id = auth.uid()
    )
  );

-- Admin helpers: allow admins to see all
create policy "profiles_select_admin" on public.profiles
  for select using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));
create policy "agents_select_admin" on public.agents
  for select using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));
create policy "agent_policies_select_admin" on public.agent_policies
  for select using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));
create policy "allowance_keys_select_admin" on public.allowance_keys
  for select using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));
create policy "provider_keys_select_admin" on public.provider_keys
  for select using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));
create policy "spend_events_select_admin" on public.spend_events
  for select using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

-- Trigger to auto-create profile row
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Convenience view: agent with policy
create or replace view public.agents_with_policy as
select a.*, p.balance_cents, p.allowed_models, p.circuit_breaker_n, p.velocity_window_seconds, p.velocity_cap_cents, p.webhook_url, p.webhook_secret
from public.agents a
left join public.agent_policies p on p.agent_id = a.id;

create or replace view public.agent_spend_summary as
select
  se.agent_id,
  min(se.ts) as first_ts,
  max(se.ts) as last_ts,
  count(*) as request_count,
  coalesce(sum(se.prompt_tokens), 0) as prompt_tokens,
  coalesce(sum(se.completion_tokens), 0) as completion_tokens,
  coalesce(sum(se.cost_cents), 0) as cost_cents
from public.spend_events se
group by se.agent_id;

create or replace view public.agent_spend_by_model as
select
  se.agent_id,
  se.model,
  count(*) as request_count,
  coalesce(sum(se.prompt_tokens), 0) as prompt_tokens,
  coalesce(sum(se.completion_tokens), 0) as completion_tokens,
  coalesce(sum(se.cost_cents), 0) as cost_cents
from public.spend_events se
group by se.agent_id, se.model;

-- Pricing
create table if not exists public.model_pricing (
  model text primary key,
  input_per_1m numeric not null,
  output_per_1m numeric not null,
  cached_input_per_1m numeric
);

