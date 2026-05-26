# Guia de Configuração OAuth (Google e Apple)

## ⚠️ Passos Obrigatórios para Ativar Autenticação Social

A autenticação com Google e Apple está **implementada** no código, mas requer **configuração manual** no Supabase Dashboard.

---

## 🔧 1. Configurar Google OAuth

### 1.1 No Google Cloud Console

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Selecione seu projeto (ou crie um novo)
3. Navegue até **APIs & Services → Credentials**
4. Clique em **Create Credentials → OAuth 2.0 Client IDs**

#### Criar Client ID para iOS/Android (Native)
```
Application type: iOS
Bundle ID: host.exp.exponent (ou seu bundle ID do app.json)
```

```
Application type: Android
Package name: host.exp.exponent (ou seu package name)
SHA-1 fingerprint: (obter com `expo credentials:manager`)
```

#### Criar Client ID para Web
```
Application type: Web application
Authorized redirect URIs: 
  - https://wbwquhhlbjxkhupvfphy.supabase.co/auth/v1/callback
```

### 1.2 No Supabase Dashboard

1. Acesse [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto: **wbwquhhlbjxkhupvfphy**
3. Navegue até **Authentication → Providers**
4. Encontre **Google** e clique em **Enable**
5. Configure:

```
Client ID (for OAuth): 
  [Cole o Client ID Web do Google Cloud Console]

Client Secret (for OAuth): 
  [Cole o Client Secret do Google Cloud Console]

Authorized Client IDs (opcional, para native apps):
  [Cole os Client IDs iOS/Android separados por vírgula]
```

6. Copie a **Callback URL** exibida:
   ```
   https://wbwquhhlbjxkhupvfphy.supabase.co/auth/v1/callback
   ```

7. Volte ao Google Cloud Console e adicione essa URL em:
   **Credentials → Seu OAuth Client → Authorized redirect URIs**

---

## 🍎 2. Configurar Apple Sign In

### 2.1 No Apple Developer Portal

1. Acesse [Apple Developer](https://developer.apple.com/)
2. Navegue até **Certificates, Identifiers & Profiles**
3. Clique em **Identifiers** → **+ (adicionar)**
4. Selecione **Services IDs** → Continue
5. Configure:

```
Description: PsiquèIA Login
Identifier: com.yourapp.signin (ou similar)
```

6. Habilite **Sign In with Apple**
7. Clique em **Configure**
8. Adicione domínio e redirect URL:

```
Domains and Subdomains:
  wbwquhhlbjxkhupvfphy.supabase.co

Return URLs:
  https://wbwquhhlbjxkhupvfphy.supabase.co/auth/v1/callback
```

### 2.2 Criar App ID (se ainda não tiver)

1. Em **Identifiers**, crie um novo **App ID**
2. Configure:

```
Description: PsiquèIA
Bundle ID: Explicit → host.exp.exponent (ou seu bundle ID)
Capabilities: ✅ Sign In with Apple
```

### 2.3 Criar Secret Key

1. Navegue até **Keys** → **+ (adicionar)**
2. Configure:

```
Key Name: PsiquèIA Apple Sign In Key
✅ Sign In with Apple
Configure → Primary App ID: [Selecione seu App ID]
```

3. **Baixe o arquivo .p8** (guarde com segurança!)
4. Anote:
   - **Key ID** (ex: ABC123DEFG)
   - **Team ID** (visível no canto superior direito)

### 2.4 No Supabase Dashboard

1. Acesse **Authentication → Providers**
2. Encontre **Apple** e clique em **Enable**
3. Configure:

```
Services ID: 
  [Cole o Services ID criado (ex: com.yourapp.signin)]

Secret Key (from .p8 file):
  [Abra o arquivo .p8 e cole TODO o conteúdo]
  -----BEGIN PRIVATE KEY-----
  MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBH...
  -----END PRIVATE KEY-----

Key ID:
  [Cole o Key ID anotado (ex: ABC123DEFG)]

Team ID:
  [Cole o Team ID da sua conta Apple Developer]
```

---

## 📱 3. Configurar Deep Links (app.json)

Certifique-se de que o `app.json` está configurado corretamente:

```json
{
  "expo": {
    "scheme": "onspaceapp",
    "ios": {
      "bundleIdentifier": "host.exp.exponent"
    },
    "android": {
      "package": "host.exp.exponent"
    }
  }
}
```

**Importante**: Se você mudar o `scheme`, `bundleIdentifier` ou `package`, atualize também no:
- Google Cloud Console (Authorized redirect URIs)
- Apple Developer Portal (Bundle ID)
- Código: `AuthSession.makeRedirectUri()`

---

## ✅ 4. Testar Autenticação

### Teste Google

1. Abra o app
2. Clique em **Google** na tela de login
3. Navegador será aberto com tela de consentimento do Google
4. Selecione conta e autorize
5. App retorna automaticamente e você está logado

### Teste Apple (iOS)

1. Abra o app no dispositivo iOS físico
2. Clique em **Apple** na tela de login
3. Tela nativa do Apple Sign In aparece
4. Autorize com Face ID/Touch ID
5. Você está logado imediatamente

### Teste Apple (Android/Web)

1. Similar ao fluxo Google
2. Navegador será aberto
3. Login com Apple ID
4. Retorna ao app

---

## 🐛 Troubleshooting

### Erro: "redirect_uri_mismatch"

**Causa**: URL de callback não configurada corretamente

**Solução**:
1. Verifique se a URL no Google Cloud Console é **exatamente**:
   ```
   https://wbwquhhlbjxkhupvfphy.supabase.co/auth/v1/callback
   ```
2. Certifique-se de que salvou as alterações
3. Aguarde alguns minutos para propagar

### Erro: "invalid_client"

**Causa**: Client ID ou Secret incorretos

**Solução**:
1. Copie novamente do Google/Apple e cole no Supabase
2. Certifique-se de não ter espaços extras
3. Salve e teste novamente

### Erro: "OAuth session missing" ou "No code returned"

**Causa**: Deep link não está redirecionando corretamente

**Solução**:
1. Verifique o `scheme` no `app.json`
2. Execute `expo prebuild --clean` se estiver usando bare workflow
3. Teste com `npx expo start` em modo desenvolvimento

### Apple: "invalid_request" ou "service_not_configured"

**Causa**: Services ID não configurado corretamente

**Solução**:
1. Verifique que o Services ID está **habilitado** para Sign In with Apple
2. Certifique-se de que o domínio Supabase está adicionado
3. Aguarde até 24h para Apple processar as alterações

### iOS: Botão Apple não aparece

**Causa**: Executando no simulador ou Expo Go

**Solução**:
- AppleAuthentication nativo **só funciona em dispositivos físicos iOS**
- Use `expo build:ios` ou EAS Build para testar
- Alternativa: Teste o fluxo OAuth (Android/Web) que funciona em todos os dispositivos

---

## 📊 Verificar Status

### No código (para debug)

```typescript
// Adicione em app/login.tsx após tentativa de login
const handleGoogleLogin = async () => {
  const result = await signInWithGoogle();
  console.log('Google result:', result);
  
  if (result.error) {
    Alert.alert('Debug Info', JSON.stringify(result, null, 2));
  }
};
```

### Logs do Supabase

1. Dashboard → Project Settings → API
2. Verifique se `SUPABASE_URL` está correto
3. Dashboard → Authentication → Logs
4. Veja tentativas de login em tempo real

---

## 🎯 Checklist Final

Antes de testar em produção, confirme:

- [ ] **Google Cloud Console**: Client ID e Secret criados
- [ ] **Supabase Dashboard**: Google Provider habilitado e configurado
- [ ] **Google Cloud Console**: Callback URL adicionada (`/auth/v1/callback`)
- [ ] **Apple Developer**: Services ID criado e configurado
- [ ] **Apple Developer**: Secret Key (.p8) baixado
- [ ] **Supabase Dashboard**: Apple Provider habilitado com todos os dados
- [ ] **app.json**: Scheme, Bundle ID, Package configurados
- [ ] **Código**: `AuthSession.makeRedirectUri()` usando scheme correto
- [ ] **Teste iOS**: Em dispositivo físico (não simulador)
- [ ] **Teste Android**: APK instalado ou Expo Dev Client
- [ ] **Logs**: Monitore Supabase Auth Logs durante testes

---

## 📚 Recursos

- [Supabase Google OAuth Docs](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Supabase Apple OAuth Docs](https://supabase.com/docs/guides/auth/social-login/auth-apple)
- [Expo AuthSession](https://docs.expo.dev/versions/latest/sdk/auth-session/)
- [Expo Apple Authentication](https://docs.expo.dev/versions/latest/sdk/apple-authentication/)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Sign in with Apple](https://developer.apple.com/sign-in-with-apple/)

---

## 📞 Próximos Passos

1. **Configure Google OAuth** seguindo seção 1
2. **Configure Apple Sign In** seguindo seção 2
3. **Teste no navegador/web primeiro** (mais fácil de debugar)
4. **Teste iOS em dispositivo físico** (para Apple nativo)
5. **Gere APK/IPA** para teste final em produção

**Importante**: OAuth social **NÃO funcionará** até completar as configurações nos dashboards Google/Apple/Supabase.
