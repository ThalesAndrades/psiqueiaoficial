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
import { FadeInView, NotificationBadge, LoadingSpinner } from '../../components';

export default function PsychologistDashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userProfile } = useAuth();
  const { monthlyRevenue, activePatients, attendanceRate, todaySessions, loading, error, refreshAll } = useAppData();

  useFocusEffect(
    useCallback(() => {
      refreshAll();
    }, [])
  );

  const doctorName = userProfile?.full_name?.split(' ')[0] || 'Doutor(a)';
  
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
      <LinearGradient
        colors={[theme.colors.primary, '#7C5FD3', '#14B8A6']}
        style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Bem-vindo(a) de volta! 👋</Text>
            <Text style={styles.doctorName}>{doctorName}</Text>
            <Text style={styles.headerSubtext}>Vamos fazer um ótimo trabalho hoje!</Text>
          </View>
          <NotificationBadge color="#FFFFFF" />
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionButtonWhite} onPress={() => router.push('/(psychologist)/agenda')}>
            <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.actionButtonTextWhite}>Agenda</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButtonTransparent} onPress={() => router.push('/(psychologist)/pacientes')}>
            <Ionicons name="people" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonTextTransparent}>Pacientes</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) + 70 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Overview Stats */}
        <Text style={styles.sectionTitle}>Visão Geral</Text>
        <FadeInView delay={0}>
          <View style={styles.statsGrid}>
            <TouchableOpacity 
              style={styles.statCard}
              onPress={() => router.push('/(psychologist)/financeiro')}
            >
              <View style={styles.statIcon}>
                <Ionicons name="wallet" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.statLabel}>Receita Mensal</Text>
              <Text style={styles.statValue}>R$ {(monthlyRevenue / 1000).toFixed(1)}k</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.statCard}
              onPress={() => router.push('/(psychologist)/pacientes')}
            >
              <View style={[styles.statIcon, { backgroundColor: '#3B82F6' }]}>
                <Ionicons name="people" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.statLabel}>Pacientes Ativos</Text>
              <Text style={styles.statValue}>{activePatients}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.statCard}
              onPress={() => router.push('/(psychologist)/agenda')}
            >
              <View style={[styles.statIcon, { backgroundColor: '#8B5CF6' }]}>
                <Ionicons name="calendar" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.statLabel}>Sessões Hoje</Text>
              <Text style={styles.statValue}>{todaySessions.length}</Text>
            </TouchableOpacity>

            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#F59E0B' }]}>
                <Ionicons name="stats-chart" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.statLabel}>Taxa de Frequência</Text>
              <Text style={styles.statValue}>{attendanceRate}%</Text>
            </View>
          </View>
        </FadeInView>

        {/* Ações Principais */}
        <Text style={styles.sectionTitle}>Ações Rápidas</Text>
        <FadeInView delay={100}>
          <View style={styles.actionsList}>
            <TouchableOpacity 
              style={styles.actionRow}
              onPress={() => router.push('/(psychologist)/disponibilidade')}
            >
              <View style={[styles.actionRowIcon, { backgroundColor: '#EDE9FE' }]}>
                <Ionicons name="time-outline" size={24} color={theme.colors.primary} />
              </View>
              <View style={styles.actionRowInfo}>
                <Text style={styles.actionRowTitle}>Configurar Disponibilidade</Text>
                <Text style={styles.actionRowDesc}>Gerencie seus horários</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionRow}
              onPress={() => router.push('/(psychologist)/pacientes')}
            >
              <View style={[styles.actionRowIcon, { backgroundColor: '#DBEAFE' }]}>
                <Ionicons name="person-add-outline" size={24} color="#3B82F6" />
              </View>
              <View style={styles.actionRowInfo}>
                <Text style={styles.actionRowTitle}>Gerenciar Pacientes</Text>
                <Text style={styles.actionRowDesc}>Visualizar lista de pacientes</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionRow}
              onPress={() => router.push('/(psychologist)/financeiro')}
            >
              <View style={[styles.actionRowIcon, { backgroundColor: '#D1FAE5' }]}>
                <Ionicons name="cash-outline" size={24} color="#059669" />
              </View>
              <View style={styles.actionRowInfo}>
                <Text style={styles.actionRowTitle}>Financeiro</Text>
                <Text style={styles.actionRowDesc}>Ver transações e receita</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </FadeInView>

        {/* Hoje */}
        {todaySessions.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Sessões de Hoje ({todaySessions.length})</Text>
            <FadeInView delay={200}>
              <View style={styles.todayList}>
                {todaySessions.slice(0, 3).map((session, index) => (
                  <View key={session.id} style={styles.todayCard}>
                    <View style={styles.todayTime}>
                      <Text style={styles.todayTimeText}>
                        {new Date(session.scheduled_at).toLocaleTimeString('pt-BR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </Text>
                    </View>
                    <View style={styles.todayInfo}>
                      <Text style={styles.todayPatient}>Sessão de Terapia</Text>
                      <Text style={styles.todayDuration}>{session.duration_minutes || 50} minutos</Text>
                    </View>
                    <TouchableOpacity style={styles.todayAction}>
                      <Ionicons name="videocam" size={20} color={theme.colors.primary} />
                    </TouchableOpacity>
                  </View>
                ))}
                {todaySessions.length > 3 && (
                  <TouchableOpacity 
                    style={styles.viewAllButton}
                    onPress={() => router.push('/(psychologist)/agenda')}
                  >
                    <Text style={styles.viewAllText}>Ver todas ({todaySessions.length})</Text>
                    <Ionicons name="arrow-forward" size={16} color={theme.colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
            </FadeInView>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8F4F8',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F4F8',
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
    backgroundColor: '#E8F4F8',
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
  header: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  doctorName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtext: {
    fontSize: 12,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButtonWhite: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonTextWhite: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  actionButtonTransparent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    borderRadius: 16,
  },
  actionButtonTextTransparent: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    gap: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.foreground,
    marginBottom: -8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#6B46C1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  statIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#10B981',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.foreground,
  },
  actionsList: {
    gap: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  actionRowIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRowInfo: {
    flex: 1,
  },
  actionRowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.foreground,
    marginBottom: 2,
  },
  actionRowDesc: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  todayList: {
    gap: 12,
  },
  todayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  todayTime: {
    backgroundColor: 'rgba(107, 70, 193, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  todayTimeText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  todayInfo: {
    flex: 1,
  },
  todayPatient: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.foreground,
    marginBottom: 2,
  },
  todayDuration: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  todayAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(107, 70, 193, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(107, 70, 193, 0.1)',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary,
  },
});
