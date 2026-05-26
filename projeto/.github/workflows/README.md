# 🚀 Deploy e CI/CD - PsiquèIA

## Estrutura de Deploy

Este projeto usa **Expo Application Services (EAS)** para builds e deploys automatizados.

### Ambientes

| Ambiente | Descrição | Branch | Trigger |
|----------|-----------|--------|---------|
| **Development** | Desenvolvimento local | `develop` | Manual |
| **Preview** | Testes internos | `staging` | Push para staging |
| **Production** | App Store/Play Store | `main` | Tag/Release |

---

## 📱 Build Profiles (eas.json)

### Development
```json
{
  "developmentClient": true,
  "distribution": "internal",
  "android": { "buildType": "apk" },
  "ios": { "simulator": true }
}
```
**Uso:** Desenvolvimento local com Expo Go

### Preview
```json
{
  "distribution": "internal",
  "android": { "buildType": "apk" },
  "ios": { "simulator": false }
}
```
**Uso:** Testes internos, TestFlight beta

### Production
```json
{
  "autoIncrement": true,
  "android": { "buildType": "app-bundle" },
  "ios": { "buildConfiguration": "Release" }
}
```
**Uso:** App Store e Google Play

---

## 🔧 Comandos de Build

### Local Development
```bash
# Instalar dependências
npm install

# Desenvolvimento local
npm start

# Limpar cache
npx expo start --clear
```

### EAS Builds

#### iOS
```bash
# Development
eas build --platform ios --profile development

# Preview (TestFlight)
eas build --platform ios --profile preview

# Production (App Store)
eas build --platform ios --profile production
```

#### Android
```bash
# Development
eas build --platform android --profile development

# Preview (Internal Testing)
eas build --platform android --profile preview

# Production (Play Store)
eas build --platform android --profile production
```

#### Ambas as Plataformas
```bash
eas build --platform all --profile production
```

---

## 📤 Submit para Stores

### iOS (App Store)
```bash
# Submit última build
eas submit --platform ios --latest

# Submit build específica
eas submit --platform ios --id <build-id>
```

**Requisitos:**
- Apple ID configurado em eas.json
- App-specific password gerado
- ASC App ID criado

### Android (Google Play)
```bash
# Submit última build
eas submit --platform android --latest

# Submit build específica
eas submit --platform android --id <build-id>
```

**Requisitos:**
- Service Account Key JSON
- App criado no Google Play Console
- Track configurado (internal/alpha/beta/production)

---

## 🔄 CI/CD com GitHub Actions

### Futuro: Workflow Automatizado

```yaml
# .github/workflows/eas-build.yml (exemplo)
name: EAS Build

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx eas-cli build --platform all --non-interactive
```

---

## 🔐 Secrets e Credenciais

### Configuradas no Projeto
- `SUPABASE_URL` - URL do backend
- `SUPABASE_ANON_KEY` - Chave pública Supabase
- `STRIPE_SECRET_KEY` - Chave secreta Stripe (Edge Functions)
- `STRIPE_WEBHOOK_SECRET` - Secret dos webhooks
- `GOOGLE_CLIENT_ID` - OAuth Google
- `GOOGLE_CLIENT_SECRET` - OAuth Google

### Configurar Secrets no EAS
```bash
# Adicionar secret
eas secret:create --scope project --name SECRET_NAME --value secret_value

# Listar secrets
eas secret:list

# Deletar secret
eas secret:delete --name SECRET_NAME
```

---

## 📊 Monitoramento

### Logs de Build
```bash
# Ver builds recentes
eas build:list

# Ver detalhes de build
eas build:view <build-id>

# Baixar build
eas build:download --id <build-id>
```

### Analytics
- **Sentry:** (TODO) Error tracking
- **Amplitude:** (TODO) User analytics
- **Crashlytics:** (TODO) Crash reporting

---

## 🚨 Troubleshooting

### Build Falha
1. Verificar logs: `eas build:view <build-id>`
2. Checar dependências: `npm install`
3. Limpar cache: `npx expo start --clear`
4. Verificar eas.json

### Submit Falha
1. Verificar credenciais (Apple ID, Service Account)
2. Checar metadados no App Store Connect
3. Verificar export compliance (iOS)
4. Revisar screenshots e ícone

### Problemas Comuns

**Erro: "No bundle identifier"**
```bash
# Verificar app.json
{
  "ios": {
    "bundleIdentifier": "com.psiqueia.app"
  }
}
```

**Erro: "Apple Team not found"**
```bash
# Adicionar em eas.json
{
  "submit": {
    "production": {
      "ios": {
        "appleTeamId": "XXXXXXXXXX"
      }
    }
  }
}
```

**Erro: "Build timeout"**
```bash
# Aumentar timeout (raro)
# Contactar suporte EAS
```

---

## 📞 Suporte

- **EAS Docs:** https://docs.expo.dev/eas/
- **EAS Support:** https://expo.dev/contact
- **Expo Forums:** https://forums.expo.dev/

---

**Última atualização:** 18 de Dezembro de 2025
