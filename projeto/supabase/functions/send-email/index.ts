import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { buildCorsHeaders } from '../_shared/cors.ts';
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('send-email');

interface SendEmailRequest {
  to: string;
  subject?: string;
  html?: string;
  text?: string;
  template?: 'appointment-confirmation' | 'appointment-reminder' | 'appointment-cancelled' | 'welcome' | 'invitation';
  templateData?: Record<string, any>;
}

// Email templates
const templates = {
  'appointment-confirmation': {
    subject: 'Confirmação de Agendamento - PsiquèIA',
    html: (data: any) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #6B46C1 0%, #8B5CF6 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #6B46C1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .details-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
            .footer { text-align: center; color: #64748B; font-size: 14px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">✓ Agendamento Confirmado</h1>
            </div>
            <div class="content">
              <p>Olá <strong>${data.patientName}</strong>,</p>
              <p>Sua sessão de terapia foi confirmada com sucesso!</p>
              
              <div class="details">
                <div class="details-row">
                  <span><strong>Psicólogo:</strong></span>
                  <span>${data.psychologistName}</span>
                </div>
                <div class="details-row">
                  <span><strong>Data:</strong></span>
                  <span>${data.date}</span>
                </div>
                <div class="details-row">
                  <span><strong>Horário:</strong></span>
                  <span>${data.time}</span>
                </div>
                <div class="details-row">
                  <span><strong>Duração:</strong></span>
                  <span>${data.duration} minutos</span>
                </div>
                ${data.meetLink ? `
                <div class="details-row">
                  <span><strong>Link da Sessão:</strong></span>
                  <span><a href="${data.meetLink}">Acessar Google Meet</a></span>
                </div>
                ` : ''}
              </div>

              ${data.meetLink ? `
              <center>
                <a href="${data.meetLink}" class="button">Entrar na Sessão</a>
              </center>
              ` : ''}

              <p>Recomendamos entrar com 5 minutos de antecedência.</p>
              
              <div class="footer">
                <p>Atenciosamente,<br><strong>Equipe PsiquèIA</strong></p>
                <p style="font-size: 12px; color: #94A3B8;">Se você não agendou esta sessão, entre em contato conosco.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
  },
  'appointment-reminder': {
    subject: 'Lembrete: Sua sessão é amanhã - PsiquèIA',
    html: (data: any) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #F59E0B 0%, #F97316 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #F59E0B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .highlight { background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #F59E0B; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">⏰ Lembrete de Sessão</h1>
            </div>
            <div class="content">
              <p>Olá <strong>${data.patientName}</strong>,</p>
              <p>Este é um lembrete de que você tem uma sessão agendada:</p>
              
              <div class="highlight">
                <p><strong>Quando:</strong> ${data.date} às ${data.time}</p>
                <p><strong>Com:</strong> ${data.psychologistName}</p>
                <p><strong>Duração:</strong> ${data.duration} minutos</p>
              </div>

              ${data.meetLink ? `
              <center>
                <a href="${data.meetLink}" class="button">Entrar na Sessão</a>
              </center>
              ` : ''}

              <p>Nos vemos em breve!</p>
              
              <div style="text-align: center; color: #64748B; font-size: 14px; margin-top: 30px;">
                <p>Atenciosamente,<br><strong>Equipe PsiquèIA</strong></p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
  },
  'invitation': {
    subject: 'Convite para PsiquèIA - Transforme o Cuidado em Saúde Mental',
    html: (data: any) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #6B46C1 0%, #8B5CF6 100%); color: white; padding: 40px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
            .code-box { background: white; border: 2px dashed #6B46C1; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0; }
            .code { font-size: 32px; font-weight: bold; color: #6B46C1; letter-spacing: 2px; }
            .button { display: inline-block; background: #6B46C1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 36px;">PsiquèIA</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Transformando o Cuidado em Saúde Mental</p>
            </div>
            <div class="content">
              <h2>Você foi convidado!</h2>
              <p>Olá,</p>
              <p>Você recebeu um convite para se juntar à <strong>PsiquèIA</strong>, a plataforma que revoluciona o cuidado em saúde mental com tecnologia e IA.</p>
              
              <div class="code-box">
                <p style="margin: 0 0 10px 0; color: #64748B; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Seu Código de Convite</p>
                <div class="code">${data.invitationCode}</div>
              </div>

              <p><strong>Como usar:</strong></p>
              <ol>
                <li>Baixe o aplicativo PsiquèIA</li>
                <li>Clique em "Criar Conta"</li>
                <li>Digite o código de convite acima</li>
                <li>Complete seu cadastro</li>
              </ol>

              <p><strong>Tipo de acesso:</strong> ${data.userType === 'psychologist' ? 'Psicólogo' : 'Paciente'}</p>

              <div style="text-align: center; margin: 30px 0;">
                <p style="color: #64748B; font-size: 14px;">Este convite expira em 30 dias</p>
              </div>
              
              <div style="text-align: center; color: #64748B; font-size: 14px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                <p>Atenciosamente,<br><strong>Equipe PsiquèIA</strong></p>
                <p style="font-size: 12px; color: #94A3B8;">Se você não esperava este convite, pode ignorar este email.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
  },
};

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader || '' } } }
    );

    const token = authHeader?.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      log.warn('[Email] Unauthorized request attempted');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    log.info('[Email] Request from user', { userId: user.id });

    const { to, subject, html, text, template, templateData }: SendEmailRequest = await req.json();

    // Validate required fields
    if (!to) {
      return new Response(
        JSON.stringify({ error: 'Email recipient is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Allow client-supplied raw html/text ONLY for the caller's own address,
    // to keep the legitimate "send me a copy" flow but block using the
    // platform sender to phish arbitrary recipients. All other recipients
    // MUST go through a predefined template.
    const callerEmail = (user.email || '').toLowerCase();
    const recipientEmail = (to || '').toLowerCase();
    const isSelf = callerEmail && callerEmail === recipientEmail;

    if (!template && !isSelf) {
      return new Response(
        JSON.stringify({ error: 'A template is required to email other recipients' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (template && !templates[template]) {
      return new Response(
        JSON.stringify({ error: `Unknown template: ${template}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let emailSubject = subject;
    let emailHtml = html;
    let emailText = text;

    // Use template if specified
    if (template && templates[template]) {
      const tmpl = templates[template];
      emailSubject = tmpl.subject; // server-controlled — ignore client subject
      emailHtml = tmpl.html(templateData || {});
      emailText = undefined; // template owns the body
    }

    if (!emailHtml && !emailText) {
      return new Response(
        JSON.stringify({ error: 'Email content (html or text) is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    log.info('[Email] Sending', { to, template: template || 'custom' });

    // Send email using Resend with retry logic
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      log.warn('[Email] RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Email service not configured',
          message: 'Email would be sent in production' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const MAX_RETRIES = 3;
    let lastError: any = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        log.info('[Email] Attempt', { attempt, maxRetries: MAX_RETRIES });

        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'PsiquèIA <noreply@psiqueia.com>',
            to: [to],
            subject: emailSubject,
            html: emailHtml,
            text: emailText,
          }),
        });

        const result = await response.json();

        if (response.ok) {
          log.info('[Email] Sent successfully', { messageId: result.id });
          return new Response(
            JSON.stringify({ success: true, messageId: result.id }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        lastError = result;
        log.error('[Email] Attempt failed', { attempt, result });

        // Don't retry on 4xx errors (client errors)
        if (response.status >= 400 && response.status < 500) {
          break;
        }

        // Wait before retrying (exponential backoff)
        if (attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      } catch (error: any) {
        lastError = error;
        log.error('[Email] Attempt error', { attempt, error: error?.message ?? String(error) });

        if (attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    // All retries failed
    log.error('[Email] All attempts failed', { error: lastError?.message ?? String(lastError) });
    return new Response(
      JSON.stringify({ error: lastError.message || 'Failed to send email after retries' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    log.error('[Email] Unexpected error', { error: error?.message ?? String(error) });
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
