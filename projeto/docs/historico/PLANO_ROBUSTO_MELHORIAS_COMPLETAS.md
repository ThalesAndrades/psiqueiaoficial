# 🚀 Plano Robusto de Melhorias Completas - PsiquèIA

**Data:** Dezembro 2024  
**Versão:** 3.0.0  
**Status:** 🔴 CRÍTICO - Navegação pós-login quebrada

---

## 🔴 PROBLEMA CRÍTICO ATUAL

### Sintoma
**Login realizado mas usuário não é direcionado para dashboard**

### Diagnóstico
```
Login bem-sucedido ✅
  ↓
user + session definidos ✅
  ↓
fetchUserProfile() executado ✅
  ↓
userProfile NÃO é definido ❌ (silenciosamente falha)
  ↓
app/index.tsx aguarda userProfile indefinidamente ⏳
  ↓
Usuário fica preso na tela de login ❌
```

### Causa Raiz
1. ❌ **fetchUserProfile() falha silenciosamente** sem feedback
2. ❌ **app/index.tsx não tem timeout** - aguarda infinitamente
3. ❌ **Sem logs visíveis** para usuário entender o problema
4. ❌ **Sem retry automático** se profile falhar
5. ❌ **Sem fallback** se profile não carregar em 10s

---

## 🎯 CORREÇÃO IMEDIATA (30 minutos)

### Fase 0: Resolver Navegação Pós-Login

#### 0.1 Adicionar Timeout e Retry no AuthContext
```typescript
// contexts/AuthContext.tsx

const fetchUserProfile = async (userId: string, retries = 3): Promise<boolean> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[AuthContext] Fetching profile (attempt ${attempt}/${retries})`);
      
      const { data, error } = await profileService.getUserProfile(userId);
      
      if (error) {
        console.error(`[AuthContext] Profile fetch error:`, error);
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }
        return false;
      }
      
      if (!data) {
        console.warn(`[AuthContext] Profile not found`);
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }
        return false;
      }
      
      console.log(`[AuthContext] Profile loaded:`, data);
      setUserProfile(data);
      return true;
      
    } catch (err: any) {
      console.error(`[AuthContext] Exception:`, err);
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        continue;
      }
      return false;
    }
  }
  
  return false;
};
```

#### 0.2 Melhorar signIn com Garantia de Profile
```typescript
const signIn = async (email: string, password: string) => {
  setLoading(true);
  try {
    const { data, error } = await authService.signIn({ email, password });
    if (error) {
      setLoading(false);
      return { error };
    }

    if (data?.user) {
      setUser(data.user);
      setSession(data);
      
      // CRITICAL: Wait for profile to load with timeout
      const profileLoaded = await Promise.race([
        fetchUserProfile(data.user.id),
        new Promise<boolean>(resolve => setTimeout(() => resolve(false), 10000))
      ]);
      
      if (!profileLoaded) {
        console.warn('[AuthContext] Profile not loaded after 10s, proceeding anyway');
        // Allow navigation even if profile fails
      }
    }
    
    setLoading(false);
    return { error: null };
  } catch (err: any) {
    logger.error('AuthContext', 'Sign in error', err);
    setLoading(false);
    return { error: err.message || 'Erro ao fazer login' };
  }
};
```

#### 0.3 Adicionar Timeout no app/index.tsx
```typescript
// app/index.tsx

useEffect(() => {
  if (loading) return;

  const timer = setTimeout(() => {
    if (!user) {
      router.replace('/login');
      return;
    }

    // TIMEOUT: If profile doesn't load in 5s, proceed with navigation
    if (!userProfile) {
      console.warn('[SplashScreen] Profile timeout - navigating anyway');
      // Navigate to login to retry
      router.replace('/login');
      return;
    }

    // Normal navigation logic...
  }, 500);

  return () => clearTimeout(timer);
}, [user, userProfile, loading, router]);

// Add separate timeout for profile loading
useEffect(() => {
  if (!user || userProfile || loading) return;
  
  const timeout = setTimeout(() => {
    console.error('[SplashScreen] Profile load timeout - redirecting to login');
    router.replace('/login');
  }, 10000); // 10 second timeout
  
  return () => clearTimeout(timeout);
}, [user, userProfile, loading]);
```

**Resultado Esperado:**
- ✅ Login → Profile carrega em 1-3s → Navega
- ✅ Login → Profile falha → Mostra erro e permanece no login
- ✅ Login → Profile timeout 10s → Redireciona para login com mensagem

---

## 📋 PLANO COMPLETO DE MELHORIAS

### 🔵 FASE 1: Fundação Sólida (2-3 horas)

#### 1.1 Sistema de Logs Robusto
**Objetivo:** Rastrear todos os problemas em produção

**Implementação:**
```typescript
// services/loggerService.ts - UPGRADE

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  data?: any;
  userId?: string;
  sessionId?: string;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private currentLevel = __DEV__ ? LogLevel.DEBUG : LogLevel.INFO;

  async log(level: LogLevel, context: string, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      context,
      message,
      data,
      userId: getCurrentUserId(),
      sessionId: getCurrentSessionId()
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output
    if (level >= this.currentLevel) {
      console.log(`[${LogLevel[level]}] [${context}] ${message}`, data || '');
    }

    // Send critical errors to monitoring
    if (level >= LogLevel.ERROR) {
      await this.sendToMonitoring(entry);
    }
  }

  async sendToMonitoring(entry: LogEntry) {
    // TODO: Integrate with Sentry/LogRocket
    try {
      await supabase.from('error_logs').insert({
        level: LogLevel[entry.level],
        context: entry.context,
        message: entry.message,
        data: entry.data,
        user_id: entry.userId,
        timestamp: entry.timestamp
      });
    } catch (err) {
      console.error('Failed to send log to monitoring:', err);
    }
  }

  getLogs(filter?: { level?: LogLevel, context?: string }) {
    return this.logs.filter(log => {
      if (filter?.level && log.level < filter.level) return false;
      if (filter?.context && log.context !== filter.context) return false;
      return true;
    });
  }

  exportLogs() {
    return JSON.stringify(this.logs, null, 2);
  }
}

export const logger = new Logger();
```

**Benefícios:**
- ✅ Rastrear TODOS os erros em produção
- ✅ Enviar erros críticos para monitoramento
- ✅ Exportar logs para suporte
- ✅ Filtrar logs por contexto/severidade

---

#### 1.2 Sistema de Tratamento de Erros Global
**Objetivo:** Nunca deixar erro sem feedback ao usuário

**Implementação:**
```typescript
// contexts/ErrorContext.tsx - NOVO

interface ErrorContextType {
  error: string | null;
  showError: (message: string, details?: any) => void;
  clearError: () => void;
  retry: (() => void) | null;
  setRetry: (fn: (() => void) | null) => void;
}

export function ErrorProvider({ children }: { children: ReactNode }) {
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState<(() => void) | null>(null);

  const showError = (message: string, details?: any) => {
    logger.error('GlobalError', message, details);
    setError(message);
    // Auto-clear after 10s
    setTimeout(() => setError(null), 10000);
  };

  const clearError = () => {
    setError(null);
    setRetry(null);
  };

  return (
    <ErrorContext.Provider value={{ error, showError, clearError, retry, setRetry }}>
      {children}
      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="warning" size={20} color="#FFFFFF" />
          <Text style={styles.errorText}>{error}</Text>
          {retry && (
            <TouchableOpacity onPress={retry}>
              <Text style={styles.retryButton}>Tentar Novamente</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={clearError}>
            <Ionicons name="close" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}
    </ErrorContext.Provider>
  );
}
```

**Benefícios:**
- ✅ Erro sempre visível ao usuário
- ✅ Botão "Tentar Novamente" automático
- ✅ Auto-dismiss após 10s
- ✅ Logs centralizados

---

#### 1.3 Health Check Automático
**Objetivo:** Detectar problemas de conectividade antes que usuário perceba

**Implementação:**
```typescript
// services/healthService.ts - UPGRADE

class HealthService {
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isHealthy = true;
  private listeners: ((healthy: boolean) => void)[] = [];

  async checkHealth(): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('health-check');
      
      if (error) {
        this.setHealthy(false);
        return false;
      }
      
      this.setHealthy(true);
      return true;
    } catch (err) {
      this.setHealthy(false);
      return false;
    }
  }

  startMonitoring() {
    this.healthCheckInterval = setInterval(() => {
      this.checkHealth();
    }, 30000); // Every 30s
  }

  stopMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }

  private setHealthy(healthy: boolean) {
    if (this.isHealthy !== healthy) {
      this.isHealthy = healthy;
      this.listeners.forEach(listener => listener(healthy));
      
      if (!healthy) {
        logger.error('HealthService', 'Backend unhealthy');
      }
    }
  }

  onHealthChange(listener: (healthy: boolean) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
}

export const healthService = new HealthService();
```

**Benefícios:**
- ✅ Detecta problemas de conectividade
- ✅ Notifica usuário automaticamente
- ✅ Permite retry quando backend voltar

---

### 🟢 FASE 2: Autenticação Robusta (3-4 horas)

#### 2.1 Autenticação com Retry e Timeout
**Já descrito na Fase 0**

#### 2.2 Verificação de Integridade do Perfil
```typescript
// services/profileService.ts - UPGRADE

async validateProfile(profile: UserProfile): Promise<{ valid: boolean, errors: string[] }> {
  const errors: string[] = [];
  
  if (!profile.email) errors.push('Email obrigatório');
  if (!profile.full_name) errors.push('Nome completo obrigatório');
  if (!profile.user_type || !['patient', 'psychologist'].includes(profile.user_type)) {
    errors.push('Tipo de usuário inválido');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
```

#### 2.3 Session Persistence Melhorada
```typescript
// lib/supabase.ts - UPGRADE

const createStorageAdapter = () => {
  return {
    async getItem(key: string) {
      try {
        const value = await AsyncStorage.getItem(key);
        console.log(`[Storage] GET ${key}:`, value ? 'found' : 'not found');
        return value;
      } catch (err) {
        console.error(`[Storage] GET ${key} failed:`, err);
        return null;
      }
    },
    async setItem(key: string, value: string) {
      try {
        await AsyncStorage.setItem(key, value);
        console.log(`[Storage] SET ${key}: success`);
      } catch (err) {
        console.error(`[Storage] SET ${key} failed:`, err);
      }
    },
    async removeItem(key: string) {
      try {
        await AsyncStorage.removeItem(key);
        console.log(`[Storage] REMOVE ${key}: success`);
      } catch (err) {
        console.error(`[Storage] REMOVE ${key} failed:`, err);
      }
    }
  };
};
```

---

### 🟡 FASE 3: Navegação Confiável (2-3 horas)

#### 3.1 Navigation Guard System
```typescript
// hooks/useNavigationGuard.tsx - NOVO

export function useNavigationGuard(requiredUserType?: 'patient' | 'psychologist') {
  const router = useRouter();
  const { user, userProfile, loading } = useAuth();
  const [guardState, setGuardState] = useState<'checking' | 'allowed' | 'denied'>('checking');

  useEffect(() => {
    if (loading) {
      setGuardState('checking');
      return;
    }

    // Not authenticated
    if (!user) {
      setGuardState('denied');
      router.replace('/login');
      return;
    }

    // Profile still loading
    if (!userProfile) {
      setGuardState('checking');
      // Timeout after 10s
      const timeout = setTimeout(() => {
        setGuardState('denied');
        router.replace('/login');
      }, 10000);
      return () => clearTimeout(timeout);
    }

    // Wrong user type
    if (requiredUserType && userProfile.user_type !== requiredUserType) {
      setGuardState('denied');
      const correctRoute = userProfile.user_type === 'patient' ? '/(patient)' : '/(psychologist)';
      router.replace(correctRoute);
      return;
    }

    // Onboarding not completed
    if (!userProfile.onboarding_completed) {
      setGuardState('denied');
      const onboardingRoute = userProfile.user_type === 'patient' 
        ? '/(onboarding-patient)' 
        : '/(onboarding-psychologist)';
      router.replace(onboardingRoute);
      return;
    }

    setGuardState('allowed');
  }, [user, userProfile, loading, requiredUserType]);

  return guardState;
}
```

**Uso:**
```typescript
// app/(patient)/_layout.tsx
export default function PatientLayout() {
  const guardState = useNavigationGuard('patient');

  if (guardState === 'checking') {
    return <LoadingSpinner />;
  }

  if (guardState === 'denied') {
    return null; // Will redirect
  }

  return <Tabs>...</Tabs>;
}
```

#### 3.2 Route Transition Tracking
```typescript
// services/analyticsService.ts - UPGRADE

trackNavigation(from: string, to: string, duration: number) {
  logger.info('Navigation', `${from} → ${to} (${duration}ms)`);
  
  // Track slow navigations
  if (duration > 3000) {
    logger.warn('Navigation', `Slow navigation detected: ${from} → ${to} (${duration}ms)`);
  }
}
```

---

### 🟣 FASE 4: Dados e Cache (4-5 horas)

#### 4.1 Cache Local de Dados
```typescript
// services/cacheService.ts - NOVO

class CacheService {
  private cache = new Map<string, { data: any, timestamp: number, ttl: number }>();

  async get<T>(key: string): Promise<T | null> {
    const cached = this.cache.get(key);
    if (!cached) return null;

    // Check TTL
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  async set<T>(key: string, data: T, ttl = 300000) { // 5min default
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  async invalidate(pattern: string) {
    const keys = Array.from(this.cache.keys());
    keys.forEach(key => {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    });
  }

  async clear() {
    this.cache.clear();
  }
}

export const cacheService = new CacheService();
```

#### 4.2 Optimistic Updates
```typescript
// contexts/AppDataContext.tsx - UPGRADE

async createAppointment(data: CreateAppointmentInput) {
  // Optimistic update
  const tempId = `temp-${Date.now()}`;
  const optimisticAppointment = {
    id: tempId,
    ...data,
    status: 'scheduled',
    created_at: new Date().toISOString()
  };

  setAppointments(prev => [...prev, optimisticAppointment]);

  try {
    const { data: newAppointment, error } = await appointmentService.createAppointment(data);
    
    if (error) throw new Error(error);

    // Replace temp with real
    setAppointments(prev => 
      prev.map(apt => apt.id === tempId ? newAppointment : apt)
    );

    return { data: newAppointment, error: null };
  } catch (err: any) {
    // Rollback
    setAppointments(prev => prev.filter(apt => apt.id !== tempId));
    return { data: null, error: err.message };
  }
}
```

#### 4.3 Background Sync
```typescript
// services/syncService.ts - NOVO

class SyncService {
  private syncQueue: Array<{ action: string, data: any }> = [];
  private isSyncing = false;

  async queue(action: string, data: any) {
    this.syncQueue.push({ action, data });
    await this.procesQueue();
  }

  private async procesQueue() {
    if (this.isSyncing || this.syncQueue.length === 0) return;

    this.isSyncing = true;

    while (this.syncQueue.length > 0) {
      const item = this.syncQueue[0];
      
      try {
        await this.syncItem(item);
        this.syncQueue.shift(); // Remove from queue
      } catch (err) {
        logger.error('SyncService', 'Sync failed', err);
        // Keep in queue, retry later
        break;
      }
    }

    this.isSyncing = false;
  }

  private async syncItem(item: { action: string, data: any }) {
    // Implement sync logic based on action
  }
}

export const syncService = new SyncService();
```

---

### 🔴 FASE 5: Pagamentos Stripe (6-8 horas)

#### 5.1 Checkout de Paciente
```typescript
// services/paymentService.ts - UPGRADE

async createCheckoutSession(appointmentId: string, amount: number) {
  try {
    const { data, error } = await supabase.functions.invoke('stripe-payment', {
      body: {
        action: 'create_checkout_session',
        appointment_id: appointmentId,
        amount,
        currency: 'BRL'
      }
    });

    if (error) {
      if (error instanceof FunctionsHttpError) {
        const details = await error.context.text();
        throw new Error(details);
      }
      throw error;
    }

    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}
```

#### 5.2 Webhook Handler Robusto
```typescript
// supabase/functions/stripe-payment/index.ts - UPGRADE

async function handleWebhook(req: Request) {
  const signature = req.headers.get('stripe-signature');
  const body = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature!,
      webhookSecret
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 400,
      headers: corsHeaders
    });
  }

  // Handle event
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      // ... other events
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: corsHeaders
    });
  } catch (err: any) {
    console.error('Webhook handler error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
```

#### 5.3 Status de Pagamento em Tempo Real
```typescript
// hooks/usePaymentStatus.tsx - NOVO

export function usePaymentStatus(appointmentId: string) {
  const [status, setStatus] = useState<PaymentStatus>('pending');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe to payment status changes
    const channel = supabase
      .channel(`payment:${appointmentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'appointments',
          filter: `id=eq.${appointmentId}`
        },
        (payload) => {
          setStatus(payload.new.payment_status);
          setLoading(false);
        }
      )
      .subscribe();

    // Initial fetch
    fetchPaymentStatus();

    return () => {
      channel.unsubscribe();
    };
  }, [appointmentId]);

  async function fetchPaymentStatus() {
    const { data } = await supabase
      .from('appointments')
      .select('payment_status')
      .eq('id', appointmentId)
      .single();
    
    if (data) {
      setStatus(data.payment_status);
    }
    setLoading(false);
  }

  return { status, loading };
}
```

---

### 🟠 FASE 6: Integração Google (5-6 horas)

#### 6.1 Google Calendar Sync Bidirecional
```typescript
// services/googleService.ts - UPGRADE

async syncToGoogleCalendar(appointment: Appointment) {
  try {
    const { data, error } = await supabase.functions.invoke('google-integration', {
      body: {
        action: 'create_event',
        appointment_id: appointment.id,
        summary: `Sessão com ${appointment.patient.full_name}`,
        start: appointment.scheduled_at,
        duration: appointment.duration_minutes
      }
    });

    if (error) throw error;

    // Update appointment with Google Calendar event ID
    await supabase
      .from('appointments')
      .update({ google_calendar_event_id: data.eventId })
      .eq('id', appointment.id);

    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

async syncFromGoogleCalendar() {
  // Fetch events from Google Calendar
  // Compare with local appointments
  // Update conflicts/new events
}
```

#### 6.2 Google Drive Auto-Upload
```typescript
async uploadToDrive(file: File, patientId: string) {
  try {
    const { data, error } = await supabase.functions.invoke('google-integration', {
      body: {
        action: 'upload_file',
        file_name: file.name,
        file_type: file.type,
        file_data: await fileToBase64(file),
        folder_id: patientId // Each patient has a folder
      }
    });

    if (error) throw error;

    // Save reference in database
    await supabase.from('shared_documents').insert({
      psychologist_id: currentUserId,
      patient_id: patientId,
      google_drive_id: data.fileId,
      file_name: file.name,
      file_type: file.type,
      drive_url: data.webViewLink
    });

    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}
```

---

### 🟢 FASE 7: Performance e UX (3-4 horas)

#### 7.1 Lazy Loading de Telas
```typescript
// app/(patient)/_layout.tsx
import React, { lazy, Suspense } from 'react';

const DiarioScreen = lazy(() => import('./diario'));
const PlanoScreen = lazy(() => import('./plano'));
const ChatAIScreen = lazy(() => import('./chat-ai'));

// Wrap with Suspense
<Suspense fallback={<LoadingSpinner />}>
  <DiarioScreen />
</Suspense>
```

#### 7.2 Image Optimization
```typescript
// components/ui/OptimizedImage.tsx - NOVO

export function OptimizedImage({ uri, width, height, ...props }) {
  const [loading, setLoading] = useState(true);

  return (
    <View>
      {loading && <Skeleton width={width} height={height} />}
      <Image
        source={{ uri }}
        style={{ width, height }}
        onLoadEnd={() => setLoading(false)}
        cachePolicy="memory-disk"
        transition={200}
        {...props}
      />
    </View>
  );
}
```

#### 7.3 Lista Virtualizada
```typescript
// Sempre usar FlatList para listas grandes
<FlatList
  data={appointments}
  renderItem={({ item }) => <AppointmentCard appointment={item} />}
  keyExtractor={item => item.id}
  initialNumToRender={10}
  maxToRenderPerBatch={10}
  windowSize={5}
  removeClippedSubviews={true}
  getItemLayout={(data, index) => ({
    length: 120,
    offset: 120 * index,
    index
  })}
/>
```

---

### 🔵 FASE 8: Testes e Qualidade (4-5 horas)

#### 8.1 Testes de Integração
```typescript
// __tests__/auth.test.ts - NOVO

describe('Authentication Flow', () => {
  it('should login successfully', async () => {
    const { signIn } = useAuth();
    const result = await signIn('test@example.com', 'password123');
    
    expect(result.error).toBeNull();
    expect(user).toBeDefined();
    expect(userProfile).toBeDefined();
  });

  it('should handle profile load failure', async () => {
    // Mock profile service to fail
    jest.spyOn(profileService, 'getUserProfile').mockRejectedValue(new Error('Network error'));
    
    const { signIn } = useAuth();
    const result = await signIn('test@example.com', 'password123');
    
    // Should still succeed login even if profile fails
    expect(result.error).toBeNull();
    expect(user).toBeDefined();
  });

  it('should timeout if profile takes too long', async () => {
    // Mock delay
    jest.spyOn(profileService, 'getUserProfile').mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 15000))
    );
    
    const { signIn } = useAuth();
    const result = await signIn('test@example.com', 'password123');
    
    // Should timeout after 10s
    expect(userProfile).toBeNull();
  });
});
```

#### 8.2 E2E Testing
```bash
# Instalar Detox
npm install --save-dev detox

# e2e/login.test.js
describe('Login Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('should login and navigate to dashboard', async () => {
    await element(by.id('email-input')).typeText('patient@test.com');
    await element(by.id('password-input')).typeText('password123');
    await element(by.id('login-button')).tap();
    
    await waitFor(element(by.id('patient-dashboard')))
      .toBeVisible()
      .withTimeout(10000);
  });
});
```

---

## 📊 CRONOGRAMA DE IMPLEMENTAÇÃO

### Semana 1: Fundação
- **Dia 1-2:** Fase 0 (Correção Imediata) ✅ CRÍTICO
- **Dia 3-4:** Fase 1 (Logs e Error Handling)
- **Dia 5:** Fase 2 (Autenticação Robusta)

### Semana 2: Navegação e Dados
- **Dia 1-2:** Fase 3 (Navegação Confiável)
- **Dia 3-5:** Fase 4 (Cache e Sync)

### Semana 3: Integrações
- **Dia 1-3:** Fase 5 (Stripe Payments)
- **Dia 4-5:** Fase 6 (Google Integration)

### Semana 4: Qualidade
- **Dia 1-2:** Fase 7 (Performance)
- **Dia 3-5:** Fase 8 (Testes)

---

## 🎯 PRIORIDADES

### 🔴 CRÍTICO (Fazer AGORA)
1. ✅ Correção navegação pós-login (Fase 0)
2. ✅ Timeout e retry em fetchUserProfile
3. ✅ Logs detalhados de autenticação
4. ✅ Error handling global

### 🟡 IMPORTANTE (Semana 1-2)
5. Navigation guards
6. Cache local
7. Health monitoring
8. Session persistence

### 🟢 DESEJÁVEL (Semana 3-4)
9. Stripe payments completos
10. Google Calendar sync
11. Performance optimization
12. Testes automatizados

---

## 🚀 PRÓXIMOS PASSOS IMEDIATOS

### 1. Implementar Fase 0 (30min)
```bash
# Modificar arquivos:
- contexts/AuthContext.tsx
- app/index.tsx
- app/login.tsx
```

### 2. Testar Navegação (15min)
```bash
# Fluxo de teste:
1. Fazer login
2. Verificar logs no console
3. Confirmar navegação para dashboard
4. Testar com usuário novo
5. Testar com perfil corrompido
```

### 3. Deploy e Monitoramento (15min)
```bash
# Build de teste
eas build --profile development --platform ios
# Monitorar logs em produção
```

---

## 📈 MÉTRICAS DE SUCESSO

### Autenticação
- ✅ Taxa de sucesso de login: >99%
- ✅ Tempo médio de navegação: <3s
- ✅ Taxa de retry bem-sucedido: >80%

### Performance
- ✅ Tempo de carregamento inicial: <2s
- ✅ Tempo de transição entre telas: <500ms
- ✅ Cache hit rate: >60%

### Confiabilidade
- ✅ Crash rate: <0.1%
- ✅ Error rate: <1%
- ✅ Session recovery rate: >95%

---

## 🎉 RESULTADO ESPERADO

### Após Fase 0 (30min)
✅ Login funciona 100% do tempo  
✅ Navegação sempre ocorre (mesmo se profile falhar)  
✅ Logs detalhados para debugging  
✅ Feedback claro ao usuário

### Após Todas as Fases (4 semanas)
✅ App robusto pronto para produção  
✅ Performance otimizada  
✅ Integrações completas (Stripe + Google)  
✅ Testes automatizados  
✅ Monitoramento em tempo real  
✅ UX excepcional

---

**Status Atual:** 🔴 BLOQUEADO - Navegação quebrada  
**Próxima Ação:** Implementar Fase 0 IMEDIATAMENTE  
**Tempo Estimado:** 30 minutos  
**Impacto:** CRÍTICO - Resolve bloqueio completo do app
