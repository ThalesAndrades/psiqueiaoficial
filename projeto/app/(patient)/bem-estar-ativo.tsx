import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { ActivityPermissionDisclosure } from '../../components/activity/ActivityPermissionDisclosure';
import { activityService } from '../../services/activityService';
import { LoadingSpinner, FadeInView } from '../../components';
import { useAppData } from '../../hooks/useAppData';
import { toastManager } from '../../components/ui/Toast';

export default function BemEstarAtivoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { patientDiaryEntries } = useAppData();
  const [showDisclosure, setShowDisclosure] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activityData, setActivityData] = useState<any[]>([]);
  const [correlations, setCorrelations] = useState<any[]>([]);

  useEffect(() => {
    checkPermissionStatus();
  }, []);

  const checkPermissionStatus = async () => {
    const granted = await activityService.checkPermission();
    setHasPermission(granted);

    if (granted) {
      loadActivityData();
    }
  };

  const loadActivityData = async () => {
    setLoading(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 7);

      const data = await activityService.getActivityData(startDate, endDate);
      setActivityData(data);

      // Correlate with mood
      const correlationData = await activityService.correlateWithMood(
        data,
        patientDiaryEntries
      );
      setCorrelations(correlationData);
    } catch (error) {
      console.error('Error loading activity data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptPermission = async () => {
    setShowDisclosure(false);
    setLoading(true);

    const granted = await activityService.requestPermission();
    
    if (granted) {
      setHasPermission(true);
      Alert.alert(
        'Permissão Concedida',
        'Agora você pode acompanhar a correlação entre atividade física e bem-estar emocional!',
        [{ text: 'OK', onPress: () => loadActivityData() }]
      );
    } else {
      toastManager.show({
        type: 'info',
        message: 'Permissão Negada: Você pode ativar essa permissão a qualquer momento nas configurações do aplicativo.',
      });
    }

    setLoading(false);
  };

  const handleDeclinePermission = () => {
    setShowDisclosure(false);
    toastManager.show({
      type: 'info',
      message: 'Funcionalidade Desativada: Você pode ativar o Bem-Estar Ativo a qualquer momento através do botão "Ativar".',
    });
  };

  const getActivityIcon = (type: string) => {
    const icons: Record<string, string> = {
      walking: 'walk',
      running: 'run',
      cycling: 'bicycle',
      resting: 'bed',
      unknown: 'help-circle',
    };
    return icons[type] || 'help-circle';
  };

  const getMoodColor = (mood: string | null) => {
    if (!mood) return '#94A3B8';
    const colors: Record<string, string> = {
      muito_feliz: '#10B981',
      feliz: '#34D399',
      neutro: '#F59E0B',
      triste: '#F97316',
      muito_triste: '#EF4444',
    };
    return colors[mood] || '#94A3B8';
  };

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#F3F0FF', '#EBF3FF', '#E8F6F8']} style={styles.background}>
          <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.foreground} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Bem-Estar Ativo</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: Math.max(insets.bottom, 16) },
            ]}
          >
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <MaterialCommunityIcons name="walk" size={80} color={theme.colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>Funcionalidade Desativada</Text>
              <Text style={styles.emptyDesc}>
                Ative o Bem-Estar Ativo para visualizar como sua atividade física
                impacta seu humor e bem-estar emocional.
              </Text>
              <TouchableOpacity
                style={styles.activateButton}
                onPress={() => setShowDisclosure(true)}
              >
                <Text style={styles.activateButtonText}>Ativar Bem-Estar Ativo</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          <Modal
            visible={showDisclosure}
            animationType="slide"
            onRequestClose={() => setShowDisclosure(false)}
          >
            <ActivityPermissionDisclosure
              onAccept={handleAcceptPermission}
              onDecline={handleDeclinePermission}
            />
          </Modal>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#F3F0FF', '#EBF3FF', '#E8F6F8']} style={styles.background}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.foreground} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Bem-Estar Ativo</Text>
          <TouchableOpacity onPress={loadActivityData} disabled={loading}>
            <Ionicons name="refresh" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <LoadingSpinner size={40} color={theme.colors.primary} />
            <Text style={styles.loadingText}>Carregando dados de atividade...</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: Math.max(insets.bottom, 16) },
            ]}
          >
            <FadeInView>
              <Text style={styles.sectionTitle}>Últimos 7 dias</Text>
              <Text style={styles.sectionDesc}>
                Correlação entre atividade física e bem-estar emocional
              </Text>
            </FadeInView>

            {correlations.map((item, index) => (
              <FadeInView key={index} delay={index * 50}>
                <View style={styles.correlationCard}>
                  <View style={styles.correlationHeader}>
                    <View style={styles.dateContainer}>
                      <Text style={styles.dateText}>
                        {new Date(item.date).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.moodIndicator,
                        { backgroundColor: getMoodColor(item.mood) },
                      ]}
                    />
                  </View>

                  <View style={styles.correlationContent}>
                    <View style={styles.activityInfo}>
                      <MaterialCommunityIcons
                        name={getActivityIcon(item.activityType)}
                        size={32}
                        color={theme.colors.primary}
                      />
                      <View style={styles.activityDetails}>
                        <Text style={styles.stepsText}>{item.steps.toLocaleString('pt-BR')} passos</Text>
                        <Text style={styles.activityTypeText}>
                          {item.activityType === 'walking' && 'Caminhada'}
                          {item.activityType === 'running' && 'Corrida'}
                          {item.activityType === 'cycling' && 'Ciclismo'}
                          {item.activityType === 'resting' && 'Repouso'}
                        </Text>
                      </View>
                    </View>

                    {item.hasCorrelation ? (
                      <View style={styles.moodInfo}>
                        <Text style={styles.moodLabel}>Humor registrado:</Text>
                        <Text style={[styles.moodValue, { color: getMoodColor(item.mood) }]}>
                          {item.mood === 'muito_feliz' && 'Muito Feliz'}
                          {item.mood === 'feliz' && 'Feliz'}
                          {item.mood === 'neutro' && 'Neutro'}
                          {item.mood === 'triste' && 'Triste'}
                          {item.mood === 'muito_triste' && 'Muito Triste'}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.noMoodInfo}>
                        <Text style={styles.noMoodText}>Sem registro de humor</Text>
                      </View>
                    )}
                  </View>
                </View>
              </FadeInView>
            ))}

            {correlations.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>Nenhum dado disponível</Text>
                <Text style={styles.emptyDesc}>
                  Comece a registrar suas atividades e humor para ver correlações.
                </Text>
              </View>
            )}
          </ScrollView>
        )}
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
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.foreground,
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
    marginBottom: 24,
    paddingHorizontal: 32,
    lineHeight: 20,
  },
  activateButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  activateButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.foreground,
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: 16,
  },
  correlationCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  correlationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateContainer: {
    backgroundColor: 'rgba(107, 70, 193, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
    textTransform: 'capitalize',
  },
  moodIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  correlationContent: {
    gap: 12,
  },
  activityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activityDetails: {
    flex: 1,
  },
  stepsText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.foreground,
  },
  activityTypeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  moodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  moodLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  moodValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  noMoodInfo: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  noMoodText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94A3B8',
    fontStyle: 'italic',
  },
});
