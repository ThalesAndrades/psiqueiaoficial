# 🚀 Setup das Integrações - PsiquèIA

Este guia explica como ativar todas as integrações implementadas na plataforma.

## ✅ Checklist de Ativação

### 1. 📊 Analytics e Notificações (Backend)

**Status:** ⏳ Aguardando execução do SQL

Execute o SQL que está aguardando aprovação no painel. Este SQL cria:
- ✅ Tabela `analytics_events` para rastreamento
- ✅ Tabela `notifications` para notificações em app
- ✅ Coluna `push_token` em `user_profiles`
- ✅ RLS policies apropriadas

**Após execução:** ✅ Analytics e notificações push estarão funcionais

---

### 2. 🔔 Push Notifications (Dependências)

**Dependências necessárias:**
```bash
npx expo install expo-notifications expo-device
```

**Configuração:**
- ✅ Código já implementado
- ✅ Inicialização automática no `app/_layout.tsx`
- ✅ Edge Function `push-notifications` pronta
- ✅ Service `pushNotificationService.ts` pronto

**Teste:**
```typescript
import { pushNotificationService } from './services';

// O sistema já solicita permissões automaticamente
// Tokens são salvos automaticamente no login
```

---

### 3. 💳 Stripe Payments (API Keys)

**Configurar no Supabase Dashboard:**

1. Acesse: `Project Settings` → `Edge Functions` → `Secrets`
2. Adicione as seguintes keys:

```
STRIPE_SECRET_KEY=sk_test_... (obtido em stripe.com/dashboard)
STRIPE_PUBLISHABLE_KEY=pk_test_... (obtido em stripe.com/dashboard)
STRIPE_WEBHOOK_SECRET=whsec_... (criar webhook primeiro)
```

**Criar Webhook do Stripe:**
1. Acesse: https://dashboard.stripe.com/webhooks
2. Clique em "+ Add endpoint"
3. URL: `https://[seu-projeto].supabase.co/functions/v1/stripe-payment?action=webhook`
4. Eventos para ouvir:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `checkout.session.completed`
5. Copie o `Signing secret` (whsec_...) e adicione como `STRIPE_WEBHOOK_SECRET`

**Status após configuração:** ✅ Pagamentos funcionais

---

### 4. 📧 Email Transacional (Resend)

**Configurar no Supabase Dashboard:**

1. Acesse: `Project Settings` → `Edge Functions` → `Secrets`
2. Adicione:

```
RESEND_API_KEY=re_... (obtido em resend.com/api-keys)
```

**Configurar domínio personalizado (Opcional mas recomendado):**
1. Acesse: https://resend.com/domains
2. Adicione o domínio `psiqueia.com`
3. Configure os registros DNS conforme instruções
4. Aguarde verificação

**Sem domínio verificado:** Emails são enviados de `onboarding@resend.dev` (funciona mas não é profissional)

**Com domínio verificado:** Emails são enviados de `noreply@psiqueia.com` ✨

**Status após configuração:** ✅ Emails transacionais funcionais

---

### 5. 🤖 OnSpace AI (Já Configurado)

**Status:** ✅ JÁ FUNCIONAL

- ✅ `ONSPACE_AI_API_KEY` configurada
- ✅ `ONSPACE_AI_BASE_URL` configurada
- ✅ Edge Function `ai-agent` pronta
- ✅ Serviço `aiService.ts` implementado
- ✅ Usado em: Chat AI, Análise de Humor, Insights

**Nenhuma ação necessária!**

---

### 6. 🔗 Google Integrations (Já Configurado)

**Status:** ✅ JÁ FUNCIONAL

- ✅ `GOOGLE_CLIENT_ID` configurada
- ✅ `GOOGLE_API_KEY` configurada
- ✅ Edge Function `google-integration` pronta
- ✅ Integrações: Drive, Meet, Calendar

**Nenhuma ação necessária!**

---

## 🎯 Ordem Recomendada de Ativação

### Fase 1: Essenciais (Faça Agora)
1. ✅ **Executar SQL** de Analytics e Notificações
2. ✅ **Instalar dependências** do Expo (`expo-notifications`, `expo-device`)
3. ✅ **Configurar Stripe** (se for usar pagamentos)

### Fase 2: Melhorias (Faça Depois)
4. ✅ **Configurar Resend** para emails profissionais
5. ✅ **Verificar domínio** psiqueia.com no Resend

---

## 📱 Testando as Integrações

### Analytics
```typescript
import { analyticsService } from './services';

// Rastrear evento customizado
analyticsService.trackEvent('test_event', userId, { test: true });

// Ver no Supabase: tabela analytics_events
```

### Push Notifications
```typescript
import { pushNotificationService } from './services';

// Enviar notificação de teste
await pushNotificationService.sendNotification(
  userId,
  'Teste',
  'Notificação de teste',
  { screen: 'agenda' }
);
```

### Stripe Payments
```typescript
import { paymentService } from './services';

// Criar checkout
const { data } = await paymentService.createCheckoutSession(
  psychologistId,
  patientId,
  appointmentId,
  450,
  'https://success.url',
  'https://cancel.url'
);

// Redirecionar para: data.url
```

### Email
```typescript
import { emailService } from './services';

// Enviar email de teste
await emailService.sendEmail({
  to: 'test@example.com',
  subject: 'Teste',
  html: '<h1>Email de Teste</h1>',
});
```

---

## 🐛 Troubleshooting

### Push Notifications não funciona
- ✅ Verificar se executou o SQL (coluna `push_token`)
- ✅ Verificar se instalou `expo-notifications`
- ✅ Testar em device físico (não funciona em simulador web)

### Stripe retorna erro 401
- ✅ Verificar se `STRIPE_SECRET_KEY` está configurada
- ✅ Verificar se a key começa com `sk_test_` ou `sk_live_`

### Emails não são enviados
- ✅ Verificar se `RESEND_API_KEY` está configurada
- ✅ Verificar logs da Edge Function `send-email`
- ✅ Verificar se o domínio está verificado (se usar domínio customizado)

### Webhook do Stripe não funciona
- ✅ Verificar se `STRIPE_WEBHOOK_SECRET` está configurada
- ✅ Verificar se a URL do webhook está correta
- ✅ Verificar se os eventos corretos estão selecionados

---

## 📊 Monitoramento

### Edge Functions Logs
Acesse no Supabase Dashboard: `Edge Functions` → `[function-name]` → `Logs`

### Database Queries
```sql
-- Ver analytics recentes
SELECT * FROM analytics_events 
ORDER BY timestamp DESC 
LIMIT 50;

-- Ver notificações não lidas
SELECT * FROM notifications 
WHERE read = false 
ORDER BY created_at DESC;

-- Ver transações pendentes
SELECT * FROM financial_transactions 
WHERE status = 'pending' 
ORDER BY created_at DESC;
```

---

## ✅ Quando Tudo Estiver Configurado

Você terá:
- 📊 **Analytics** rastreando todos os eventos do app
- 🔔 **Push Notifications** enviando lembretes automáticos
- 💳 **Stripe** processando pagamentos de forma segura
- 📧 **Emails** transacionais com templates profissionais
- 🤖 **IA** gerando insights e respondendo perguntas
- 🔗 **Google** integrando Drive, Meet e Calendar

**Plataforma 100% funcional e pronta para produção!** 🚀
