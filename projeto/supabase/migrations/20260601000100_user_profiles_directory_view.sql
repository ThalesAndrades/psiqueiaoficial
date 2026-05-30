-- ============================================================================
-- 20260601000100_user_profiles_directory_view.sql
--
-- Etapa 1 de 2 do fix do leak de PII (auditoria B6). A policy SELECT atual
-- em user_profiles (`using (true)`) expõe email/phone/birth_date/push_token
-- a qualquer autenticado, porque o app usa user_profiles para o diretório
-- de psicólogos/pacientes.
--
-- Esta migration é NÃO-QUEBRADIVA: cria a view `user_profiles_directory`
-- com apenas colunas seguras (sem email/phone/birth_date/push_token) que os
-- clientes devem adotar para qualquer busca/listagem pública. A policy
-- restritiva em user_profiles entra em migration separada (etapa 2) APÓS
-- todos os clientes terem migrado para a view — isso evita quebrar embedded
-- joins (PostgREST) que ainda usam o caminho atual.
--
-- Idempotente: drop view if exists antes do create.
-- ============================================================================

drop view if exists public.user_profiles_directory cascade;

-- security_invoker: a view aplica as policies do caller, não as do owner.
-- Sem isso, a view rodaria com os privilégios do postgres e bypassaria RLS.
create view public.user_profiles_directory
with (security_invoker = true)
as
  select
    id,
    full_name,
    avatar_url,
    user_type,
    created_at
  from public.user_profiles;

comment on view public.user_profiles_directory is
  'Diretório público de usuários sem PII sensível. Use esta view sempre que precisar listar/buscar psicólogos ou pacientes (ex.: nova-sessao, diretório). Para o próprio perfil (com email/phone/birth_date), use user_profiles direto — a policy restritiva da etapa 2 garantirá que apenas o dono ou relação ativa em patient_psychologist veja a linha completa.';

grant select on public.user_profiles_directory to authenticated, anon;

-- ---------------------------------------------------------------------------
-- Cleanup: marca a RPC legada mark_invitation_used como deprecated. O
-- atomic consume_invitation (migration 20260101000200) substituiu o
-- caminho válido. Mantemos a função para backwards-compat de qualquer
-- caller esquecido, mas removeremos no próximo release.
-- ---------------------------------------------------------------------------
comment on function public.mark_invitation_used(text, uuid) is
  'DEPRECATED. Use consume_invitation() — atômica via SELECT FOR UPDATE. Esta função tem janela TOCTOU. Será removida em release futuro.';

-- 20260601000100_user_profiles_directory_view.sql — directory view + dep mark
