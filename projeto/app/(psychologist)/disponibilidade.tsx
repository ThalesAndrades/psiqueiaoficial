import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, Switch } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { theme } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { profileService } from '../../services';
import { LoadingSpinner } from '../../components';
import { toastManager } from '../../components/ui/Toast';

interface DaySchedule {
  enabled: boolean;
  startTime: string;
  endTime: string;
}

interface WeekSchedule {
  [key: string]: DaySchedule;
}

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Segunda-feira', short: 'Seg' },
  { key: 'tuesday', label: 'Terça-feira', short: 'Ter' },
  { key: 'wednesday', label: 'Quarta-feira', short: 'Qua' },
  { key: 'thursday', label: 'Quinta-feira', short: 'Qui' },
  { key: 'friday', label: 'Sexta-feira', short: 'Sex' },
  { key: 'saturday', label: 'Sábado', short: 'Sáb' },
  { key: 'sunday', label: 'Domingo', short: 'Dom' },
];

const TIME_SLOTS = [
  '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
  '19:00', '19:30', '20:00', '20:30', '21:00',
];

const DEFAULT_SCHEDULE: WeekSchedule = {
  monday: { enabled: true, startTime: '08:00', endTime: '18:00' },
  tuesday: { enabled: true, startTime: '08:00', endTime: '18:00' },
  wednesday: { enabled: true, startTime: '08:00', endTime: '18:00' },
  thursday: { enabled: true, startTime: '08:00', endTime: '18:00' },
  friday: { enabled: true, startTime: '08:00', endTime: '18:00' },
  saturday: { enabled: false, startTime: '09:00', endTime: '13:00' },
  sunday: { enabled: false, startTime: '09:00', endTime: '13:00' },
};

export default function DisponibilidadeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userProfile, refreshProfile } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schedule, setSchedule] = useState<WeekSchedule>(DEFAULT_SCHEDULE);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  useEffect(() => {
    loadSchedule();
  }, [userProfile]);

  const loadSchedule = async () => {
    if (!userProfile?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await profileService.getPsychologistProfile(userProfile.id);
      
      if (data?.available_hours) {
        // Converter o formato do banco para o formato do componente
        const savedSchedule = data.available_hours as WeekSchedule;
        setSchedule({ ...DEFAULT_SCHEDULE, ...savedSchedule });
      }
    } catch (error) {
      console.error('Error loading schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!userProfile?.id) return;

    // Validar que pelo menos um dia está habilitado
    const hasEnabledDay = Object.values(schedule).some((day) => day.enabled);
    if (!hasEnabledDay) {
      Alert.alert('Erro', 'Você precisa habilitar pelo menos um dia de atendimento.');
      return;
    }

    // Validar horários
    for (const [dayKey, daySchedule] of Object.entries(schedule)) {
      if (daySchedule.enabled) {
        const startIndex = TIME_SLOTS.indexOf(daySchedule.startTime);
        const endIndex = TIME_SLOTS.indexOf(daySchedule.endTime);
        
        if (startIndex >= endIndex) {
          const dayLabel = DAYS_OF_WEEK.find((d) => d.key === dayKey)?.label || dayKey;
          Alert.alert('Erro', `O horário de início deve ser anterior ao horário de término em ${dayLabel}.`);
          return;
        }
      }
    }

    setSaving(true);
    try {
      const { error } = await profileService.updatePsychologistProfile(userProfile.id, {
        available_hours: schedule,
      });

      if (error) {
        Alert.alert('Erro', error);
        return;
      }

      toastManager.show({
        type: 'success',
        message: 'Disponibilidade atualizada com sucesso!',
      });

      if (refreshProfile) {
        await refreshProfile();
      }

      router.back();
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao salvar disponibilidade.');
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (dayKey: string) => {
    setSchedule((prev) => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        enabled: !prev[dayKey].enabled,
      },
    }));
  };

  const updateDayTime = (dayKey: string, field: 'startTime' | 'endTime', value: string) => {
    setSchedule((prev) => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        [field]: value,
      },
    }));
  };

  const copyToAllDays = (sourceDay: string) => {
    const source = schedule[sourceDay];
    Alert.alert(
      'Copiar Horários',
      `Deseja copiar os horários de ${DAYS_OF_WEEK.find((d) => d.key === sourceDay)?.label} para todos os outros dias?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Copiar',
          onPress: () => {
            setSchedule((prev) => {
              const newSchedule = { ...prev };
              DAYS_OF_WEEK.forEach((day) => {
                if (day.key !== sourceDay) {
                  newSchedule[day.key] = {
                    ...newSchedule[day.key],
                    startTime: source.startTime,
                    endTime: source.endTime,
                  };
                }
              });
              return newSchedule;
            });
            toastManager.show({
              type: 'success',
              message: 'Horários copiados para todos os dias!',
            });
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner size={40} color={theme.colors.primary} />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Disponibilidade',
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerShadowVisible: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.foreground} />
            </TouchableOpacity>
          ),
        }}
      />

      <LinearGradient colors={['#F3F0FF', '#EBF3FF', '#E8F6F8']} style={styles.background}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Instruções */}
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={24} color={theme.colors.primary} />
            <Text style={styles.infoText}>
              Configure os dias e horários em que você está disponível para atendimento. Os pacientes só poderão agendar sessões dentro desses horários.
            </Text>
          </View>

          {/* Dias da Semana */}
          {DAYS_OF_WEEK.map((day) => {
            const daySchedule = schedule[day.key];
            const isExpanded = expandedDay === day.key;

            return (
              <View key={day.key} style={styles.dayCard}>
                <TouchableOpacity
                  style={styles.dayHeader}
                  onPress={() => setExpandedDay(isExpanded ? null : day.key)}
                  activeOpacity={0.7}
                >
                  <View style={styles.dayInfo}>
                    <Switch
                      value={daySchedule.enabled}
                      onValueChange={() => toggleDay(day.key)}
                      trackColor={{ false: '#E2E8F0', true: 'rgba(107, 70, 193, 0.3)' }}
                      thumbColor={daySchedule.enabled ? theme.colors.primary : '#94A3B8'}
                    />
                    <Text style={[styles.dayLabel, !daySchedule.enabled && styles.dayLabelDisabled]}>
                      {day.label}
                    </Text>
                  </View>
                  <View style={styles.dayRight}>
                    {daySchedule.enabled && (
                      <Text style={styles.dayTime}>
                        {daySchedule.startTime} - {daySchedule.endTime}
                      </Text>
                    )}
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color="#94A3B8"
                    />
                  </View>
                </TouchableOpacity>

                {isExpanded && daySchedule.enabled && (
                  <View style={styles.dayContent}>
                    <View style={styles.timeRow}>
                      <View style={styles.timeField}>
                        <Text style={styles.timeLabel}>Início</Text>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          style={styles.timeScroll}
                        >
                          {TIME_SLOTS.map((time) => (
                            <TouchableOpacity
                              key={time}
                              style={[
                                styles.timeChip,
                                daySchedule.startTime === time && styles.timeChipSelected,
                              ]}
                              onPress={() => updateDayTime(day.key, 'startTime', time)}
                            >
                              <Text
                                style={[
                                  styles.timeChipText,
                                  daySchedule.startTime === time && styles.timeChipTextSelected,
                                ]}
                              >
                                {time}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    </View>

                    <View style={styles.timeRow}>
                      <View style={styles.timeField}>
                        <Text style={styles.timeLabel}>Término</Text>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          style={styles.timeScroll}
                        >
                          {TIME_SLOTS.map((time) => (
                            <TouchableOpacity
                              key={time}
                              style={[
                                styles.timeChip,
                                daySchedule.endTime === time && styles.timeChipSelected,
                              ]}
                              onPress={() => updateDayTime(day.key, 'endTime', time)}
                            >
                              <Text
                                style={[
                                  styles.timeChipText,
                                  daySchedule.endTime === time && styles.timeChipTextSelected,
                                ]}
                              >
                                {time}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.copyButton}
                      onPress={() => copyToAllDays(day.key)}
                    >
                      <Ionicons name="copy-outline" size={16} color={theme.colors.primary} />
                      <Text style={styles.copyButtonText}>Copiar para todos os dias</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>

        {/* Save Button */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={saving ? ['#94A3B8', '#94A3B8'] : [theme.colors.primary, '#8B5CF6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveButtonGradient}
            >
              {saving ? (
                <LoadingSpinner size={24} color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Salvar Disponibilidade</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
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
    gap: 16,
  },
  infoCard: {
    backgroundColor: 'rgba(107, 70, 193, 0.08)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(107, 70, 193, 0.15)',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  dayCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  dayInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dayLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.foreground,
  },
  dayLabelDisabled: {
    color: '#94A3B8',
  },
  dayRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayTime: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.primary,
  },
  dayContent: {
    padding: 16,
    paddingTop: 0,
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  timeRow: {
    gap: 8,
  },
  timeField: {
    gap: 8,
  },
  timeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  timeScroll: {
    flexGrow: 0,
  },
  timeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  timeChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  timeChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.foreground,
  },
  timeChipTextSelected: {
    color: '#FFFFFF',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: 'rgba(107, 70, 193, 0.08)',
    borderRadius: 8,
  },
  copyButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
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
  saveButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
