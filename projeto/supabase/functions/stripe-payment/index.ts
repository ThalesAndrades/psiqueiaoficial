import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { buildCorsHeaders } from '../_shared/cors.ts';
import { createLogger } from '../_shared/logger.ts';
import Stripe from 'https://esm.sh/stripe@14.5.0?target=deno';

const log = createLogger('stripe-payment');

interface PaymentRequest {
  appointmentId: string;
  amount: number;
  currency?: string;
  description?: string;
  metadata?: Record<string, string>;
}

interface CreateCheckoutRequest {
  psychologistId: string;
  patientId: string;
  appointmentId: string;
  amount: number;
  successUrl: string;
  cancelUrl: string;
}

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('Stripe API key not configured');
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader || '' } } }
    );

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const url = new URL(req.url);

    // Pre-parse body once so action can come from query OR body (supabase-js
    // does not pass through query strings appended to the function slug).
    // Webhook path must NOT consume the body — Stripe verifies the raw bytes.
    const queryAction = url.searchParams.get('action');
    let bodyPayload: Record<string, any> = {};
    if (queryAction !== 'webhook' && req.method !== 'GET' && req.method !== 'OPTIONS') {
      try {
        const cloned = req.clone();
        bodyPayload = await cloned.json();
      } catch {
        bodyPayload = {};
      }
    }
    const action = queryAction || bodyPayload.action;

    log.info('[Stripe] Action', { action });

    // CREATE PAYMENT INTENT WITH CONNECT (default method)
    if (action === 'create-payment-intent') {
      // Verificar autenticação
      const token = authHeader?.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);

      if (!user) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized - Authentication required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const {
        appointmentId,
        currency = 'brl',
        description,
        metadata
      } = await req.json() as {
        appointmentId: string;
        currency?: string;
        description?: string;
        metadata?: Record<string, string>;
      };

      if (!appointmentId) {
        return new Response(
          JSON.stringify({ error: 'Missing required field: appointmentId' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // CRITICAL: amount and parties are sourced from the appointment row,
      // never from the client. This blocks tampering with the charge amount,
      // the platform fee, the destination psychologist, or the patient_id.
      const { data: appointment, error: apptErr } = await supabaseAdmin
        .from('appointments')
        .select('id, patient_id, psychologist_id, session_price, payment_status')
        .eq('id', appointmentId)
        .single();

      if (apptErr || !appointment) {
        log.error('[Stripe] Appointment lookup failed', { error: apptErr });
        return new Response(
          JSON.stringify({ error: 'Appointment not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (user.id !== appointment.patient_id) {
        log.error('[Stripe] Ownership validation failed', { userId: user.id, appointmentOwnerId: appointment.patient_id });
        return new Response(
          JSON.stringify({ error: 'Unauthorized - You can only create payments for your own appointments' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (appointment.payment_status === 'paid') {
        return new Response(
          JSON.stringify({ error: 'Appointment is already paid' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const amount = Number(appointment.session_price);
      if (!Number.isFinite(amount) || amount <= 0) {
        return new Response(
          JSON.stringify({ error: 'Appointment has no valid price configured' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const psychologistId = appointment.psychologist_id;
      const patientId = appointment.patient_id;
      const platformFeePercent = Number(Deno.env.get('PLATFORM_FEE_PERCENT') ?? '10');

      log.info('[Stripe] Creating payment intent', { amount, currency, appointmentId });

      // Verify psychologist has completed Stripe onboarding
      const { data: psychProfile } = await supabaseAdmin
        .from('psychologist_profiles')
        .select('stripe_account_id, stripe_onboarding_completed')
        .eq('user_id', psychologistId)
        .single();

      if (!psychProfile?.stripe_account_id || !psychProfile?.stripe_onboarding_completed) {
        log.error('[Stripe] Psychologist onboarding not completed');
        return new Response(
          JSON.stringify({ error: 'Psychologist has not completed payment setup. Please complete onboarding first.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Calculate platform fee
      const platformFeeAmount = Math.round(amount * (platformFeePercent / 100) * 100);

      try {
        // Create payment intent with Connect account
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(amount * 100),
          currency,
          application_fee_amount: platformFeeAmount,
          transfer_data: {
            destination: psychProfile.stripe_account_id,
          },
          description,
          metadata: {
            appointment_id: appointmentId,
            psychologist_id: psychologistId,
            patient_id: patientId,
            ...metadata,
          },
        });

        log.info('[Stripe] Payment intent created', { paymentIntentId: paymentIntent.id });

        // Store transaction in database
        const { error: dbError } = await supabaseAdmin.from('financial_transactions').insert({
          appointment_id: appointmentId,
          psychologist_id: psychologistId,
          patient_id: patientId,
          transaction_type: 'session_payment',
          amount,
          currency,
          status: 'pending',
          stripe_payment_id: paymentIntent.id,
          description: description || 'Pagamento de sessão',
        });

        if (dbError) {
          log.error('[Stripe] Error storing transaction', { error: dbError });
        }

        return new Response(
          JSON.stringify({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (stripeError: any) {
        log.error('[Stripe] Payment intent error', { error: stripeError });
        return new Response(
          JSON.stringify({ 
            error: `Stripe error: ${stripeError.message}`,
            type: stripeError.type,
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // CREATE CHECKOUT SESSION
    if (action === 'create-checkout') {
      // Verificar autenticação
      const token = authHeader?.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);

      if (!user) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized - Authentication required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { appointmentId, successUrl, cancelUrl } = await req.json() as {
        appointmentId: string;
        successUrl: string;
        cancelUrl: string;
      };

      if (!appointmentId) {
        return new Response(
          JSON.stringify({ error: 'Missing required field: appointmentId' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Server-authoritative lookup — never trust client-supplied amount/parties.
      const { data: appointment, error: apptErr } = await supabaseAdmin
        .from('appointments')
        .select('id, patient_id, psychologist_id, session_price, payment_status')
        .eq('id', appointmentId)
        .single();

      if (apptErr || !appointment) {
        return new Response(
          JSON.stringify({ error: 'Appointment not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (user.id !== appointment.patient_id) {
        log.error('[Stripe] Checkout ownership validation failed', { userId: user.id, appointmentOwnerId: appointment.patient_id });
        return new Response(
          JSON.stringify({ error: 'Unauthorized - You can only create checkout sessions for your own appointments' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (appointment.payment_status === 'paid') {
        return new Response(
          JSON.stringify({ error: 'Appointment is already paid' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const amount = Number(appointment.session_price);
      if (!Number.isFinite(amount) || amount <= 0) {
        return new Response(
          JSON.stringify({ error: 'Appointment has no valid price configured' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const psychologistId = appointment.psychologist_id;
      const patientId = appointment.patient_id;

      // Get patient and psychologist data
      const { data: patient } = await supabase
        .from('user_profiles')
        .select('email, full_name')
        .eq('id', patientId)
        .single();

      const { data: psychologist } = await supabase
        .from('user_profiles')
        .select('email, full_name')
        .eq('id', psychologistId)
        .single();

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'brl',
              product_data: {
                name: 'Sessão de Terapia',
                description: `Sessão com ${psychologist?.full_name || 'Psicólogo'}`,
              },
              unit_amount: Math.round(amount * 100),
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: patient?.email,
        metadata: {
          appointment_id: appointmentId,
          psychologist_id: psychologistId,
          patient_id: patientId,
        },
      });

      // Store transaction
      const { error: dbError } = await supabaseAdmin.from('financial_transactions').insert({
        appointment_id: appointmentId,
        psychologist_id: psychologistId,
        patient_id: patientId,
        transaction_type: 'session_payment',
        amount,
        currency: 'brl',
        status: 'pending',
        stripe_payment_id: session.id,
        description: `Sessão com ${psychologist?.full_name || 'Psicólogo'}`,
      });

      if (dbError) {
        log.error('[Stripe] Error storing transaction', { error: dbError });
      }

      return new Response(
        JSON.stringify({ url: session.url, sessionId: session.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // WEBHOOK HANDLER
    if (action === 'webhook') {
      const signature = req.headers.get('stripe-signature');
      const body = await req.text();

      if (!signature) {
        return new Response('Missing signature', { status: 400 });
      }

      let event;
      try {
        const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
        if (!webhookSecret) {
          log.error('[Webhook] STRIPE_WEBHOOK_SECRET not configured');
          return new Response('Webhook secret not configured', { status: 500 });
        }

        event = stripe.webhooks.constructEvent(
          body,
          signature,
          webhookSecret
        );

        log.info('[Webhook] Received event', { type: event.type });
      } catch (err: any) {
        log.error('[Webhook] Signature verification failed', {
          error: err,
          raw: body.substring(0, 100),
        });
        return new Response(`Webhook Error: ${err.message}`, { status: 400 });
      }

      // Handle payment_intent.succeeded
      if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        log.info('[Webhook] Payment succeeded', { paymentIntentId: paymentIntent.id });
        
        // Update transaction status
        const { error } = await supabaseAdmin
          .from('financial_transactions')
          .update({ status: 'completed', transaction_date: new Date().toISOString() })
          .eq('stripe_payment_id', paymentIntent.id);

        if (error) {
          log.error('[Webhook] Error updating transaction', { error: error });
        }

        // Update appointment payment status
        if (paymentIntent.metadata?.appointment_id) {
          await supabaseAdmin
            .from('appointments')
            .update({ payment_status: 'paid', status: 'confirmed' })
            .eq('id', paymentIntent.metadata.appointment_id);
        }
      }

      // Handle checkout.session.completed
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        log.info('[Webhook] Checkout completed', { sessionId: session.id });
        
        // Update transaction status
        const { error } = await supabaseAdmin
          .from('financial_transactions')
          .update({ status: 'completed', transaction_date: new Date().toISOString() })
          .eq('stripe_payment_id', session.id);

        if (error) {
          log.error('[Webhook] Error updating transaction', { error: error });
        }

        // Update appointment payment status and (only on first delivery)
        // create the Meet link. Stripe retries duplicate webhooks for ~3 hours;
        // we must NOT overwrite an existing link on retry or the patient and
        // psychologist receive a new URL each time and the one already sent
        // out by email/push goes dead.
        if (session.metadata?.appointment_id) {
          const { data: appointment } = await supabaseAdmin
            .from('appointments')
            .select('google_meet_link, meet_link')
            .eq('id', session.metadata.appointment_id)
            .single();

          const alreadyHasLink = Boolean(appointment?.google_meet_link || appointment?.meet_link);

          let update: Record<string, unknown> = {
            payment_status: 'paid',
            status: 'confirmed',
          };

          if (!alreadyHasLink) {
            const meetId = crypto.randomUUID().replace(/-/g, '').substring(0, 12);
            const meetLink = `https://meet.google.com/${meetId.substring(0, 3)}-${meetId.substring(3, 7)}-${meetId.substring(7, 11)}`;
            update.google_meet_link = meetLink;
            update.meet_link = meetLink;
          }

          const { error: updateError } = await supabaseAdmin
            .from('appointments')
            .update(update)
            .eq('id', session.metadata.appointment_id);

          if (updateError) {
            log.error('[Webhook] Error updating appointment', { error: updateError });
          } else {
            log.info('[Webhook] Appointment confirmed', {
              appointmentId: session.metadata.appointment_id,
              regeneratedMeetLink: !alreadyHasLink,
            });
          }
        }
      }

      // Handle account.updated (Connect account status changes)
      if (event.type === 'account.updated') {
        const account = event.data.object as Stripe.Account;
        log.info('[Webhook] Account updated', { accountId: account.id });
        
        // Update psychologist profile with account status
        const onboardingCompleted = account.charges_enabled && account.payouts_enabled;
        await supabaseAdmin
          .from('psychologist_profiles')
          .update({ stripe_onboarding_completed: onboardingCompleted })
          .eq('stripe_account_id', account.id);
      }

      // Handle payment_intent.payment_failed
      if (event.type === 'payment_intent.payment_failed') {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        log.info('[Webhook] Payment failed', { paymentIntentId: paymentIntent.id });
        
        await supabaseAdmin
          .from('financial_transactions')
          .update({ status: 'failed' })
          .eq('stripe_payment_id', paymentIntent.id);
      }

      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET PAYMENT STATUS
    if (action === 'payment-status') {
      const paymentIntentId = url.searchParams.get('payment_intent_id');
      
      if (!paymentIntentId) {
        return new Response('Missing payment_intent_id', { status: 400 });
      }

      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      return new Response(
        JSON.stringify({
          status: paymentIntent.status,
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // CREATE CONNECT ACCOUNT (for psychologists)
    if (action === 'create-connect-account') {
      const token = authHeader?.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);

      if (!user) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify user is psychologist
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('email, full_name, user_type')
        .eq('id', user.id)
        .single();

      if (profile?.user_type !== 'psychologist') {
        return new Response(
          JSON.stringify({ error: 'Only psychologists can create Connect accounts' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const account = await stripe.accounts.create({
        type: 'express',
        country: 'BR',
        email: profile?.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
      });

      // Store account ID in psychologist profile
      await supabaseAdmin
        .from('psychologist_profiles')
        .update({ 
          stripe_account_id: account.id,
          stripe_onboarding_completed: false,
        })
        .eq('user_id', user.id);

      // Create account link
      const origin = req.headers.get('origin') || 'http://localhost:8081';
      const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: `${origin}/(psychologist)/financeiro`,
        return_url: `${origin}/(psychologist)/financeiro?setup=complete`,
        type: 'account_onboarding',
      });

      log.info('[Stripe] Created Connect account', { accountId: account.id, userId: user.id });

      return new Response(
        JSON.stringify({ url: accountLink.url, accountId: account.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // CREATE CONNECT ACCOUNT LINK (refresh or return after setup)
    if (action === 'create-connect-account-link') {
      const token = authHeader?.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);

      if (!user) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: psychProfile } = await supabase
        .from('psychologist_profiles')
        .select('stripe_account_id')
        .eq('user_id', user.id)
        .single();

      if (!psychProfile?.stripe_account_id) {
        return new Response(
          JSON.stringify({ error: 'No Connect account found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const origin = req.headers.get('origin') || 'http://localhost:8081';
      const accountLink = await stripe.accountLinks.create({
        account: psychProfile.stripe_account_id,
        refresh_url: `${origin}/(psychologist)/financeiro`,
        return_url: `${origin}/(psychologist)/financeiro?setup=complete`,
        type: 'account_onboarding',
      });

      return new Response(
        JSON.stringify({ url: accountLink.url }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET CONNECT ACCOUNT STATUS
    if (action === 'connect-account-status') {
      const token = authHeader?.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);

      if (!user) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: psychProfile } = await supabase
        .from('psychologist_profiles')
        .select('stripe_account_id, stripe_onboarding_completed')
        .eq('user_id', user.id)
        .single();

      if (!psychProfile?.stripe_account_id) {
        return new Response(
          JSON.stringify({ 
            hasAccount: false, 
            onboardingCompleted: false,
            chargesEnabled: false,
            payoutsEnabled: false,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const account = await stripe.accounts.retrieve(psychProfile.stripe_account_id);

      // Update onboarding status in database
      const onboardingCompleted = account.charges_enabled && account.payouts_enabled;
      if (onboardingCompleted !== psychProfile.stripe_onboarding_completed) {
        await supabaseAdmin
          .from('psychologist_profiles')
          .update({ stripe_onboarding_completed: onboardingCompleted })
          .eq('user_id', user.id);
      }

      return new Response(
        JSON.stringify({
          hasAccount: true,
          accountId: account.id,
          onboardingCompleted,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          detailsSubmitted: account.details_submitted,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // CREATE CONNECT LOGIN LINK (for dashboard access)
    if (action === 'create-login-link') {
      const token = authHeader?.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);

      if (!user) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: psychProfile } = await supabase
        .from('psychologist_profiles')
        .select('stripe_account_id, stripe_onboarding_completed')
        .eq('user_id', user.id)
        .single();

      if (!psychProfile?.stripe_account_id || !psychProfile?.stripe_onboarding_completed) {
        return new Response(
          JSON.stringify({ error: 'Complete onboarding first' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const loginLink = await stripe.accounts.createLoginLink(psychProfile.stripe_account_id);

      return new Response(
        JSON.stringify({ url: loginLink.url }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // VERIFY PSYCHOLOGIST CAN RECEIVE PAYMENTS
    if (action === 'verify-psychologist') {
      const { psychologistId } = await req.json();

      const { data: psychProfile } = await supabase
        .from('psychologist_profiles')
        .select('stripe_account_id, stripe_onboarding_completed')
        .eq('user_id', psychologistId)
        .single();

      const canReceivePayments = psychProfile?.stripe_account_id && psychProfile?.stripe_onboarding_completed;

      return new Response(
        JSON.stringify({ 
          canReceivePayments,
          hasAccount: !!psychProfile?.stripe_account_id,
          onboardingCompleted: !!psychProfile?.stripe_onboarding_completed,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Invalid action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    log.error('[Stripe] Unexpected error', { error: error });
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
