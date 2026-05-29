import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { buildCorsHeaders } from '../_shared/cors.ts';
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('google-integration');

const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');

interface GoogleIntegrationRequest {
  action: 'create_meeting' | 'sync_calendar' | 'list_files' | 'upload_file' | 'share_file' | 'exchange_oauth_code';
  data?: any;
  code?: string;
}

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { action, data, code } = await req.json() as GoogleIntegrationRequest;

    log.info('[Google Integration] Action', { action, userId: user.id });

    // Handle OAuth code exchange
    if (action === 'exchange_oauth_code') {
      if (!code) {
        throw new Error('Missing OAuth code');
      }

      // No inner try/catch — the outer catch at the bottom of serve() logs
      // every OAuth failure once with full context, so re-logging here would
      // just produce duplicate entries with no extra signal.
      log.info('[OAuth] Exchanging code for tokens');

      // SECURITY: redirect_uri vem de env var server-side, NUNCA do header
      // Origin (controlado pelo cliente). Deve casar exatamente com o
      // registrado no Google Console.
      const googleRedirectUri = Deno.env.get('GOOGLE_OAUTH_REDIRECT_URI');
      if (!googleRedirectUri) {
        log.error('[OAuth] GOOGLE_OAUTH_REDIRECT_URI not configured');
        return new Response(
          JSON.stringify({ error: 'OAuth redirect URI not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: googleRedirectUri,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.text();
        // Log the upstream Google response body before throwing — this is the
        // only place that has access to it.
        log.error('[OAuth] Token exchange error', { error: errorData });
        throw new Error(`Failed to exchange code: ${errorData}`);
      }

      const tokens = await tokenResponse.json();
      log.info('[OAuth] Tokens obtained successfully for user', { userId: user.id });

      // TODO: Store refresh_token securely for long-term access
      // For now, returning success without storing tokens
      // In production, store in encrypted user_metadata or separate table

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result;
    switch (action) {
      case 'create_meeting':
        result = await createGoogleMeeting(data, user.id, supabase);
        break;
      case 'sync_calendar':
        result = await syncGoogleCalendar(data, user.id, supabase);
        break;
      case 'list_files':
        result = await listDriveFiles(data, user.id);
        break;
      case 'upload_file':
        result = await uploadToDrive(data, user.id);
        break;
      case 'share_file':
        result = await shareFile(data, user.id, supabase);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    log.error('[Google Integration] Error', { error: error });
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

/**
 * Create Google Meet link for appointment
 * SIMPLIFIED: Opens meet.google.com in browser
 * For full OAuth integration, implement Calendar API with meet conferencing
 */
async function createGoogleMeeting(
  appointmentData: any,
  userId: string,
  supabase: any
): Promise<any> {
  try {
    // Simple approach: Direct link to Google Meet (user creates room manually)
    // Alternative: Use Calendar API with OAuth to create proper Meet events
    
    const meetLink = 'https://meet.google.com'; // User will create room in browser

    // Update appointment with Google Meet link
    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        google_meet_link: meetLink,
        meeting_link: meetLink,
      })
      .eq('id', appointmentData.appointmentId);

    if (updateError) {
      log.error('[Meet] Failed to update appointment', { error: updateError });
      throw new Error(`Failed to update appointment: ${updateError.message}`);
    }

    log.info('[Meet] Updated appointment with Meet link', { appointmentId: appointmentData.appointmentId });

    return {
      meetLink: meetLink,
      appointmentId: appointmentData.appointmentId,
      note: 'Open in browser to create or join a meeting',
    };
  } catch (error: any) {
    log.error('[Meet] Error', { error: error });
    throw error;
  }
}

/**
 * Sync appointments to Google Calendar
 * REQUIRES: OAuth implementation with calendar.events scope
 */
async function syncGoogleCalendar(
  syncData: any,
  userId: string,
  supabase: any
): Promise<any> {
  try {
    log.info('[Calendar] Fetching appointments for user', { userId });

    // Fetch appointments from database
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('*')
      .or(`patient_id.eq.${userId},psychologist_id.eq.${userId}`)
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch appointments: ${error.message}`);
    }

    log.info('[Calendar] Found appointments to sync', { count: appointments?.length || 0 });

    // For now, returning appointment count
    // TODO: Implement Calendar API integration with OAuth
    // This requires storing user's refresh_token and using Calendar API

    return {
      synced: 0,
      total: appointments?.length || 0,
      message: 'OAuth implementation required for full calendar sync',
      appointments: appointments,
    };
  } catch (error: any) {
    log.error('[Calendar] Error', { error: error });
    throw error;
  }
}

/**
 * List files from Google Drive
 * REQUIRES: OAuth with drive.readonly scope
 */
async function listDriveFiles(filterData: any, userId: string): Promise<any> {
  // This requires user's OAuth token, not just API key
  throw new Error('Drive integration requires OAuth implementation. Use Supabase Storage instead.');
}

/**
 * Upload file to Google Drive
 * REQUIRES: OAuth with drive.file scope
 */
async function uploadToDrive(uploadData: any, userId: string): Promise<any> {
  throw new Error('Drive upload requires OAuth implementation. Use Supabase Storage instead.');
}

/**
 * Share file with patient
 * REQUIRES: OAuth with drive.file scope
 */
async function shareFile(
  shareData: any,
  userId: string,
  supabase: any
): Promise<any> {
  throw new Error('File sharing requires OAuth implementation. Use Supabase Storage instead.');
}
