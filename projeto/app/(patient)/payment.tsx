import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { theme } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { paymentService, appointmentService, googleService, profileService } from '../../services';
import { LoadingSpinner } from '../../components';
import { toastManager } from '../../components/ui/Toast';

type PaymentStatus = 'idle' | 'loading' | 'processing' | 'success' | 'error';

export default function PaymentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    appointmentId: string;
    psychologistId: string;
    amount: string;
    psychologistName: string;
  }>();
  
  const { userProfile } = useAuth();
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const appointmentId = params.appointmentId;
  const psychologistId = params.psychologistId;
  const amount = parseFloat(params.amount || '0');
  const psychologistName = params.psychologistName || 'Psicólogo';

  useEffect(() => {
    // Validar parâmetros ao montar o componente
    if (!appointmentId || !psychologistId || !amount || amount <= 0) {
      Alert.alert(
        'Erro',
        'Informações de pagamento inválidas. Por favor, tente novamente.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }
  }, [appointmentId, psychologistId, amount]);

  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handlePayWithCheckout = async () => {
    if (!userProfile?.id || !appointmentId || !psychologistId) {
      toastManager.show({ type: 'error', message: 'Informações de pagamento incompletas.' });
      return;
    }

    setStatus('loading');
    setErrorMessage(null);

    try {
      // Criar sessão de checkout no Stripe
      const successUrl = Platform.select({
        ios: `psiqueia://payment-success?appointmentId=${appointmentId}`,
        android: `psiqueia://payment-success?appointmentId=${appointmentId}`,
        default: `${window.location.origin}/(patient)/agenda?payment=success&appointmentId=${appointmentId}`,
      }) || '';

      const cancelUrl = Platform.select({
        ios: `psiqueia://payment-cancel?appointmentId=${appointmentId}`,
        android: `psiqueia://payment-cancel?appointmentId=${appointmentId}`,
        default: `${window.location.origin}/(patient)/payment?appointmentId=${appointmentId}&psychologistId=${psychologistId}&amount=${amount}&psychologistName=${encodeURIComponent(psychologistName)}`,
      }) || '';

      const { data, error } = await paymentService.createCheckoutSession(
        appointmentId,
        successUrl,
        cancelUrl,
      );

      if (error || !data?.url) {
        setStatus('error');
        setErrorMessage(error || 'Não foi possível criar a sessão de pagamento.');
        return;
      }

      // Abrir URL do Stripe Checkout
      if (Platform.OS === 'web') {
        window.location.href = data.url;
      } else {
        const supported = await Linking.canOpenURL(data.url);
        if (supported) {
          await Linking.openURL(data.url);
          // Após abrir o link, o usuário será redirecionado de volta ao app
          // O webhook do Stripe atualizará o status do pagamento
          setStatus('processing');
        } else {
          setStatus('error');
          setErrorMessage('Não foi possível abrir o link de pagamento.');
        }
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      setStatus('error');
      setErrorMessage(err.message || 'Erro ao processar pagamento.');
    }
  };

  const handlePayWithPaymentIntent = async () => {
    if (!userProfile?.id || !appointmentId || !psychologistId) {
      toastManager.show({ type: 'error', message: 'Informações de pagamento incompletas.' });
      return;
    }

    setStatus('loading');
    setErrorMessage(null);

    try {
      // Criar Payment Intent
      const { data, error } = await paymentService.createPaymentIntent(
        appointmentId,
        `Sessão de terapia com ${psychologistName}`,
      );

      if (error || !data?.clientSecret) {
        setStatus('error');
        setErrorMessage(error || 'Não foi possível criar a intenção de pagamento.');
        return;
      }

      // Aqui seria a integração com o Stripe SDK nativo
      // Como o @stripe/stripe-react-native requer configuração adicional,
      // vamos usar o Checkout Session como método principal
      
      Alert.alert(
        'Payment Intent Criado',
        'O Payment Intent foi criado com sucesso. Para pagamento in-app, configure o Stripe SDK nativo.',
        [
          { text: 'Usar Checkout', onPress: handlePayWithCheckout },
          { text: 'Cancelar', style: 'cancel', onPress: () => setStatus('idle') }
        ]
      );
    } catch (err: any) {
      console.error('Payment Intent error:', err);
      setStatus('error');
      setErrorMessage(err.message || 'Erro ao criar intenção de pagamento.');
    }
  };

  const handleCancelPayment = async () => {
    Alert.alert(
      'Cancelar Pagamento',
      'Tem certeza que deseja cancelar? O agendamento será removido.',
      [
        { text: 'Não', style: 'cancel' },
        {
          text: 'Sim, Cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              // Cancelar o agendamento
              await appointmentService.cancelAppointment(appointmentId);
              toastManager.show({
                type: 'info',
                message: 'Agendamento cancelado.',
              });
              router.replace('/(patient)');
            } catch (err) {
              console.error('Cancel error:', err);
              router.back();
            }
          },
        },
      ]
    );
  };

  const handleRetry = () => {
    setStatus('idle');
    setErrorMessage(null);
  };

  // Renderização condicional baseada no status
  if (status === 'loading') {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#F3F0FF', '#EBF3FF', '#E8F6F8']} style={styles.background}>
          <View style={styles.centerContent}>
            <LoadingSpinner size={48} color={theme.colors.primary} />
            <Text style={styles.loadingText}>Preparando pagamento...</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  if (status === 'processing') {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#F3F0FF', '#EBF3FF', '#E8F6F8']} style={styles.background}>
          <View style={styles.centerContent}>
            <View style={styles.processingIcon}>
              <Ionicons name="card" size={48} color={theme.colors.primary} />
            </View>
            <Text style={styles.processingTitle}>Processando Pagamento</Text>
            <Text style={styles.processingText}>
              Complete o pagamento no navegador. Você será redirecionado automaticamente após a confirmação.
            </Text>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.replace('/(patient)/agenda')}
            >
              <Text style={styles.secondaryButtonText}>Ir para Agenda</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  }

  if (status === 'success') {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#F3F0FF', '#EBF3FF', '#E8F6F8']} style={styles.background}>
          <View style={styles.centerContent}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={64} color="#10B981" />
            </View>
            <Text style={styles.successTitle}>Pagamento Confirmado!</Text>
            <Text style={styles.successText}>
              Sua sessão foi agendada com sucesso. Você receberá um email com os detalhes.
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.replace('/(patient)/agenda')}
            >
              <LinearGradient
                colors={[theme.colors.primary, '#8B5CF6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <Text style={styles.primaryButtonText}>Ver Minha Agenda</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#F3F0FF', '#EBF3FF', '#E8F6F8']} style={styles.background}>
          <View style={styles.centerContent}>
            <View style={styles.errorIcon}>
              <Ionicons name="close-circle" size={64} color="#EF4444" />
            </View>
            <Text style={styles.errorTitle}>Erro no Pagamento</Text>
            <Text style={styles.errorText}>
              {errorMessage || 'Não foi possível processar o pagamento. Por favor, tente novamente.'}
            </Text>
            <View style={styles.errorActions}>
              <TouchableOpacity style={styles.primaryButton} onPress={handleRetry}>
                <LinearGradient
                  colors={[theme.colors.primary, '#8B5CF6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  <Ionicons name="refresh" size={20} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Tentar Novamente</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={handleCancelPayment}>
                <Text style={styles.secondaryButtonText}>Cancelar Agendamento</Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  }

  // Status 'idle' - Tela principal de pagamento
  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Pagamento',
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerShadowVisible: true,
          headerLeft: () => (
            <TouchableOpacity onPress={handleCancelPayment} style={styles.backButton}>
              <Ionicons name="close" size={24} color={theme.colors.foreground} />
            </TouchableOpacity>
          ),
        }}
      />

      <LinearGradient colors={['#F3F0FF', '#EBF3FF', '#E8F6F8']} style={styles.background}>
        <View style={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
          {/* Resumo do Pagamento */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Ionicons name="receipt" size={24} color={theme.colors.primary} />
              <Text style={styles.summaryTitle}>Resumo do Pagamento</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Profissional</Text>
              <Text style={styles.summaryValue}>{psychologistName}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tipo</Text>
              <Text style={styles.summaryValue}>Sessão de Terapia</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatCurrency(amount)}</Text>
            </View>
          </View>

          {/* Informações de Segurança */}
          <View style={styles.securityCard}>
            <Ionicons name="shield-checkmark" size={20} color="#10B981" />
            <Text style={styles.securityText}>
              Pagamento seguro processado pelo Stripe. Seus dados estão protegidos.
            </Text>
          </View>

          {/* Botão de Pagamento */}
          <View style={styles.paymentActions}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handlePayWithCheckout}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[theme.colors.primary, '#8B5CF6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <Ionicons name="card" size={24} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Pagar {formatCurrency(amount)}</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={handleCancelPayment}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>

          {/* Métodos de Pagamento Aceitos */}
          <View style={styles.paymentMethods}>
            <Text style={styles.paymentMethodsLabel}>Aceitamos</Text>
            <View style={styles.paymentMethodsIcons}>
              <View style={styles.paymentMethodIcon}>
                <Ionicons name="card" size={20} color="#64748B" />
              </View>
              <Text style={styles.paymentMethodText}>Cartão de Crédito e Débito</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  backButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 16,
  },
  processingIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(107, 70, 193, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  processingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.foreground,
    textAlign: 'center',
  },
  processingText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 24,
  },
  successIcon: {
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10B981',
    textAlign: 'center',
  },
  successText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 24,
  },
  errorIcon: {
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#EF4444',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 24,
  },
  errorActions: {
    width: '100%',
    gap: 12,
    marginTop: 16,
  },
  summaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    ...Platform.select({
      ios: {
        shadowColor: '#6b46c1',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.foreground,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  summaryLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#64748B',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.foreground,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.foreground,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  securityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  securityText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#059669',
    lineHeight: 18,
  },
  paymentActions: {
    gap: 12,
  },
  primaryButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(107, 70, 193, 0.2)',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  cancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  paymentMethods: {
    alignItems: 'center',
    gap: 8,
  },
  paymentMethodsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  paymentMethodsIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paymentMethodIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  paymentMethodText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
});
