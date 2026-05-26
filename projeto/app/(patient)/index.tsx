import React, { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { theme } from '../../constants/theme';
import { useAppData } from '../../hooks/useAppData';
import { useAuth } from '../../hooks/useAuth';
import { FadeInView, PressableCard, NotificationBadge, AIInsightCard, LoadingSpinner } from '../../components';

export default function PatientHomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userProfile } = useAuth();
  const { carePlanProgress, nextPatientSession, diaryEntries, loading, error, refreshAll } = useAppData();

  useFocusEffect(
    useCallback(() => {
      refreshAll();
    }, [])
  );

  const firstName = userProfile?.full_name?.split(' ')[0] || 'Usuário';
  const progress = carePlanProgress ?? 0;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner size={40} color={theme.colors.primary} />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#EF4444" />
        <Text style={styles.errorTitle}>Erro ao Carregar</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refreshAll}>
          <Text style={styles.retryText}>Tentar Novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#F3F0FF', '#EBF3FF', '#E8F6F8']} style={styles.background}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
          <View>
            <Text style={styles.greeting}>Bem-vindo(a) de volta,</Text>
            <Text style={styles.userName}>{firstName}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => router.push('/(patient)/chat-ai')} style={styles.aiButton}>
              <Ionicons name="sparkles" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
            <NotificationBadge color={theme.colors.primary} />
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) + 70 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* AI Insight */}
          <FadeInView delay={0}>
            <AIInsightCard userContext={{ 
              userName: firstName, 
              progress,
              recentEntries: diaryEntries.length,
              hasUpcomingSession: !!nextPatientSession 
            }} />
          </FadeInView>

          {/* Ações Rápidas */}
          <FadeInView delay={100}>
            <View style={styles.quickActions}>
              <TouchableOpacity 
                style={styles.actionCard}
                onPress={() => router.push('/(patient)/nova-sessao')}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#EDE9FE' }]}>
                  <Ionicons name="calendar-outline" size={28} color={theme.colors.primary} />
                </View>
                <Text style={styles.actionTitle}>Agendar Sessão</Text>
                <Text style={styles.actionDesc}>Nova consulta</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionCard}
                onPress={() => router.push('/(patient)/diario')}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#DBEAFE' }]}>
                  <Ionicons name="journal-outline" size={28} color="#3B82F6" />
                </View>
                <Text style={styles.actionTitle}>Diário</Text>
                <Text style={styles.actionDesc}>Registrar emoções</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionCard}
                onPress={() => router.push('/(patient)/plano')}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#D1FAE5' }]}>
                  <Ionicons name="clipboard-outline" size={28} color="#059669" />
                </View>
                <Text style={styles.actionTitle}>Plano</Text>
                <Text style={styles.actionDesc}>Ver progresso</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionCard}
                onPress={() => router.push('/(patient)/documentos')}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="document-text-outline" size={28} color="#D97706" />
                </View>
                <Text style={styles.actionTitle}>Documentos</Text>
                <Text style={styles.actionDesc}>Materiais</Text>
              </TouchableOpacity>
            </View>
          </FadeInView>

          {/* Próxima Sessão */}
          {nextPatientSession && (
            <FadeInView delay={200}>
              <View style={styles.sessionCard}>
                <View style={styles.sessionHeader}>
                  <Text style={styles.sessionLabel}>PRÓXIMA SESSÃO</Text>
                  <View style={styles.sessionStatus}>
                    <Ionicons name="checkmark-circle" size={32} color="#10B981" />
                  </View>
                </View>
                <Text style={styles.sessionDate}>
                  {new Date(nextPatientSession.scheduled_at).toLocaleDateString('pt-BR', { 
                    weekday: 'short', 
                    day: 'numeric', 
                    month: 'short' 
                  })}
                </Text>
                <Text style={styles.sessionTime}>
                  {new Date(nextPatientSession.scheduled_at).toLocaleTimeString('pt-BR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })} - {nextPatientSession.duration_minutes} min
                </Text>

                <View style={styles.doctorInfo}>
                  <Ionicons name="person-circle" size={40} color={theme.colors.primary} />
                  <View style={styles.doctorDetails}>
                    <Text style={styles.doctorName}>Dr. Psicólogo</Text>
                    <Text style={styles.doctorTitle}>Psicólogo Clínico</Text>
                  </View>
                </View>

                {nextPatientSession.google_meet_link && (
                  <PressableCard>
                    <LinearGradient
                      colors={[theme.colors.primary, '#8B5CF6', '#14B8A6']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.sessionButton}
                    >
                      <Ionicons name="videocam" size={20} color="#FFFFFF" />
                      <Text style={styles.sessionButtonText}>Entrar na Sessão</Text>
                    </LinearGradient>
                  </PressableCard>
                )}
              </View>
            </FadeInView>
          )}

          {/* Plano de Cuidado */}
          <FadeInView delay={300}>
            <View style={styles.planCard}>
              <View style={styles.planHeader}>
                <Text style={styles.planTitle}>Meu Progresso</Text>
                <TouchableOpacity onPress={() => router.push('/(patient)/plano')}>
                  <Ionicons name="arrow-forward" size={20} color={theme.colors.primary} />
                </TouchableOpacity>
              </View>

              <View style={styles.progressContainer}>
                <View style={styles.circularProgress}>
                  <Text style={styles.progressNumber}>{progress}%</Text>
                  <Text style={styles.progressLabel}>progresso</Text>
                </View>

                <View style={styles.progressInfo}>
                  <Text style={styles.progressTitle}>Continue assim!</Text>
                  <Text style={styles.progressDesc}>
                    Você está no caminho certo. Continue focado em seus objetivos.
                  </Text>
                </View>
              </View>
            </View>
          </FadeInView>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F0FF',
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F0FF',
    padding: 24,
    gap: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  errorText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
  },
  retryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
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
  greeting: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.foreground,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aiButton: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(107, 70, 193, 0.1)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(107, 70, 193, 0.2)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    gap: 24,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.foreground,
    marginBottom: 4,
  },
  actionDesc: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  sessionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sessionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
    letterSpacing: 0.5,
  },
  sessionStatus: {
    // icon container
  },
  sessionDate: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.foreground,
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  sessionTime: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: 20,
  },
  doctorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  doctorDetails: {
    flex: 1,
  },
  doctorName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.foreground,
  },
  doctorTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  sessionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  sessionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  planCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  planTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.foreground,
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  circularProgress: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(107, 70, 193, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 8,
    borderColor: theme.colors.primary,
  },
  progressNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  progressInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.foreground,
    marginBottom: 4,
  },
  progressDesc: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
    lineHeight: 19,
  },
});
