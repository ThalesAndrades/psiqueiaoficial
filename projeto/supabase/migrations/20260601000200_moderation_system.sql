-- ============================================================================
-- 20260601000200_moderation_system.sql
--
-- Sistema de moderação v1: denúncias, designação de admin, e ações
-- (warning/suspension/ban). Schema, RLS e RPCs. PR C do refactor amplo.
--
-- Modelo:
--   1. user_reports — qualquer autenticado (paciente ou psicólogo)
--      denuncia outro usuário. Status inicia 'open' e migra para
--      'under_review' → 'resolved'|'dismissed'.
--   2. admin_users — lista explícita de quem pode moderar. Designar via
--      service_role (Edge Function admin-bootstrap, fora de escopo desta
--      migration; manualmente por enquanto).
--   3. moderation_actions — ação aplicada a um usuário (warning, 7d
--      suspension, permanent ban). Inclui motivo, expira_em, quem aplicou.
--   4. is_user_active(user_id) — RPC que retorna false se houver
--      moderation_action com type IN (suspension, ban) e expires_at no
--      futuro OU null (banido permanente). App e Edge Functions consultam
--      antes de operar.
--
-- Idempotente: CREATE IF NOT EXISTS + DROP POLICY IF EXISTS.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- admin_users — designação de moderadores. user_id é a referência ao
-- auth.users + um campo `role` para distinguir admin de super_admin no
-- futuro. created_by é quem promoveu (audit trail). created_at é quando.
-- ---------------------------------------------------------------------------
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('admin', 'super_admin')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.admin_users is
  'Designação explícita de moderadores. Bootstrap inicial é manual via service_role / SQL. Em produção, super_admin promove novos admins via dashboard.';

alter table public.admin_users enable row level security;

-- Sem policies authenticated — só service_role e o RPC is_admin() abaixo.

create or replace function public.is_admin(p_user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.admin_users where user_id = p_user_id
  );
$$;

grant execute on function public.is_admin(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- user_reports — denúncias de usuário sobre usuário.
-- reporter_id e reported_user_id são auth.users — não relacionamos a
-- patient_psychologist porque pode haver denúncia entre desconhecidos
-- (ex.: paciente vê psicólogo no diretório e denuncia perfil suspeito).
-- ---------------------------------------------------------------------------
create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in (
    'inappropriate_behavior',
    'harassment',
    'fraud',
    'fake_profile',
    'inappropriate_content',
    'ethical_violation',
    'other'
  )),
  description text,
  status text not null default 'open' check (status in (
    'open',
    'under_review',
    'resolved',
    'dismissed'
  )),
  reviewer_id uuid references auth.users(id) on delete set null,
  reviewer_notes text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_reports_no_self_report check (reporter_id <> reported_user_id)
);

create index if not exists user_reports_reporter_idx on public.user_reports(reporter_id);
create index if not exists user_reports_reported_idx on public.user_reports(reported_user_id);
create index if not exists user_reports_status_idx on public.user_reports(status);
create index if not exists user_reports_open_idx on public.user_reports(created_at desc) where status = 'open';

drop trigger if exists user_reports_set_updated_at on public.user_reports;
create trigger user_reports_set_updated_at
  before update on public.user_reports
  for each row execute function public.set_updated_at();

alter table public.user_reports enable row level security;

drop policy if exists user_reports_select_own on public.user_reports;
create policy user_reports_select_own
  on public.user_reports
  for select
  to authenticated
  using (auth.uid() = reporter_id);

drop policy if exists user_reports_select_admin on public.user_reports;
create policy user_reports_select_admin
  on public.user_reports
  for select
  to authenticated
  using (public.is_admin(auth.uid()));

drop policy if exists user_reports_insert_self on public.user_reports;
create policy user_reports_insert_self
  on public.user_reports
  for insert
  to authenticated
  with check (auth.uid() = reporter_id);

drop policy if exists user_reports_update_admin on public.user_reports;
create policy user_reports_update_admin
  on public.user_reports
  for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- moderation_actions — ações de moderação aplicadas a um usuário.
-- action_type: warning (sem efeito operacional, só registro), suspension
-- (bloqueia ações até expires_at), ban (bloqueia permanente; expires_at
-- null). report_id é opcional (admin pode agir sem denúncia prévia).
-- ---------------------------------------------------------------------------
create table if not exists public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null references auth.users(id) on delete cascade,
  report_id uuid references public.user_reports(id) on delete set null,
  action_type text not null check (action_type in ('warning', 'suspension', 'ban')),
  reason text not null,
  expires_at timestamptz,
  applied_by uuid not null references auth.users(id) on delete restrict,
  applied_at timestamptz not null default now(),
  -- Para ban: NULL = permanente. Para suspension: deve haver expires_at no
  -- futuro. Para warning: ignorado.
  constraint moderation_actions_suspension_has_expiry check (
    action_type <> 'suspension' or expires_at is not null
  ),
  constraint moderation_actions_warning_no_expiry check (
    action_type <> 'warning' or expires_at is null
  )
);

create index if not exists moderation_actions_target_idx on public.moderation_actions(target_user_id);
create index if not exists moderation_actions_active_idx on public.moderation_actions(target_user_id)
  where action_type in ('suspension', 'ban');
create index if not exists moderation_actions_report_idx on public.moderation_actions(report_id);

alter table public.moderation_actions enable row level security;

-- Target vê suas próprias ações (para entender por que foi suspenso).
drop policy if exists moderation_actions_select_target on public.moderation_actions;
create policy moderation_actions_select_target
  on public.moderation_actions
  for select
  to authenticated
  using (auth.uid() = target_user_id);

drop policy if exists moderation_actions_select_admin on public.moderation_actions;
create policy moderation_actions_select_admin
  on public.moderation_actions
  for select
  to authenticated
  using (public.is_admin(auth.uid()));

drop policy if exists moderation_actions_insert_admin on public.moderation_actions;
create policy moderation_actions_insert_admin
  on public.moderation_actions
  for insert
  to authenticated
  with check (public.is_admin(auth.uid()) and auth.uid() = applied_by);

-- ---------------------------------------------------------------------------
-- is_user_active(user_id) — verifica se o usuário tem ação de
-- suspension/ban ativa. Usado pelo app e por Edge Functions antes de
-- operações sensíveis (agendar, enviar mensagem, fazer pagamento).
-- Retorna { active: boolean, reason: text|null, until: timestamptz|null }.
-- ---------------------------------------------------------------------------
create or replace function public.is_user_active(p_user_id uuid default auth.uid())
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  with active_action as (
    select action_type, reason, expires_at
    from public.moderation_actions
    where target_user_id = p_user_id
      and action_type in ('suspension', 'ban')
      and (expires_at is null or expires_at > now())
    order by applied_at desc
    limit 1
  )
  select case
    when exists (select 1 from active_action) then jsonb_build_object(
      'active', false,
      'reason', (select reason from active_action),
      'until', (select expires_at from active_action),
      'action_type', (select action_type from active_action)
    )
    else jsonb_build_object('active', true, 'reason', null, 'until', null)
  end;
$$;

grant execute on function public.is_user_active(uuid) to authenticated, service_role;

comment on function public.is_user_active(uuid) is
  'Retorna {active, reason, until, action_type}. active=false quando o usuário tem suspension/ban ativa. Apps DEVEM checar isso no boot/login e em ações sensíveis.';

-- 20260601000200_moderation_system.sql — moderação v1
