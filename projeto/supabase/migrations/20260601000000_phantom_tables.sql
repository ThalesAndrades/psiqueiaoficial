-- ============================================================================
-- 20260601000000_phantom_tables.sql
--
-- Cria as 4 tabelas que estavam sendo usadas por services mas não existiam
-- em nenhuma migration (auditoria de 2026-05-29):
--   - patient_profiles  (services/profileService.ts)
--   - treatment_plans   (services/treatmentService.ts)
--   - shared_documents  (services/documentService.ts)
--   - audit_log         (services/auditService.ts)
--
-- Antes desta migration, qualquer chamada a getPatientProfile,
-- getTreatmentPlans, getSharedDocuments ou getAuditLogs retornava PGRST205
-- (tabela não encontrada). Todas as colunas vêm das interfaces TS
-- correspondentes em services/.
--
-- Idempotente: usa CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS,
-- e DROP POLICY IF EXISTS antes de cada CREATE POLICY.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- patient_profiles — informações extras de paciente (1:1 com user_profiles
-- via user_id). Mantemos separado de user_profiles porque os campos aqui são
-- específicos do papel "paciente" (anamnese, histórico clínico, contato de
-- emergência) e não fazem sentido para psicólogos.
-- ---------------------------------------------------------------------------
create table if not exists public.patient_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  birth_date date,
  gender text check (gender is null or gender in ('feminino', 'masculino', 'nao_binario', 'prefiro_nao_dizer', 'outro')),
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_contact_relationship text,
  medical_history text,
  current_medications text,
  allergies text,
  presenting_concerns text,
  previous_therapy boolean default false,
  previous_therapy_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists patient_profiles_user_id_idx on public.patient_profiles(user_id);

drop trigger if exists patient_profiles_set_updated_at on public.patient_profiles;
create trigger patient_profiles_set_updated_at
  before update on public.patient_profiles
  for each row execute function public.set_updated_at();

alter table public.patient_profiles enable row level security;

drop policy if exists patient_profiles_select_own on public.patient_profiles;
create policy patient_profiles_select_own
  on public.patient_profiles
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists patient_profiles_select_linked_psychologist on public.patient_profiles;
create policy patient_profiles_select_linked_psychologist
  on public.patient_profiles
  for select
  to authenticated
  using (
    exists (
      select 1 from public.patient_psychologist pp
      where pp.patient_id = patient_profiles.user_id
        and pp.psychologist_id = auth.uid()
        and pp.status = 'active'
    )
  );

drop policy if exists patient_profiles_insert_own on public.patient_profiles;
create policy patient_profiles_insert_own
  on public.patient_profiles
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists patient_profiles_update_own on public.patient_profiles;
create policy patient_profiles_update_own
  on public.patient_profiles
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- treatment_plans — plano terapêutico que o psicólogo cria e atualiza.
-- ---------------------------------------------------------------------------
create table if not exists public.treatment_plans (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references auth.users(id) on delete cascade,
  psychologist_id uuid not null references auth.users(id) on delete cascade,
  plan_name text not null,
  description text,
  goals text[] not null default '{}',
  strategies text[] not null default '{}',
  frequency text,
  duration_weeks integer check (duration_weeks is null or duration_weeks > 0),
  status text not null default 'active' check (status in ('active', 'completed', 'paused', 'cancelled')),
  start_date date not null default current_date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists treatment_plans_patient_idx on public.treatment_plans(patient_id);
create index if not exists treatment_plans_psychologist_idx on public.treatment_plans(psychologist_id);
create index if not exists treatment_plans_active_idx on public.treatment_plans(patient_id, psychologist_id) where status = 'active';

drop trigger if exists treatment_plans_set_updated_at on public.treatment_plans;
create trigger treatment_plans_set_updated_at
  before update on public.treatment_plans
  for each row execute function public.set_updated_at();

alter table public.treatment_plans enable row level security;

drop policy if exists treatment_plans_select_party on public.treatment_plans;
create policy treatment_plans_select_party
  on public.treatment_plans
  for select
  to authenticated
  using (auth.uid() = patient_id or auth.uid() = psychologist_id);

-- Psychologist owns the plan: only they can create/update. Patient is
-- read-only — they cannot rewrite their own treatment plan.
drop policy if exists treatment_plans_insert_psychologist on public.treatment_plans;
create policy treatment_plans_insert_psychologist
  on public.treatment_plans
  for insert
  to authenticated
  with check (
    auth.uid() = psychologist_id
    and exists (
      select 1 from public.patient_psychologist pp
      where pp.patient_id = treatment_plans.patient_id
        and pp.psychologist_id = auth.uid()
        and pp.status = 'active'
    )
  );

drop policy if exists treatment_plans_update_psychologist on public.treatment_plans;
create policy treatment_plans_update_psychologist
  on public.treatment_plans
  for update
  to authenticated
  using (auth.uid() = psychologist_id)
  with check (auth.uid() = psychologist_id);

drop policy if exists treatment_plans_delete_psychologist on public.treatment_plans;
create policy treatment_plans_delete_psychologist
  on public.treatment_plans
  for delete
  to authenticated
  using (auth.uid() = psychologist_id);

-- ---------------------------------------------------------------------------
-- shared_documents — anexos compartilhados (Google Drive ou armazenamento
-- próprio) entre psicólogo e paciente. patient_id é opcional porque um
-- psicólogo pode compartilhar com vários pacientes via relação.
-- ---------------------------------------------------------------------------
create table if not exists public.shared_documents (
  id uuid primary key default gen_random_uuid(),
  psychologist_id uuid not null references auth.users(id) on delete cascade,
  patient_id uuid references auth.users(id) on delete cascade,
  google_drive_id text,
  file_name text not null,
  file_type text not null,
  file_size bigint,
  drive_url text not null,
  thumbnail_url text,
  description text,
  shared_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shared_documents_psychologist_idx on public.shared_documents(psychologist_id);
create index if not exists shared_documents_patient_idx on public.shared_documents(patient_id);
create index if not exists shared_documents_shared_at_idx on public.shared_documents(shared_at desc);

drop trigger if exists shared_documents_set_updated_at on public.shared_documents;
create trigger shared_documents_set_updated_at
  before update on public.shared_documents
  for each row execute function public.set_updated_at();

alter table public.shared_documents enable row level security;

drop policy if exists shared_documents_select_party on public.shared_documents;
create policy shared_documents_select_party
  on public.shared_documents
  for select
  to authenticated
  using (
    auth.uid() = psychologist_id
    or auth.uid() = patient_id
    or (patient_id is null and exists (
      select 1 from public.patient_psychologist pp
      where pp.psychologist_id = shared_documents.psychologist_id
        and pp.patient_id = auth.uid()
        and pp.status = 'active'
    ))
  );

drop policy if exists shared_documents_insert_psychologist on public.shared_documents;
create policy shared_documents_insert_psychologist
  on public.shared_documents
  for insert
  to authenticated
  with check (auth.uid() = psychologist_id);

drop policy if exists shared_documents_update_psychologist on public.shared_documents;
create policy shared_documents_update_psychologist
  on public.shared_documents
  for update
  to authenticated
  using (auth.uid() = psychologist_id)
  with check (auth.uid() = psychologist_id);

drop policy if exists shared_documents_delete_psychologist on public.shared_documents;
create policy shared_documents_delete_psychologist
  on public.shared_documents
  for delete
  to authenticated
  using (auth.uid() = psychologist_id);

-- ---------------------------------------------------------------------------
-- audit_log — trilha imutável de operações sensíveis (admin/compliance).
-- Sem policies authenticated; apenas service_role grava (via Edge Function)
-- e o admin lê. Mantemos o usuário do request via auth.uid() quando
-- disponível.
-- ---------------------------------------------------------------------------
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  operation text not null check (operation in ('INSERT', 'UPDATE', 'DELETE')),
  user_id uuid references auth.users(id) on delete set null,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_table_idx on public.audit_log(table_name);
create index if not exists audit_log_user_idx on public.audit_log(user_id);
create index if not exists audit_log_created_idx on public.audit_log(created_at desc);

alter table public.audit_log enable row level security;

-- intentionally no `authenticated` policies — service_role only.

-- ---------------------------------------------------------------------------
-- analytics_events_summary() — RPC de agregação por event_name.
-- Substitui o select('event_name, count(*)') de analyticsService.ts que não
-- é uma sintaxe suportada pelo PostgREST.
-- ---------------------------------------------------------------------------
create or replace function public.analytics_events_summary(
  p_user_id uuid default null,
  p_start_date timestamptz default null,
  p_end_date timestamptz default null
)
returns table(event_name text, event_count bigint, last_seen timestamptz)
language sql
security invoker
set search_path = public
as $$
  select
    event_name,
    count(*) as event_count,
    max(timestamp) as last_seen
  from public.analytics_events
  where
    (p_user_id is null or user_id = p_user_id)
    and (p_start_date is null or timestamp >= p_start_date)
    and (p_end_date is null or timestamp <= p_end_date)
  group by event_name
  order by event_count desc;
$$;

grant execute on function public.analytics_events_summary(uuid, timestamptz, timestamptz)
  to authenticated, service_role;

-- 20260601000000_phantom_tables.sql — 4 phantom tables + agg RPC
