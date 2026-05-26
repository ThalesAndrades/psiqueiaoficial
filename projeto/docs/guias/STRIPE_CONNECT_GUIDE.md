# Guia de Integração Stripe Connect

## 📋 Visão Geral

A plataforma PsiquèIA está totalmente integrada com **Stripe Connect** para permitir que psicólogos recebam pagamentos das sessões de forma automática e segura.

---

## 🎯 Funcionalidades Implementadas

### ✅ Para Psicólogos

1. **Onboarding Automático**
   - Criação de conta Stripe Connect durante o cadastro
   - Opção de configurar agora ou depois
   - Fluxo guiado do Stripe Express

2. **Dashboard Financeiro**
   - Visualização de receitas
   - Status da conta Stripe
   - Acesso direto ao dashboard Stripe
   - Histórico de transações

3. **Recebimento Automático**
   - Pagamentos divididos automaticamente (90% psicólogo, 10% plataforma)
   - Transferências automáticas via Stripe
   - Suporte a Pix, cartão e transferência

### ✅ Para Pacientes

1. **Pagamento Seguro**
   - Checkout integrado
   - Múltiplos métodos de pagamento
   - Confirmação automática de sessões após pagamento

2. **Transparência**
   - Valores claros antes do pagamento
   - Recibos automáticos
   - Histórico de pagamentos

---

## 🔧 Configuração Técnica

### 1. Variáveis de Ambiente

Configure no **Supabase Edge Functions**:

```env
STRIPE_SECRET_KEY=sk_test_... ou sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 2. Webhooks do Stripe

Configure os seguintes eventos no dashboard Stripe:

```
Endpoint: https://SEU_PROJETO.supabase.co/functions/v1/stripe-payment?action=webhook

Eventos:
- payment_intent.succeeded
- payment_intent.payment_failed
- checkout.session.completed
- account.updated
```

### 3. Fluxo de Onboarding

```typescript
// 1. Psicólogo clica em "Configurar Recebimentos"
const { data } = await paymentService.createConnectAccount();

// 2. Abre URL do Stripe Express
window.location.href = data.url;

// 3. Stripe redireciona de volta após conclusão
// Return URL: /(psychologist)/financeiro?setup=complete

// 4. Sistema verifica status automaticamente
const { data: status } = await paymentService.getConnectAccountStatus();
```

### 4. Fluxo de Pagamento

```typescript
// 1. Paciente agenda sessão
const appointment = await appointmentService.createAppointment({...});

// 2. Sistema verifica se psicólogo pode receber
const { data: verification } = await paymentService.verifyPsychologist(psychologistId);

if (!verification.canReceivePayments) {
  throw new Error('Psychologist cannot receive payments yet');
}

// 3. Cria Payment Intent com divisão automática
const { data: payment } = await paymentService.createPaymentIntent(
  appointmentId,
  psychologistId,
  patientId,
  amount, // Exemplo: 450.00
  'Sessão de terapia'
);

// 4. Cliente processa pagamento no frontend
// 5. Webhook confirma e atualiza status
```

---

## 💰 Estrutura de Taxas

| Item | Valor |
|------|-------|
| **Valor da Sessão** | R$ 450,00 (100%) |
| **Taxa da Plataforma** | R$ 45,00 (10%) |
| **Psicólogo Recebe** | R$ 405,00 (90%) |
| **Taxas Stripe** | ~2.9% + R$ 0.39 (deduzido do valor do psicólogo) |

### Exemplo Real:

```
Sessão: R$ 450,00
├─ Taxa Plataforma (10%): R$ 45,00
└─ Psicólogo (90%): R$ 405,00
   └─ Taxa Stripe (~3%): R$ 12,50
   └─ Líquido Final: R$ 392,50
```

---

## 🚀 Validações Implementadas

### Antes de Criar Agendamento

```typescript
// Verifica se psicólogo completou onboarding
const { data } = await paymentService.verifyPsychologist(psychologistId);

if (!data.canReceivePayments) {
  Alert.alert(
    'Psicólogo Indisponível',
    'Este psicólogo ainda não configurou os recebimentos.'
  );
  return;
}
```

### Antes de Criar Payment Intent

```typescript
// Edge Function verifica automaticamente
const { data: psychProfile } = await supabase
  .from('psychologist_profiles')
  .select('stripe_account_id, stripe_onboarding_completed')
  .eq('user_id', psychologistId)
  .single();

if (!psychProfile?.stripe_onboarding_completed) {
  return Response.json(
    { error: 'Psychologist has not completed payment setup' },
    { status: 400 }
  );
}
```

---

## 📊 Status da Conta Connect

### Estados Possíveis

1. **Sem Conta** (`hasAccount: false`)
   - Psicólogo nunca iniciou configuração
   - Mostrar botão "Configurar Recebimentos"

2. **Onboarding Incompleto** (`hasAccount: true, onboardingCompleted: false`)
   - Psicólogo iniciou mas não finalizou
   - Mostrar botão "Continuar Configuração"

3. **Ativo** (`onboardingCompleted: true, chargesEnabled: true, payoutsEnabled: true`)
   - Totalmente funcional
   - Mostrar status verde + acesso ao dashboard

4. **Pendente** (`onboardingCompleted: false, detailsSubmitted: true`)
   - Aguardando verificação do Stripe
   - Mostrar status amarelo

---

## 🎨 UI/UX Implementada

### Tela de Onboarding (Step 3)

```tsx
// Opções para o psicólogo
1. "Configurar Agora" → Abre Stripe Express
2. "Configurar Depois" → Pula etapa (pode configurar em Financeiro)
```

### Tela Financeiro

```tsx
// Card de Status
- Sem conta: Ícone vermelho + "Configure Recebimentos"
- Incompleto: Ícone amarelo + "Complete sua Configuração"
- Ativo: Ícone verde + "Conta Stripe Ativa" + botão Dashboard

// Informações Financeiras
- Total Recebido
- A Receber
- Média por Sessão
- Transações Recentes
```

---

## 🔐 Segurança

### ✅ Implementado

1. **Autenticação**
   - Todas as ações requerem JWT válido
   - RLS habilitado em todas as tabelas

2. **Autorização**
   - Apenas psicólogos podem criar conta Connect
   - Apenas donos da conta podem acessar dashboard

3. **Validação**
   - Verificação de onboarding antes de criar pagamentos
   - Webhook signature verification

4. **Dados Sensíveis**
   - Chaves Stripe apenas em Edge Functions
   - Nunca expostas no frontend

---

## 🐛 Troubleshooting

### Problema: "Psychologist cannot receive payments"

**Causa**: Onboarding não completado

**Solução**:
```typescript
// Verificar status
const { data } = await paymentService.getConnectAccountStatus();
console.log(data);

// Se necessário, recriar link de onboarding
const { data: link } = await paymentService.createConnectAccountLink();
```

### Problema: Webhook não está sendo recebido

**Causa**: URL incorreta ou secret inválido

**Solução**:
1. Verificar endpoint: `https://SEU_PROJETO.supabase.co/functions/v1/stripe-payment?action=webhook`
2. Testar com Stripe CLI: `stripe trigger payment_intent.succeeded`
3. Verificar logs: Supabase Dashboard → Functions → Logs

### Problema: Payment Intent falha com erro 400

**Causa**: Psicólogo não tem conta Connect ativa

**Solução**:
```typescript
// Sempre verificar antes de criar pagamento
const { data } = await paymentService.verifyPsychologist(psychologistId);
if (!data.canReceivePayments) {
  // Mostrar mensagem apropriada
}
```

---

## 📈 Métricas e Analytics

### Eventos Rastreados

```typescript
// Quando psicólogo cria conta Connect
analyticsService.trackEvent('stripe_connect_created', userId);

// Quando onboarding é completado
analyticsService.trackEvent('stripe_onboarding_completed', userId);

// Quando pagamento é processado
analyticsService.trackEvent('payment_successful', userId, { amount });
```

---

## 🎯 Próximos Passos

### Funcionalidades Planejadas

- [ ] Relatórios financeiros detalhados
- [ ] Exportação de dados fiscais
- [ ] Suporte a múltiplas contas bancárias
- [ ] Pagamento recorrente (assinaturas)
- [ ] Sistema de descontos/cupons
- [ ] Split payment com múltiplos psicólogos

---

## 📚 Recursos

- [Stripe Connect Docs](https://stripe.com/docs/connect)
- [Stripe Express Accounts](https://stripe.com/docs/connect/express-accounts)
- [Webhook Events](https://stripe.com/docs/api/events)
- [Testing Webhooks](https://stripe.com/docs/webhooks/test)

---

## 📞 Suporte

Para questões técnicas sobre Stripe Connect:
- **Documentação**: Este arquivo
- **Código**: `/supabase/functions/stripe-payment/index.ts`
- **Service**: `/services/paymentService.ts`
- **UI**: `/app/(psychologist)/financeiro.tsx`
