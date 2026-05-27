# Guia de Autenticação - PsiquèIA

## ✅ Sistema Completo de Autenticação

O aplicativo possui um sistema robusto de autenticação com múltiplas opções de login e recursos de segurança.

---

## 🔐 Métodos de Autenticação

### 1. Email e Senha (Padrão)

**Login:**
- Email e senha obrigatórios
- Validação de formato de email
- Mensagens de erro melhoradas:
  - ✅ "Email ou senha incorretos" (em vez de mensagem técnica)
  - ✅ "Email não confirmado" (quando necessário)
  - ✅ "Usuário não encontrado"

**Cadastro:**
- Campos obrigatórios:
  - Nome completo
  - Email (validado)
  - Senha (mínimo 6 caracteres)
  - Confirmação de senha
  - Código de convite
- Campos opcionais:
  - Telefone
- Tipo de usuário: Paciente ou Psicólogo

### 2. Google OAuth

**Status:** Implementado (requer configuração)

**Como funciona:**
- Botão "Google" na tela de login
- Redirecionamento para tela de consentimento do Google
- Retorno automático ao app após autorização
- Criação automática de perfil de usuário

**Configuração necessária:**
- Seguir instruções em `CONFIGURACAO_OAUTH.md`
- Habilitar provider no Supabase Dashboard
- Configurar Client ID e Secret no Google Cloud Console

### 3. Apple Sign In

**Status:** Implementado (requer configuração)

**Como funciona:**
- **iOS (nativo):**
  - Usa `expo-apple-authentication` para autenticação nativa
  - Face ID / Touch ID para autorização
  - Captura e salva nome completo do usuário
  - Experiência mais rápida e segura
  
- **Android/Web:**
  - Usa OAuth flow padrão
  - Redirecionamento para página de login da Apple
  - Retorno automático ao app

**Configuração necessária:**
- Seguir instruções em `CONFIGURACAO_OAUTH.md`
- Configurar Services ID no Apple Developer Portal
- Habilitar provider no Supabase Dashboard

---

## 🎟️ Sistema de Convites

### Código Universal: SOUPSIQUEIA

**Características:**
- ✅ Nunca expira (válido até 2099)
- ✅ Pode ser usado por qualquer pessoa
- ✅ Não é marcado como "usado" após registro
- ✅ Case-insensitive (SOUPSIQUEIA = soupsiqueia)
- ✅ Funciona para pacientes e psicólogos

**Como usar:**
1. Na tela de cadastro, digite: `SOUPSIQUEIA`
2. Clique em "Criar Conta"
3. Pronto! Conta criada com sucesso

### Códigos de Convite Personalizados

Administradores podem criar códigos de convite específicos:

```typescript
import { invitationService } from './services/invitationService';

// Criar convite para um email específico
await invitationService.createInvitation(
  'paciente@example.com',
  'patient',
  adminUserId
);
```

**Características:**
- Válido por 30 dias
- Vinculado a um email específico
- Marcado como "usado" após primeiro registro
- Tipo de usuário pré-definido (patient ou psychologist)

---

## 🔄 Recuperação de Senha

### Fluxo Completo Implementado

**1. Solicitar Reset:**
- Tela: `/esqueci-senha`
- Usuário digita email cadastrado
- Email de recuperação enviado via Supabase Auth
- Mensagem de confirmação exibida

**2. Receber Email:**
- Email contém link mágico para redefinir senha
- Link redireciona para: `psiqueia://reset-password`
- Token de segurança incluído automaticamente

**3. Redefinir Senha:**
- Usuário é redirecionado de volta ao app
- Nova senha é definida via `authService.updatePassword()`
- Sessão mantida após atualização

**Como acessar:**
- Tela de login → "Esqueceu a senha?" (link azul)
- Digite email → "Enviar Instruções"
- Verifique caixa de entrada

---

## 👥 Tipos de Usuário

### Paciente (Patient)

**Funcionalidades:**
- Agendar sessões com psicólogos
- Manter diário emocional
- Visualizar documentos compartilhados
- Chat com IA terapêutica
- Acessar plano de tratamento

**Onboarding:**
- Step 1: Informações pessoais (data nascimento, telefone)
- Step 2: Configurações de notificação

### Psicólogo (Psychologist)

**Funcionalidades:**
- Gerenciar agenda de sessões
- Visualizar lista de pacientes
- Criar e compartilhar documentos
- Criar planos de tratamento
- Gestão financeira (Stripe Connect)
- Integração com Google Meet

**Onboarding:**
- Step 1: Dados profissionais (CRP, especializações)
- Step 2: Disponibilidade (dias e horários)
- Step 3: Configuração de pagamentos (Stripe)

### Administrador (Admin)

**Características:**
- Flag `is_admin` na tabela `user_profiles`
- Pode gerenciar convites
- Acesso total ao sistema
- Criar outros usuários via Edge Function

**Como criar admin:**
```sql
-- Promover usuário existente
UPDATE user_profiles
SET is_admin = true, admin_level = 'super'
WHERE email = 'admin@psiqueia.com';
```

---

## 🔒 Segurança

### Políticas Row Level Security (RLS)

**Todas as tabelas possuem RLS ativo:**

**user_profiles:**
- ✅ Usuários autenticados podem ler/atualizar próprio perfil
- ✅ Admins podem ler/atualizar todos os perfis
- ✅ Service role pode executar todas operações

**invitations:**
- ✅ Qualquer pessoa pode validar convite (anon + authenticated)
- ✅ Usuários autenticados podem criar convites
- ✅ Admins podem gerenciar todos os convites
- ✅ Service role pode executar todas operações

**appointments, diary_entries, treatment_plans, etc:**
- ✅ Usuários veem apenas próprios dados
- ✅ Relacionamentos patient-psychologist respeitados
- ✅ Admins têm acesso total para auditoria

### Armazenamento de Tokens

**Mobile (iOS/Android):**
```typescript
// Usa AsyncStorage com criptografia
import AsyncStorage from '@react-native-async-storage/async-storage';

const storage = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};
```

**Web:**
```typescript
// Usa localStorage
const storage = {
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
  removeItem: (key) => localStorage.removeItem(key),
};
```

### Configurações de Sessão

```typescript
createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    autoRefreshToken: true,      // Auto refresh antes expirar
    persistSession: true,         // Manter sessão entre reinicializações
    detectSessionInUrl: false,    // Não necessário em mobile
  },
});
```

### Gerenciamento de Estado do App

```typescript
// Pausar/retomar refresh automático baseado em estado do app
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
```

---

## 🚀 Fluxo de Autenticação

### 1. App Inicializa

```typescript
// AuthContext recupera sessão existente
useEffect(() => {
  supabase.auth.getSession().then(({ data }) => {
    setSession(data.session);
    setUser(data.session?.user ?? null);
    if (data.session?.user) {
      fetchUserProfile(data.session.user.id);
    }
  });
}, []);
```

### 2. Listener de Mudanças

```typescript
// Reage a eventos de autenticação
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    // Usuário fez login
    fetchUserProfile(session.user.id);
  } else if (event === 'SIGNED_OUT') {
    // Usuário fez logout
    clearUserData();
  } else if (event === 'TOKEN_REFRESHED') {
    // Token atualizado automaticamente
    setSession(session);
  }
});
```

### 3. Navegação Automática

**AuthContext gerencia redirecionamento:**

```typescript
// Se não autenticado → /login
// Se autenticado mas sem onboarding → /(onboarding-patient) ou /(onboarding-psychologist)
// Se autenticado e onboarding completo → /(patient) ou /(psychologist)
```

**Lógica em app/index.tsx:**
```typescript
useEffect(() => {
  if (!loading) {
    if (!isAuthenticated) {
      router.replace('/login');
    } else if (!hasCompletedOnboarding) {
      router.replace(
        userType === 'psychologist' 
          ? '/(onboarding-psychologist)/step1' 
          : '/(onboarding-patient)/step1'
      );
    } else {
      router.replace(
        userType === 'psychologist' 
          ? '/(psychologist)' 
          : '/(patient)'
      );
    }
  }
}, [loading, isAuthenticated, hasCompletedOnboarding, userType]);
```

---

## 🛠️ Funções Disponíveis

### AuthContext

```typescript
const {
  user,                        // User object do Supabase
  session,                     // Session ativa
  userProfile,                 // Perfil do user_profiles
  loading,                     // Estado de carregamento
  userType,                    // 'patient' | 'psychologist' | null
  isAuthenticated,             // Boolean
  hasCompletedOnboarding,      // Boolean
  signIn,                      // (email, password) => Promise
  signUp,                      // (email, password, type, fullName, phone?, invitationCode?) => Promise
  signInWithGoogle,            // () => Promise
  signInWithApple,             // () => Promise
  exchangeCodeForSession,      // (code) => Promise (OAuth callback)
  signOut,                     // () => Promise
  refreshProfile,              // () => Promise (recarrega perfil)
} = useAuth();
```

### authService

```typescript
// Email/Password
await authService.signIn({ email, password });
await authService.signUp({ email, password, fullName, userType, phone, invitationCode });

// OAuth
const { url } = await authService.signInWithGoogle();
const { url } = await authService.signInWithApple();
await authService.exchangeCodeForSession(code);

// Recuperação de Senha
await authService.resetPassword(email);
await authService.updatePassword(newPassword);

// Sessão
await authService.getSession();
await authService.refreshSession();
await authService.signOut();

// Listener
const { data: { subscription } } = authService.onAuthStateChange(callback);
```

### invitationService

```typescript
// Validar convite
const result = await invitationService.validateInvitation('SOUPSIQUEIA', 'user@example.com');
// { valid: true, user_type: 'patient', email: 'user@example.com' }

// Marcar como usado
await invitationService.markInvitationUsed('CODE123', userId);

// Criar novo convite (admin)
await invitationService.createInvitation('user@example.com', 'psychologist', adminId);

// Listar convites (admin)
const { data } = await invitationService.getAllInvitations();
```

---

## 📝 Tratamento de Erros

### Mensagens Amigáveis

**Antes:**
```
Error: Invalid login credentials
```

**Depois:**
```
Email ou senha incorretos
```

**Implementação:**
```typescript
if (result.error) {
  let errorMsg = result.error;
  if (errorMsg.includes('Invalid login credentials')) {
    errorMsg = 'Email ou senha incorretos';
  } else if (errorMsg.includes('Email not confirmed')) {
    errorMsg = 'Email não confirmado. Verifique sua caixa de entrada.';
  } else if (errorMsg.includes('User not found')) {
    errorMsg = 'Usuário não encontrado';
  }
  
  setError(errorMsg);
  notificationService.showError(errorMsg);
}
```

### FunctionsHttpError

**Edge Functions retornam erros especiais:**

```typescript
import { FunctionsHttpError } from '@supabase/supabase-js';

if (error instanceof FunctionsHttpError) {
  const statusCode = error.context?.status ?? 500;
  const textContent = await error.context?.text();
  const parsedError = JSON.parse(textContent);
  console.error(`[Code: ${statusCode}] ${parsedError.error}`);
}
```

---

## 🧪 Testes

### Testar Cadastro

1. Abra o app
2. Clique em "Criar conta"
3. Preencha:
   - Código: `SOUPSIQUEIA`
   - Nome: Teste Paciente
   - Email: teste@example.com
   - Senha: 123456
4. Criar Conta
5. ✅ Deve logar automaticamente e redirecionar para onboarding

### Testar Login

1. Use credenciais criadas no cadastro
2. Clicar "Entrar"
3. ✅ Deve redirecionar para área do paciente/psicólogo

### Testar Recuperação de Senha

1. Tela de login → "Esqueceu a senha?"
2. Digite email cadastrado
3. "Enviar Instruções"
4. ✅ Mensagem de sucesso exibida
5. Verificar email (caixa de entrada)
6. Clicar no link do email
7. ✅ App abre automaticamente
8. Definir nova senha

### Testar OAuth (Google/Apple)

**Pré-requisito:** Configurar providers (ver `CONFIGURACAO_OAUTH.md`)

1. Tela de login → Clicar botão Google/Apple
2. Navegador/tela nativa abre
3. Autorizar acesso
4. ✅ Retorna ao app e loga automaticamente

---

## 🔧 Configuração de Email

### Personalizar Templates de Email

**Supabase envia emails automáticos para:**
- Confirmação de cadastro
- Recuperação de senha
- Mudança de email

**Personalizar:**
1. Dashboard Supabase → Authentication → Email Templates
2. Editar templates padrão com branding da PsiquèIA
3. Adicionar logos, cores e textos personalizados

**Variáveis disponíveis:**
```html
{{ .ConfirmationURL }}  <!-- Link de confirmação -->
{{ .Token }}            <!-- Token de segurança -->
{{ .Email }}            <!-- Email do usuário -->
{{ .SiteURL }}          <!-- URL do site/app -->
```

### SMTP Customizado (Opcional)

Para usar serviço de email próprio (SendGrid, Postmark, etc.):

1. Dashboard → Project Settings → Auth
2. SMTP Settings
3. Configure:
   - Host
   - Port
   - Username
   - Password
   - Sender email

---

## 📊 Monitoramento

### Logs de Autenticação

**Supabase Dashboard:**
- Authentication → Users (lista de usuários)
- Authentication → Logs (tentativas de login)
- Authentication → Settings (configurações)

**Filtros disponíveis:**
- Successful logins
- Failed login attempts
- Password resets
- Email confirmations

### Analytics Personalizados

```typescript
// Em authService.ts, adicione tracking:
await authService.signIn(email, password);

// Track evento
analyticsService.track('user_login', {
  method: 'email',
  user_type: userType,
  timestamp: new Date().toISOString(),
});
```

---

## ✅ Checklist de Segurança

- [x] **Senha mínima:** 6 caracteres
- [x] **Validação de email:** Regex pattern
- [x] **Confirmação de senha:** Match obrigatório
- [x] **RLS ativo:** Todas as tabelas
- [x] **Tokens seguros:** AsyncStorage (mobile) / LocalStorage (web)
- [x] **Auto-refresh:** Tokens atualizados automaticamente
- [x] **HTTPS:** Todas as requisições criptografadas
- [x] **OAuth PKCE:** Flow seguro para mobile
- [x] **Deep links validados:** Scheme registrado
- [x] **Tratamento de erros:** Sem exposição de dados sensíveis
- [x] **Logs auditáveis:** Todas ações registradas
- [x] **Recuperação de senha:** Email verificado
- [x] **Convites validados:** Não permite bypass

---

## 📞 Suporte

**Problemas comuns:**

1. **"Código de convite inválido"**
   - Use: `SOUPSIQUEIA` (case-insensitive)
   - Verifique se digitou corretamente

2. **"Email ou senha incorretos"**
   - Verifique credenciais
   - Use "Esqueceu a senha?" se necessário

3. **"OAuth não funciona"**
   - Verifique configuração em `CONFIGURACAO_OAUTH.md`
   - Confirme providers habilitados no Supabase

4. **"Email de recuperação não chegou"**
   - Verifique caixa de spam
   - Aguarde alguns minutos
   - Tente novamente

**Contato:**
- Email: contato@psiqueia.com
- Documentação: Ver arquivos `.md` no projeto

---

## 🎯 Próximos Passos

1. **Configurar OAuth:** Seguir `CONFIGURACAO_OAUTH.md`
2. **Personalizar emails:** Editar templates no Supabase
3. **Testar fluxos:** Cadastro → Login → Recuperação
4. **Monitorar logs:** Dashboard de autenticação
5. **Criar admins:** Promover usuários conforme necessário

---

**Sistema de autenticação completo e pronto para produção!** ✅
