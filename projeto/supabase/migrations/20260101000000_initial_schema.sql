-- ============================================================================
-- 20260101000000_initial_schema.sql
--
-- PsiquèIA base schema. Tables here are inferred from `.from(...)` /
-- `.rpc(...)` call sites in `projeto/services/**` and
-- `projeto/supabase/functions/**`. Every table has RLS enabled in this file
-- but the policies themselves live in 20260101000100_rls_policies.sql so a
-- later policy refactor doesn't force a CREATE TABLE rewrite.
--
-- Ownership model: a row in `auth.users` is the single source of truth for
-- user identity. `user_profiles.id` is FK = `auth.users.id` and is populated
-- by the `handle_new_user()` trigger. Specialty profiles
-- (`psychologist_profiles`, etc.) reference `auth.users.id` via `user_id`.
--
-- Idempotency: tables and indexes use `IF NOT EXISTS`. Functions use
-- `CREATE OR REPLACE`. Triggers use a `DROP TRIGGER IF EXISTS` guard.
-- ============================================================================

-- Extensions required by the schema.
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- user_profiles
-- One row per auth user. Created automatically by handle_new_user().
-- ---------------------------------------------------------------------------
create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  phone text,
  birth_date date,
  avatar_url text,
  user_type text not null check (user_type in ('patient', 'psychologist')),
  onboarding_completed boolean not null default false,
  push_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_profiles_user_type_idx on public.user_profiles(user_type);
create index if not exists user_profiles_email_idx on public.user_profiles(email);

drop trigger if exists user_profiles_set_updated_at on public.user_profiles;
create trigger user_profiles_set_updated_at
  before update on public.user_profiles
  for each row execute function public.set_updated_at();

alter table public.user_profiles enable row level security;

-- ---------------------------------------------------------------------------
-- psychologist_profiles
-- Extra fields specific to a psychologist (CRP, CFP, rates, availability).
-- `cfp_number` is a new column being introduced in this migration (see
-- Front A task #6) — pattern checked against "NN/NNNN" up to "NN/NNNNNN".
-- ---------------------------------------------------------------------------
create table if not exists public.psychologist_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  crp text,
  cfp_number text check (cfp_number is null or cfp_number ~ '^[0-9]{2}/[0-9]{4,6}$'),
  specializations text[] not null default '{}',
  bio text,
  session_price numeric(10, 2),
  session_duration int not null default 50,
  approach text,
  available_days text[] not null default '{}',
  available_hours jsonb not null default '{}'::jsonb,
  rating numeric(3, 2) not null default 0,
  total_sessions int not null default 0,
  stripe_account_id text,
  stripe_onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists psychologist_profiles_user_id_idx on public.psychologist_profiles(user_id);

drop trigger if exists psychologist_profiles_set_updated_at on public.psychologist_profiles;
create trigger psychologist_profiles_set_updated_at
  before update on public.psychologist_profiles
  for each row execute function public.set_updated_at();

alter table public.psychologist_profiles enable row level security;

-- ---------------------------------------------------------------------------
-- patient_psychologist
-- Many-to-one relation linking a patient to their psychologist. Codebase
-- assumes at most one active relation per patient, but the UNIQUE constraint
-- below is on the pair regardless of status — duplicates of (patient,
-- psychologist) at all are nonsensical and would break `.single()` reads in
-- services/patientPsychologistService.ts (see comments there for context).
-- ---------------------------------------------------------------------------
create table if not exists public.patient_psychologist (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references auth.users(id) on delete cascade,
  psychologist_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('active', 'pending', 'inactive')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  constraint patient_psychologist_unique_pair unique (patient_id, psychologist_id)
);

create index if not exists patient_psychologist_patient_idx on public.patient_psychologist(patient_id);
create index if not exists patient_psychologist_psychologist_idx on public.patient_psychologist(psychologist_id);
create index if not exists patient_psychologist_status_idx on public.patient_psychologist(status);

alter table public.patient_psychologist enable row level security;

-- ---------------------------------------------------------------------------
-- appointments
-- Status enum includes 'scheduled' because services/appointmentService.ts
-- filters on it (`status in ('scheduled','confirmed')`). The plan doc lists
-- 'pending' as a synonym — kept both so neither side breaks.
-- ---------------------------------------------------------------------------
create table if not exists public.appointments (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references auth.users(id) on delete cascade,
  psychologist_id uuid not null references auth.users(id) on delete cascade,
  scheduled_at timestamptz not null,
  duration_minutes int not null default 50,
  status text not null default 'scheduled' check (
    status in ('pending', 'scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')
  ),
  payment_status text not null default 'unpaid' check (
    payment_status in ('unpaid', 'pending', 'paid', 'refunded')
  ),
  session_price numeric(10, 2),
  amount numeric(10, 2),
  patient_notes text,
  psychologist_notes text,
  session_notes text,
  meet_link text,
  google_meet_link text,
  meeting_link text,
  google_calendar_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists appointments_patient_idx on public.appointments(patient_id);
create index if not exists appointments_psychologist_idx on public.appointments(psychologist_id);
create index if not exists appointments_scheduled_at_idx on public.appointments(scheduled_at);
create index if not exists appointments_status_idx on public.appointments(status);

drop trigger if exists appointments_set_updated_at on public.appointments;
create trigger appointments_set_updated_at
  before update on public.appointments
  for each row execute function public.set_updated_at();

alter table public.appointments enable row level security;

-- ---------------------------------------------------------------------------
-- diary_entries
-- Patient-owned clinical data. `is_shared` lets the linked psychologist
-- SELECT a row (see RLS policies file).
-- `entry_date` is kept because diaryService.ts filters/orders by it.
-- ---------------------------------------------------------------------------
create table if not exists public.diary_entries (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null default current_date,
  mood text check (mood in ('muito_bem', 'bem', 'neutro', 'mal', 'muito_mal')),
  mood_intensity int check (mood_intensity is null or (mood_intensity between 1 and 10)),
  emotions text[] not null default '{}',
  content text,
  attachments text[] not null default '{}',
  is_shared boolean not null default false,
  shared_with uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists diary_entries_patient_idx on public.diary_entries(patient_id);
create index if not exists diary_entries_shared_with_idx on public.diary_entries(shared_with) where is_shared = true;
create index if not exists diary_entries_entry_date_idx on public.diary_entries(entry_date desc);

drop trigger if exists diary_entries_set_updated_at on public.diary_entries;
create trigger diary_entries_set_updated_at
  before update on public.diary_entries
  for each row execute function public.set_updated_at();

alter table public.diary_entries enable row level security;

-- ---------------------------------------------------------------------------
-- financial_transactions
-- Authoritative ledger written by stripe-payment Edge Function (service
-- role). All money flows here. updated_at is included because
-- financialService.updateTransactionStatus() sets it.
-- ---------------------------------------------------------------------------
create table if not exists public.financial_transactions (
  id uuid primary key default uuid_generate_v4(),
  appointment_id uuid references public.appointments(id) on delete set null,
  psychologist_id uuid not null references auth.users(id) on delete cascade,
  patient_id uuid references auth.users(id) on delete set null,
  transaction_type text not null check (
    transaction_type in ('session_payment', 'subscription', 'refund', 'payout')
  ),
  amount numeric(12, 2) not null,
  currency text not null default 'brl',
  status text not null default 'pending' check (
    status in ('pending', 'completed', 'failed', 'refunded')
  ),
  stripe_payment_id text,
  stripe_payout_id text,
  description text,
  transaction_date timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists financial_transactions_psychologist_idx on public.financial_transactions(psychologist_id);
create index if not exists financial_transactions_patient_idx on public.financial_transactions(patient_id);
create index if not exists financial_transactions_appointment_idx on public.financial_transactions(appointment_id);
create index if not exists financial_transactions_stripe_payment_idx on public.financial_transactions(stripe_payment_id);
create index if not exists financial_transactions_transaction_date_idx on public.financial_transactions(transaction_date desc);

drop trigger if exists financial_transactions_set_updated_at on public.financial_transactions;
create trigger financial_transactions_set_updated_at
  before update on public.financial_transactions
  for each row execute function public.set_updated_at();

alter table public.financial_transactions enable row level security;

-- ---------------------------------------------------------------------------
-- analytics_events
-- Append-only telemetry. user_id is nullable so anonymous events can land
-- (e.g. landing page hits) — but RLS still requires INSERT to be from an
-- authenticated session.
-- ---------------------------------------------------------------------------
create table if not exists public.analytics_events (
  id uuid primary key default uuid_generate_v4(),
  event_name text not null,
  user_id uuid references auth.users(id) on delete set null,
  properties jsonb,
  timestamp timestamptz not null default now()
);

create index if not exists analytics_events_user_idx on public.analytics_events(user_id);
create index if not exists analytics_events_name_idx on public.analytics_events(event_name);
create index if not exists analytics_events_ts_idx on public.analytics_events(timestamp desc);

alter table public.analytics_events enable row level security;

-- ---------------------------------------------------------------------------
-- notifications
-- One row per delivered notification. push-notifications Edge Function
-- inserts these; the app marks them read.
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  data jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_unread_idx on public.notifications(user_id, read) where read = false;
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);

alter table public.notifications enable row level security;

-- ---------------------------------------------------------------------------
-- ai_interactions
-- Chat history for the AI agent. Owned by the user.
-- ---------------------------------------------------------------------------
create table if not exists public.ai_interactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  interaction_type text not null,
  context jsonb,
  user_message text,
  ai_response text,
  created_at timestamptz not null default now()
);

create index if not exists ai_interactions_user_idx on public.ai_interactions(user_id, created_at desc);

alter table public.ai_interactions enable row level security;

-- ---------------------------------------------------------------------------
-- invitations
-- Server-issued codes that gate signup. Service role only — invitations are
-- created from the admin tooling and consumed by create-admin-user.
-- ---------------------------------------------------------------------------
create table if not exists public.invitations (
  id uuid primary key default uuid_generate_v4(),
  email text not null,
  invitation_code text not null unique,
  user_type text not null check (user_type in ('patient', 'psychologist')),
  invited_by uuid references auth.users(id) on delete set null,
  used boolean not null default false,
  used_at timestamptz,
  used_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists invitations_email_idx on public.invitations(lower(email));
create index if not exists invitations_code_idx on public.invitations(invitation_code);

alter table public.invitations enable row level security;

-- ---------------------------------------------------------------------------
-- psychologist_availability
-- Weekly recurring availability slots (day_of_week 0=Sun..6=Sat).
-- ---------------------------------------------------------------------------
create table if not exists public.psychologist_availability (
  id uuid primary key default uuid_generate_v4(),
  psychologist_id uuid not null references auth.users(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  constraint psychologist_availability_time_order check (start_time < end_time)
);

create index if not exists psychologist_availability_psychologist_idx on public.psychologist_availability(psychologist_id);
create index if not exists psychologist_availability_day_idx on public.psychologist_availability(psychologist_id, day_of_week);

alter table public.psychologist_availability enable row level security;

-- ===========================================================================
-- Functions
-- ===========================================================================

-- handle_new_user(): trigger on auth.users that materialises the
-- user_profiles row from auth metadata. Referenced by the comment in
-- create-admin-user/index.ts ("Profiles are created automatically by the
-- handle_new_user trigger").
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.user_profiles (id, email, full_name, phone, birth_date, user_type)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), new.email),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    case
      when nullif(new.raw_user_meta_data ->> 'birth_date', '') is null then null
      else (new.raw_user_meta_data ->> 'birth_date')::date
    end,
    coalesce(nullif(new.raw_user_meta_data ->> 'user_type', ''), 'patient')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- generate_invitation_code(): random 10-char uppercase alphanumeric token.
-- Called from services/invitationService.createInvitation().
create or replace function public.generate_invitation_code()
returns text
language plpgsql
volatile
as $$
declare
  alphabet text := 'ABCDEFGHIJKLMNPQRSTUVWXYZ23456789';
  code text;
  attempt int := 0;
  exists_check boolean;
begin
  loop
    code := '';
    for _i in 1..10 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    select exists(select 1 from public.invitations where invitation_code = code) into exists_check;
    exit when not exists_check;
    attempt := attempt + 1;
    if attempt > 8 then
      -- Astronomically unlikely, but fall back to a guaranteed-unique value
      -- rather than spin forever.
      code := 'INV-' || replace(uuid_generate_v4()::text, '-', '');
      exit;
    end if;
  end loop;
  return code;
end;
$$;

-- validate_invitation(p_code, p_email): used by the app at signup time as
-- a non-locking pre-flight check (the locking + state mutation belongs to
-- consume_invitation, defined in 20260101000200_atomic_invitation.sql).
create or replace function public.validate_invitation(p_code text, p_email text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  inv public.invitations%rowtype;
begin
  select * into inv from public.invitations where invitation_code = p_code;
  if not found then
    return jsonb_build_object('valid', false, 'error', 'Convite não encontrado');
  end if;
  if inv.used then
    return jsonb_build_object('valid', false, 'error', 'Convite já utilizado');
  end if;
  if inv.expires_at < now() then
    return jsonb_build_object('valid', false, 'error', 'Convite expirado');
  end if;
  if lower(inv.email) <> lower(p_email) then
    return jsonb_build_object('valid', false, 'error', 'Email não corresponde ao convite');
  end if;
  return jsonb_build_object('valid', true, 'user_type', inv.user_type, 'email', inv.email);
end;
$$;

-- mark_invitation_used(p_code, p_user_id): legacy single-step mutation kept
-- for backwards compatibility (services/invitationService.markInvitationUsed
-- still references it). New callers should prefer consume_invitation.
create or replace function public.mark_invitation_used(p_code text, p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  updated_count int;
begin
  update public.invitations
     set used = true,
         used_at = now(),
         used_by = p_user_id
   where invitation_code = p_code
     and used = false
     and expires_at >= now();
  get diagnostics updated_count = row_count;
  return updated_count > 0;
end;
$$;

-- health_check(): aggregate of basic platform stats, called from
-- services/healthService.checkSystemHealth(). Returns the exact shape
-- healthService expects: { status, timestamp, stats: {...} }.
create or replace function public.health_check()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_total_users int;
  v_total_patients int;
  v_total_psychologists int;
  v_total_appointments int;
begin
  select count(*) into v_total_users from public.user_profiles;
  select count(*) into v_total_patients from public.user_profiles where user_type = 'patient';
  select count(*) into v_total_psychologists from public.user_profiles where user_type = 'psychologist';
  select count(*) into v_total_appointments from public.appointments;
  return jsonb_build_object(
    'status', 'healthy',
    'timestamp', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'stats', jsonb_build_object(
      'total_users', v_total_users,
      'total_patients', v_total_patients,
      'total_psychologists', v_total_psychologists,
      'total_appointments', v_total_appointments
    )
  );
end;
$$;

grant execute on function public.health_check() to authenticated, anon;
grant execute on function public.validate_invitation(text, text) to authenticated, anon;
grant execute on function public.mark_invitation_used(text, uuid) to service_role;
grant execute on function public.generate_invitation_code() to service_role;

-- 20260101000000_initial_schema.sql — base tables, triggers, and core RPCs
