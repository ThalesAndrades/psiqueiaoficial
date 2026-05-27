# 🚀 Integrações Facilitadas OnSpace - PsiquèIA

Este documento descreve todas as integrações implementadas na plataforma PsiquèIA usando as ferramentas facilitadas do OnSpace.

## 📦 Integrações Implementadas

### 1. 💳 Stripe - Sistema de Pagamentos

**Funcionalidades:**
- ✅ Pagamento de sessões individuais
- ✅ Checkout seguro com Stripe
- ✅ Gerenciamento de transações
- ✅ Webhook para confirmação automática
- ✅ Stripe Connect para psicólogos receberem pagamentos

**Como Usar (Paciente):**
```typescript
import { paymentService } from '../services';

// Criar sessão de checkout
const { data, error } = await paymentService.createCheckoutSession(
  psychologistId,
  patientId,
  appointmentId,
  450, // R$ 450,00
  'https://app.psiqueia.com/success',
  'https://app.psiqueia.com/cancel'
);

if (!error && data.url) {
  // Redirecionar para checkout
  Linking.openURL(data.url);
}
```

**Como Usar (Psicólogo):**
```typescript
// Criar conta Stripe Connect
const { data, error } = await paymentService.createConnectAccount();
if (!error && data.url) {
  // Redirecionar para onboarding
  Linking.openURL(data.url);
}
```

**Edge Function:** `supabase/functions/stripe-payment/index.ts`

**Configuração Necessária:**
- `STRIPE_SECRET_KEY` - Chave secreta Stripe
- `STRIPE_PUBLISHABLE_KEY` - Chave pública Stripe
- `STRIPE_WEBHOOK_SECRET` - Secret do webhook

---

### 2. 🔔 Push Notifications - Notificações em Tempo Real

**Funcionalidades:**
- ✅ Notificações push via Expo
- ✅ Lembretes de consultas
- ✅ Confirmações de pagamento
- ✅ Mensagens de psicólogos
- ✅ Badges e contadores
- ✅ Notificações agendadas

**Como Usar:**
```typescript
import { pushNotificationService } from '../services';

// Inicializar no app startup
await pushNotificationService.initialize();

// Enviar notificação para um usuário
await pushNotificationService.sendNotification(
  userId,
  'Lembrete de Sessão',
  'Sua sessão começa em 1 hora',
  { appointmentId: '123', screen: 'agenda' }
);

// Agendar notificação local
await pushNotificationService.scheduleLocalNotification(
  'Sessão Amanhã',
  'Você tem uma sessão amanhã às 10:00',
  { seconds: 3600 * 24 }, // 24 horas
  { appointmentId: '123' }
);

// Escutar notificações
pushNotificationService.addNotificationResponseListener((response) => {
  const { screen, appointmentId } = response.notification.request.content.data;
  // Navegar para a tela específica
});
```

**Edge Function:** `supabase/functions/push-notifications/index.ts`

**Permissions:** Automaticamente solicitadas no primeiro uso

---

### 3. 📧 Email Transacional - Resend

**Funcionalidades:**
- ✅ Confirmação de agendamento
- ✅ Lembretes de consulta
- ✅ Convites para cadastro
- ✅ Templates HTML profissionais
- ✅ Domínio personalizado (psiqueia.com)

**Templates Disponíveis:**
- `appointment-confirmation` - Confirmação de agendamento
- `appointment-reminder` - Lembrete de consulta
- `appointment-cancelled` - Cancelamento de consulta
- `invitation` - Convite para cadastro
- `welcome` - Boas-vindas

**Como Usar:**
```typescript
import { emailService } from '../services';

// Enviar confirmação de agendamento
await emailService.sendAppointmentConfirmation(
  'paciente@email.com',
  'Ana Silva',
  'Dr. João Santos',
  '15 de Dezembro, 2024',
  '10:00',
  50,
  'https://meet.google.com/abc-defg-hij'
);

// Enviar convite
await emailService.sendInvitation(
  'novo@email.com',
  'INVITE-CODE-2024',
  'patient'
);

// Enviar email customizado
await emailService.sendEmail({
  to: 'usuario@email.com',
  subject: 'Assunto do Email',
  html: '<h1>Conteúdo HTML</h1>',
});
```

**Edge Function:** `supabase/functions/send-email/index.ts`

**Configuração Necessária:**
- `RESEND_API_KEY` - API Key do Resend
- Verificar domínio `psiqueia.com` no Resend

---

### 4. 📊 Analytics - Rastreamento de Eventos

**Funcionalidades:**
- ✅ Rastreamento de telas visitadas
- ✅ Eventos de agendamento
- ✅ Eventos de pagamento
- ✅ Engajamento do usuário
- ✅ Métricas customizadas

**Eventos Principais:**
- `screen_view` - Visualização de tela
- `appointment_created` - Agendamento criado
- `appointment_completed` - Sessão concluída
- `payment_completed` - Pagamento realizado
- `diary_entry_created` - Entrada de diário criada
- `ai_chat_message_sent` - Mensagem enviada ao chat IA

**Como Usar:**
```typescript
import { analyticsService } from '../services';

// Track screen view
useEffect(() => {
  analyticsService.trackScreen('Home', userId);
}, []);

// Track appointment creation
await analyticsService.trackAppointmentCreated(userId, appointmentId);

// Track payment
await analyticsService.trackPaymentCompleted(userId, 450, paymentId);

// Track custom event
await analyticsService.trackEvent('custom_event', userId, {
  feature: 'diary',
  mood: 'happy',
  intensity: 8,
});

// Get analytics summary
const { data } = await analyticsService.getEventsSummary(
  userId,
  '2024-12-01',
  '2024-12-31'
);
```

**Armazenamento:** Tabela `analytics_events` no Supabase

---

## 🎯 Fluxos de Integração Completos

### Fluxo de Agendamento com Notificações e Emails

```typescript
// 1. Criar agendamento
const appointment = await appointmentService.createAppointment({
  patient_id: patientId,
  psychologist_id: psychologistId,
  scheduled_at: scheduleDate,
  duration_minutes: 50,
});

// 2. Enviar email de confirmação
await emailService.sendAppointmentConfirmation(
  patientEmail,
  patientName,
  psychologistName,
  date,
  time,
  50,
  meetLink
);

// 3. Enviar notificação push
await pushNotificationService.sendNotification(
  patientId,
  'Sessão Agendada',
  `Sua sessão com ${psychologistName} foi confirmada para ${date} às ${time}`,
  { appointmentId: appointment.id }
);

// 4. Agendar lembrete para 1 dia antes
const reminderTime = new Date(scheduleDate);
reminderTime.setDate(reminderTime.getDate() - 1);

await pushNotificationService.scheduleLocalNotification(
  'Lembrete: Sessão Amanhã',
  `Sua sessão com ${psychologistName} é amanhã às ${time}`,
  { date: reminderTime },
  { appointmentId: appointment.id }
);

// 5. Track analytics
await analyticsService.trackAppointmentCreated(patientId, appointment.id);
```

### Fluxo de Pagamento Completo

```typescript
// 1. Criar checkout session
const { data: session } = await paymentService.createCheckoutSession(
  psychologistId,
  patientId,
  appointmentId,
  450,
  'https://app.psiqueia.com/success',
  'https://app.psiqueia.com/cancel'
);

// 2. Track analytics
await analyticsService.trackPaymentInitiated(patientId, 450);

// 3. Redirecionar para checkout
await Linking.openURL(session.url);

// 4. Webhook do Stripe atualiza automaticamente:
//    - Status da transação em financial_transactions
//    - Status de pagamento em appointments
//    - Envia email de confirmação
//    - Envia notificação push

// 5. No callback de sucesso:
await analyticsService.trackPaymentCompleted(patientId, 450, paymentId);
await pushNotificationService.sendNotification(
  patientId,
  'Pagamento Confirmado',
  'Seu pagamento de R$ 450,00 foi processado com sucesso'
);
```

---

## 📱 Setup no App

### 1. Inicialização das Integrações

Em `app/_layout.tsx`:

```typescript
import { useEffect } from 'react';
import { pushNotificationService, analyticsService } from '../services';
import { useAuth } from '../hooks/useAuth';

export default function RootLayout() {
  const { user } = useAuth();

  useEffect(() => {
    // Initialize push notifications
    pushNotificationService.initialize();

    // Setup notification listeners
    const responseListener = pushNotificationService.addNotificationResponseListener((response) => {
      const { screen, ...params } = response.notification.request.content.data;
      // Navigate based on notification data
    });

    const receivedListener = pushNotificationService.addNotificationReceivedListener((notification) => {
      // Update badge count or show in-app notification
    });

    return () => {
      responseListener.remove();
      receivedListener.remove();
    };
  }, []);

  useEffect(() => {
    // Track user login
    if (user) {
      analyticsService.trackEvent('user_logged_in', user.id);
    }
  }, [user]);

  return (
    // ... rest of layout
  );
}
```

### 2. Instalação de Dependências

```bash
npm install expo-notifications expo-device
```

---

## ⚙️ Configuração de Secrets

As seguintes chaves devem ser configuradas no Supabase Edge Functions:

### Stripe
- `STRIPE_SECRET_KEY` - sk_test_... (Test) ou sk_live_... (Production)
- `STRIPE_PUBLISHABLE_KEY` - pk_test_... (Test) ou pk_live_... (Production)
- `STRIPE_WEBHOOK_SECRET` - whsec_... (obtido ao criar webhook no Dashboard Stripe)

### Resend
- `RESEND_API_KEY` - re_... (obtido no Dashboard Resend)

### Já Configuradas Automaticamente
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY` (substitui `ONSPACE_AI_*` — chama `api.anthropic.com/v1/messages`)
- `ANTHROPIC_MODEL` (opcional; default `claude-opus-4-7`)
- `GOOGLE_CLIENT_ID`
- `GOOGLE_API_KEY`

---

## 🔒 Segurança

- ✅ Todas as operações sensíveis via Edge Functions
- ✅ RLS (Row Level Security) em todas as tabelas
- ✅ Webhooks com verificação de assinatura
- ✅ Tokens de push armazenados com segurança
- ✅ Analytics com dados anonimizados quando necessário

---

## 📈 Métricas e Monitoramento

### Dashboard de Analytics (Admin)

```typescript
// Get summary of all events
const { data: summary } = await analyticsService.getEventsSummary(
  undefined, // all users
  startDate,
  endDate
);

// Get user-specific metrics
const { data: userMetrics } = await analyticsService.getEventsSummary(
  userId,
  startDate,
  endDate
);
```

### Logs e Debugging

Todos os serviços incluem logging detalhado:
- Console logs em desenvolvimento (`__DEV__`)
- Error tracking em produção
- Analytics de erros via `analytics_events`

---

## 🎁 Benefícios das Integrações

1. **Melhor Engajamento**: Notificações push aumentam taxa de comparecimento
2. **Profissionalismo**: Emails transacionais branded com psiqueia.com
3. **Receita**: Sistema de pagamentos completo e seguro
4. **Insights**: Analytics para entender comportamento dos usuários
5. **Automação**: Fluxos automáticos reduzem trabalho manual
6. **Escalabilidade**: Infraestrutura pronta para crescimento

---

## 🚀 Próximos Passos

Para ativar as integrações:

1. **Configure as API Keys** no Supabase Dashboard
2. **Execute o SQL** para criar tabelas necessárias
3. **Teste cada integração** em ambiente de desenvolvimento
4. **Configure webhooks** do Stripe apontando para sua Edge Function
5. **Verifique domínio** no Resend para emails personalizados
6. **Deploy** e monitore logs das Edge Functions

---

## 📚 Documentação Adicional

- [Stripe Documentation](https://stripe.com/docs)
- [Resend Documentation](https://resend.com/docs)
- [Expo Notifications](https://docs.expo.dev/push-notifications/overview/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
