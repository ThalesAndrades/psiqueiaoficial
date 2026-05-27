import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { theme } from '../../constants/theme';
import { useState } from 'react';
import { useAppData } from '../../hooks/useAppData';
import { LoadingSpinner } from '../../components';

const generateCurrentWeek = () => {
  const week = [];
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday

  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    week.push({
      day: dayNames[date.getDay()],
      date: date.getDate(),
      fullDate: date,
    });
  }
  return week;
};

export default function AgendaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { psychologistAppointments, refreshAppointments } = useAppData();
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);
  const [currentWeek] = useState(generateCurrentWeek());

  useFocusEffect(
    React.useCallback(() => {
      loadAppointments();
    }, [])
  );

  const loadAppointments = async () => {
    setLoading(true);
    await refreshAppointments();
    setLoading(false);
  };

  const selectedDate = currentWeek[selectedDay]?.fullDate;
  const dayAppointments = psychologistAppointments.filter(apt => {
    const aptDate = new Date(apt.scheduled_at);
    return (
      selectedDate &&
      aptDate.getDate() === selectedDate.getDate() &&
      aptDate.getMonth() === selectedDate.getMonth() &&
      aptDate.getFullYear() === selectedDate.getFullYear() &&
      apt.status !== 'cancelled'
    );
  }).sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

  const appointments = dayAppointments.map(apt => ({
    id: apt.id,
    time: new Date(apt.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    duration: `${apt.duration_minutes || 50}min`,
    patient: apt.patient_name || 'Paciente',
    type: apt.patient_notes ? apt.patient_notes.substring(0, 30) : 'Sessão Individual',
    status: apt.status === 'scheduled' || apt.status === 'confirmed' ? 'confirmed' : apt.status,
  }));

  const confirmedCount = dayAppointments.filter(a => a.status === 'confirmed' || a.status === 'scheduled').length;
  const totalDuration = dayAppointments.reduce((sum, a) => sum + (a.duration_minutes || 50), 0);
  const uniquePatients = new Set(dayAppointments.map(a => a.patient_id)).size;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#F3F0FF', '#EBF3FF', '#E8F6F8']} style={styles.background}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
          <View>
            <Text style={styles.headerLabel}>AGENDA</Text>
            <Text style={styles.headerTitle}>Junho 2024</Text>
          </View>
          <TouchableOpacity style={styles.addButton}>
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Week Selector */}
        <View style={styles.weekSelector}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.weekContent}
          >
            {currentWeek.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayButton,
                  selectedDay === index && styles.dayButtonActive,
                ]}
                onPress={() => setSelectedDay(index)}
              >
                <Text
                  style={[
                    styles.dayLabel,
                    selectedDay === index && styles.dayLabelActive,
                  ]}
                >
                  {item.day}
                </Text>
                <Text
                  style={[
                    styles.dayNumber,
                    selectedDay === index && styles.dayNumberActive,
                  ]}
                >
                  {item.date}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons name="checkmark-done" size={20} color="#10B981" />
            </View>
            <View>
              <Text style={styles.statNumber}>{confirmedCount}</Text>
              <Text style={styles.statLabel}>Agendadas</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
              <Ionicons name="time" size={20} color="#F59E0B" />
            </View>
            <View>
              <Text style={styles.statNumber}>{Math.floor(totalDuration / 60)}h{totalDuration % 60 > 0 ? `${totalDuration % 60}m` : ''}</Text>
              <Text style={styles.statLabel}>Duração Total</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(107, 70, 193, 0.1)' }]}>
              <Ionicons name="people" size={20} color={theme.colors.primary} />
            </View>
            <View>
              <Text style={styles.statNumber}>{uniquePatients}</Text>
              <Text style={styles.statLabel}>Pacientes</Text>
            </View>
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
          {loading ? (
            <View style={styles.loadingContainer}>
              <LoadingSpinner size={32} color={theme.colors.primary} />
              <Text style={styles.loadingText}>Carregando agenda...</Text>
            </View>
          ) : appointments.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={64} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>Nenhuma sessão agendada</Text>
              <Text style={styles.emptyDesc}>Não há sessões para este dia</Text>
            </View>
          ) : (
            appointments.map((appointment) => (
            <TouchableOpacity key={appointment.id} style={styles.appointmentCard}>
              <View style={styles.appointmentTime}>
                <Text style={styles.timeText}>{appointment.time}</Text>
                <Text style={styles.durationText}>{appointment.duration}</Text>
              </View>

              <View style={styles.appointmentDetails}>
                <View style={styles.patientInfo}>
                  <View style={styles.patientAvatar}>
                    <Ionicons name="person" size={20} color={theme.colors.primary} />
                  </View>
                  <View style={styles.patientDetails}>
                    <Text style={styles.patientName}>{appointment.patient}</Text>
                    <Text style={styles.appointmentType}>{appointment.type}</Text>
                  </View>
                </View>

                <View style={styles.appointmentActions}>
                  <View
                    style={[
                      styles.statusBadge,
                      appointment.status === 'confirmed'
                        ? styles.statusConfirmed
                        : styles.statusPending,
                    ]}
                  >
                    <Ionicons
                      name={
                        appointment.status === 'confirmed'
                          ? 'checkmark-circle'
                          : 'time'
                      }
                      size={14}
                      color={appointment.status === 'confirmed' ? '#059669' : '#F59E0B'}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        appointment.status === 'confirmed'
                          ? styles.statusTextConfirmed
                          : styles.statusTextPending,
                      ]}
                    >
                      {appointment.status === 'confirmed' ? 'Confirmada' : 'Pendente'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.videoButton}
                    onPress={() => router.push(`/session/${appointment.id}` as any)}
                    accessibilityLabel="Entrar na sessão de vídeo"
                  >
                    <Ionicons name="videocam" size={20} color={theme.colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))
          )}
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
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.foreground,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    gap: 16,
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
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  patientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(107, 70, 193, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  patientDetails: {
    flex: 1,
  },
  patientName: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.foreground,
    marginBottom: 2,
  },
  appointmentType: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  appointmentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusConfirmed: {
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
    borderColor: 'rgba(5, 150, 105, 0.2)',
  },
  statusPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusTextConfirmed: {
    color: '#059669',
  },
  statusTextPending: {
    color: '#F59E0B',
  },
  videoButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(107, 70, 193, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.foreground,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
  },
});
