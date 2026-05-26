import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { theme } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { treatmentService } from '../../services';
import { LoadingSpinner, FadeInView } from '../../components';

interface TreatmentPlan {
  id: string;
  plan_name: string;
  description?: string;
  goals: string[];
  strategies: string[];
  frequency?: string;
  duration_weeks?: number;
  status: string;
  start_date: string;
  end_date?: string;
  psychologist?: {
    full_name: string;
  };
}

export default function PlanoScreen() {
  const insets = useSafeAreaInsets();
  const { userProfile } = useAuth();
  const [treatmentPlan, setTreatmentPlan] = useState<TreatmentPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTreatmentPlan();
  }, [userProfile]);

  const loadTreatmentPlan = async () => {
    if (!userProfile?.id) return;

    setLoading(true);
    const { data, error } = await treatmentService.getTreatmentPlans(userProfile.id, 'patient');

    if (error) {
      console.error('Error loading treatment plan:', error);
      setLoading(false);
      return;
    }

    if (data && data.length > 0) {
      // Get active plan or most recent
      const activePlan = data.find((p: any) => p.status === 'active') || data[0];
      setTreatmentPlan(activePlan);
    }

    setLoading(false);
  };

  const getProgressPercentage = () => {
    if (!treatmentPlan?.start_date || !treatmentPlan?.duration_weeks) return 0;

    const start = new Date(treatmentPlan.start_date);
    const now = new Date();
    const totalDays = treatmentPlan.duration_weeks * 7;
    const elapsedDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    const progress = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
    return Math.round(progress);
  };

  const getRemainingWeeks = () => {
    if (!treatmentPlan?.start_date || !treatmentPlan?.duration_weeks) return 0;

    const start = new Date(treatmentPlan.start_date);
    const now = new Date();
    const elapsedWeeks = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7));
    
    return Math.max(0, treatmentPlan.duration_weeks - elapsedWeeks);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return { bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.2)', text: '#10B981' };
      case 'completed':
        return { bg: 'rgba(107, 70, 193, 0.1)', border: 'rgba(107, 70, 193, 0.2)', text: theme.colors.primary };
      case 'paused':
        return { bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.2)', text: '#F59E0B' };
      default:
        return { bg: 'rgba(148, 163, 184, 0.1)', border: 'rgba(148, 163, 184, 0.2)', text: '#64748B' };
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: 'Ativo',
      completed: 'Concluído',
      paused: 'Pausado',
      cancelled: 'Cancelado',
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner size={40} color={theme.colors.primary} />
        <Text style={styles.loadingText}>Carregando plano...</Text>
      </View>
    );
  }

  if (!treatmentPlan) {
    return (
      <LinearGradient colors={['#E8E3F5', '#E3EBF8', '#E0F2F7']} style={styles.container}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
          <Text style={styles.headerTitle}>Plano de Cuidado</Text>
        </View>
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="clipboard-outline" size={64} color="#CBD5E1" />
          </View>
          <Text style={styles.emptyTitle}>Nenhum plano ativo</Text>
          <Text style={styles.emptyDesc}>
            Seu psicólogo criará um plano de tratamento personalizado para você
          </Text>
        </View>
      </LinearGradient>
    );
  }

  const statusColors = getStatusColor(treatmentPlan.status);
  const progress = getProgressPercentage();
  const remainingWeeks = getRemainingWeeks();

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#E8E3F5', '#E3EBF8', '#E0F2F7']} style={styles.background}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
          <Text style={styles.headerTitle}>Plano de Cuidado</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColors.bg, borderColor: statusColors.border }]}>
            <Text style={[styles.statusText, { color: statusColors.text }]}>
              {getStatusLabel(treatmentPlan.status)}
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 70 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Plan Header */}
          <FadeInView delay={0}>
            <View style={styles.planHeaderCard}>
              <Text style={styles.planName}>{treatmentPlan.plan_name}</Text>
              {treatmentPlan.description && (
                <Text style={styles.planDescription}>{treatmentPlan.description}</Text>
              )}

              {treatmentPlan.psychologist && (
                <View style={styles.psychologistInfo}>
                  <View style={styles.psychologistAvatar}>
                    <Ionicons name="person" size={20} color={theme.colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.psychologistLabel}>Seu Psicólogo</Text>
                    <Text style={styles.psychologistName}>{treatmentPlan.psychologist.full_name}</Text>
                  </View>
                </View>
              )}
            </View>
          </FadeInView>

          {/* Progress Card */}
          {treatmentPlan.status === 'active' && (
            <FadeInView delay={100}>
              <View style={styles.progressCard}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressTitle}>Progresso do Tratamento</Text>
                  <Text style={styles.progressPercentage}>{progress}%</Text>
                </View>

                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBarBackground}>
                    <LinearGradient
                      colors={[theme.colors.primary, '#8B5CF6', '#14B8A6']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.progressBarFill, { width: `${progress}%` }]}
                    />
                  </View>
                </View>

                <View style={styles.progressStats}>
                  {treatmentPlan.frequency && (
                    <View style={styles.progressStat}>
                      <Ionicons name="calendar" size={16} color="#64748B" />
                      <Text style={styles.progressStatText}>{treatmentPlan.frequency}</Text>
                    </View>
                  )}
                  {treatmentPlan.duration_weeks && (
                    <View style={styles.progressStat}>
                      <Ionicons name="time" size={16} color="#64748B" />
                      <Text style={styles.progressStatText}>{remainingWeeks} semanas restantes</Text>
                    </View>
                  )}
                </View>
              </View>
            </FadeInView>
          )}

          {/* Goals */}
          {treatmentPlan.goals && treatmentPlan.goals.length > 0 && (
            <FadeInView delay={200}>
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="flag" size={20} color={theme.colors.primary} />
                  <Text style={styles.sectionTitle}>Objetivos do Tratamento</Text>
                </View>
                <View style={styles.listContainer}>
                  {treatmentPlan.goals.map((goal, index) => (
                    <View key={index} style={styles.listItem}>
                      <View style={styles.listIcon}>
                        <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                      </View>
                      <Text style={styles.listText}>{goal}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </FadeInView>
          )}

          {/* Strategies */}
          {treatmentPlan.strategies && treatmentPlan.strategies.length > 0 && (
            <FadeInView delay={300}>
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="bulb" size={20} color={theme.colors.primary} />
                  <Text style={styles.sectionTitle}>Estratégias Terapêuticas</Text>
                </View>
                <View style={styles.listContainer}>
                  {treatmentPlan.strategies.map((strategy, index) => (
                    <View key={index} style={styles.listItem}>
                      <View style={styles.listIcon}>
                        <Ionicons name="arrow-forward-circle" size={20} color={theme.colors.primary} />
                      </View>
                      <Text style={styles.listText}>{strategy}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </FadeInView>
          )}

          {/* Dates Info */}
          <FadeInView delay={400}>
            <View style={styles.datesCard}>
              <View style={styles.dateItem}>
                <Text style={styles.dateLabel}>Início</Text>
                <Text style={styles.dateValue}>
                  {new Date(treatmentPlan.start_date).toLocaleDateString('pt-BR')}
                </Text>
              </View>
              {treatmentPlan.end_date && (
                <>
                  <View style={styles.dateDivider} />
                  <View style={styles.dateItem}>
                    <Text style={styles.dateLabel}>Término Previsto</Text>
                    <Text style={styles.dateValue}>
                      {new Date(treatmentPlan.end_date).toLocaleDateString('pt-BR')}
                    </Text>
                  </View>
                </>
              )}
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
  background: {
    flex: 1,
  },
  header: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.foreground,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    gap: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIcon: {
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.foreground,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  planHeaderCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  planName: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.foreground,
    marginBottom: 8,
  },
  planDescription: {
    fontSize: 15,
    fontWeight: '500',
    color: '#64748B',
    lineHeight: 22,
    marginBottom: 20,
  },
  psychologistInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  psychologistAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(107, 70, 193, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  psychologistLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 2,
  },
  psychologistName: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.foreground,
  },
  progressCard: {
    backgroundColor: 'rgba(107, 70, 193, 0.05)',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(107, 70, 193, 0.1)',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.foreground,
  },
  progressPercentage: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  progressBarContainer: {
    marginBottom: 16,
  },
  progressBarBackground: {
    height: 12,
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressStats: {
    flexDirection: 'row',
    gap: 16,
  },
  progressStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressStatText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  section: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.foreground,
  },
  listContainer: {
    gap: 12,
  },
  listItem: {
    flexDirection: 'row',
    gap: 12,
  },
  listIcon: {
    marginTop: 2,
  },
  listText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.foreground,
    lineHeight: 20,
  },
  datesCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    flexDirection: 'row',
  },
  dateItem: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.foreground,
  },
  dateDivider: {
    width: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    marginHorizontal: 16,
  },
});
