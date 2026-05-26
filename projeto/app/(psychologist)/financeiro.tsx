import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { theme } from '../../constants/theme';
import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useAppData } from '../../hooks/useAppData';
import { analyticsService, paymentService } from '../../services';
import { LoadingSpinner } from '../../components';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { toastManager } from '../../components/ui/Toast';

const monthlyData = {
  totalReceived: 18500,
  totalPending: 3200,
  totalSessions: 42,
  averagePerSession: 450,
};

const transactions = [
  {
    id: '1',
    patient: 'Ana Carolina',
    date: '18 Jun',
    amount: 450,
    status: 'paid',
    method: 'Pix',
  },
  {
    id: '2',
    patient: 'Pedro Santos',
    date: '17 Jun',
    amount: 450,
    status: 'paid',
    method: 'Cartão',
  },
  {
    id: '3',
    patient: 'Maria Silva',
    date: '16 Jun',
    amount: 450,
    status: 'pending',
    method: 'Pix',
  },
  {
    id: '4',
    patient: 'João Oliveira',
    date: '15 Jun',
    amount: 450,
    status: 'paid',
    method: 'Transferência',
  },
  {
    id: '5',
    patient: 'Carla Mendes',
    date: '14 Jun',
    amount: 450,
    status: 'pending',
    method: 'Pix',
  },
  {
    id: '6',
    patient: 'Roberto Lima',
    date: '13 Jun',
    amount: 450,
    status: 'paid',
    method: 'Cartão',
  },
];

export default function FinanceiroScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { userProfile } = useAuth();
  const { transactions, financialStats, refreshFinancials } = useAppData();
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [connectStatus, setConnectStatus] = useState<any>(null);
  const [isLoadingConnect, setIsLoadingConnect] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  useEffect(() => {
    // Track screen view
    if (userProfile?.id) {
      analyticsService.trackScreen('Financeiro', userProfile.id);
    }
    checkConnectStatus();
  }, [userProfile]);

  useEffect(() => {
    // Check if returning from Stripe setup
    if (params.setup === 'complete') {
      toastManager.show({ type: 'success', message: 'Sua conta Stripe foi configurada com sucesso!' });
      checkConnectStatus();
      // Clear params
      router.replace('/(psychologist)/financeiro');
    }
  }, [params]);

  const checkConnectStatus = async () => {
    setIsCheckingStatus(true);
    const { data, error } = await paymentService.getConnectAccountStatus();
    if (data) {
      setConnectStatus(data);
    } else if (error) {
      console.error('Error checking connect status:', error);
    }
    setIsCheckingStatus(false);
  };

  const handleSetupStripeConnect = async () => {
    setIsLoadingConnect(true);
    
    try {
      let result;
      
      // Check if account already exists but onboarding incomplete
      if (connectStatus?.hasAccount && !connectStatus?.onboardingCompleted) {
        result = await paymentService.createConnectAccountLink();
      } else {
        result = await paymentService.createConnectAccount();
      }

      if (result.error) {
        toastManager.show({ type: 'error', message: result.error });
        setIsLoadingConnect(false);
        return;
      }

      if (result.data?.url) {
        if (Platform.OS === 'web') {
          window.location.href = result.data.url;
        } else {
          const supported = await Linking.canOpenURL(result.data.url);
          if (supported) {
            await Linking.openURL(result.data.url);
          } else {
            toastManager.show({ type: 'error', message: 'Não foi possível abrir o link de configuração' });
          }
        }
      }
    } catch (error: any) {
      toastManager.show({ type: 'error', message: error.message || 'Erro ao configurar Stripe Connect' });
    } finally {
      setIsLoadingConnect(false);
    }
  };

  const handleOpenStripeDashboard = async () => {
    setIsLoadingConnect(true);

    const { data, error } = await paymentService.createLoginLink();

    if (error) {
      toastManager.show({ type: 'error', message: error });
      setIsLoadingConnect(false);
      return;
    }

    if (data?.url) {
      if (Platform.OS === 'web') {
        window.open(data.url, '_blank');
      } else {
        const supported = await Linking.canOpenURL(data.url);
        if (supported) {
          await Linking.openURL(data.url);
        } else {
          toastManager.show({ type: 'error', message: 'Não foi possível abrir o dashboard' });
        }
      }
    }

    setIsLoadingConnect(false);
  };

  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#F3F0FF', '#EBF3FF', '#E8F6F8']} style={styles.background}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
          <View>
            <Text style={styles.headerLabel}>FINANCEIRO</Text>
            <Text style={styles.headerTitle}>Junho 2024</Text>
          </View>
          <TouchableOpacity style={styles.filterButton}>
            <Ionicons name="calendar" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          <TouchableOpacity
            style={[styles.periodButton, selectedPeriod === 'week' && styles.periodButtonActive]}
            onPress={() => setSelectedPeriod('week')}
          >
            <Text
              style={[
                styles.periodText,
                selectedPeriod === 'week' && styles.periodTextActive,
              ]}
            >
              Semana
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.periodButton, selectedPeriod === 'month' && styles.periodButtonActive]}
            onPress={() => setSelectedPeriod('month')}
          >
            <Text
              style={[
                styles.periodText,
                selectedPeriod === 'month' && styles.periodTextActive,
              ]}
            >
              Mês
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.periodButton, selectedPeriod === 'year' && styles.periodButtonActive]}
            onPress={() => setSelectedPeriod('year')}
          >
            <Text
              style={[
                styles.periodText,
                selectedPeriod === 'year' && styles.periodTextActive,
              ]}
            >
              Ano
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 70 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Stripe Connect Status */}
          {isCheckingStatus ? (
            <View style={styles.loadingCard}>
              <LoadingSpinner size={24} color={theme.colors.primary} />
              <Text style={styles.loadingText}>Verificando conta Stripe...</Text>
            </View>
          ) : !connectStatus?.onboardingCompleted ? (
            <View style={styles.setupCard}>
              <View style={styles.setupIcon}>
                <Ionicons name="card" size={32} color={theme.colors.primary} />
              </View>
              <View style={styles.setupContent}>
                <Text style={styles.setupTitle}>
                  {connectStatus?.hasAccount ? 'Complete sua Configuração' : 'Configure Recebimentos'}
                </Text>
                <Text style={styles.setupDesc}>
                  {connectStatus?.hasAccount 
                    ? 'Complete o cadastro no Stripe para começar a receber pagamentos'
                    : 'Configure sua conta Stripe Connect para receber pagamentos das sessões'}
                </Text>
                <TouchableOpacity
                  style={styles.setupButton}
                  onPress={handleSetupStripeConnect}
                  disabled={isLoadingConnect}
                >
                  {isLoadingConnect ? (
                    <LoadingSpinner size={20} color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                      <Text style={styles.setupButtonText}>
                        {connectStatus?.hasAccount ? 'Continuar Configuração' : 'Configurar Agora'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.connectedCard}>
              <View style={styles.connectedIcon}>
                <Ionicons name="checkmark-circle" size={32} color="#10B981" />
              </View>
              <View style={styles.connectedContent}>
                <Text style={styles.connectedTitle}>Conta Stripe Ativa</Text>
                <Text style={styles.connectedDesc}>
                  Recebimentos configurados • Pagamentos habilitados
                </Text>
              </View>
              <TouchableOpacity
                style={styles.dashboardButton}
                onPress={handleOpenStripeDashboard}
                disabled={isLoadingConnect}
              >
                {isLoadingConnect ? (
                  <LoadingSpinner size={16} color={theme.colors.primary} />
                ) : (
                  <Ionicons name="open-outline" size={20} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Summary Cards */}
          <View style={styles.summaryContainer}>
            <LinearGradient
              colors={[theme.colors.primary, '#8B5CF6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.mainCard}
            >
              <View style={styles.mainCardHeader}>
                <Text style={styles.mainCardLabel}>Total Recebido</Text>
                <View style={styles.mainCardIcon}>
                  <Ionicons name="trending-up" size={20} color="#10B981" />
                </View>
              </View>
              <Text style={styles.mainCardAmount}>
                {formatCurrency(monthlyData.totalReceived)}
              </Text>
              <View style={styles.mainCardFooter}>
                <Text style={styles.mainCardFooterText}>
                  {monthlyData.totalSessions} sessões realizadas
                </Text>
              </View>
            </LinearGradient>

            <View style={styles.smallCardsRow}>
              <View style={styles.smallCard}>
                <View style={[styles.smallCardIcon, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                  <Ionicons name="time" size={20} color="#F59E0B" />
                </View>
                <Text style={styles.smallCardLabel}>A Receber</Text>
                <Text style={styles.smallCardAmount}>
                  {formatCurrency(monthlyData.totalPending)}
                </Text>
              </View>

              <View style={styles.smallCard}>
                <View style={[styles.smallCardIcon, { backgroundColor: 'rgba(107, 70, 193, 0.1)' }]}>
                  <Ionicons name="cash" size={20} color={theme.colors.primary} />
                </View>
                <Text style={styles.smallCardLabel}>Média/Sessão</Text>
                <Text style={styles.smallCardAmount}>
                  {formatCurrency(monthlyData.averagePerSession)}
                </Text>
              </View>
            </View>
          </View>

          {/* Transactions List */}
          <View style={styles.transactionsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Transações Recentes</Text>
              <TouchableOpacity>
                <Text style={styles.seeAllText}>Ver Todas</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.transactionsList}>
              {transactions.map((transaction) => (
                <View key={transaction.id} style={styles.transactionCard}>
                  <View style={styles.transactionLeft}>
                    <View
                      style={[
                        styles.transactionIcon,
                        transaction.status === 'paid'
                          ? styles.transactionIconPaid
                          : styles.transactionIconPending,
                      ]}
                    >
                      <Ionicons
                        name={transaction.status === 'paid' ? 'checkmark' : 'time'}
                        size={18}
                        color={transaction.status === 'paid' ? '#10B981' : '#F59E0B'}
                      />
                    </View>
                    <View>
                      <Text style={styles.transactionPatient}>{transaction.patient}</Text>
                      <View style={styles.transactionDetails}>
                        <Text style={styles.transactionDate}>{transaction.date}</Text>
                        <Text style={styles.transactionDot}>•</Text>
                        <Text style={styles.transactionMethod}>{transaction.method}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.transactionRight}>
                    <Text
                      style={[
                        styles.transactionAmount,
                        transaction.status === 'pending' && styles.transactionAmountPending,
                      ]}
                    >
                      {formatCurrency(transaction.amount)}
                    </Text>
                    <View
                      style={[
                        styles.transactionBadge,
                        transaction.status === 'paid'
                          ? styles.transactionBadgePaid
                          : styles.transactionBadgePending,
                      ]}
                    >
                      <Text
                        style={[
                          styles.transactionBadgeText,
                          transaction.status === 'paid'
                            ? styles.transactionBadgeTextPaid
                            : styles.transactionBadgeTextPending,
                        ]}
                      >
                        {transaction.status === 'paid' ? 'Pago' : 'Pendente'}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
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
  header: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.foreground,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  periodSelector: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  periodButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  periodText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  periodTextActive: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    gap: 24,
  },
  summaryContainer: {
    gap: 16,
  },
  mainCard: {
    borderRadius: 24,
    padding: 24,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  mainCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mainCardLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.9)',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  mainCardIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainCardAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  mainCardFooter: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  mainCardFooterText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  smallCardsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  smallCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  smallCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  smallCardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  smallCardAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.foreground,
  },
  transactionsSection: {
    gap: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.foreground,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  transactionsList: {
    gap: 12,
  },
  transactionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionIconPaid: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  transactionIconPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  transactionPatient: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.foreground,
    marginBottom: 4,
  },
  transactionDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  transactionDate: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  transactionDot: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  transactionMethod: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  transactionRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.foreground,
  },
  transactionAmountPending: {
    color: '#F59E0B',
  },
  transactionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  transactionBadgePaid: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  transactionBadgePending: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  transactionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  transactionBadgeTextPaid: {
    color: '#059669',
  },
  transactionBadgeTextPending: {
    color: '#D97706',
  },
  loadingCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 20,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  setupCard: {
    backgroundColor: 'rgba(107, 70, 193, 0.1)',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(107, 70, 193, 0.2)',
    marginBottom: 24,
  },
  setupIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(107, 70, 193, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  setupContent: {
    flex: 1,
  },
  setupTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.foreground,
    marginBottom: 6,
  },
  setupDesc: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 12,
  },
  setupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  setupButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  connectedCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    marginBottom: 24,
  },
  connectedIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectedContent: {
    flex: 1,
  },
  connectedTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.foreground,
    marginBottom: 4,
  },
  connectedDesc: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  dashboardButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(107, 70, 193, 0.2)',
  },
});
