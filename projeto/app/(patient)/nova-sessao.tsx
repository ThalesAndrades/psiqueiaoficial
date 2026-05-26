import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Platform, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { theme } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { appointmentService, patientPsychologistService, paymentService } from '../../services';
import { LoadingSpinner } from '../../components';
import { toastManager } from '../../components/ui/Toast';

interface PsychologistData {
  psychologist_id: string;
  psychologist: {
    id: string;
    full_name: string;
    avatar_url?: string;
    user_type: string;
  };
  psychologist_profile: {
    crp: string;
    specializations: string[];
    bio?: string;
    session_price: number;
    rating?: number;
    total_sessions?: number;
  };
}

// Componente de Calendário Simples
const SimpleCalendar = ({
  selectedDate,
  onSelectDate,
  onClose,
}: {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onClose: () => void;
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];

    // Adicionar dias vazios para alinhar com o dia da semana
    const startDayOfWeek = firstDay.getDay();
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    // Adicionar os dias do mês
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  }, [currentMonth]);

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const isDateDisabled = (date: Date | null) => {
    if (!date) return true;
    return date < today;
  };

  const isDateSelected = (date: Date | null) => {
    if (!date) return false;
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const isToday = (date: Date | null) => {
    if (!date) return false;
    const now = new Date();
    return (
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    );
  };

  return (
    <View style={calendarStyles.container}>
      <View style={calendarStyles.header}>
        <TouchableOpacity onPress={goToPreviousMonth} style={calendarStyles.navButton}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={calendarStyles.monthTitle}>
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </Text>
        <TouchableOpacity onPress={goToNextMonth} style={calendarStyles.navButton}>
          <Ionicons name="chevron-forward" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={calendarStyles.weekDays}>
        {dayNames.map((day) => (
          <Text key={day} style={calendarStyles.weekDayText}>{day}</Text>
        ))}
      </View>

      <View style={calendarStyles.daysGrid}>
        {daysInMonth.map((date, index) => {
          const disabled = isDateDisabled(date);
          const selected = isDateSelected(date);
          const todayDate = isToday(date);

          return (
            <TouchableOpacity
              key={index}
              style={[
                calendarStyles.dayCell,
                selected && calendarStyles.dayCellSelected,
                todayDate && !selected && calendarStyles.dayCellToday,
              ]}
              onPress={() => {
                if (date && !disabled) {
                  onSelectDate(date);
                  onClose();
                }
              }}
              disabled={disabled}
            >
              {date && (
                <Text
                  style={[
                    calendarStyles.dayText,
                    disabled && calendarStyles.dayTextDisabled,
                    selected && calendarStyles.dayTextSelected,
                  ]}
                >
                  {date.getDate()}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity style={calendarStyles.closeButton} onPress={onClose}>
        <Text style={calendarStyles.closeButtonText}>Fechar</Text>
      </TouchableOpacity>
    </View>
  );
};

export default function NovaSessaoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userProfile } = useAuth();
  
  // Inicializar com amanhã como data padrão
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  const [selectedDate, setSelectedDate] = useState(tomorrow);
  const [selectedTime, setSelectedTime] = useState('');
  const [duration, setDuration] = useState(50);
  const [notes, setNotes] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [psychologistData, setPsychologistData] = useState<PsychologistData | null>(null);
  const [loadingPsychologist, setLoadingPsychologist] = useState(true);
  const [canReceivePayments, setCanReceivePayments] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    loadPsychologist();
  }, [userProfile]);

  const loadPsychologist = async () => {
    if (!userProfile?.id) {
      setLoadingPsychologist(false);
      return;
    }

    setLoadingPsychologist(true);
    
    try {
      // 1. Buscar o psicólogo vinculado ao paciente
      const { data, error } = await patientPsychologistService.getMyPsychologist(userProfile.id);
      
      if (error || !data) {
        console.error('Error loading psychologist:', error);
        Alert.alert(
          'Psicólogo Não Encontrado',
          'Você precisa estar vinculado a um psicólogo para agendar sessões.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
        setLoadingPsychologist(false);
        return;
      }

      // 2. Verificar se o psicólogo pode receber pagamentos (onboarding Stripe completo)
      const { data: verification, error: verificationError } = await paymentService.verifyPsychologist(data.psychologist_id);
      
      if (verificationError) {
        console.error('Error verifying psychologist:', verificationError);
        // Continuar mesmo com erro de verificação, mas desabilitar pagamentos
        setCanReceivePayments(false);
      } else if (verification) {
        setCanReceivePayments(verification.canReceivePayments);
        
        if (!verification.canReceivePayments) {
          Alert.alert(
            'Pagamentos Indisponíveis',
            'Este profissional ainda não configurou o recebimento de pagamentos. Entre em contato diretamente para agendar.',
            [
              { text: 'Voltar', onPress: () => router.back() },
              { text: 'Continuar Mesmo Assim', style: 'cancel' }
            ]
          );
        }
      }

      setPsychologistData(data);
    } catch (err: any) {
      console.error('Unexpected error:', err);
      Alert.alert('Erro', 'Não foi possível carregar os dados do psicólogo.');
      router.back();
    } finally {
      setLoadingPsychologist(false);
    }
  };

  // Time slots from 8:00 to 19:00
  const timeSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
    '17:00', '17:30', '18:00', '18:30', '19:00',
  ];

  // Filtrar horários passados se a data selecionada for hoje
  const availableTimeSlots = useMemo(() => {
    const now = new Date();
    const isToday = 
      selectedDate.getDate() === now.getDate() &&
      selectedDate.getMonth() === now.getMonth() &&
      selectedDate.getFullYear() === now.getFullYear();

    if (!isToday) return timeSlots;

    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    return timeSlots.filter((time) => {
      const [hours, minutes] = time.split(':').map(Number);
      // Adicionar 1 hora de margem para agendamento no mesmo dia
      if (hours > currentHour + 1) return true;
      if (hours === currentHour + 1 && minutes >= currentMinute) return true;
      return false;
    });
  }, [selectedDate, timeSlots]);

  const handleCreateAppointment = async () => {
    if (!selectedTime) {
      Alert.alert('Erro', 'Por favor, selecione um horário');
      return;
    }

    if (!userProfile?.id) {
      Alert.alert('Erro', 'Usuário não autenticado');
      return;
    }

    if (!psychologistData) {
      Alert.alert('Erro', 'Psicólogo não encontrado. Por favor, volte e tente novamente.');
      return;
    }

    const sessionPrice = psychologistData.psychologist_profile?.session_price || 0;
    
    // Verificar se há um preço configurado
    if (sessionPrice <= 0) {
      Alert.alert(
        'Preço Não Configurado',
        'O psicólogo ainda não configurou o preço da sessão. Entre em contato diretamente.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
      return;
    }

    setIsCreating(true);

    try {
      // Create scheduled date/time
      const [hours, minutes] = selectedTime.split(':');
      const scheduledAt = new Date(selectedDate);
      scheduledAt.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      // Verificar se a data é no futuro
      if (scheduledAt <= new Date()) {
        Alert.alert('Erro', 'Por favor, selecione uma data e horário no futuro.');
        setIsCreating(false);
        return;
      }

      // Create appointment with pending payment status
      const { data: appointment, error: createError } = await appointmentService.createAppointment({
        patient_id: userProfile.id,
        psychologist_id: psychologistData.psychologist_id,
        scheduled_at: scheduledAt.toISOString(),
        duration_minutes: duration,
        status: 'scheduled',
        patient_notes: notes,
        payment_status: 'pending',
        session_price: sessionPrice,
      });

      if (createError || !appointment) {
        Alert.alert('Erro', createError || 'Não foi possível criar a sessão');
        setIsCreating(false);
        return;
      }

      // Se o psicólogo pode receber pagamentos, redirecionar para a tela de pagamento
      if (canReceivePayments && sessionPrice > 0) {
        router.push({
          pathname: '/(patient)/payment',
          params: {
            appointmentId: appointment.id,
            psychologistId: psychologistData.psychologist_id,
            amount: sessionPrice.toString(),
            psychologistName: psychologistData.psychologist?.full_name || 'Psicólogo',
          },
        });
      } else {
        // Se não pode receber pagamentos, apenas confirmar o agendamento
        toastManager.show({
          type: 'success',
          message: 'Sessão agendada com sucesso!',
        });
        
        Alert.alert(
          'Sessão Criada! ✅',
          `Sua sessão foi agendada para ${scheduledAt.toLocaleDateString('pt-BR')} às ${selectedTime}.\n\nComo o psicólogo ainda não configurou pagamentos online, entre em contato para combinar a forma de pagamento.`,
          [{ text: 'OK', onPress: () => router.replace('/(patient)/agenda') }]
        );
      }
    } catch (error: any) {
      console.error('Create appointment error:', error);
      Alert.alert('Erro', error.message || 'Não foi possível criar a sessão');
    } finally {
      setIsCreating(false);
    }
  };

  if (loadingPsychologist) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner size={40} color={theme.colors.primary} />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const sessionPrice = psychologistData?.psychologist_profile?.session_price || 0;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Nova Sessão',
          headerStyle: {
            backgroundColor: '#FFFFFF',
          },
          headerShadowVisible: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.foreground} />
            </TouchableOpacity>
          ),
        }}
      />

      {/* Modal do Calendário */}
      <Modal
        visible={showCalendar}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCalendar(false)}
      >
        <View style={calendarStyles.modalOverlay}>
          <View style={calendarStyles.modalContent}>
            <SimpleCalendar
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onClose={() => setShowCalendar(false)}
            />
          </View>
        </View>
      </Modal>

      <LinearGradient colors={['#F3F0FF', '#EBF3FF', '#E8F6F8']} style={styles.background}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 100 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Psychologist Info */}
          {psychologistData && (
            <View style={styles.psychologistCard}>
              <View style={styles.psychologistIcon}>
                <Ionicons name="person-circle" size={48} color={theme.colors.primary} />
              </View>
              <View style={styles.psychologistInfo}>
                <Text style={styles.psychologistName}>
                  {psychologistData.psychologist?.full_name || 'Psicólogo'}
                </Text>
                <Text style={styles.psychologistCrp}>
                  CRP {psychologistData.psychologist_profile?.crp || 'N/A'}
                </Text>
                {sessionPrice > 0 && (
                  <View style={styles.priceTag}>
                    <Ionicons name="pricetag" size={14} color={theme.colors.primary} />
                    <Text style={styles.priceText}>{formatCurrency(sessionPrice)} / sessão</Text>
                  </View>
                )}
              </View>
              {canReceivePayments && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="shield-checkmark" size={16} color="#10B981" />
                </View>
              )}
            </View>
          )}

          {/* Date Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Data da Sessão</Text>
            <TouchableOpacity 
              style={styles.dateCard}
              onPress={() => setShowCalendar(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar" size={24} color={theme.colors.primary} />
              <View style={styles.dateInfo}>
                <Text style={styles.dateLabel}>Toque para alterar</Text>
                <Text style={styles.dateValue}>{formatDate(selectedDate)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Time Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Horário</Text>
            {availableTimeSlots.length === 0 ? (
              <View style={styles.noTimesCard}>
                <Ionicons name="time-outline" size={24} color="#94A3B8" />
                <Text style={styles.noTimesText}>
                  Nenhum horário disponível para esta data. Por favor, selecione outra data.
                </Text>
              </View>
            ) : (
              <View style={styles.timeGrid}>
                {availableTimeSlots.map((time) => {
                  const isSelected = selectedTime === time;
                  return (
                    <TouchableOpacity
                      key={time}
                      style={[
                        styles.timeSlot,
                        isSelected && styles.timeSlotActive,
                      ]}
                      onPress={() => setSelectedTime(time)}
                    >
                      <Text
                        style={[
                          styles.timeText,
                          isSelected && styles.timeTextActive,
                        ]}
                      >
                        {time}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* Duration */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Duração</Text>
            <View style={styles.durationContainer}>
              {[30, 45, 50, 60].map((mins) => {
                const isSelected = duration === mins;
                return (
                  <TouchableOpacity
                    key={mins}
                    style={[
                      styles.durationButton,
                      isSelected && styles.durationButtonActive,
                    ]}
                    onPress={() => setDuration(mins)}
                  >
                    <Text
                      style={[
                        styles.durationText,
                        isSelected && styles.durationTextActive,
                      ]}
                    >
                      {mins} min
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Observações (Opcional)</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Adicione observações sobre temas que gostaria de abordar..."
              placeholderTextColor="#94A3B8"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Payment Info */}
          {sessionPrice > 0 && (
            <View style={styles.paymentInfoCard}>
              <View style={styles.paymentInfoIcon}>
                <Ionicons name="card" size={24} color={theme.colors.primary} />
              </View>
              <View style={styles.paymentInfoContent}>
                <Text style={styles.paymentInfoTitle}>Pagamento Online</Text>
                <Text style={styles.paymentInfoText}>
                  {canReceivePayments
                    ? 'Após agendar, você será direcionado para o pagamento seguro via Stripe.'
                    : 'Pagamento online indisponível. Combine diretamente com o profissional.'}
                </Text>
              </View>
            </View>
          )}

          {/* Meeting Info */}
          <View style={styles.infoCard}>
            <View style={styles.infoIcon}>
              <Ionicons name="videocam" size={24} color={theme.colors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Google Meet Automático</Text>
              <Text style={styles.infoText}>
                Um link do Google Meet será criado automaticamente após a confirmação do pagamento
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Create Button */}
        <View
          style={[
            styles.footer,
            {
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          {/* Price Summary */}
          {sessionPrice > 0 && (
            <View style={styles.priceSummary}>
              <Text style={styles.priceSummaryLabel}>Total</Text>
              <Text style={styles.priceSummaryValue}>{formatCurrency(sessionPrice)}</Text>
            </View>
          )}
          
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreateAppointment}
            disabled={isCreating || !selectedTime}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={
                isCreating || !selectedTime
                  ? ['#94A3B8', '#94A3B8']
                  : [theme.colors.primary, '#8B5CF6']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.createButtonGradient}
            >
              {isCreating ? (
                <LoadingSpinner size={24} color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons 
                    name={canReceivePayments && sessionPrice > 0 ? "card" : "checkmark-circle"} 
                    size={24} 
                    color="#FFFFFF" 
                  />
                  <Text style={styles.createText}>
                    {canReceivePayments && sessionPrice > 0 ? 'Continuar para Pagamento' : 'Agendar Sessão'}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

const calendarStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 360,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  container: {
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navButton: {
    padding: 8,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.foreground,
  },
  weekDays: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    width: 40,
    textAlign: 'center',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  dayCellSelected: {
    backgroundColor: theme.colors.primary,
  },
  dayCellToday: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.foreground,
  },
  dayTextDisabled: {
    color: '#CBD5E1',
  },
  dayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  closeButton: {
    marginTop: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(107, 70, 193, 0.1)',
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.primary,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  background: {
    flex: 1,
  },
  backButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    gap: 24,
  },
  psychologistCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    ...Platform.select({
      ios: {
        shadowColor: '#6b46c1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  psychologistIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(107, 70, 193, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  psychologistInfo: {
    flex: 1,
  },
  psychologistName: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.foreground,
    marginBottom: 4,
  },
  psychologistCrp: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: 8,
  },
  priceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(107, 70, 193, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  priceText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  verifiedBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.foreground,
    marginBottom: 4,
  },
  dateCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  dateInfo: {
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
    textTransform: 'capitalize',
  },
  noTimesCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  noTimesText: {
    flex: 1,
    fontSize: 14,
    color: '#64748B',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeSlot: {
    width: '22%',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  timeSlotActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.foreground,
  },
  timeTextActive: {
    color: '#FFFFFF',
  },
  durationContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  durationButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  durationButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  durationText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.foreground,
  },
  durationTextActive: {
    color: '#FFFFFF',
  },
  notesInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    color: theme.colors.foreground,
    minHeight: 100,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  paymentInfoCard: {
    backgroundColor: 'rgba(107, 70, 193, 0.08)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(107, 70, 193, 0.15)',
  },
  paymentInfoIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(107, 70, 193, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentInfoContent: {
    flex: 1,
  },
  paymentInfoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.foreground,
    marginBottom: 4,
  },
  paymentInfoText: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  infoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  infoIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(107, 70, 193, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.foreground,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  priceSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  priceSummaryLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  priceSummaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.foreground,
  },
  createButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  createText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
