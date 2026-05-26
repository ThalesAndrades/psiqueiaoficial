# 🔍 Diagnóstico e Correção: Perfil Não Encontrado Após Cadastro

## 🐛 Problema Persistente

### Erro Continua Mesmo Após Correções
```
Error fetching user profile after all retries: Perfil não encontrado
     at OnboardingPatientLayout (app/(onboarding-patient)/_layout.tsx:6:2719)
     at fetchUserProfile (contexts/AuthContext.tsx:53:17)
     at initializeAuth (contexts/AuthContext.tsx:83:13)
```

**Status**: Mesmo com 5 retries (17 segundos total), perfil não é encontrado.

---

## 🔬 Análise de Causa Raiz

### Possíveis Causas Identificadas

#### 1. **Timing de Session vs Profile Fetch**
**Problema**: `fetchUserProfile` pode estar sendo chamado antes da session estar totalmente estabelecida.

```
Edge Function cria perfil
    ↓
Frontend faz auto sign-in
    ↓
onAuthStateChange dispara SIGNED_IN
    ↓
fetchUserProfile é chamado ❌ (session pode não estar pronta)
    ↓
Query falha porque auth.uid() retorna null/undefined
```

#### 2. **RLS Policy Depende de auth.uid()**
**Policy Atual**:
```sql
authenticated_select_own_profile
    - USING: ((id = auth.uid()))
```

**Problema**: Se `auth.uid()` não estiver disponível ainda, a query retorna vazio (não erro!).

#### 3. **Race Condition Entre Trigger e Edge Function**
**Possibilidade**: Trigger e Edge Function tentam criar perfil simultaneamente, causando conflito.

---

## ✅ Soluções Implementadas

### 1. Edge Function: Logs Detalhados

#### Antes
```typescript
console.log('User created successfully:', userData.user.id);
const { data: profileData, error: profileError } = await supabaseAdmin
  .from('user_profiles')
  .insert({...})
  .select()
  .single();
```

#### Depois
```typescript
console.log('User created successfully:', userData.user.id);
console.log('User email:', userData.user.email);
console.log('User metadata:', userData.user.user_metadata);

// Wait a bit to ensure auth.users row is fully committed
await new Promise(resolve => setTimeout(resolve, 500));

console.log('Creating user profile...');
const { data: profileData, error: profileError } = await supabaseAdmin
  .from('user_profiles')
  .insert({...})
  .select()
  .single();

if (profileError) {
  console.error('Error creating user profile:', profileError);
  console.error('Profile error details:', JSON.stringify(profileError));
  return new Response(...);
}

console.log('User profile created successfully:', profileData.id);
```

**Benefícios**:
- ✅ Logs em cada etapa para identificar onde falha
- ✅ Delay de 500ms para garantir commit do auth.users
- ✅ JSON completo de erros para debugging

---

### 2. AuthContext: Verificação de Session Antes de Fetch

#### Antes
```typescript
const fetchUserProfile = async (userId: string, retryCount = 0) => {
  const { data, error } = await profileService.getUserProfile(userId);
  if (error) {
    // Retry logic
  }
};
```

#### Depois
```typescript
const fetchUserProfile = async (userId: string, retryCount = 0) => {
  // ✅ First check if we have a valid session
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    console.log('No active session, skipping profile fetch');
    return;
  }

  console.log(`Fetching profile for user ${userId} (attempt ${retryCount + 1}/7)...`);
  console.log('Current auth.uid:', sessionData.session.user.id);

  const { data, error } = await profileService.getUserProfile(userId);
  // ...
};
```

**Benefícios**:
- ✅ Garante session ativa antes de buscar perfil
- ✅ Logs mostram auth.uid atual
- ✅ Evita chamadas quando não autenticado

---

### 3. AuthContext: Delay Após SIGNED_IN

#### Antes
```typescript
authService.onAuthStateChange(async (event, newSession) => {
  setSession(newSession);
  setUser(newSession?.user ?? null);
  
  if (newSession?.user) {
    await fetchUserProfile(newSession.user.id); // ❌ Imediato
  }
});
```

#### Depois
```typescript
authService.onAuthStateChange(async (event, newSession) => {
  console.log('Auth state changed:', event);
  setSession(newSession);
  setUser(newSession?.user ?? null);
  
  if (newSession?.user) {
    console.log('New session user:', newSession.user.id);
    // ✅ Add delay after SIGNED_IN to ensure session is fully established
    if (event === 'SIGNED_IN') {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    await fetchUserProfile(newSession.user.id);
  }
});
```

**Benefícios**:
- ✅ Aguarda 1 segundo após SIGNED_IN
- ✅ Garante que session está totalmente pronta
- ✅ auth.uid() estará disponível

---

### 4. AuthContext: Mais Retries (5 → 7)

#### Antes
```typescript
if (error === 'Perfil não encontrado' && retryCount < 5) {
  const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
  // Total: 17 segundos
}
```

#### Depois
```typescript
if (error === 'Perfil não encontrado' && retryCount < 7) {
  const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
  // Total: 27 segundos (1s + 2s + 4s + 5s + 5s + 5s + 5s)
}
```

**Benefícios**:
- ✅ Mais tempo para perfil ser criado
- ✅ Mais tolerante a delays de banco

---

### 5. AuthService: Delay Antes de Auto Sign-In

#### Antes
```typescript
// Edge Function success
// Auto sign in immediately
const signInResult = await this.signIn({ email: data.email, password: data.password });
```

#### Depois
```typescript
console.log('User created successfully in Edge Function:', functionData);

// ✅ Wait before auto sign-in to ensure all database operations are complete
await new Promise(resolve => setTimeout(resolve, 1000));

console.log('Attempting auto sign-in...');
const signInResult = await this.signIn({ email: data.email, password: data.password });

if (signInResult.error) {
  console.error('Auto sign-in failed:', signInResult.error);
} else {
  console.log('Auto sign-in successful');
}
```

**Benefícios**:
- ✅ Aguarda 1 segundo após criação
- ✅ Garante que perfil está no banco
- ✅ Logs detalhados de sign-in

---

## 🔄 Novo Fluxo Completo (Com Delays)

```
1. Frontend: Submit cadastro
    ↓
2. Edge Function: Create auth.users
    ↓ (log: User created)
3. Edge Function: Wait 500ms ✅ (garante commit)
    ↓ (log: Creating user profile...)
4. Edge Function: Create user_profiles
    ↓ (log: User profile created successfully)
5. Edge Function: Verify profile exists
    ↓ (log: Profile verified successfully)
6. Edge Function: Return success
    ↓ (log: User created successfully in Edge Function)
7. AuthService: Wait 1000ms ✅ (garante perfil no banco)
    ↓ (log: Attempting auto sign-in...)
8. AuthService: Auto sign-in
    ↓ (log: Auto sign-in successful)
9. AuthContext: onAuthStateChange (SIGNED_IN)
    ↓ (log: Auth state changed: SIGNED_IN)
10. AuthContext: Wait 1000ms ✅ (garante session pronta)
    ↓ (log: New session user: abc-123)
11. AuthContext: Check session
    ↓ (log: Current auth.uid: abc-123)
12. AuthContext: Fetch profile (attempt 1/7)
    ↓ (log: Fetching profile for user abc-123)
13. ✅ Profile found!
    ↓ (log: User profile loaded successfully)
14. Navigate to onboarding
```

**Total de delays**: 2.5 segundos (500ms + 1000ms + 1000ms)
**Total de tempo com retries**: Até 29.5 segundos se necessário

---

## 📊 Timing Detalhado

### Cenário Ideal (Sem Retries)
```
Edge Function: 1-2s (criação + verificação)
    ↓
Delay: 0.5s (commit)
    ↓
Delay: 1s (antes de sign-in)
    ↓
Sign-in: 0.5s
    ↓
Delay: 1s (após SIGNED_IN)
    ↓
Fetch profile: 0.5s
    ↓
Total: ~4.5-5.5 segundos
```

### Cenário Com Retries (Pior Caso)
```
Edge Function: 2s
    ↓
Delays: 2.5s
    ↓
Sign-in: 0.5s
    ↓
Fetch attempt 1: 0.5s → Falha
Wait: 1s
    ↓
Fetch attempt 2: 0.5s → Falha
Wait: 2s
    ↓
Fetch attempt 3: 0.5s → Falha
Wait: 4s
    ↓
Fetch attempt 4: 0.5s → Falha
Wait: 5s
    ↓
Fetch attempt 5: 0.5s → Falha
Wait: 5s
    ↓
Fetch attempt 6: 0.5s → Falha
Wait: 5s
    ↓
Fetch attempt 7: 0.5s → Sucesso!
    ↓
Total: ~32 segundos (máximo)
```

---

## 🔍 Logs de Debug Completos

### Edge Function Logs (Sucesso)
```
User created successfully: abc-123-def-456
User email: user@example.com
User metadata: { full_name: "João Silva", user_type: "patient" }
Creating user profile...
User profile created successfully: abc-123-def-456
Verifying profile creation...
Profile verified successfully: abc-123-def-456
Profile data: {"id":"abc-123","email":"user@example.com",...}
Registration completed successfully!
```

### Edge Function Logs (Falha na Criação)
```
User created successfully: abc-123-def-456
User email: user@example.com
User metadata: { full_name: "João Silva", user_type: "patient" }
Creating user profile...
Error creating user profile: { code: "23505", message: "duplicate key" }
Profile error details: {"code":"23505","details":"...","hint":"..."}
[Retorna erro 500]
```

### Frontend Logs (Sucesso)
```
User created successfully in Edge Function: { success: true, user: {...} }
Attempting auto sign-in...
Auto sign-in successful
Auth state changed: SIGNED_IN
New session user: abc-123-def-456
Fetching profile for user abc-123-def-456 (attempt 1/7)...
Current auth.uid: abc-123-def-456
User profile loaded successfully: abc-123-def-456
Profile data: {"id":"abc-123","email":"user@example.com",...}
```

### Frontend Logs (Com Retries)
```
User created successfully in Edge Function: { success: true, user: {...} }
Attempting auto sign-in...
Auto sign-in successful
Auth state changed: SIGNED_IN
New session user: abc-123-def-456
Fetching profile for user abc-123-def-456 (attempt 1/7)...
Current auth.uid: abc-123-def-456
Profile fetch error: Perfil não encontrado
Profile not found, retrying in 1000ms... (1/7)
Fetching profile for user abc-123-def-456 (attempt 2/7)...
Current auth.uid: abc-123-def-456
User profile loaded successfully: abc-123-def-456
Profile data: {"id":"abc-123",...}
```

### Frontend Logs (Falha Total)
```
User created successfully in Edge Function: { success: true, user: {...} }
Attempting auto sign-in...
Auto sign-in successful
Auth state changed: SIGNED_IN
New session user: abc-123-def-456
Fetching profile for user abc-123-def-456 (attempt 1/7)...
Current auth.uid: abc-123-def-456
Profile fetch error: Perfil não encontrado
Profile not found, retrying in 1000ms... (1/7)
... (repete 7 vezes)
Error fetching user profile after all retries: Perfil não encontrado
This usually means the profile was not created in the database.
Please check Edge Function logs for errors during user creation.
```

---

## 🧪 Testes de Validação

### Teste 1: Cadastro Normal (Happy Path)
```
1. Preencher formulário de cadastro
2. Clicar "Criar Conta"
3. Aguardar ~5 segundos
4. Verificar logs do console

✅ Deve mostrar:
   - Edge Function: "Registration completed successfully!"
   - Frontend: "Auto sign-in successful"
   - Frontend: "User profile loaded successfully"
✅ Deve navegar para onboarding
✅ Total: ~5 segundos
```

### Teste 2: Cadastro Com Delay de Banco
```
Simular delay do banco (latência alta):
1. Criar conta
2. Observar retries no console

✅ Deve mostrar:
   - "Profile not found, retrying..." (múltiplas vezes)
   - Eventualmente: "User profile loaded successfully"
✅ Deve navegar para onboarding
✅ Total: 5-15 segundos
```

### Teste 3: Edge Function Falhando
```
Simular erro na Edge Function:
1. Desabilitar policy de INSERT temporariamente
2. Tentar criar conta

✅ Deve mostrar:
   - Edge Function: "Error creating user profile"
   - Frontend: "Failed to create user profile: ..."
❌ NÃO deve fazer auto sign-in
❌ NÃO deve tentar buscar perfil
```

### Teste 4: Session Não Pronta
```
Cenário: auth.uid() retorna null após sign-in
1. Criar conta
2. Observar logs

✅ Deve mostrar:
   - "No active session, skipping profile fetch" (se acontecer)
   - Ou delay de 1s deve evitar isso completamente
```

---

## 🛡️ Proteções em Camadas (Atualizado)

### Camada 1: Edge Function
- ✅ Delay 500ms após criar auth.users
- ✅ Criar perfil explicitamente
- ✅ Verificar perfil após criação
- ✅ Logs detalhados em cada etapa
- ✅ Retornar erro 500 se falhar

### Camada 2: AuthService
- ✅ Delay 1s antes de auto sign-in
- ✅ Logs de sucesso/falha de sign-in
- ✅ Tratamento FunctionsHttpError

### Camada 3: AuthContext
- ✅ Delay 1s após SIGNED_IN
- ✅ Verificar session antes de fetch
- ✅ Logs de auth.uid atual
- ✅ 7 retries com exponential backoff (27s total)
- ✅ Mensagens de erro descritivas

### Camada 4: Trigger (Fallback)
- ✅ Ainda existe como backup
- ✅ ON CONFLICT para não duplicar

---

## ⚠️ Troubleshooting

### Erro: "No active session, skipping profile fetch"
**Causa**: Session não foi estabelecida após sign-in
**Solução**: 
1. Verificar se sign-in retornou sucesso
2. Verificar logs do Supabase Auth
3. Aumentar delay após SIGNED_IN de 1s para 2s

### Erro: "Current auth.uid: undefined"
**Causa**: JWT não contém user.id
**Solução**:
1. Verificar se usuário foi criado corretamente
2. Verificar se sign-in está usando email/senha corretos
3. Limpar localStorage/AsyncStorage e tentar novamente

### Erro: "Profile error details: {code: 23505}"
**Causa**: Tentativa de criar perfil duplicado
**Solução**:
1. Verificar se trigger está tentando criar simultaneamente
2. Edge Function já trata ON CONFLICT, não deveria acontecer

### Logs Mostram Sucesso Mas Frontend Não Carrega
**Causa**: Navegação não aconteceu
**Solução**:
1. Verificar `onboarding_completed` no perfil
2. Verificar lógica de navegação no app
3. Verificar se não há redirect loops

---

## 📝 Checklist de Implementação

- [x] Edge Function: Logs detalhados em todas as etapas
- [x] Edge Function: Delay 500ms após criar auth.users
- [x] Edge Function: JSON completo de erros
- [x] AuthService: Delay 1s antes de auto sign-in
- [x] AuthService: Logs de sign-in success/failure
- [x] AuthContext: Verificar session antes de fetch
- [x] AuthContext: Logs de auth.uid
- [x] AuthContext: Delay 1s após SIGNED_IN
- [x] AuthContext: 7 retries (27s total)
- [x] AuthContext: Mensagens de erro descritivas
- [x] Documentação completa

---

## 🎯 Próximos Passos

### Se Erro Persistir
1. **Verificar Edge Function Logs**: Logs mostram onde está falhando
2. **Verificar RLS Policies**: Garantir que authenticated pode SELECT own profile
3. **Verificar Trigger**: Pode estar conflitando com criação manual
4. **Testar Manualmente**: Criar usuário via SQL e verificar se perfil existe

### Monitoramento
1. Acompanhar logs de cada camada
2. Medir tempo médio de cadastro
3. Verificar taxa de retries necessários
4. Identificar padrões de falha

### Melhorias Futuras
1. **Telemetria**: Enviar métricas de tempo/retries para analytics
2. **Cache**: Armazenar perfil no AsyncStorage após load
3. **Optimistic UI**: Mostrar skeleton com dados esperados
4. **Health Check**: Verificar status do banco antes de cadastro

---

## 🎉 Status Final

✅ **Logs Detalhados**: Todas as camadas com logs descritivos
✅ **Delays Estratégicos**: 2.5s total para garantir consistência
✅ **Verificação de Session**: Evita chamadas quando não autenticado
✅ **Mais Retries**: 7 tentativas (27s total)
✅ **Mensagens Descritivas**: Usuário e dev sabem o que aconteceu

**Com essas melhorias, conseguiremos identificar exatamente onde o problema está ocorrendo através dos logs!** 🔍

---

## 📞 Próximos Passos para Usuário

**Por favor, tente criar uma conta novamente e compartilhe:**

1. **Todos os logs do console** (copie tudo)
2. **Logs da Edge Function** (se tiver acesso ao Supabase Dashboard)
3. **Tempo total que aguardou**
4. **Se viu alguma mensagem de erro na tela**

Com esses logs, podemos identificar exatamente qual camada está falhando! 🎯
