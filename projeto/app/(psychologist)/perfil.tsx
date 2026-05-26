import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, Modal, Linking, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { theme } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { paymentService } from '../../services';
import { LoadingSpinner } from '../../components';
import { toastManager } from '../../components/ui/Toast';

export default function PsychologistProfile() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signOut, deleteAccount, userProfile } = useAuth();
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  
  // Estado do Stripe Connect
  const [stripeStatus, setStripeStatus] = useState<{
    hasAccount: boolean;
    onboardingCompleted: boolean;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
  } | null>(null);
  const [loadingStripeStatus, setLoadingStripeStatus] = useState(true);
  const [settingUpStripe, setSettingUpStripe] = useState(false);

  useEffect(() => {
    checkStripeStatus();
  }, []);

  const checkStripeStatus = async () => {
    setLoadingStripeStatus(true);
    try {
      const { data, error } = await paymentService.getConnectAccountStatus();
      if (data) {
        setStripeStatus(data);
      } else if (error) {
        console.error('Error checking Stripe status:', error);
      }
    } catch (err) {
      console.error('Unexpected error checking Stripe:', err);
    } finally {
      setLoadingStripeStatus(false);
    }
  };

  const handleSetupStripe = async () => {
    setSettingUpStripe(true);
    
    try {
      let result;
      
      // Se já tem conta mas não completou onboarding, criar link para continuar
      if (stripeStatus?.hasAccount && !stripeStatus?.onboardingCompleted) {
        result = await paymentService.createConnectAccountLink();
      } else {
        // Criar nova conta
        result = await paymentService.createConnectAccount();
      }

      if (result.error) {
        Alert.alert('Erro', result.error);
        setSettingUpStripe(false);
        return;
      }

      if (result.data?.url) {
        if (Platform.OS === 'web') {
          window.location.href = result.data.url;
        } else {
          const supported = await Linking.canOpenURL(result.data.url);
          if (supported) {
            await Linking.openURL(result.data.url);
            // Mostrar mensagem para o usuário
            toastManager.show({
              type: 'info',
              message: 'Complete a configuração no navegador',
            });
          } else {
            Alert.alert('Erro', 'Não foi possível abrir o link de configuração');
          }
        }
      }
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao configurar Stripe Connect');
    } finally {
      setSettingUpStripe(false);
    }
  };

  const handleOpenStripeDashboard = async () => {
    setSettingUpStripe(true);
    
    try {
      const { data, error } = await paymentService.createLoginLink();
      
      if (error) {
        Alert.alert('Erro', error);
        setSettingUpStripe(false);
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
            Alert.alert('Erro', 'Não foi possível abrir o dashboard');
          }
        }
      }
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao abrir dashboard');
    } finally {
      setSettingUpStripe(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.replace('/login');
  };

  const handleDeleteAccount = () => {
    setDeletePassword('');
    setDeleteModalVisible(true);
  };

  const confirmDeleteAccount = async () => {
    if (!deletePassword) {
      const msg = 'Digite sua senha para confirmar';
      if (Platform.OS === 'web') alert(msg); else Alert.alert('Senha obrigatória', msg);
      return;
    }
    setDeleting(true);
    const { error } = await deleteAccount(deletePassword);
    setDeleting(false);

    if (error) {
      if (Platform.OS === 'web') {
        alert(`Erro ao excluir conta: ${error}`);
      } else {
        Alert.alert('Erro', `Não foi possível excluir sua conta: ${error}`);
      }
      return;
    }
    setDeleteModalVisible(false);
    setDeletePassword('');
    router.replace('/login');
  };

  // Renderizar status do Stripe
  const renderStripeStatus = () => {
    if (loadingStripeStatus) {
      return (
        <View style={styles.stripeStatusLoading}>
          <LoadingSpinner size={16} color={theme.colors.primary} />
          <Text style={styles.stripeStatusLoadingText}>Verificando...</Text>
        </View>
      );
    }

    if (stripeStatus?.onboardingCompleted) {
      return (
        <View style={styles.stripeStatusBadge}>
          <Ionicons name="checkmark-circle" size={14} color="#10B981" />
          <Text style={styles.stripeStatusText}>Ativo</Text>
        </View>
      );
    }

    if (stripeStatus?.hasAccount) {
      return (
        <View style={[styles.stripeStatusBadge, styles.stripeStatusPending]}>
          <Ionicons name="time" size={14} color="#F59E0B" />
          <Text style={[styles.stripeStatusText, { color: '#F59E0B' }]}>Pendente</Text>
        </View>
      );
    }

    return (
      <View style={[styles.stripeStatusBadge, styles.stripeStatusNotConfigured]}>
        <Ionicons name="alert-circle" size={14} color="#EF4444" />
        <Text style={[styles.stripeStatusText, { color: '#EF4444' }]}>Não configurado</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.primary, '#7C5FD3', '#14B8A6']}
        style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 24 }]}
      >
        <View style={styles.headerContent}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={60} color="#FFFFFF" />
          </View>
          <Text style={styles.name}>{userProfile?.full_name || 'Psicólogo(a)'}</Text>
          <Text style={styles.email}>{userProfile?.email || ''}</Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) + 70 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Stripe Connect Status Card */}
        {!loadingStripeStatus && !stripeStatus?.onboardingCompleted && (
          <View style={styles.alertCard}>
            <View style={styles.alertIcon}>
              <Ionicons name="warning" size={24} color="#F59E0B" />
            </View>
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>Configure seus Pagamentos</Text>
              <Text style={styles.alertText}>
                Para receber pagamentos dos pacientes, você precisa configurar sua conta Stripe Connect.
              </Text>
              <TouchableOpacity
                style={styles.alertButton}
                onPress={handleSetupStripe}
                disabled={settingUpStripe}
              >
                {settingUpStripe ? (
                  <LoadingSpinner size={16} color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                    <Text style={styles.alertButtonText}>
                      {stripeStatus?.hasAccount ? 'Continuar Configuração' : 'Configurar Agora'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.menuSection}>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.push('/(psychologist)/editar-perfil')}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#3B82F6' }]}>
              <Ionicons name="person-outline" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuText}>Dados Pessoais</Text>
              <Text style={styles.menuSubtext}>Editar informações do perfil</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.push('/(psychologist)/editar-perfil')}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#8B5CF6' }]}>
              <Ionicons name="briefcase-outline" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuText}>Dados Profissionais</Text>
              <Text style={styles.menuSubtext}>CRP, especialidades, valores</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.push('/(psychologist)/disponibilidade')}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#10B981' }]}>
              <Ionicons name="calendar-outline" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuText}>Disponibilidade</Text>
              <Text style={styles.menuSubtext}>Horários de atendimento</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={stripeStatus?.onboardingCompleted ? handleOpenStripeDashboard : handleSetupStripe}
            disabled={settingUpStripe}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#F59E0B' }]}>
              <Ionicons name="card-outline" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuText}>Pagamentos</Text>
              <Text style={styles.menuSubtext}>
                {stripeStatus?.onboardingCompleted 
                  ? 'Acessar dashboard Stripe' 
                  : 'Configurar Stripe Connect'}
              </Text>
            </View>
            <View style={styles.menuRight}>
              {renderStripeStatus()}
              {settingUpStripe ? (
                <LoadingSpinner size={16} color={theme.colors.primary} />
              ) : (
                <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: '#64748B' }]}>
              <Ionicons name="settings-outline" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuText}>Configurações</Text>
              <Text style={styles.menuSubtext}>Notificações, privacidade</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: '#64748B' }]}>
              <Ionicons name="help-circle-outline" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuText}>Ajuda e Suporte</Text>
              <Text style={styles.menuSubtext}>FAQ, contato</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
          </TouchableOpacity>
        </View>

        <View style={styles.dangerSection}>
          <TouchableOpacity style={styles.dangerItem} onPress={handleLogout}>
            <View style={[styles.menuIcon, { backgroundColor: '#EF4444' }]}>
              <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
            </View>
            <Text style={[styles.menuText, { color: '#EF4444' }]}>Sair</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.dangerItem} 
            onPress={handleDeleteAccount}
            disabled={deleting}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#DC2626' }]}>
              <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
            </View>
            <Text style={[styles.menuText, { color: '#DC2626' }]}>
              {deleting ? 'Excluindo...' : 'Excluir Conta'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Excluir Conta</Text>
            <Text style={styles.modalMessage}>
              Esta ação é permanente. Digite sua senha para confirmar.
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Senha atual"
              placeholderTextColor="#94A3B8"
              secureTextEntry
              value={deletePassword}
              onChangeText={setDeletePassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!deleting}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => { setDeleteModalVisible(false); setDeletePassword(''); }}
                disabled={deleting}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton]}
                onPress={confirmDeleteAccount}
                disabled={deleting}
              >
                <Text style={styles.deleteButtonText}>
                  {deleting ? 'Excluindo...' : 'Excluir'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8F4F8',
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  scrollView: {
    flex: 1,
    marginTop: -20,
  },
  scrollContent: {
    padding: 24,
    gap: 16,
  },
  alertCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  alertIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 4,
  },
  alertText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#B45309',
    lineHeight: 18,
    marginBottom: 12,
  },
  alertButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F59E0B',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  alertButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  menuSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 24,
    padding: 8,
    shadowColor: '#6B46C1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContent: {
    flex: 1,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.foreground,
    marginBottom: 2,
  },
  menuSubtext: {
    fontSize: 13,
    fontWeight: '400',
    color: theme.colors.muted,
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stripeStatusLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stripeStatusLoadingText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  stripeStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  stripeStatusPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  stripeStatusNotConfigured: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  stripeStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  dangerSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 24,
    padding: 8,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  dangerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.foreground,
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 15,
    color: theme.colors.muted,
    lineHeight: 22,
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: theme.colors.foreground,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: theme.colors.muted + '20',
  },
  cancelButtonText: {
    color: theme.colors.foreground,
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#DC2626',
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
