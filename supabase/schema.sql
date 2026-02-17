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
-- 1) Token-based pricing (per 1M tokens)
create table if not exists public.model_pricing_tokens (
  model text not null,
  modality text not null,       -- 'text' | 'audio' | 'image' | 'embeddings' | 'fine_tune' | 'legacy'
  tier text not null,           -- 'standard' | 'batch' | 'flex' | 'priority'
  input_per_1m numeric,         -- null allowed if '-'
  cached_input_per_1m numeric,  -- null allowed if '-'
  output_per_1m numeric,        -- null allowed if '-'
  notes text,
  updated_at timestamptz not null default now(),
  primary key (model, modality, tier)
);

-- 2) Unit-based pricing (per second / per image / per minute, etc.)
create table if not exists public.model_pricing_units (
  model text not null,
  modality text not null,   -- 'video' | 'image' | 'tts' | 'transcribe'
  unit text not null,       -- 'second' | 'image' | 'minute'
  tier text not null default 'standard',
  quality text,             -- e.g. 'low' | 'medium' | 'high' | 'standard' | 'hd'
  size text,                -- e.g. '1024x1024'
  price_per_unit numeric not null,
  notes text,
  updated_at timestamptz not null default now(),
  primary key (model, modality, unit, tier, quality, size)
);

-- =========================================================
-- Forsig: Waitlist + Founder inquiries + Forced password change
-- =========================================================

-- 1) Profiles: add must_change_password
alter table public.profiles
  add column if not exists must_change_password boolean not null default false;

-- 2) Waitlist table
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  company text,
  status text not null default 'pending', -- pending|approved|rejected
  created_at timestamptz not null default now(),
  approved_at timestamptz
);

-- Optional: store founder inquiries too (nice for tracking)
create table if not exists public.founder_inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  company text,
  role text,
  message text not null,
  monthly_spend text,
  created_at timestamptz not null default now()
);

-- Enable RLS (safe default)
alter table public.waitlist enable row level security;
alter table public.founder_inquiries enable row level security;

-- Allow anonymous inserts into waitlist (no select/update)
drop policy if exists waitlist_insert_any on public.waitlist;
create policy waitlist_insert_any
  on public.waitlist for insert
  with check (true);

-- Allow anonymous inserts into founder inquiries (no select/update)
drop policy if exists founder_inquiries_insert_any on public.founder_inquiries;
create policy founder_inquiries_insert_any
  on public.founder_inquiries for insert
  with check (true);

