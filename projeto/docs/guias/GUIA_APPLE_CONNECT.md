# 🍎 Guia Completo de Envio para Apple App Store Connect

**App:** PsiquèIA  
**Versão:** 1.0.0  
**Build:** 1  
**Data:** Dezembro 2024

---

## 📋 Pré-Requisitos

### 1. **Conta Apple Developer**
- [ ] Conta Apple Developer ativa ($99/ano)
- [ ] Acesso ao [App Store Connect](https://appstoreconnect.apple.com)
- [ ] Acesso ao [Developer Portal](https://developer.apple.com)

### 2. **Informações Necessárias**
- [ ] Bundle ID: `com.psiqueia.app`
- [ ] App Name: `PsiquèIA`
- [ ] Team ID (encontrar em developer.apple.com)
- [ ] Apple ID (email da conta)

### 3. **Assets Necessários**
- [ ] Ícone do app (1024x1024px)
- [ ] Screenshots iPhone (vários tamanhos)
- [ ] Screenshots iPad (se suportar)
- [ ] Política de Privacidade (URL pública)
- [ ] Termos de Serviço (URL pública)

---

## 🚀 Passo a Passo de Envio

### **Etapa 1: Configurar App no App Store Connect**

1. **Criar App:**
   - Acesse [App Store Connect](https://appstoreconnect.apple.com)
   - Clique em "My Apps" → "+" → "New App"
   - Preencha:
     - **Platform:** iOS
     - **Name:** PsiquèIA
     - **Primary Language:** Portuguese (Brazil)
     - **Bundle ID:** com.psiqueia.app (criar se não existir)
     - **SKU:** psiqueia-001 (identificador único interno)

2. **Configurar Informações do App:**
   - **Category:** Health & Fitness → Medical
   - **Subtitle:** Plataforma de saúde mental com IA
   - **Description:**
     ```
     PsiquèIA é uma plataforma inovadora de saúde mental que conecta pacientes 
     e psicólogos através de tecnologia avançada e inteligência artificial.

     PARA PACIENTES:
     • Agendamento fácil de sessões online
     • Diário emocional com insights de IA
     • Acesso a psicólogos verificados
     • Pagamentos seguros via Stripe
     • Histórico completo de sessões

     PARA PSICÓLOGOS:
     • Gestão completa de pacientes
     • Agenda integrada com Google Calendar
     • Recebimentos automáticos via Stripe Connect
     • Ferramentas de análise e acompanhamento
     • Dashboard financeiro completo

     SEGURANÇA E PRIVACIDADE:
     • Dados criptografados de ponta a ponta
     • Conformidade com LGPD
     • Autenticação segura
     • Sessões via Google Meet integrado
     ```

3. **Configurar URLs:**
   - **Privacy Policy URL:** `https://psiqueia.com/privacy` (criar página)
   - **Support URL:** `https://psiqueia.com/support` (criar página)
   - **Marketing URL:** `https://psiqueia.com` (opcional)

4. **Configurar Pricing:**
   - **Price:** Free (app gratuito, pagamentos in-app via Stripe)

---

### **Etapa 2: Preparar Assets**

#### **Ícone do App (obrigatório):**
- **Tamanho:** 1024x1024px
- **Formato:** PNG sem transparência
- **Conteúdo:** Logo PsiquèIA sem texto

#### **Screenshots iPhone (obrigatórios):**
Você precisa de screenshots para pelo menos 2 tamanhos:

**6.7" Display (iPhone 14 Pro Max, 15 Pro Max):**
- Tamanho: 1290 x 2796 px
- Quantidade: 3-10 screenshots
- Sugestões:
  1. Tela de login
  2. Dashboard do paciente
  3. Agendamento de sessão
  4. Tela de chat/diário
  5. Dashboard do psicólogo

**6.5" Display (iPhone 14 Plus, 13 Pro Max):**
- Tamanho: 1284 x 2778 px
- Quantidade: 3-10 screenshots

**Como gerar screenshots:**
```bash
# 1. Rodar app em simulador iOS
npx expo run:ios

# 2. Abrir simulador no tamanho correto
# Device → iPhone 15 Pro Max

# 3. Capturar telas (Cmd+S ou Device → Screenshot)

# 4. Redimensionar se necessário
```

#### **Screenshots iPad (opcional):**
Se `supportsTablet: true`, adicionar screenshots de iPad.

---

### **Etapa 3: Configurar EAS Build**

1. **Instalar EAS CLI:**
```bash
npm install -g eas-cli
```

2. **Login no EAS:**
```bash
eas login
```

3. **Configurar Projeto:**
```bash
eas build:configure
```

Isso criará/atualizará o `eas.json` e solicitará seu Project ID.

4. **Atualizar app.json com Project ID:**
Após `eas build:configure`, copie o Project ID e adicione em `app.json`:
```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "seu-project-id-aqui"
      }
    }
  }
}
```

---

### **Etapa 4: Build iOS para Produção**

1. **Criar Build:**
```bash
eas build --platform ios --profile production
```

Este comando irá:
- ✅ Configurar certificados automaticamente (se não existirem)
- ✅ Criar provisioning profiles
- ✅ Fazer upload para Apple servers
- ✅ Compilar o app
- ✅ Gerar arquivo `.ipa`

2. **Acompanhar Build:**
- Acesse [expo.dev](https://expo.dev) para ver progresso
- Build leva cerca de 15-30 minutos
- Você receberá notificação quando terminar

3. **Download do IPA (opcional):**
Após build concluído, você pode baixar o `.ipa`:
```bash
eas build:list
# Copie o ID do build
eas build:download --id BUILD_ID
```

---

### **Etapa 5: Enviar para TestFlight**

#### **Opção A: Upload Automático via EAS Submit**

```bash
eas submit --platform ios --latest
```

Você precisará fornecer:
- **Apple ID:** seu-email-apple@exemplo.com
- **App-specific password:** (gerar em appleid.apple.com)
- **ASC App ID:** (encontrar no App Store Connect)

#### **Opção B: Upload Manual via Transporter**

1. **Baixar Transporter:**
   - Mac App Store → Buscar "Transporter"
   - Instalar app oficial da Apple

2. **Upload do IPA:**
   - Abrir Transporter
   - Arrastar arquivo `.ipa`
   - Fazer login com Apple ID
   - Clicar "Deliver"

---

### **Etapa 6: Configurar TestFlight**

1. **Acessar App Store Connect:**
   - Ir para "My Apps" → PsiquèIA
   - Aba "TestFlight"

2. **Aguardar Processamento:**
   - Build leva 5-15 minutos para processar
   - Você receberá email quando estiver pronto

3. **Preencher Informações:**
   - **Test Information:**
     - Descrição do que testar
     - Email de feedback
     - Notas para revisores
   
   - **Export Compliance:**
     - ✅ "Yes" (usa criptografia)
     - ✅ "No" (não é criptografia customizada)

4. **Adicionar Testadores:**
   
   **Opção 1: Testadores Internos (até 100)**
   - Adicionar emails da sua equipe
   - Acesso imediato após aprovação

   **Opção 2: Testadores Externos (até 10,000)**
   - Criar grupo de teste
   - Adicionar emails
   - Requer aprovação da Apple (1-2 dias)

5. **Compartilhar Link:**
   - Testadores recebem email com link
   - Instalam app TestFlight
   - Instalam seu app

---

### **Etapa 7: Enviar para Revisão da App Store**

Após testar via TestFlight e confirmar que tudo funciona:

1. **Preparar Versão:**
   - App Store Connect → PsiquèIA → App Store
   - Clicar "+" para criar nova versão

2. **Preencher Metadados:**
   - **What's New:** Descrição da versão 1.0
   - **Promotional Text:** Texto de marketing
   - **Description:** Descrição completa (já preenchida)
   - **Keywords:** terapia, psicologia, saúde mental, IA, consulta online
   - **Support URL:** https://psiqueia.com/support
   - **Marketing URL:** https://psiqueia.com

3. **Upload Screenshots:**
   - Arrastar screenshots para cada tamanho de tela

4. **Selecionar Build:**
   - Clicar em "Build" → Selecionar build do TestFlight

5. **Configurar Rating:**
   - **Age Rating:** 17+ (conteúdo médico/saúde mental)
   - Preencher questionário

6. **Configurar In-App Purchases:**
   - ⚠️ **IMPORTANTE:** Como usa Stripe, NÃO configurar In-App Purchase
   - Marcar "No" para in-app purchases

7. **Preencher Review Information:**
   - **Contact Information:**
     - Nome: Seu nome
     - Phone: Seu telefone
     - Email: contact@psiqueia.com
   
   - **Demo Account (OBRIGATÓRIO para revisores):**
     ```
     Username: revisor@psiqueia.com
     Password: Revisor@123
     
     Notas:
     - Esta é uma conta de teste de PACIENTE
     - Também fornecemos conta de PSICÓLOGO:
       Username: psicologo-revisor@psiqueia.com
       Password: Psicologo@123
     
     - O app conecta pacientes e psicólogos
     - Pagamentos via Stripe (modo teste ativado)
     - Use cartão de teste: 4242 4242 4242 4242
     ```

   - **Notes:**
     ```
     PsiquèIA é uma plataforma de telemedicina que conecta pacientes 
     e psicólogos licenciados.
     
     FUNCIONALIDADES PRINCIPAIS:
     - Agendamento de sessões online
     - Videochamadas via Google Meet (integrado)
     - Pagamentos via Stripe (processador externo)
     - Diário emocional com insights de IA
     - Gestão de pacientes para psicólogos
     
     CONFORMIDADE:
     - Todos os psicólogos são verificados (CRP)
     - Dados criptografados (Supabase)
     - Conforme LGPD
     - Stripe para pagamentos (PCI-DSS compliant)
     
     CONTAS DE TESTE:
     - Paciente: revisor@psiqueia.com / Revisor@123
     - Psicólogo: psicologo-revisor@psiqueia.com / Psicologo@123
     
     STRIPE TESTE:
     - Cartão: 4242 4242 4242 4242
     - Qualquer data futura e CVV
     ```

8. **Enviar para Revisão:**
   - Revisar todas as informações
   - Clicar "Submit for Review"

---

## ⏱️ Timeline Esperado

| Etapa | Tempo Estimado |
|-------|----------------|
| Configurar App Store Connect | 1-2 horas |
| Preparar Assets (screenshots) | 2-4 horas |
| Build iOS com EAS | 15-30 minutos |
| Upload para TestFlight | 5-15 minutos |
| Aprovação TestFlight (interno) | Imediato |
| Aprovação TestFlight (externo) | 1-2 dias |
| Revisão App Store | 1-3 dias |
| **TOTAL ATÉ LANÇAMENTO** | **3-7 dias** |

---

## ⚠️ Checklist Crítico Antes de Enviar

### **Código:**
- [ ] Remover todos `console.log` desnecessários (já otimizado)
- [ ] Testar fluxos completos (paciente e psicólogo)
- [ ] Verificar integração Stripe funcionando
- [ ] Testar notificações push
- [ ] Verificar deep links funcionando

### **Configurações:**
- [ ] Bundle ID correto: `com.psiqueia.app`
- [ ] Versão: `1.0.0`
- [ ] Build number: `1`
- [ ] Ícone de alta qualidade (1024x1024)
- [ ] Splash screen configurado

### **Compliance:**
- [ ] Política de Privacidade publicada
- [ ] Termos de Serviço publicados
- [ ] Permissões explicadas (NSCameraUsageDescription, etc.)
- [ ] LGPD compliance verificado

### **Contas de Teste:**
- [ ] Criar `revisor@psiqueia.com` (paciente) no Supabase
- [ ] Criar `psicologo-revisor@psiqueia.com` (psicólogo) no Supabase
- [ ] Configurar dados de teste (agendamentos, etc.)
- [ ] Testar login com essas contas

### **Stripe:**
- [ ] Modo de teste ativado para revisores
- [ ] Verificar que cartão `4242 4242 4242 4242` funciona
- [ ] Testar fluxo completo de pagamento

---

## 🚨 Problemas Comuns e Soluções

### **Erro: "Missing Compliance"**
**Solução:** Preencher Export Compliance no TestFlight
- Sim, usa criptografia
- Não, não é customizada (usa HTTPS padrão)

### **Erro: "Invalid Binary"**
**Solução:** Verificar:
- Bundle ID corresponde ao App Store Connect
- Versão/Build number incrementados
- Certificados válidos

### **Erro: "Missing Screenshots"**
**Solução:** Upload screenshots para todos os tamanhos obrigatórios
- 6.7" e 6.5" são obrigatórios
- Mínimo 3 screenshots cada

### **Erro: "Guideline 4.3 - Design: Spam"**
**Solução:** App muito genérico
- Adicionar funcionalidades únicas (IA insights já está)
- Melhorar descrição
- Destacar diferenciais

### **Erro: "Guideline 2.1 - Performance: App Completeness"**
**Solução:** App não funcionando para revisores
- Verificar contas de teste
- Testar todos os fluxos
- Adicionar instruções claras nas notas

---

## 📞 Suporte

**Problemas com EAS Build:**
- Documentação: https://docs.expo.dev/build/introduction/
- Discord: https://chat.expo.dev

**Problemas com App Store:**
- Apple Developer Forums: https://developer.apple.com/forums/
- App Review: https://developer.apple.com/app-store/review/

**Problemas com o App:**
- Email: contact@psiqueia.com

---

## ✅ Comandos Rápidos

```bash
# Login EAS
eas login

# Configurar projeto
eas build:configure

# Build iOS
eas build --platform ios --profile production

# Listar builds
eas build:list

# Download build
eas build:download --id BUILD_ID

# Submit para App Store
eas submit --platform ios --latest

# Ver status do submit
eas submit:list
```

---

## 📝 Notas Finais

1. **Primeira Revisão:** Geralmente leva 2-3 dias. Seja paciente.

2. **Rejeições são Normais:** ~40% dos apps são rejeitados na primeira tentativa. Leia o feedback, corrija, e reenvie.

3. **Contas de Teste:** Mantenha-as sempre funcionando. Revisores testam rigorosamente.

4. **Atualizações:** Após aprovação inicial, updates levam 1-2 dias.

5. **Phased Release:** Considere liberar gradualmente (10% → 50% → 100% dos usuários).

---

**Boa sorte com o lançamento! 🚀🍎**
