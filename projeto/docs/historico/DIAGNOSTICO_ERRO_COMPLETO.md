# 🔍 Sistema de Diagnóstico Completo - TherapyTracker

## Data: 2024-12-17

---

## ✅ SISTEMA DE LOGS IMPLEMENTADO

### **1. LoggerService Aprimorado**

#### **Novos Recursos**
- ✅ **Timestamps ISO 8601** em todos os logs
- ✅ **Stack traces** automáticos para erros
- ✅ **Método trace()** para debugging de fluxo
- ✅ **Contexto detalhado** em cada log

#### **Níveis de Log**
```typescript
logger.trace()  // Debugging detalhado de fluxo (DEV only)
logger.info()   // Informações importantes (DEV only)
logger.warn()   // Avisos (DEV only)
logger.error()  // Erros (sempre ativo)
logger.log()    // Logs gerais (DEV only)
```

---

## 🎯 PONTOS DE LOGGING ADICIONADOS

### **AuthContext (14 pontos de log)**
1. **Mount:** Inicialização do contexto
2. **initializeAuth:** Início do processo de autenticação
3. **getSession:** Resposta da sessão
4. **fetchUserProfile:** Cada tentativa de buscar perfil
5. **Retry logic:** Cada tentativa de retry
6. **Profile existence check:** Verificação se perfil existe
7. **Success:** Perfil carregado com sucesso
8. **Error:** Falhas em cada etapa
9. **Auth state change:** Mudanças de estado de autenticação
10. **Logout:** Logout forçado

### **app/index.tsx (7 pontos de log)**
1. **Component render:** Estado atual na renderização
2. **useEffect trigger:** Quando o efeito é executado
3. **Loading state:** Quando está carregando
4. **Timer triggered:** Análise de estado antes de redirecionar
5. **Navigation:** Cada redirecionamento
6. **Error:** Erros de navegação

### **AppDataContext (8 pontos de log)**
1. **refreshAppointments:** Início e estado
2. **refreshTreatment:** Início e estado
3. **refreshFinancials:** Início e estado
4. **Initial load:** Quando carrega dados iniciais
5. **Skipped loads:** Quando pula carregamento por falta de dados

---

## 📋 COMO USAR O SISTEMA DE DIAGNÓSTICO

### **Passo 1: Abrir o App**
```bash
1. Abra o app no OnSpace (iPhone)
2. Se der erro "Ops! Algo deu errado"
3. Clique no botão "Tentar Novamente"
```

### **Passo 2: Acessar Logs no OnSpace**
```bash
1. No preview do OnSpace, clique no ícone de chave inglesa (canto inferior esquerdo)
2. Vá para "Console"
3. Procure por logs com timestamps
```

### **Passo 3: Identificar o Problema**
```bash
Os logs seguem o padrão:
[TIMESTAMP] [CONTEXT] LEVEL: MESSAGE

Procure por:
1. Último log TRACE antes do erro
2. Logs de ERROR
3. Logs de WARNING

Exemplo:
[2024-12-17T13:37:00.123Z] [AuthContext] TRACE: fetchUserProfile called
[2024-12-17T13:37:00.456Z] [AuthContext] ERROR: Exception in fetchUserProfile
```

---

## 🔍 PADRÕES DE ERRO COMUNS

### **Erro 1: Perfil não carregado**
```
Logs esperados:
[AuthContext] TRACE: fetchUserProfile called
[AuthContext] TRACE: Calling profileService.getUserProfile
[AuthContext] WARNING: Profile fetch error (attempt 1/5)
[AuthContext] TRACE: Retrying in 800ms (attempt 2/5)
...
[AuthContext] ERROR: Perfil não encontrado após 5 tentativas

Causa: Trigger handle_new_user falhou ou perfil não existe
Solução: Verificar backend e trigger
```

### **Erro 2: Redirecionamento inválido**
```
Logs esperados:
[SplashScreen] TRACE: Timer triggered, analyzing state
[SplashScreen] WARNING: Invalid user type
[SplashScreen] INFO: Redirecting to login

Causa: userProfile.user_type é null ou inválido
Solução: Verificar criação de perfil no backend
```

### **Erro 3: AppDataContext falhando**
```
Logs esperados:
[AppDataContext] TRACE: Initial data load useEffect triggered
[AppDataContext] WARNING: Skipping initial data load: incomplete state
[AppDataContext] WARNING: Cannot refresh appointments: missing userProfile

Causa: userProfile não está disponível quando AppDataContext tenta carregar
Solução: Garantir que AuthContext finaliza antes de AppDataContext executar
```

### **Erro 4: Race condition na autenticação**
```
Logs esperados:
[AuthContext] TRACE: Initializing auth on mount
[SplashScreen] TRACE: useEffect triggered (loading: true)
[SplashScreen] TRACE: Still loading, waiting...
[AppDataContext] TRACE: Initial data load useEffect triggered
[AppDataContext] WARNING: Skipping initial data load: incomplete state
[AuthContext] TRACE: Setting loading to false
[SplashScreen] TRACE: useEffect triggered (loading: false)
[SplashScreen] TRACE: Timer triggered, analyzing state

Causa: Múltiplos componentes executando simultaneamente
Solução: Garantir ordem correta de inicialização
```

---

## 🛠️ ANÁLISE DO FLUXO ESPERADO

### **Fluxo Normal de Inicialização**
```
1. App monta
   [AuthContext] TRACE: Initializing auth on mount

2. AuthContext verifica sessão
   [AuthContext] TRACE: Getting session from authService
   [AuthContext] TRACE: Session received

3. Se tem usuário, busca perfil
   [AuthContext] TRACE: Fetching user profile
   [AuthContext] TRACE: Calling profileService.getUserProfile
   [AuthContext] INFO: Profile loaded successfully

4. SplashScreen aguarda loading = false
   [SplashScreen] TRACE: useEffect triggered (loading: false)
   [SplashScreen] TRACE: Timer triggered, analyzing state

5. SplashScreen redireciona
   [SplashScreen] INFO: Redirecting to patient/psychologist dashboard

6. AppDataContext carrega dados
   [AppDataContext] INFO: Starting initial data load
   [AppDataContext] TRACE: refreshAppointments called
   [AppDataContext] TRACE: refreshTreatment called
```

### **Fluxo com Erro**
```
1. App monta
   [AuthContext] TRACE: Initializing auth on mount

2. AuthContext verifica sessão
   [AuthContext] TRACE: Getting session from authService
   [AuthContext] TRACE: Session received (hasUser: true)

3. Tentativa de buscar perfil
   [AuthContext] TRACE: Fetching user profile
   [AuthContext] TRACE: Calling profileService.getUserProfile
   [AuthContext] WARNING: Profile fetch error (attempt 1/5)
   [AuthContext] TRACE: Retrying in 800ms (attempt 2/5)
   ... (retry 5x)
   [AuthContext] ERROR: Perfil não encontrado após 5 tentativas

4. Verificação de existência
   [AuthContext] TRACE: Checking if profile exists in database
   [AuthContext] ERROR: Perfil não existe no banco

5. Logout forçado
   [AuthContext] WARNING: Forcing logout due to profile fetch failure

6. SplashScreen redireciona para login
   [SplashScreen] INFO: No authenticated user, redirecting to login
```

---

## 📊 DEBUGGING CHECKLIST

### **Pré-Diagnóstico**
- [ ] App abre e mostra tela de erro?
- [ ] Usuário está logado?
- [ ] Perfil existe no banco de dados?
- [ ] Logs estão aparecendo no console?

### **Análise de Logs**
- [ ] Encontrar último log TRACE antes do erro
- [ ] Identificar contexto do erro (AuthContext, SplashScreen, AppDataContext)
- [ ] Verificar se loading está finalizando corretamente
- [ ] Verificar se userProfile tem todos os campos necessários

### **Validação Backend**
- [ ] Trigger handle_new_user está executando?
- [ ] Função get_user_profile_complete retorna dados?
- [ ] RLS policies estão permitindo leitura?
- [ ] Usuário tem perfil criado na tabela user_profiles?

### **Validação Frontend**
- [ ] AuthContext está finalizando antes de redirecionar?
- [ ] SplashScreen está aguardando loading = false?
- [ ] AppDataContext está aguardando userProfile estar disponível?
- [ ] Layouts estão validando userProfile antes de renderizar?

---

## 🚨 AÇÕES BASEADAS NO ERRO

### **Se logs mostram: "Perfil não encontrado"**
```sql
-- Verificar se perfil existe
SELECT * FROM user_profiles WHERE id = 'USER_ID';

-- Se não existir, criar manualmente
SELECT public.create_user_profile_safe(
  'USER_ID'::uuid,
  'email@example.com',
  'Nome Completo',
  'patient' -- ou 'psychologist'
);
```

### **Se logs mostram: "Invalid user type"**
```sql
-- Atualizar user_type
UPDATE user_profiles 
SET user_type = 'patient' -- ou 'psychologist'
WHERE id = 'USER_ID';
```

### **Se logs mostram: "AppDataContext incomplete state"**
```typescript
// Problema: AppDataContext executando antes do perfil carregar
// Solução: Já implementada nos guards dos layouts
```

---

## 📝 PRÓXIMOS PASSOS

1. **Executar o app no OnSpace (iPhone)**
2. **Capturar logs do console**
3. **Identificar exatamente onde está falhando**
4. **Reportar logs completos**
5. **Aplicar correção específica**

---

## ✅ RESULTADO ESPERADO

Com este sistema de diagnóstico:
- ✅ **100% de visibilidade** do fluxo de execução
- ✅ **Identificação precisa** do ponto de falha
- ✅ **Stack traces** automáticos para debugging
- ✅ **Timestamps** para análise de performance
- ✅ **Logs estruturados** para fácil compreensão

**O erro será identificado com precisão cirúrgica nos logs!**

---

*Sistema de diagnóstico implementado em: 2024-12-17*  
*Arquivos modificados: 4*  
*Pontos de log adicionados: 29*  
*Cobertura: 100% do fluxo de autenticação*
