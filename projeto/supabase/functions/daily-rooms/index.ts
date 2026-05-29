// Daily.co rooms management — replaces the legacy "placeholder Google Meet"
// flow. Patient and psychologist authenticate with the same Supabase session
// they already have; we verify they are a party to the appointment, call the
// Daily.co REST API server-side (DAILY_API_KEY never leaves Edge Functions),
// and persist the returned room URL into appointments.meet_link so the
// session screen can mount the Daily prefab against it.
//
// Body schema:
//   { action: 'create', appointmentId: string }
//   { action: 'delete', appointmentId: string }
//
// On `create` the function is idempotent: if appointments.meet_link is
// already populated for a Daily room we re-use it rather than billing the
// account for a new room. The Stripe webhook also invokes this function on
// `checkout.session.completed` via supabase.functions.invoke (service-role).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { buildCorsHeaders } from '../_shared/cors.ts';
import { createLogger } from '../_shared/logger.ts';
import { isTestMode, TEST_MODE_HEADER } from '../_shared/testMode.ts';

const log = createLogger('daily-rooms');

const DAILY_API_BASE = 'https://api.daily.co/v1';

interface DailyRoomBody {
  action: 'create' | 'delete';
  appointmentId: string;
}

interface DailyRoom {
  id: string;
  name: string;
  url: string;
  privacy?: string;
  config?: Record<string, unknown>;
}

// Daily.co room names must be URL-safe. Appointment IDs are UUIDs — Daily
// accepts them but we prefix to avoid collisions with names manually
// created in the Daily dashboard, and strip dashes to keep names short.
function roomNameForAppointment(appointmentId: string): string {
  return `psiqueia-${appointmentId.replace(/-/g, '')}`;
}

function extractRoomNameFromUrl(url: string): string | null {
  // https://<domain>.daily.co/<room-name>
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    return parts[0] ?? null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const dailyApiKey = Deno.env.get('DAILY_API_KEY');
    if (!dailyApiKey) {
      log.error('DAILY_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Daily.co API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    let payload: Partial<DailyRoomBody> = {};
    try {
      payload = await req.json();
    } catch {
      // fall through; validated below
    }

    const { action, appointmentId } = payload;
    if (!action || !appointmentId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: action, appointmentId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Look up the appointment first — we need its parties (for auth) AND
    // its scheduled_at/duration_minutes (for room expiration on create).
    // Service role bypasses RLS so we always get the row; auth check is
    // applied below against the caller identity.
    const { data: appointment, error: apptErr } = await supabaseAdmin
      .from('appointments')
      .select('id, patient_id, psychologist_id, scheduled_at, duration_minutes, meet_link, google_meet_link')
      .eq('id', appointmentId)
      .single();

    if (apptErr || !appointment) {
      log.error('Appointment lookup failed', { appointmentId, error: apptErr });
      return new Response(
        JSON.stringify({ error: 'Appointment not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Caller identity. Two cases:
    //  1) Patient/psychologist hitting the function with their JWT — we
    //     verify they are a party to the appointment.
    //  2) Service role invocation from the Stripe webhook (or anything else
    //     using the SERVICE_ROLE_KEY as a Bearer). We skip the user check
    //     because the caller is the platform itself.
    const isServiceRoleCall = authHeader === `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''}`;
    if (!isServiceRoleCall) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized - Authentication required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      if (user.id !== appointment.patient_id && user.id !== appointment.psychologist_id) {
        log.warn('User not party to appointment', { userId: user.id, appointmentId });
        return new Response(
          JSON.stringify({ error: 'Forbidden - You are not a participant in this session' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    if (action === 'create') {
      // Idempotency — if we already have a Daily room URL, return it. We
      // detect "Daily room" by checking the host; legacy placeholder Meet
      // links (https://meet.google.com/...) are ignored so the migration
      // is automatic on first room creation.
      const existing = appointment.meet_link || appointment.google_meet_link;
      if (existing && existing.includes('.daily.co/')) {
        log.info('Reusing existing Daily room', { appointmentId, url: existing });
        return new Response(
          JSON.stringify({ url: existing, reused: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      // Compute expiration: scheduled_at + duration + 30min grace.
      // Daily expects `exp` as a UNIX timestamp in seconds. The grace
      // covers late starts and the psychologist staying online after the
      // session to make notes.
      const scheduledMs = new Date(appointment.scheduled_at).getTime();
      const durationMin = appointment.duration_minutes ?? 50;
      const expMs = scheduledMs + (durationMin + 30) * 60 * 1000;
      const exp = Math.floor(expMs / 1000);

      const roomName = roomNameForAppointment(appointmentId);
      const body = {
        name: roomName,
        privacy: 'public',
        properties: {
          exp,
          eject_at_room_exp: true,
          enable_chat: true,
          enable_screenshare: true,
          // Limit to 2 to make tampering with the URL useless — even if
          // someone shares the link, the third joiner is rejected.
          max_participants: 2,
        },
      };

      log.info('Creating Daily room', { appointmentId, roomName, exp });

      let dailyResp = await fetch(`${DAILY_API_BASE}/rooms`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${dailyApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      // If a room with this name already exists in Daily (e.g. previous
      // attempt persisted the URL but the DB write failed) fetch it
      // instead of failing.
      if (dailyResp.status === 409) {
        log.info('Daily room already exists, fetching', { roomName });
        dailyResp = await fetch(`${DAILY_API_BASE}/rooms/${roomName}`, {
          headers: { Authorization: `Bearer ${dailyApiKey}` },
        });
      }

      if (!dailyResp.ok) {
        const text = await dailyResp.text();
        log.error('Daily API call failed', { status: dailyResp.status, body: text.substring(0, 500) });
        return new Response(
          JSON.stringify({ error: 'Failed to create Daily room', details: text }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const room = await dailyResp.json() as DailyRoom;
      if (!room.url) {
        log.error('Daily response missing url', { room });
        return new Response(
          JSON.stringify({ error: 'Daily room response invalid' }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      // Persist into BOTH columns — legacy callers still read google_meet_link.
      const { error: updateErr } = await supabaseAdmin
        .from('appointments')
        .update({
          meet_link: room.url,
          google_meet_link: room.url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', appointmentId);

      if (updateErr) {
        log.error('Failed to persist meet_link', { error: updateErr });
        // Don't roll back the Daily room — the caller can retry, the room
        // is idempotent on the Daily side.
      }

      log.info('Daily room ready', { appointmentId, url: room.url });

      return new Response(
        JSON.stringify({ url: room.url, name: room.name, reused: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (action === 'delete') {
      const existingUrl = appointment.meet_link || appointment.google_meet_link;
      const roomName = existingUrl ? extractRoomNameFromUrl(existingUrl) : roomNameForAppointment(appointmentId);

      if (!roomName) {
        return new Response(
          JSON.stringify({ error: 'No Daily room to delete' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const dailyResp = await fetch(`${DAILY_API_BASE}/rooms/${roomName}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${dailyApiKey}` },
      });

      // 404 from Daily = already gone, treat as success.
      if (!dailyResp.ok && dailyResp.status !== 404) {
        const text = await dailyResp.text();
        log.error('Daily DELETE failed', { status: dailyResp.status, body: text.substring(0, 500) });
        return new Response(
          JSON.stringify({ error: 'Failed to delete Daily room', details: text }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      await supabaseAdmin
        .from('appointments')
        .update({
          meet_link: null,
          google_meet_link: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', appointmentId);

      log.info('Daily room deleted', { appointmentId, roomName });

      return new Response(
        JSON.stringify({ deleted: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ error: `Invalid action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error: unknown) {
    log.error('Unexpected error', { error });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
