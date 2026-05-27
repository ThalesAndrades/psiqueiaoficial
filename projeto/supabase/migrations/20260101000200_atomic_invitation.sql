-- ============================================================================
-- 20260101000200_atomic_invitation.sql
--
-- Race-condition-safe invitation consumption. The original flow called
-- validate_invitation() and then mark_invitation_used() as two RPCs, which
-- left a TOCTOU window: two concurrent signups racing on the same code
-- could both pass validation, then both succeed at marking it used.
--
-- consume_invitation locks the invitation row with SELECT ... FOR UPDATE
-- inside a single function call, re-validates inside the lock, and either
-- atomically marks the invitation used + returns success, or returns a
-- structured error without mutating anything.
-- ============================================================================

create or replace function public.consume_invitation(
  p_code text,
  p_email text,
  p_user_type text,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  inv public.invitations%rowtype;
begin
  if p_code is null or p_email is null or p_user_type is null or p_user_id is null then
    return jsonb_build_object('valid', false, 'error', 'Parâmetros obrigatórios ausentes');
  end if;

  -- Lock the invitation row for the duration of this transaction. Any
  -- concurrent consume_invitation() call for the same code will block here
  -- until we commit / rollback.
  select * into inv
    from public.invitations
   where invitation_code = p_code
   for update;

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

  if inv.user_type <> p_user_type then
    return jsonb_build_object('valid', false, 'error', 'O tipo de usuário não corresponde ao convite');
  end if;

  update public.invitations
     set used = true,
         used_at = now(),
         used_by = p_user_id
   where id = inv.id;

  return jsonb_build_object(
    'valid', true,
    'user_type', inv.user_type,
    'email', inv.email
  );
end;
$$;

-- Only the service role should call this — the function mutates state and
-- runs as definer. authenticated callers should keep using
-- validate_invitation() (read-only) for pre-flight checks.
revoke all on function public.consume_invitation(text, text, text, uuid) from public;
grant execute on function public.consume_invitation(text, text, text, uuid) to service_role;

-- 20260101000200_atomic_invitation.sql — atomic consume_invitation RPC
