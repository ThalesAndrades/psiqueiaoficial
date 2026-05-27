// LGPD / GDPR-style data export. Authenticated user calls this and gets a
// JSON file containing every row the platform stores about them across the
// tables they have a stake in. Format: single JSON document downloaded as
// an attachment — no ZIP, no streaming. The export is intentionally a
// snapshot; ongoing exports / scheduled deletion live in delete-account.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { buildCorsHeaders } from '../_shared/cors.ts';
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('export-user-data');

// Tables exported and the column used to scope rows to the calling user.
const EXPORTS: ReadonlyArray<{ table: string; column: string }> = [
  { table: 'user_profiles', column: 'id' },
  { table: 'psychologist_profiles', column: 'user_id' },
  { table: 'patient_psychologist', column: 'patient_id' },
  { table: 'appointments', column: 'patient_id' },
  { table: 'diary_entries', column: 'patient_id' },
  { table: 'financial_transactions', column: 'patient_id' },
  { table: 'notifications', column: 'user_id' },
  { table: 'ai_interactions', column: 'user_id' },
  { table: 'analytics_events', column: 'user_id' },
];

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.toLowerCase().startsWith('bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const token = authHeader.slice('bearer '.length).trim();

    // Resolve the caller via the anon-key client.
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const userId = userData.user.id;

    // Read with the service role so RLS does not exclude rows the user is
    // entitled to under LGPD (e.g. their share of patient_psychologist when
    // they are the psychologist). We then filter every query by user-owned
    // column to make sure we never return rows belonging to other users.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const exportedAt = new Date().toISOString();
    const payload: Record<string, unknown> = {
      meta: {
        user_id: userId,
        email: userData.user.email,
        exported_at: exportedAt,
        format_version: 1,
        notes:
          'Snapshot exportado sob a Lei Geral de Proteção de Dados (LGPD). ' +
          'Cada chave representa uma tabela do PsiquèIA filtrada pelos seus dados pessoais.',
      },
    };

    for (const { table, column } of EXPORTS) {
      const { data, error } = await supabaseAdmin
        .from(table)
        .select('*')
        .eq(column, userId);

      if (error) {
        // Don't abort the whole export over one missing table — log and
        // record an empty array so the user still gets the rest.
        log.error('Failed to export table', { table, column, userId, error: error.message });
        payload[table] = [];
        continue;
      }
      payload[table] = data ?? [];
    }

    // Patients filtered above own their `appointments` and
    // `financial_transactions`; psychologists need the mirror query too so
    // they get their professional history. We union both sides under
    // _psychologist_* keys to avoid colliding with the patient-scoped data.
    for (const table of ['patient_psychologist', 'appointments', 'financial_transactions'] as const) {
      const { data, error } = await supabaseAdmin
        .from(table)
        .select('*')
        .eq('psychologist_id', userId);

      if (error) {
        log.error('Failed to export psychologist-side rows', { table, userId, error: error.message });
        payload[`${table}_as_psychologist`] = [];
        continue;
      }
      payload[`${table}_as_psychologist`] = data ?? [];
    }

    const body = JSON.stringify(payload, null, 2);
    const datePart = exportedAt.slice(0, 10);
    const filename = `psiqueia-export-${userId}-${datePart}.json`;

    log.info('Export completed', { userId, tables: EXPORTS.length, bytes: body.length });

    return new Response(body, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    log.error('Unhandled error', { error });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
