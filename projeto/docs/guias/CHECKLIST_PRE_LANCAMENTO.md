# ✅ Checklist Completo Pré-Lançamento - Apple App Store

**App:** PsiquèIA v1.0.0  
**Data:** Dezembro 2024

---

## 🔧 1. CONFIGURAÇÃO TÉCNICA

### App Configuration (app.json)
- [x] Nome do app: "PsiquèIA"
- [x] Slug: "psiqueia"
- [x] Bundle ID iOS: "com.psiqueia.app"
- [x] Versão: "1.0.0"
- [x] Build number: "1"
- [x] Ícone configurado
- [x] Splash screen configurado
- [x] Orientação: portrait
- [x] Scheme: "psiqueia"
- [x] Permissões iOS configuradas:
  - [x] NSCameraUsageDescription
  - [x] NSPhotoLibraryUsageDescription
  - [x] NSMicrophoneUsageDescription
  - [x] NSCalendarsUsageDescription
  - [x] NSRemindersUsageDescription
  - [x] UIBackgroundModes (notificações)

### Build Configuration (eas.json)
- [x] EAS CLI >= 5.9.0
- [x] Production profile configurado
- [x] iOS buildConfiguration: "Release"
- [x] Auto-increment ativado
- [ ] **TODO:** Adicionar Project ID após `eas build:configure`
- [ ] **TODO:** Adicionar Apple Team ID
- [ ] **TODO:** Adicionar ASC App ID

---

## 📱 2. ASSETS E MÍDIA

### Ícone do App
- [ ] **TODO:** Criar ícone 1024x1024px
  - Formato: PNG sem transparência
  - Conteúdo: Logo PsiquèIA limpo
  - Cores: Roxo primário (#6B46C1)
  - Localização: `./assets/images/app-icon.png`

### Screenshots iPhone
- [ ] **TODO:** Capturar screenshots 6.7" (1290 x 2796px)
  - [ ] Screenshot 1: Tela de login
  - [ ] Screenshot 2: Dashboard paciente
  - [ ] Screenshot 3: Agendamento de sessão
  - [ ] Screenshot 4: Diário emocional
  - [ ] Screenshot 5: Dashboard psicólogo

- [ ] **TODO:** Capturar screenshots 6.5" (1284 x 2778px)
  - [ ] Screenshot 1: Tela de login
  - [ ] Screenshot 2: Dashboard paciente
  - [ ] Screenshot 3: Agendamento de sessão
  - [ ] Screenshot 4: Diário emocional
  - [ ] Screenshot 5: Dashboard psicólogo

### Splash Screen
- [x] Configurado em app.json
- [x] Background color: #6B46C1
- [x] Logo centralizado

---

## 🌐 3. PÁGINAS WEB OBRIGATÓRIAS

### Política de Privacidade
- [ ] **TODO:** Criar página em `https://psiqueia.com/privacy`
- [ ] **Deve incluir:**
  - [ ] Dados coletados (email, nome, telefone, fotos)
  - [ ] Como dados são usados (sessões, agendamento)
  - [ ] Compartilhamento de dados (Google Meet, Stripe)
  - [ ] Direitos do usuário (LGPD)
  - [ ] Cookies e tracking
  - [ ] Contato para dúvidas

### Página de Suporte
- [ ] **TODO:** Criar página em `https://psiqueia.com/support`
- [ ] **Deve incluir:**
  - [ ] FAQ
  - [ ] Email de contato: contact@psiqueia.com
  - [ ] Como usar o app
  - [ ] Troubleshooting comum
  - [ ] Como cancelar conta

### Termos de Serviço (opcional mas recomendado)
- [ ] **TODO:** Criar página em `https://psiqueia.com/terms`
- [ ] **Deve incluir:**
  - [ ] Aceitação dos termos
  - [ ] Responsabilidades (pacientes e psicólogos)
  - [ ] Pagamentos e reembolsos
  - [ ] Cancelamento de conta
  - [ ] Limitação de responsabilidade

---

## 👤 4. CONTAS DE TESTE PARA REVISORES

### Conta de Paciente
- [ ] **TODO:** Criar no Supabase
  - Email: `revisor@psiqueia.com`
  - Senha: `Revisor@123`
  - Nome: `Revisor Apple`
  - Tipo: `patient`
  - Onboarding: `completed`
  - [ ] Criar 2-3 agendamentos de exemplo
  - [ ] Adicionar entradas no diário
  - [ ] Configurar psicólogo associado

### Conta de Psicólogo
- [ ] **TODO:** Criar no Supabase
  - Email: `psicologo-revisor@psiqueia.com`
  - Senha: `Psicologo@123`
  - Nome: `Dr. João Silva`
  - Tipo: `psychologist`
  - Onboarding: `completed`
  - CRP: `12/34567`
  - [ ] Completar perfil (bio, especialidades, preço)
  - [ ] Configurar disponibilidade
  - [ ] Adicionar 2-3 pacientes de exemplo
  - [ ] Criar agendamentos de exemplo

### Stripe Test Mode
- [ ] **TODO:** Configurar Stripe em modo teste
  - [ ] Verificar que chaves de teste estão em uso
  - [ ] Testar cartão: `4242 4242 4242 4242`
  - [ ] Verificar que pagamentos funcionam
  - [ ] Verificar Connect account do psicólogo teste

---

## 🧪 5. TESTES FUNCIONAIS

### Fluxo de Paciente
- [ ] **Testar:** Cadastro de novo paciente
- [ ] **Testar:** Login com email/senha
- [ ] **Testar:** Onboarding (pular e completar)
- [ ] **Testar:** Visualizar dashboard
- [ ] **Testar:** Buscar psicólogos
- [ ] **Testar:** Agendar sessão
- [ ] **Testar:** Ver agendamentos na agenda
- [ ] **Testar:** Pagar sessão com Stripe
- [ ] **Testar:** Acessar link Google Meet
- [ ] **Testar:** Escrever no diário
- [ ] **Testar:** Ver insights de IA
- [ ] **Testar:** Editar perfil
- [ ] **Testar:** Fazer logout

### Fluxo de Psicólogo
- [ ] **Testar:** Cadastro de novo psicólogo
- [ ] **Testar:** Login com email/senha
- [ ] **Testar:** Onboarding (completar perfil)
- [ ] **Testar:** Configurar Stripe Connect
- [ ] **Testar:** Visualizar dashboard
- [ ] **Testar:** Ver lista de pacientes
- [ ] **Testar:** Ver agendamentos
- [ ] **Testar:** Acessar sessão (Google Meet)
- [ ] **Testar:** Ver financeiro
- [ ] **Testar:** Receber pagamento
- [ ] **Testar:** Acessar Stripe Dashboard
- [ ] **Testar:** Editar perfil
- [ ] **Testar:** Fazer logout

### Funcionalidades Avançadas
- [ ] **Testar:** Notificações push
- [ ] **Testar:** Deep links (reset password)
- [ ] **Testar:** Recuperação de senha
- [ ] **Testar:** Deletar conta
- [ ] **Testar:** Google Calendar sync
- [ ] **Testar:** Upload de fotos/documentos
- [ ] **Testar:** Chat com IA

### Performance
- [ ] **Verificar:** App carrega em < 3 segundos
- [ ] **Verificar:** Sem crashes em 10 minutos de uso
- [ ] **Verificar:** Transições suaves entre telas
- [ ] **Verificar:** Scroll suave em listas longas
- [ ] **Verificar:** Sem memory leaks

---

## 🔒 6. SEGURANÇA E COMPLIANCE

### LGPD / Privacidade
- [x] Dados criptografados (Supabase)
- [x] Autenticação segura
- [x] RLS policies no banco
- [ ] **TODO:** Política de privacidade publicada
- [ ] **TODO:** Termos de serviço publicados
- [ ] **TODO:** Funcionalidade de deletar conta testada

### Stripe / Pagamentos
- [x] Chaves Stripe apenas no servidor
- [x] Webhooks configurados
- [x] PCI-DSS compliant (via Stripe)
- [ ] **TODO:** Testar modo teste com revisores
- [ ] **TODO:** Documentar que não usa In-App Purchase

### Apple Guidelines
- [x] Não usa criptografia customizada
- [x] Permissões bem explicadas
- [ ] **TODO:** Verificar Age Rating (17+ para conteúdo médico)
- [ ] **TODO:** Sem funcionalidades enganosas
- [ ] **TODO:** App completo e funcional

---

## 📝 7. APP STORE CONNECT

### Informações Básicas
- [ ] **TODO:** Criar app no App Store Connect
  - Bundle ID: `com.psiqueia.app`
  - Name: `PsiquèIA`
  - Primary Language: Portuguese (Brazil)
  - SKU: `psiqueia-001`

### Categoria e Classificação
- [ ] **TODO:** Selecionar categoria: Health & Fitness → Medical
- [ ] **TODO:** Preencher questionário de Age Rating
- [ ] **TODO:** Marcar como 17+ (conteúdo de saúde mental)

### Descrição e Metadados
- [ ] **TODO:** Escrever descrição do app (max 4000 caracteres)
- [ ] **TODO:** Escrever subtitle (max 30 caracteres)
- [ ] **TODO:** Adicionar keywords: terapia,psicologia,saúde mental,IA,teleconsulta
- [ ] **TODO:** URL de suporte: `https://psiqueia.com/support`
- [ ] **TODO:** URL de marketing: `https://psiqueia.com`
- [ ] **TODO:** URL de privacidade: `https://psiqueia.com/privacy`

### Pricing
- [ ] **TODO:** Marcar como Free
- [ ] **TODO:** Marcar "No" para In-App Purchases (usa Stripe externo)

### Review Information
- [ ] **TODO:** Preencher informações de contato:
  - Nome completo
  - Telefone
  - Email: contact@psiqueia.com

- [ ] **TODO:** Adicionar contas de teste:
  ```
  PACIENTE:
  Email: revisor@psiqueia.com
  Senha: Revisor@123
  
  PSICÓLOGO:
  Email: psicologo-revisor@psiqueia.com
  Senha: Psicologo@123
  
  STRIPE TESTE:
  Cartão: 4242 4242 4242 4242
  Data: Qualquer futura
  CVV: Qualquer
  ```

- [ ] **TODO:** Adicionar notas detalhadas sobre funcionamento

---

## 🚀 8. BUILD E DEPLOY

### Configurar EAS
- [ ] **TODO:** Instalar EAS CLI: `npm install -g eas-cli`
- [ ] **TODO:** Login: `eas login`
- [ ] **TODO:** Configurar projeto: `eas build:configure`
- [ ] **TODO:** Copiar Project ID para app.json

### Build iOS
- [ ] **TODO:** Executar: `eas build --platform ios --profile production`
- [ ] **TODO:** Aguardar build (~20 minutos)
- [ ] **TODO:** Verificar build completo sem erros

### Upload para App Store
- [ ] **TODO:** Opção A - EAS Submit: `eas submit --platform ios --latest`
  - [ ] Fornecer Apple ID
  - [ ] Fornecer App-specific password
  - [ ] Fornecer ASC App ID

- [ ] **TODO:** Opção B - Transporter Manual:
  - [ ] Baixar build: `eas build:download`
  - [ ] Abrir Transporter
  - [ ] Upload do .ipa

### TestFlight
- [ ] **TODO:** Aguardar processamento (5-15 min)
- [ ] **TODO:** Preencher Export Compliance:
  - Sim, usa criptografia
  - Não, não é customizada
- [ ] **TODO:** Adicionar testadores internos
- [ ] **TODO:** Testar build via TestFlight
- [ ] **TODO:** Corrigir bugs encontrados

### Submit para Review
- [ ] **TODO:** Selecionar build no App Store Connect
- [ ] **TODO:** Upload de todos os screenshots
- [ ] **TODO:** Revisar todas as informações
- [ ] **TODO:** Clicar "Submit for Review"
- [ ] **TODO:** Aguardar aprovação (1-3 dias)

---

## 📊 9. OTIMIZAÇÕES FINAIS

### Código
- [x] Remover console.logs desnecessários (mantidos apenas em _layout.tsx para debugging)
- [ ] **TODO:** Adicionar error tracking (Sentry)
- [ ] **TODO:** Adicionar analytics (Amplitude/Mixpanel)
- [ ] **TODO:** Otimizar imagens com compression

### Performance
- [ ] **TODO:** Analisar bundle size
- [ ] **TODO:** Lazy load de telas pesadas
- [ ] **TODO:** Cache de imagens
- [ ] **TODO:** Debounce em searches

### UX
- [ ] **TODO:** Adicionar loading states em todas as ações
- [ ] **TODO:** Adicionar error states em todas as telas
- [ ] **TODO:** Adicionar empty states
- [ ] **TODO:** Melhorar feedback visual de ações

---

## 🎯 10. PÓS-APROVAÇÃO

### Launch
- [ ] **TODO:** Configurar phased release (recomendado)
- [ ] **TODO:** Monitorar crashes no primeiro dia
- [ ] **TODO:** Responder reviews
- [ ] **TODO:** Coletar feedback dos usuários

### Marketing
- [ ] **TODO:** Preparar press kit
- [ ] **TODO:** Post em redes sociais
- [ ] **TODO:** Email para beta testers
- [ ] **TODO:** Comunicado de lançamento

### Suporte
- [ ] **TODO:** Configurar sistema de tickets
- [ ] **TODO:** Preparar FAQ detalhado
- [ ] **TODO:** Treinar equipe de suporte
- [ ] **TODO:** Monitorar emails de suporte

---

## ⏱️ TIMELINE ESTIMADO

| Tarefa | Tempo | Responsável | Status |
|--------|-------|-------------|--------|
| Criar assets (ícone, screenshots) | 4h | Design | ⏳ Pendente |
| Criar páginas web (privacy, support) | 3h | Dev | ⏳ Pendente |
| Criar contas de teste | 1h | Dev | ⏳ Pendente |
| Testes completos (ambos fluxos) | 4h | QA | ⏳ Pendente |
| Configurar App Store Connect | 2h | Dev | ⏳ Pendente |
| Build iOS via EAS | 30min | Dev | ⏳ Pendente |
| Upload e configurar TestFlight | 1h | Dev | ⏳ Pendente |
| Teste interno TestFlight | 2h | QA | ⏳ Pendente |
| Submit para review | 30min | Dev | ⏳ Pendente |
| Aguardar aprovação Apple | 1-3 dias | - | ⏳ Pendente |
| **TOTAL** | **~2-4 dias de trabalho** | | |

---

## 🚨 BLOQUEADORES CRÍTICOS

### Antes de Iniciar Build:
- [ ] ❗ App Store Developer account ativa
- [ ] ❗ Páginas web publicadas (privacy + support)
- [ ] ❗ Contas de teste criadas e funcionando
- [ ] ❗ Ícone 1024x1024 pronto
- [ ] ❗ Screenshots capturados

### Antes de Submit:
- [ ] ❗ Build TestFlight testado por pelo menos 2 pessoas
- [ ] ❗ Zero crashes em uso normal
- [ ] ❗ Todos os fluxos principais funcionando
- [ ] ❗ Stripe funcionando em modo teste

---

## 📞 CONTATOS DE EMERGÊNCIA

**Apple Developer Support:**  
https://developer.apple.com/contact/

**EAS Support:**  
https://expo.dev/contact

**Stripe Support:**  
https://support.stripe.com

**Supabase Support:**  
https://supabase.com/support

---

**Última atualização:** Dezembro 2024  
**Próxima revisão:** Após primeira aprovação

**✅ Use este checklist para garantir que nada foi esquecido!**
