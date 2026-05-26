import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { buildCorsHeaders } from '../_shared/cors.ts';
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('create-admin-user');

interface CreateUserRequest {
  email: string;
  password: string;
  fullName: string;
  userType: 'patient' | 'psychologist';
  phone?: string;
  birthDate?: string;
  invitationCode: string;
}

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Parse request body
    const { email, password, fullName, userType, phone, birthDate, invitationCode }: CreateUserRequest = await req.json();

    // Validate required fields
    if (!email || !password || !fullName || !userType || !invitationCode) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (userType !== 'patient' && userType !== 'psychologist') {
      return new Response(
        JSON.stringify({ error: 'Invalid userType' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Gate signup behind a server-side invitation check. Without this the
    // function is an open relay for creating confirmed accounts of any role.
    const { data: invitation, error: invitationError } = await supabaseAdmin.rpc('validate_invitation', {
      p_code: invitationCode,
      p_email: email,
    });

    if (invitationError || !invitation?.valid) {
      log.warn('Invitation rejected', { email, userType, reason: invitation?.error || invitationError?.message });
      return new Response(
        JSON.stringify({ error: invitation?.error || 'Convite inválido ou expirado' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (invitation.user_type && invitation.user_type !== userType) {
      return new Response(
        JSON.stringify({ error: 'O tipo de usuário não corresponde ao convite' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create user using Admin API
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName,
        user_type: userType,
        phone: phone || '',
        birth_date: birthDate || '',
      },
    });

    if (createError) {
      log.error('Failed to create user', { error: createError.message, code: (createError as any)?.code });
      return new Response(
        JSON.stringify({ error: createError.message }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!userData.user) {
      return new Response(
        JSON.stringify({ error: 'Falha ao criar usuário' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Profiles are created automatically by the handle_new_user trigger
    // No need to create them manually here

    // Burn the invitation so it cannot be reused.
    await supabaseAdmin.rpc('mark_invitation_used', {
      p_code: invitationCode,
      p_user_id: userData.user.id,
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        user: { id: userData.user.id, email: userData.user.email },
        message: 'User created. Profile will be ready in 1-2 seconds.'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    log.error('Unhandled error', { error: error });
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
