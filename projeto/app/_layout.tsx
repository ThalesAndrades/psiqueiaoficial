// Sentry must be initialised before any React component mounts so that
// errors thrown during the very first render are captured. Keep this
// import + call at the top of the file.
import { initSentry, Sentry } from '../lib/sentry';
initSentry();

import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { Linking, Alert } from 'react-native';
import * as ExpoLinking from 'expo-linking';
import { PostHogProvider } from 'posthog-react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../contexts/AuthContext';
import { AppDataProvider } from '../contexts/AppDataContext';
import { useAuth } from '../hooks/useAuth';
import { pushNotificationService } from '../services';
import { ToastContainer, ErrorBoundary } from '../components';
import { toastManager } from '../components/ui/Toast';
import { queryClient } from '../lib/queryClient';

const POSTHOG_API_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '';
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

function RootLayoutContent() {
  const router = useRouter();
  const { user } = useAuth();

  // Push notifications need an authenticated session to persist the token —
  // initialize after the user is known, and re-run when they sign in/out.
  useEffect(() => {
    if (!user?.id) return;
    pushNotificationService.initialize();
  }, [user?.id]);

  useEffect(() => {
    // Setup notification listeners
    const responseListener = pushNotificationService.addNotificationResponseListener((response) => {
      const { screen, ...params } = response.notification.request.content.data as any;
      console.log('Notification tapped:', { screen, params });

      // Navegar para a tela apropriada baseado na notificação
      if (screen === 'appointment' && params.appointmentId) {
        router.push('/(patient)/agenda');
      }
    });

    const receivedListener = pushNotificationService.addNotificationReceivedListener((notification) => {
      console.log('Notification received:', notification);
    });

    // Handle deep links
    const handleDeepLink = async ({ url }: { url: string }) => {
      console.log('Deep link received:', url);

      const urlObj = ExpoLinking.parse(url);
      const { path, queryParams } = urlObj;

      // Handle payment success deep link.
      //
      // SECURITY: o deep link NUNCA grava payment_status='paid' no banco.
      // A fonte da verdade do pagamento é o webhook do Stripe (Edge Function
      // stripe-payment, ação 'webhook') que valida a assinatura, fonte do
      // valor (appointments.session_price), e parties. Marcar 'paid' aqui
      // permitia ao próprio paciente burlar o pagamento abrindo
      // `psiqueia://payment-success?appointmentId=<id>` sem passar pelo
      // checkout. Aqui só mostramos UX positiva e navegamos — o webhook
      // resolve o estado.
      if (url.includes('payment-success') || path?.includes('payment-success')) {
        toastManager.show({
          type: 'success',
          message: 'Pagamento recebido! Aguarde a confirmação na sua agenda.',
        });
        router.replace('/(patient)/agenda');
        return;
      }

      // Handle payment cancel deep link
      if (url.includes('payment-cancel') || path?.includes('payment-cancel')) {
        const appointmentId = queryParams?.appointmentId as string;

        toastManager.show({
          type: 'info',
          message: 'Pagamento cancelado. Você pode tentar novamente.',
        });

        // Voltar para a tela de pagamento ou agenda
        if (appointmentId) {
          // O agendamento ainda existe com status pending, usuário pode tentar novamente
          router.replace('/(patient)/agenda');
        } else {
          router.replace('/(patient)');
        }
        return;
      }

      // Handle reset password deep link
      if (url.includes('reset-password') || url.includes('type=recovery')) {
        console.log('Password reset link:', urlObj);
        router.push('/auth/reset-password');
        return;
      }
    };

    // Listen for deep links
    const linkingSubscription = Linking.addEventListener('url', handleDeepLink);

    // Check if app was opened with a deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      responseListener.remove();
      receivedListener.remove();
      linkingSubscription.remove();
    };
  }, [router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="cadastro" />
      <Stack.Screen name="esqueci-senha" />
      <Stack.Screen
        name="auth/reset-password"
        options={{
          presentation: 'modal',
          headerShown: true,
          title: 'Redefinir Senha'
        }}
      />
      <Stack.Screen name="(onboarding-patient)" />
      <Stack.Screen name="(onboarding-psychologist)" />
      <Stack.Screen name="(patient)" />
      <Stack.Screen name="(psychologist)" />
    </Stack>
  );
}

/**
 * Provider tree (outer → inner):
 *   Sentry.wrap → PostHogProvider → ErrorBoundary → AuthProvider →
 *   AppDataProvider → QueryClientProvider → RootLayoutContent
 *
 * Sentry wraps the entire tree (via `Sentry.wrap`) so it can capture
 * uncaught errors regardless of where they happen. PostHog sits above
 * ErrorBoundary so analytics keeps working even after a render error.
 * ErrorBoundary is above the auth/data providers so a context failure
 * still shows the fallback UI.
 *
 * QueryClientProvider is placed inside AppDataProvider intentionally:
 * the legacy context still owns most data loading; the query client is
 * additive and ready for incremental adoption.
 */
function RootLayout() {
  return (
    <PostHogProvider
      apiKey={POSTHOG_API_KEY}
      options={{
        host: POSTHOG_HOST,
        // App de saúde: autocapture desligado para evitar registrar
        // cada toque/interação (potencial PII em telas de diário, perfil,
        // pagamento). Eventos canônicos são emitidos via analyticsService
        // com payload curado e auditado. Lifecycle de app fica ligado para
        // mantermos métricas de session_start/session_end.
        captureNativeAppLifecycleEvents: true,
      }}
      autocapture={false}
    >
      <ErrorBoundary>
        <AuthProvider>
          <AppDataProvider>
            <QueryClientProvider client={queryClient}>
              <RootLayoutContent />
              <ToastContainer />
            </QueryClientProvider>
          </AppDataProvider>
        </AuthProvider>
      </ErrorBoundary>
    </PostHogProvider>
  );
}

// Wrap with Sentry so the SDK can hook into navigation/perf instrumentation.
// `Sentry.wrap` is a no-op passthrough when the SDK was initialised with
// `enabled: false` (empty DSN).
export default Sentry.wrap(RootLayout);
