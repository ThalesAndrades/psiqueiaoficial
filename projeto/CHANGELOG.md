# Changelog - PsiquèIA

**Versão:** 1.1.0
**Data:** 18 de Dezembro de 2025
**Autor:** Manus AI

## ✨ Novas Funcionalidades

- **Implementação do Fluxo de Pagamento com Stripe:**
  - Adicionada uma nova tela de pagamento (`app/(patient)/payment.tsx`) para processar transações de forma segura usando o Stripe Checkout.
  - O fluxo de agendamento (`app/(patient)/nova-sessao.tsx`) agora redireciona para a tela de pagamento após a criação de uma consulta.
  - O preço da sessão é buscado dinamicamente do perfil do psicólogo.

- **Verificação de Onboarding do Psicólogo:**
  - O sistema agora verifica se o psicólogo completou o onboarding do Stripe antes de permitir que um paciente agende uma sessão paga.
  - A tela de perfil do psicólogo (`app/(psychologist)/perfil.tsx`) foi atualizada para exibir o status do Stripe Connect e facilitar a configuração.

## 🚀 Melhorias

- **Refatoração da Edge Function `stripe-payment`:**
  - A Edge Function foi refatorada para seguir as melhores práticas de API RESTful, passando a `action` pelo corpo da requisição (`body`) em vez de parâmetros de URL.

- **Melhora na Experiência do Usuário (UX):**
  - Mensagens de erro e sucesso mais claras durante o processo de agendamento e pagamento.
  - O paciente é informado caso o psicólogo ainda não esteja apto a receber pagamentos online.

## 🐞 Correções de Bugs

- Corrigido um problema onde o preço da sessão era fixo e não dinâmico.
- Adicionada a propriedade `session_price` à interface `Appointment` para consistência.

## 🛠️ Alterações Técnicas

- **`services/paymentService.ts`:** Atualizado para corresponder à nova estrutura da Edge Function.
- **`contexts/AppDataContext.tsx`:** Adicionada a função `refreshFinancials` para atualizar os dados financeiros do psicólogo.
- **`app/(patient)/_layout.tsx`:** Adicionada a rota para a nova tela de pagamento.
