-- ============================================================================
-- 20260101000100_rls_policies.sql
--
-- Row-level security policies for every public table. RLS is already
-- enabled in the base schema migration; this file only declares policies.
--
-- Conventions:
--   - service_role is the implicit caller for Edge Functions using
--     SUPABASE_SERVICE_ROLE_KEY. It bypasses RLS entirely so no policy is
--     required to grant it access (we only need to restrict authenticated /
--     anon callers here).
--   - We assume `auth.uid()` is the canonical caller identity. Anonymous
--     callers (`auth.uid() IS NULL`) are blocked unless an explicit policy
--     allows them.
--
-- CREATE POLICY is not idempotent, but migrations only apply once, so this
-- file uses raw CREATE statements.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- user_profiles
-- Any authenticated user can read any profile (patient browsing the
-- psychologist directory needs this). Writes are restricted to the owner;
-- INSERT/DELETE flow through the service role / handle_new_user trigger.
-- ---------------------------------------------------------------------------
drop policy if exists user_profiles_select_authenticated on public.user_profiles;
create policy user_profiles_select_authenticated
  on public.user_profiles
  for select
  to authenticated
  using (true);

drop policy if exists user_profiles_update_own on public.user_profiles;
create policy user_profiles_update_own
  on public.user_profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- psychologist_profiles
-- Visible to any authenticated user. Writes restricted to the owner.
-- ---------------------------------------------------------------------------
drop policy if exists psychologist_profiles_select_authenticated on public.psychologist_profiles;
create policy psychologist_profiles_select_authenticated
  on public.psychologist_profiles
  for select
  to authenticated
  using (true);

drop policy if exists psychologist_profiles_insert_own on public.psychologist_profiles;
create policy psychologist_profiles_insert_own
  on public.psychologist_profiles
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists psychologist_profiles_update_own on public.psychologist_profiles;
create policy psychologist_profiles_update_own
  on public.psychologist_profiles
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- patient_psychologist
-- Either party of the relation can read. Patients create the link;
-- either party may update (e.g. mark inactive) or delete.
-- ---------------------------------------------------------------------------
drop policy if exists patient_psychologist_select_party on public.patient_psychologist;
create policy patient_psychologist_select_party
  on public.patient_psychologist
  for select
  to authenticated
  using (auth.uid() = patient_id or auth.uid() = psychologist_id);

drop policy if exists patient_psychologist_insert_patient on public.patient_psychologist;
create policy patient_psychologist_insert_patient
  on public.patient_psychologist
  for insert
  to authenticated
  with check (auth.uid() = patient_id);

drop policy if exists patient_psychologist_update_party on public.patient_psychologist;
create policy patient_psychologist_update_party
  on public.patient_psychologist
  for update
  to authenticated
  using (auth.uid() = patient_id or auth.uid() = psychologist_id)
  with check (auth.uid() = patient_id or auth.uid() = psychologist_id);

drop policy if exists patient_psychologist_delete_party on public.patient_psychologist;
create policy patient_psychologist_delete_party
  on public.patient_psychologist
  for delete
  to authenticated
  using (auth.uid() = patient_id or auth.uid() = psychologist_id);

-- ---------------------------------------------------------------------------
-- appointments
-- Either party can SELECT/UPDATE. Patients create the booking. DELETE is
-- intentionally not granted — appointments should be cancelled, not
-- removed.
-- ---------------------------------------------------------------------------
drop policy if exists appointments_select_party on public.appointments;
create policy appointments_select_party
  on public.appointments
  for select
  to authenticated
  using (auth.uid() = patient_id or auth.uid() = psychologist_id);

drop policy if exists appointments_insert_patient on public.appointments;
create policy appointments_insert_patient
  on public.appointments
  for insert
  to authenticated
  with check (auth.uid() = patient_id);

drop policy if exists appointments_update_party on public.appointments;
create policy appointments_update_party
  on public.appointments
  for update
  to authenticated
  using (auth.uid() = patient_id or auth.uid() = psychologist_id)
  with check (auth.uid() = patient_id or auth.uid() = psychologist_id);

-- ---------------------------------------------------------------------------
-- diary_entries
-- Medical data — strictest policy in the schema. Patients have full CRUD on
-- their own rows. Linked psychologists can SELECT *only* when the patient
-- has explicitly shared the entry. Three options for "shared with the
-- psychologist": either `shared_with = auth.uid()` (point-share) or the
-- patient has an active relation to the requesting psychologist when
-- `is_shared = true` (broadcast-share to the linked psychologist).
-- ---------------------------------------------------------------------------
drop policy if exists diary_entries_owner_all on public.diary_entries;
create policy diary_entries_owner_all
  on public.diary_entries
  for all
  to authenticated
  using (auth.uid() = patient_id)
  with check (auth.uid() = patient_id);

drop policy if exists diary_entries_psychologist_select_shared on public.diary_entries;
create policy diary_entries_psychologist_select_shared
  on public.diary_entries
  for select
  to authenticated
  using (
    is_shared = true
    and (
      shared_with = auth.uid()
      or exists (
        select 1
        from public.patient_psychologist pp
        where pp.patient_id = diary_entries.patient_id
          and pp.psychologist_id = auth.uid()
          and pp.status = 'active'
      )
    )
  );

-- ---------------------------------------------------------------------------
-- financial_transactions
-- Read by either party of the row. All writes happen via Edge Functions
-- using the service role, so we deliberately omit INSERT/UPDATE/DELETE
-- policies for `authenticated` — service role bypasses RLS.
-- ---------------------------------------------------------------------------
drop policy if exists financial_transactions_select_party on public.financial_transactions;
create policy financial_transactions_select_party
  on public.financial_transactions
  for select
  to authenticated
  using (auth.uid() = patient_id or auth.uid() = psychologist_id);

-- ---------------------------------------------------------------------------
-- analytics_events
-- Any authenticated user may INSERT (subject to user_id check), but only
-- the owner can SELECT their own events.
-- ---------------------------------------------------------------------------
drop policy if exists analytics_events_insert_authenticated on public.analytics_events;
create policy analytics_events_insert_authenticated
  on public.analytics_events
  for insert
  to authenticated
  with check (user_id is null or auth.uid() = user_id);

drop policy if exists analytics_events_select_own on public.analytics_events;
create policy analytics_events_select_own
  on public.analytics_events
  for select
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- notifications
-- Owner-only SELECT/UPDATE (the UPDATE is for marking read).
-- INSERT is service_role only (no policy needed; bypassed).
-- ---------------------------------------------------------------------------
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own
  on public.notifications
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own
  on public.notifications
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- ai_interactions
-- Owner-only across all operations.
-- ---------------------------------------------------------------------------
drop policy if exists ai_interactions_owner_all on public.ai_interactions;
create policy ai_interactions_owner_all
  on public.ai_interactions
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- invitations
-- No authenticated policies — service role manages everything. The
-- validate_invitation() RPC (SECURITY DEFINER) is the only authenticated
-- read path.
-- ---------------------------------------------------------------------------
-- (intentionally no policies)

-- ---------------------------------------------------------------------------
-- psychologist_availability
-- Anyone authenticated can read (used to render booking grids). Only the
-- owning psychologist can write.
-- ---------------------------------------------------------------------------
drop policy if exists psychologist_availability_select_authenticated on public.psychologist_availability;
create policy psychologist_availability_select_authenticated
  on public.psychologist_availability
  for select
  to authenticated
  using (true);

drop policy if exists psychologist_availability_insert_owner on public.psychologist_availability;
create policy psychologist_availability_insert_owner
  on public.psychologist_availability
  for insert
  to authenticated
  with check (auth.uid() = psychologist_id);

drop policy if exists psychologist_availability_update_owner on public.psychologist_availability;
create policy psychologist_availability_update_owner
  on public.psychologist_availability
  for update
  to authenticated
  using (auth.uid() = psychologist_id)
  with check (auth.uid() = psychologist_id);

drop policy if exists psychologist_availability_delete_owner on public.psychologist_availability;
create policy psychologist_availability_delete_owner
  on public.psychologist_availability
  for delete
  to authenticated
  using (auth.uid() = psychologist_id);

-- 20260101000100_rls_policies.sql — RLS for every public table
