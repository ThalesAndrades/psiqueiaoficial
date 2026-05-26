import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { Linking, Alert } from 'react-native';
import * as ExpoLinking from 'expo-linking';
import { AuthProvider } from '../contexts/AuthContext';
import { AppDataProvider } from '../contexts/AppDataContext';
import { useAuth } from '../hooks/useAuth';
import { pushNotificationService, appointmentService, googleService } from '../services';
import { ToastContainer, ErrorBoundary } from '../components';
import { toastManager } from '../components/ui/Toast';

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
      
      // Handle payment success deep link
      if (url.includes('payment-success') || path?.includes('payment-success')) {
        const appointmentId = queryParams?.appointmentId as string;
        
        if (appointmentId) {
          try {
            // Atualizar status do pagamento para 'paid'
            await appointmentService.updateAppointment(appointmentId, {
              payment_status: 'paid',
              status: 'confirmed',
            });

            // Tentar criar o link do Google Meet
            try {
              const { data: appointment } = await appointmentService.getAppointmentById(appointmentId);
              
              if (appointment && !appointment.meet_link) {
                const { data: meetLink } = await googleService.createMeetLink(
                  appointment.scheduled_at,
                  appointment.duration_minutes || 50,
                  `Sessão de Terapia - PsiquèIA`
                );
                
                if (meetLink) {
                  await appointmentService.updateAppointment(appointmentId, {
                    meet_link: meetLink,
                  });
                }
              }
            } catch (meetError) {
              console.error('Error creating Meet link:', meetError);
              // Não bloquear o fluxo se falhar a criação do Meet
            }

            // Mostrar mensagem de sucesso
            toastManager.show({
              type: 'success',
              message: 'Pagamento confirmado! Sua sessão foi agendada.',
            });

            // Navegar para a agenda
            router.replace('/(patient)/agenda');
          } catch (error) {
            console.error('Error processing payment success:', error);
            Alert.alert(
              'Pagamento Processado',
              'Seu pagamento foi processado. Verifique sua agenda para confirmar o agendamento.',
              [{ text: 'OK', onPress: () => router.replace('/(patient)/agenda') }]
            );
          }
        } else {
          router.replace('/(patient)/agenda');
        }
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

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppDataProvider>
          <RootLayoutContent />
          <ToastContainer />
        </AppDataProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
