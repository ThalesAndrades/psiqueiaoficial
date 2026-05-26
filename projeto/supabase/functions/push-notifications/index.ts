import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { buildCorsHeaders } from '../_shared/cors.ts';

interface PushNotificationRequest {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: string;
  priority?: 'default' | 'high';
}

interface BulkNotificationRequest {
  userIds: string[];
  title: string;
  body: string;
  data?: Record<string, any>;
}

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Accept action via query string OR body to tolerate clients that pass
    // the action as part of the function slug — supabase-js does not forward
    // query strings appended to the function name, so body is the reliable path.
    const url = new URL(req.url);
    let payload: Record<string, any> = {};
    if (req.method !== 'GET') {
      try { payload = await req.json(); } catch { payload = {}; }
    }
    const action = url.searchParams.get('action') || payload.action || 'send';

    // SEND SINGLE NOTIFICATION
    if (action === 'send') {
      // Verificar autenticação
      const authHeader = req.headers.get('Authorization');
      const token = authHeader?.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);

      if (!user) {
        console.warn('[Push] Unauthorized send request attempted');
        return new Response(
          JSON.stringify({ error: 'Unauthorized - Authentication required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[Push] Send request from user: ${user.id}`);

      const { userId, title, body, data, sound = 'default', priority = 'high' } = payload as PushNotificationRequest;

      if (!userId || !title || !body) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: userId, title, body' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Authorization: caller may only push to themselves OR to a user they
      // have a recorded relationship with (psychologist <-> patient).
      if (userId !== user.id) {
        const { data: rel } = await supabase
          .from('patient_psychologist_relations')
          .select('id')
          .eq('status', 'active')
          .or(`and(patient_id.eq.${user.id},psychologist_id.eq.${userId}),and(patient_id.eq.${userId},psychologist_id.eq.${user.id})`)
          .limit(1)
          .maybeSingle();

        if (!rel) {
          console.warn(`[Push] User ${user.id} tried to push to unrelated user ${userId}`);
          return new Response(
            JSON.stringify({ error: 'You are not authorized to send notifications to this user' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Get user's push token from database
      const { data: userData, error: userError } = await supabase
        .from('user_profiles')
        .select('push_token')
        .eq('id', userId)
        .single();

      if (userError || !userData?.push_token) {
        return new Response(
          JSON.stringify({ error: 'User push token not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Send push notification using Expo Push API
      const message = {
        to: userData.push_token,
        sound,
        title,
        body,
        data,
        priority,
      };

      const pushResponse = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const pushResult = await pushResponse.json();

      // Store notification in database
      await supabase.from('notifications').insert({
        user_id: userId,
        type: data?.type || 'general',
        title,
        message: body,
        data,
        read: false,
      });

      return new Response(
        JSON.stringify({ success: true, result: pushResult }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SEND BULK NOTIFICATIONS
    if (action === 'send-bulk') {
      // Verificar autenticação - apenas psicólogos podem enviar notificações em massa
      const authHeader = req.headers.get('Authorization');
      const token = authHeader?.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);

      if (!user) {
        console.warn('[Push] Unauthorized bulk send request attempted');
        return new Response(
          JSON.stringify({ error: 'Unauthorized - Authentication required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verificar se é psicólogo
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('user_type')
        .eq('id', user.id)
        .single();

      if (profile?.user_type !== 'psychologist') {
        console.warn(`[Push] Non-psychologist ${user.id} attempted bulk send`);
        return new Response(
          JSON.stringify({ error: 'Only psychologists can send bulk notifications' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[Push] Bulk send request from psychologist: ${user.id}`);

      const { userIds, title, body, data } = payload as BulkNotificationRequest;

      if (!userIds || !Array.isArray(userIds) || !title || !body) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: userIds (array), title, body' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Restrict targets to patients linked to this psychologist.
      const { data: relations } = await supabase
        .from('patient_psychologist_relations')
        .select('patient_id')
        .eq('psychologist_id', user.id)
        .eq('status', 'active');
      const allowed = new Set((relations || []).map(r => r.patient_id));
      const filteredUserIds = userIds.filter(id => allowed.has(id));
      if (filteredUserIds.length === 0) {
        return new Response(
          JSON.stringify({ error: 'No authorized recipients in this request' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get push tokens for all users
      const { data: usersData, error: usersError } = await supabase
        .from('user_profiles')
        .select('id, push_token')
        .in('id', filteredUserIds)
        .not('push_token', 'is', null);

      if (usersError || !usersData || usersData.length === 0) {
        return new Response(
          JSON.stringify({ error: 'No users with push tokens found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Prepare messages
      const messages = usersData.map(user => ({
        to: user.push_token,
        sound: 'default',
        title,
        body,
        data,
        priority: 'high',
      }));

      // Send in chunks of 100 (Expo limit)
      const chunks = [];
      for (let i = 0; i < messages.length; i += 100) {
        chunks.push(messages.slice(i, i + 100));
      }

      const results = [];
      for (const chunk of chunks) {
        const pushResponse = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(chunk),
        });
        const pushResult = await pushResponse.json();
        results.push(pushResult);
      }

      // Store notifications in database
      const notificationRecords = usersData.map(user => ({
        user_id: user.id,
        type: data?.type || 'general',
        title,
        message: body,
        data,
        read: false,
      }));

      await supabase.from('notifications').insert(notificationRecords);

      return new Response(
        JSON.stringify({ 
          success: true, 
          sent: messages.length,
          results 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // REGISTER PUSH TOKEN
    if (action === 'register-token') {
      const authHeader = req.headers.get('Authorization');
      const token = authHeader?.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);

      if (!user) {
        return new Response('Unauthorized', { status: 401 });
      }

      const { pushToken } = payload as { pushToken?: string };

      if (!pushToken) {
        return new Response(
          JSON.stringify({ error: 'Push token is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('user_profiles')
        .update({ push_token: pushToken })
        .eq('id', user.id);

      if (error) {
        console.error('Error storing push token:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to store push token' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response('Invalid action', { status: 400 });
  } catch (error: any) {
    console.error('Push notification error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
