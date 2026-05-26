# ⚡ Próximos Passos Imediatos - PsiquèIA

**Data:** 18 de Dezembro de 2025  
**Status Atual:** 95% Pronto → 100% Pronto → Envio para Review

---

## 🎯 Objetivo

Completar os últimos 5% e enviar o app para review na App Store.

---

## 📋 Tarefas Pendentes (em ordem de prioridade)

### 🔴 PRIORIDADE MÁXIMA (Bloqueiam Envio)

#### 1. Criar Ícone do App (2-4 horas)

**Por que é crítico:**
- Sem ícone, a build não pode ser enviada
- É a primeira impressão do app

**Especificações:**
- Tamanho: 1024x1024px
- Formato: PNG sem transparência
- Background: #6B46C1 (roxo primário do PsiquèIA)
- Conteúdo: Logo limpo e profissional
- Sem texto (apenas símbolo/logo)

**Onde criar:**
1. **Opção A - Figma** (gratuito)
   - Criar artboard 1024x1024
   - Desenhar logo centralizado
   - Exportar PNG @1x

2. **Opção B - Canva** (gratuito)
   - Template "App Icon"
   - Customizar com cores/logo
   - Download PNG

3. **Opção C - Contratar Designer**
   - Fiverr, 99designs
   - Preço: $20-50 USD
   - Entrega: 1-2 dias

**Onde salvar:**
```
./assets/images/app-icon.png
```

**Como testar:**
```bash
# Atualizar app.json
{
  "expo": {
    "icon": "./assets/images/app-icon.png"
  }
}

# Testar localmente
npx expo start
```

---

#### 2. Capturar Screenshots (3-4 horas)

**Por que é crítico:**
- App Store exige mínimo 5 screenshots
- Usuários decidem download baseado nas screenshots

**Especificações iOS:**

| Dispositivo | Resolução | Quantidade |
|-------------|-----------|------------|
| iPhone 15 Pro Max (6.7") | 1290 x 2796px | 5-10 |
| iPhone 15 Pro (6.1") | 1179 x 2556px | 5-10 |

**Telas Recomendadas:**

1. **Login/Splash** (Marketing)
   - Mostrar logo + slogan
   - Visual limpo e profissional

2. **Dashboard Paciente** (Funcionalidades)
   - Mostrar cards principais
   - Estatísticas e próximas sessões

3. **Agendamento** (Usabilidade)
   - Calendário de seleção
   - Horários disponíveis
   - Preço claro

4. **Diário Emocional** (IA/Diferencial)
   - Entrada de texto
   - Insights da IA
   - Gráficos de humor

5. **Dashboard Psicólogo** (Profissional)
   - Lista de pacientes
   - Agenda de sessões
   - Financeiro

**Como capturar:**

**Método 1: Simulador iOS (Recomendado)**
```bash
# Abrir simulador
npx expo run:ios

# Selecionar dispositivo: iPhone 15 Pro Max
# Navegar para tela desejada
# CMD + S (screenshot)
# Salvar em pasta organizada
```

**Método 2: Xcode Simulator**
```bash
# Abrir Xcode
# Window → Devices and Simulators
# Selecionar iPhone 15 Pro Max
# Capturar screenshot: CMD + S
```

**Onde salvar:**
```
./screenshots/
  ├── 6.7-inch/
  │   ├── 01-login.png
  │   ├── 02-dashboard.png
  │   ├── 03-agendamento.png
  │   ├── 04-diario.png
  │   └── 05-psicologo.png
  └── 6.1-inch/
      └── (mesmos arquivos)
```

**Dica Pro:**
- Use dados reais (não lorem ipsum)
- Modo claro E escuro (opcional)
- Sem dados sensíveis
- Consistência visual

---

#### 3. Publicar Páginas Web (2-3 horas)

**Por que é crítico:**
- App Store exige URL de privacidade + suporte
- Validação automática antes da review

**Páginas Necessárias:**

1. **Política de Privacidade**
   - Arquivo fonte: `POLITICA_DE_PRIVACIDADE.md`
   - URL destino: `https://psiqueia.com/privacy`
   - Formato: HTML simples

2. **Termos de Uso**
   - Arquivo fonte: `TERMOS_DE_USO.md`
   - URL destino: `https://psiqueia.com/terms`
   - Formato: HTML simples

3. **Página de Suporte**
   - Arquivo fonte: `support-page.md`
   - URL destino: `https://psiqueia.com/support`
   - Formato: HTML simples

**Opções de Hospedagem:**

**Opção A: GitHub Pages (Grátis, 5 min)**
```bash
# 1. Criar repositório GitHub
# 2. Criar branch gh-pages
git checkout -b gh-pages

# 3. Converter MD para HTML
# 4. Push para GitHub
git push origin gh-pages

# 5. Ativar GitHub Pages nas configurações
# URL final: https://USERNAME.github.io/psiqueia/privacy
```

**Opção B: Vercel (Grátis, 10 min)**
```bash
# 1. Instalar Vercel CLI
npm install -g vercel

# 2. Criar pasta web/
mkdir web
cd web

# 3. Copiar arquivos HTML
cp ../POLITICA_DE_PRIVACIDADE.md ./privacy.html
# (converter MD → HTML)

# 4. Deploy
vercel

# URL final: https://psiqueia.vercel.app/privacy
```

**Opção C: Domínio Próprio (Pago, 1-2h)**
```bash
# 1. Comprar domínio: psiqueia.com
# 2. Configurar DNS
# 3. Hospedar HTML no servidor
# 4. Ativar SSL (Let's Encrypt)

# URL final: https://psiqueia.com/privacy
```

**Template HTML Simples:**
```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Política de Privacidade - PsiquèIA</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; color: #1e293b; }
        h1 { color: #6B46C1; }
        h2 { color: #8B5CF6; margin-top: 2em; }
        a { color: #6B46C1; }
    </style>
</head>
<body>
    <!-- Colar conteúdo do POLITICA_DE_PRIVACIDADE.md aqui (convertido para HTML) -->
</body>
</html>
```

**Ferramenta de Conversão MD → HTML:**
- https://markdowntohtml.com/
- Copiar MD, colar, copiar HTML resultante

---

#### 4. Criar Contas de Teste (1 hora)

**Por que é crítico:**
- Revisores da Apple precisam testar o app
- Sem contas de teste = rejeição automática

**Passo a Passo:**

**1. Criar Contas no Supabase Auth**
```bash
# Acessar: https://supabase.com/dashboard
# Ir para: Authentication → Users
# Clicar: "Add User"

# Conta 1: Paciente
Email: revisor.paciente@psiqueia.com
Password: Revisor@Paciente2025
Email Confirmed: ✅ YES

# Conta 2: Psicólogo
Email: revisor.psicologo@psiqueia.com
Password: Revisor@Psicologo2025
Email Confirmed: ✅ YES
```

**2. Copiar UUIDs Gerados**
```
Paciente UUID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
Psicólogo UUID: yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy
```

**3. Executar Script SQL**
```sql
-- Abrir: scripts/create-test-accounts.sql
-- Substituir UUIDs nos placeholders:
patient_id UUID := 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
psychologist_id UUID := 'yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy';

-- Executar no SQL Editor do Supabase
```

**4. Testar Login**
```bash
# Abrir app
# Fazer login com:
#   revisor.paciente@psiqueia.com
#   Revisor@Paciente2025

# Verificar:
# ✅ Login funciona
# ✅ Dashboard carrega
# ✅ Dados aparecem
```

**5. Configurar Dados de Teste**

Após login, completar manualmente:

**Paciente:**
- Completar onboarding
- Agendar 1-2 sessões
- Criar 2-3 entradas de diário
- Compartilhar diário com psicólogo

**Psicólogo:**
- Completar onboarding
- Configurar Stripe Connect (modo teste)
- Definir disponibilidade
- Adicionar especialidades e bio

---

#### 5. Testes Finais (2-3 horas)

**Por que é crítico:**
- Garantir zero crashes
- Validar todos os fluxos principais

**Script de Teste:**
Usar arquivo: `scripts/test-all-flows.md`

**Checklist Rápido:**
- [ ] Login funciona (paciente e psicólogo)
- [ ] Agendamento end-to-end (calendário → pagamento → confirmação)
- [ ] Stripe Checkout funciona
- [ ] Deep link de retorno funciona
- [ ] Google Meet link é gerado
- [ ] Diário salva e mostra insights
- [ ] Edição de perfil funciona
- [ ] App não crasha em 10 minutos de uso

**Critério de Aprovação:**
- ✅ Zero bugs críticos
- ✅ Todos os fluxos principais funcionando
- ✅ Sem crashes

---

### 🟠 PRIORIDADE ALTA (Melhoram Aprovação)

#### 6. Configurar EAS Build (1 hora)

```bash
# 1. Instalar EAS CLI
npm install -g eas-cli

# 2. Login
eas login

# 3. Configurar projeto
eas build:configure

# 4. Copiar Project ID gerado para app.json
{
  "extra": {
    "eas": {
      "projectId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
    }
  }
}
```

#### 7. Atualizar eas.json (30 min)

```json
{
  "submit": {
    "production": {
      "ios": {
        "appleId": "seu-email@icloud.com",
        "ascAppId": "XXXXXXXXXX",
        "appleTeamId": "XXXXXXXXXX"
      }
    }
  }
}
```

**Onde encontrar:**
- **Apple ID:** Email da conta Apple Developer
- **ASC App ID:** App Store Connect → App → App Information
- **Team ID:** Apple Developer → Membership

---

## 🚀 Após Completar P0

### Executar Build

```bash
# Build iOS Production
eas build --platform ios --profile production

# Aguardar ~20-30 minutos
# Build será automaticamente enviada para App Store Connect
```

### Configurar App Store Connect

1. **Criar App** (se ainda não criado)
   - Nome: PsiquèIA
   - Bundle ID: com.psiqueia.app
   - Primary Language: Portuguese (Brazil)

2. **Upload Assets**
   - Ícone 1024x1024
   - Screenshots (5-10 por tamanho)

3. **Preencher Metadados**
   - Descrição (copiar de `docs/APP_STORE_DESCRIPTION.md`)
   - Keywords: terapia,psicologia,saúde mental,IA
   - URLs: privacy, support, marketing

4. **Adicionar Build**
   - Selecionar build do EAS
   - Responder Export Compliance (YES, encryption limited to Apple)

5. **Informações de Revisão**
   - Copiar de `docs/REVIEWER_INSTRUCTIONS.md`
   - Adicionar credenciais de teste
   - Adicionar notas sobre Stripe em modo teste

6. **Submit para Review**
   - Revisar tudo
   - Clicar "Submit for Review"
   - Aguardar 1-3 dias

---

## 📊 Timeline Estimada

| Tarefa | Tempo | Status |
|--------|-------|--------|
| 1. Criar ícone | 2-4h | ⏳ Pendente |
| 2. Capturar screenshots | 3-4h | ⏳ Pendente |
| 3. Publicar páginas web | 2-3h | ⏳ Pendente |
| 4. Criar contas de teste | 1h | ⏳ Pendente |
| 5. Testes finais | 2-3h | ⏳ Pendente |
| 6. Configurar EAS | 1h | ⏳ Pendente |
| 7. Build iOS | 30min | ⏳ Pendente |
| 8. App Store Connect | 2h | ⏳ Pendente |
| **TOTAL** | **13-20h** | |

**Estimativa:** 2-3 dias de trabalho

---

## ✅ Checklist de Conclusão

Antes de enviar para review:

- [ ] Ícone 1024x1024 criado e testado
- [ ] Screenshots capturados (mín. 5 por tamanho)
- [ ] Páginas web publicadas e acessíveis
- [ ] Contas de teste criadas e funcionando
- [ ] Testes finais executados (zero bugs críticos)
- [ ] EAS configurado
- [ ] Build iOS completa
- [ ] App Store Connect configurado
- [ ] Build testada via TestFlight
- [ ] Metadados revisados
- [ ] Submit realizado

---

## 🆘 Precisa de Ajuda?

### Recursos
- **Guia Completo:** `GUIA_FINAL_LANCAMENTO.md`
- **Script de Testes:** `scripts/test-all-flows.md`
- **Checklist Detalhado:** `CHECKLIST_PRE_LANCAMENTO.md`
- **Instruções Revisores:** `docs/REVIEWER_INSTRUCTIONS.md`

### Suporte
- **EAS:** https://docs.expo.dev/eas/
- **App Store:** https://developer.apple.com/support/
- **Stripe:** https://support.stripe.com/

---

## 🎯 Próximo Marco

**Objetivo:** Completar tarefas P0 (1-5) em 2-3 dias

**Após completar P0:**
- Executar build
- Configurar App Store Connect
- Submit para review
- **Aguardar aprovação (1-3 dias)**

**Status de Prontidão Atual:** 95%  
**Status de Prontidão Alvo:** 100%

---

**Última atualização:** 18 de Dezembro de 2025  
**Próxima revisão:** Após completar assets visuais
