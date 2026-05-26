import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { theme } from '../../constants/theme';
import { aiService, diaryService, analyticsService } from '../../services';
import { useAuth } from '../../hooks/useAuth';
import { useAppData } from '../../hooks/useAppData';
import { LoadingSpinner, FadeInView } from '../../components';

const moods = [
  { id: 'muito_bem', label: 'Muito Bem', icon: 'happy', color: '#10B981' },
  { id: 'bem', label: 'Bem', icon: 'happy-outline', color: '#059669' },
  { id: 'neutro', label: 'Neutro', icon: 'remove-circle', color: '#F59E0B' },
  { id: 'mal', label: 'Mal', icon: 'sad-outline', color: '#F97316' },
  { id: 'muito_mal', label: 'Muito Mal', icon: 'sad', color: '#EF4444' },
];

const emotions = [
  { id: 'feliz', label: 'Feliz', icon: 'happy', color: '#10B981' },
  { id: 'triste', label: 'Triste', icon: 'sad', color: '#3B82F6' },
  { id: 'ansioso', label: 'Ansioso', icon: 'alert-circle', color: '#F59E0B' },
  { id: 'calmo', label: 'Calmo', icon: 'leaf', color: '#14B8A6' },
  { id: 'irritado', label: 'Irritado', icon: 'flame', color: '#EF4444' },
  { id: 'motivado', label: 'Motivado', icon: 'flash', color: '#8B5CF6' },
];

export default function DiarioScreen() {
  const insets = useSafeAreaInsets();
  const { userProfile } = useAuth();
  const { refreshDiary } = useAppData();
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [diaryText, setDiaryText] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshDiary();
    }, [])
  );

  const toggleEmotion = (emotionId: string) => {
    setSelectedEmotions(prev =>
      prev.includes(emotionId)
        ? prev.filter(id => id !== emotionId)
        : [...prev, emotionId]
    );
  };

  const handleSaveDiary = async () => {
    if (!selectedMood && selectedEmotions.length === 0 && !diaryText.trim()) {
      Alert.alert('Atenção', 'Adicione pelo menos uma informação antes de salvar');
      return;
    }

    if (!userProfile?.id) {
      Alert.alert('Erro', 'Usuário não autenticado');
      return;
    }
    
    setLoading(true);
    const { error } = await diaryService.createEntry({
      patient_id: userProfile.id,
      mood: selectedMood || undefined,
      emotions: selectedEmotions,
      content: diaryText,
    });

    if (error) {
      Alert.alert('Erro', 'Não foi possível salvar o diário');
      setLoading(false);
      return;
    }

    // Track analytics
    await analyticsService.trackDiaryEntry(userProfile.id, selectedMood || undefined);
    
    Alert.alert('Sucesso', 'Diário salvo com sucesso!');
    
    // Reset form
    setSelectedMood(null);
    setSelectedEmotions([]);
    setDiaryText('');
    setAiAnalysis(null);
    setLoading(false);
  };

  const handleAIAnalysis = async () => {
    if (!selectedMood && selectedEmotions.length === 0 && !diaryText.trim()) {
      Alert.alert('Atenção', 'Adicione informações para analisar');
      return;
    }

    setLoadingAnalysis(true);
    const { data, error } = await aiService.analyzeMood([{
      mood: selectedMood,
      emotions: selectedEmotions,
      content: diaryText,
      date: new Date().toISOString(),
    }]);

    setLoadingAnalysis(false);

    if (error) {
      Alert.alert('Erro', 'Não foi possível gerar análise');
      return;
    }

    if (data) {
      setAiAnalysis(data.response);
      // Track AI chat usage
      if (userProfile?.id) {
        await analyticsService.trackAIChatMessage(userProfile.id);
      }
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#E8F4FF', '#F0E8FF', '#E0F7FA']} style={styles.background}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) + 70 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Mood Selection */}
          <FadeInView delay={0}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Como você está se sentindo?</Text>
              <View style={styles.moodGrid}>
                {moods.map((mood) => (
                  <TouchableOpacity
                    key={mood.id}
                    style={[
                      styles.moodCard,
                      selectedMood === mood.id && { borderColor: mood.color, borderWidth: 3 },
                    ]}
                    onPress={() => setSelectedMood(mood.id)}
                  >
                    <Ionicons name={mood.icon as any} size={32} color={mood.color} />
                    <Text style={[styles.moodLabel, selectedMood === mood.id && { fontWeight: '700' }]}>
                      {mood.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </FadeInView>

          {/* Emotion Selection */}
          <FadeInView delay={100}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Que emoções você está sentindo?</Text>
              <View style={styles.emotionGrid}>
                {emotions.map((emotion) => (
                  <TouchableOpacity
                    key={emotion.id}
                    style={[
                      styles.emotionChip,
                      selectedEmotions.includes(emotion.id) && {
                        backgroundColor: `${emotion.color}20`,
                        borderColor: emotion.color,
                        borderWidth: 2,
                      },
                    ]}
                    onPress={() => toggleEmotion(emotion.id)}
                  >
                    <Ionicons 
                      name={emotion.icon as any} 
                      size={18} 
                      color={selectedEmotions.includes(emotion.id) ? emotion.color : '#64748B'} 
                    />
                    <Text
                      style={[
                        styles.emotionLabel,
                        selectedEmotions.includes(emotion.id) && { 
                          color: emotion.color, 
                          fontWeight: '700' 
                        },
                      ]}
                    >
                      {emotion.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </FadeInView>

          {/* Diary Entry */}
          <FadeInView delay={200}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>O que aconteceu hoje?</Text>
              <TextInput
                style={styles.diaryInput}
                placeholder="Escreva sobre seu dia, seus pensamentos e sentimentos..."
                placeholderTextColor="#94A3B8"
                value={diaryText}
                onChangeText={setDiaryText}
                multiline
                numberOfLines={8}
                textAlignVertical="top"
              />
            </View>
          </FadeInView>

          {/* AI Analysis */}
          {aiAnalysis && (
            <FadeInView delay={0}>
              <View style={styles.analysisCard}>
                <View style={styles.analysisHeader}>
                  <View style={styles.aiIconSmall}>
                    <Ionicons name="sparkles" size={18} color={theme.colors.primary} />
                  </View>
                  <Text style={styles.analysisTitle}>Análise de IA</Text>
                </View>
                <Text style={styles.analysisText}>{aiAnalysis}</Text>
              </View>
            </FadeInView>
          )}

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.analyzeButton]} 
              onPress={handleAIAnalysis}
              disabled={loadingAnalysis}
            >
              {loadingAnalysis ? (
                <LoadingSpinner size={20} color={theme.colors.primary} />
              ) : (
                <>
                  <Ionicons name="sparkles" size={20} color={theme.colors.primary} />
                  <Text style={styles.analyzeText}>Analisar com IA</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, styles.saveButton]} 
              onPress={handleSaveDiary}
              disabled={loading}
            >
              {loading ? (
                <View style={styles.saveGradient}>
                  <LoadingSpinner size={20} color="#FFFFFF" />
                </View>
              ) : (
                <LinearGradient
                  colors={[theme.colors.primary, '#8B5CF6', '#14B8A6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.saveGradient}
                >
                  <Ionicons name="save" size={20} color="#FFFFFF" />
                  <Text style={styles.saveText}>Salvar</Text>
                </LinearGradient>
              )}
            </TouchableOpacity>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    gap: 24,
  },
  section: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.foreground,
    marginBottom: 16,
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  moodCard: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  moodLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.foreground,
    textAlign: 'center',
  },
  emotionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emotionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.3)',
  },
  emotionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  diaryInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.foreground,
    minHeight: 160,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
  },
  analyzeButton: {
    backgroundColor: 'rgba(107, 70, 193, 0.1)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(107, 70, 193, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  analyzeText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  saveButton: {},
  saveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
  },
  saveText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  analysisCard: {
    backgroundColor: 'rgba(107, 70, 193, 0.05)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(107, 70, 193, 0.1)',
    marginTop: 8,
  },
  analysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  aiIconSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(107, 70, 193, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  analysisTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.foreground,
  },
  analysisText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.foreground,
    lineHeight: 22,
  },
});
