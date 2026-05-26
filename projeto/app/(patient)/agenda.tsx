import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, FlatList, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { theme } from '../../constants/theme';
import { useAppData } from '../../hooks/useAppData';
import { useAuth } from '../../hooks/useAuth';
import { analyticsService } from '../../services';
import { LoadingSpinner, FadeInView, GoogleMeetViewer } from '../../components';
import { googleService } from '../../services/googleService';
import { toastManager } from '../../components/ui/Toast';

const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function AgendaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { patientAppointments, refreshAppointments } = useAppData();
  const { userProfile } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [currentWeek, setCurrentWeek] = useState<Date[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<string | null>(null);

  useEffect(() => {
    generateWeek();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadAppointments();
      
      // Track screen view
      if (userProfile?.id) {
        analyticsService.trackScreen('Agenda', userProfile.id);
      }
    }, [userProfile?.id])
  );

  const generateWeek = () => {
    const week: Date[] = [];
    const today = new Date();
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      week.push(day);
    }
    setCurrentWeek(week);
  };

  const loadAppointments = async () => {
    setLoading(true);
    await refreshAppointments();
    setLoading(false);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  };

  const filteredAppointments = patientAppointments.filter((apt) =>
    isSameDay(new Date(apt.scheduled_at), selectedDate)
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return { bg: 'rgba(5, 150, 105, 0.1)', border: 'rgba(5, 150, 105, 0.2)', text: '#059669' };
      case 'completed':
        return { bg: 'rgba(107, 70, 193, 0.1)', border: 'rgba(107, 70, 193, 0.2)', text: theme.colors.primary };
      case 'cancelled':
        return { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.2)', text: '#EF4444' };
      default:
        return { bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.2)', text: '#F59E0B' };
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      scheduled: 'Agendada',
      confirmed: 'Confirmada',
      completed: 'Concluída',
      cancelled: 'Cancelada',
      no_show: 'Ausência',
    };
    return labels[status] || status;
  };

  const handleJoinMeeting = (meetLink: string | null) => {
    if (!meetLink) {
      // Two-clause explainer — blocking Alert so the user reads the
      // "contact the psychologist" instruction before the UI moves on.
      Alert.alert('Link Indisponível', 'O link da reunião ainda não foi gerado. Aguarde ou entre em contato com seu psicólogo.');
      return;
    }
    // Detectar placeholder
    if (meetLink.includes('abc-defg-hij')) {
      Alert.alert('Link Temporário', 'O link real será gerado automaticamente após a confirmação do pagamento.');
      return;
    }
    setSelectedMeeting(meetLink);
  };

  const handleSyncCalendar = async () => {
    if (!userProfile?.email) {
      toastManager.show({ type: 'error', message: 'Email não disponível' });
      return;
    }

    setLoading(true);
    const { data, error } = await googleService.syncCalendar({
      patientEmail: userProfile.email,
    });

    if (error) {
      toastManager.show({ type: 'error', message: `Erro ao Sincronizar: ${error}` });
    } else {
      // Blocking Alert — the synced count matters (0 = silent no-op the user
      // needs to know about), and the list is about to re-render underneath.
      Alert.alert('Sucesso', `${data?.synced || 0} eventos sincronizados com Google Calendar`);
      await loadAppointments();
    }
    setLoading(false);
  };

  if (loading && patientAppointments.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner size={40} color={theme.colors.primary} />
        <Text style={styles.loadingText}>Carregando agenda...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#F3F0FF', '#EBF3FF', '#E8F6F8']} style={styles.background}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
          <View>
            <Text style={styles.headerLabel}>AGENDA</Text>
            <Text style={styles.headerTitle}>
              {selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.addButton} 
              onPress={() => router.push('/(patient)/nova-sessao')}
            >
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Week Selector */}
        <View style={styles.weekSelector}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.weekContent}
          >
            {currentWeek.map((day, index) => {
              const isSelected = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());
              
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dayButton,
                    isSelected && styles.dayButtonActive,
                  ]}
                  onPress={() => setSelectedDate(day)}
                >
                  <Text
                    style={[
                      styles.dayLabel,
                      isSelected && styles.dayLabelActive,
                    ]}
                  >
                    {weekDays[day.getDay()]}
                  </Text>
                  <Text
                    style={[
                      styles.dayNumber,
                      isSelected && styles.dayNumberActive,
                    ]}
                  >
                    {day.getDate()}
                  </Text>
                  {isToday && !isSelected && <View style={styles.todayDot} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <FlatList
          data={filteredAppointments}
          keyExtractor={(item) => item.id}
          renderItem={({ item: appointment, index }) => {
            const statusColors = getStatusColor(appointment.status);
            
            return (
              <FadeInView delay={index * 50}>
                <View style={styles.appointmentCard}>
                  <View style={styles.appointmentTime}>
                    <Text style={styles.timeText}>{formatTime(appointment.scheduled_at)}</Text>
                    <Text style={styles.durationText}>{appointment.duration_minutes}min</Text>
                  </View>

                  <View style={styles.appointmentDetails}>
                    <View style={styles.sessionInfo}>
                      <View style={styles.doctorAvatar}>
                        <Ionicons name="person" size={20} color={theme.colors.primary} />
                      </View>
                      <View style={styles.sessionDetails}>
                        <Text style={styles.sessionTitle}>Sessão de Terapia</Text>
                        <Text style={styles.sessionType}>Dr. Psicólogo</Text>
                      </View>
                    </View>

                    <View style={styles.appointmentActions}>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: statusColors.bg, borderColor: statusColors.border },
                        ]}
                      >
                        <Text style={[styles.statusText, { color: statusColors.text }]}>
                          {getStatusLabel(appointment.status)}
                        </Text>
                      </View>

                      {appointment.google_meet_link && (
                        <TouchableOpacity
                          style={styles.meetButton}
                          onPress={() => handleJoinMeeting(appointment.google_meet_link)}
                        >
                          <Ionicons name="videocam" size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                      )}
                    </View>

                    {appointment.patient_notes && (
                      <View style={styles.notesContainer}>
                        <Ionicons name="document-text" size={14} color="#64748B" />
                        <Text style={styles.notesText} numberOfLines={2}>
                          {appointment.patient_notes}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </FadeInView>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="calendar-outline" size={64} color="#CBD5E1" />
              </View>
              <Text style={styles.emptyTitle}>Nenhuma sessão agendada</Text>
              <Text style={styles.emptyDesc}>
                Você não tem sessões marcadas para este dia
              </Text>
            </View>
          }
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 70 },
          ]}
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
        />
      </LinearGradient>

      {/* Google Meet Modal */}
      <Modal
        visible={!!selectedMeeting}
        animationType="slide"
        onRequestClose={() => setSelectedMeeting(null)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalHeader, { paddingTop: Math.max(insets.top, 16) }]}>
            <Text style={styles.modalTitle}>Sessão ao Vivo</Text>
            <TouchableOpacity onPress={() => setSelectedMeeting(null)} style={styles.closeButton}>
              <Ionicons name="close" size={28} color={theme.colors.foreground} />
            </TouchableOpacity>
          </View>
          {selectedMeeting && <GoogleMeetViewer meetLink={selectedMeeting} />}
        </View>
      </Modal>
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
  headerLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.foreground,
    textTransform: 'capitalize',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  weekSelector: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  weekContent: {
    paddingHorizontal: 24,
    gap: 12,
  },
  dayButton: {
    width: 56,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    position: 'relative',
  },
  dayButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
  },
  dayLabelActive: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.foreground,
  },
  dayNumberActive: {
    color: '#FFFFFF',
  },
  todayDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.primary,
  },

  scrollContent: {
    padding: 24,
    gap: 16,
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
    alignItems: 'center',
    paddingVertical: 60,
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
  },
  appointmentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  appointmentTime: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  timeText: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.foreground,
  },
  durationText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  appointmentDetails: {
    flex: 1,
  },
  sessionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  doctorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(107, 70, 193, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionDetails: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.foreground,
    marginBottom: 2,
  },
  sessionType: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  appointmentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  meetButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  notesText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    lineHeight: 18,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.foreground,
  },
  closeButton: {
    padding: 8,
  },
});
