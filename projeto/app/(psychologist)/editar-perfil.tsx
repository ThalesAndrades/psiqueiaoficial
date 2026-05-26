import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { theme } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { profileService } from '../../services';
import { LoadingSpinner } from '../../components';
import { toastManager } from '../../components/ui/Toast';

interface PsychologistProfile {
  crp: string;
  bio: string;
  specializations: string[];
  session_price: number;
  session_duration: number;
  approach: string;
}

const SPECIALIZATIONS_OPTIONS = [
  'Ansiedade',
  'Depressão',
  'Terapia de Casal',
  'Terapia Familiar',
  'Transtornos Alimentares',
  'TDAH',
  'Autismo',
  'Traumas',
  'Luto',
  'Fobias',
  'TOC',
  'Burnout',
  'Autoestima',
  'Relacionamentos',
  'Carreira',
  'Infância e Adolescência',
];

const APPROACH_OPTIONS = [
  'Terapia Cognitivo-Comportamental (TCC)',
  'Psicanálise',
  'Psicologia Analítica (Jung)',
  'Gestalt-terapia',
  'Terapia Humanista',
  'Terapia Sistêmica',
  'Terapia Comportamental',
  'EMDR',
  'Mindfulness',
  'Outra',
];

export default function EditarPerfilScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userProfile, refreshProfile } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<PsychologistProfile>({
    crp: '',
    bio: '',
    specializations: [],
    session_price: 0,
    session_duration: 50,
    approach: '',
  });
  const [showSpecializations, setShowSpecializations] = useState(false);
  const [showApproach, setShowApproach] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [userProfile]);

  const loadProfile = async () => {
    if (!userProfile?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await profileService.getPsychologistProfile(userProfile.id);
      
      if (data) {
        setProfile({
          crp: data.crp || '',
          bio: data.bio || '',
          specializations: data.specializations || [],
          session_price: data.session_price || 0,
          session_duration: data.session_duration || 50,
          approach: data.approach || '',
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!userProfile?.id) return;

    // Validações
    if (!profile.crp.trim()) {
      toastManager.show({ type: 'error', message: 'O número do CRP é obrigatório.' });
      return;
    }

    if (profile.session_price <= 0) {
      toastManager.show({ type: 'error', message: 'O valor da sessão deve ser maior que zero.' });
      return;
    }

    if (profile.specializations.length === 0) {
      toastManager.show({ type: 'error', message: 'Selecione pelo menos uma especialização.' });
      return;
    }

    setSaving(true);
    try {
      const { error } = await profileService.updatePsychologistProfile(userProfile.id, {
        crp: profile.crp.trim(),
        bio: profile.bio.trim(),
        specializations: profile.specializations,
        session_price: profile.session_price,
        session_duration: profile.session_duration,
        approach: profile.approach,
      });

      if (error) {
        toastManager.show({ type: 'error', message: error });
        return;
      }

      toastManager.show({
        type: 'success',
        message: 'Perfil atualizado com sucesso!',
      });

      // Atualizar o perfil no contexto
      if (refreshProfile) {
        await refreshProfile();
      }

      router.back();
    } catch (error: any) {
      toastManager.show({ type: 'error', message: error.message || 'Erro ao salvar perfil.' });
    } finally {
      setSaving(false);
    }
  };

  const toggleSpecialization = (spec: string) => {
    setProfile((prev) => {
      const exists = prev.specializations.includes(spec);
      if (exists) {
        return {
          ...prev,
          specializations: prev.specializations.filter((s) => s !== spec),
        };
      } else {
        return {
          ...prev,
          specializations: [...prev.specializations, spec],
        };
      }
    });
  };

  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
          headerTitle: 'Editar Perfil Profissional',
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
          {/* CRP */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Número do CRP *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 06/123456"
              placeholderTextColor="#94A3B8"
              value={profile.crp}
              onChangeText={(text) => setProfile((prev) => ({ ...prev, crp: text }))}
            />
          </View>

          {/* Valor da Sessão */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Valor da Sessão (R$) *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 150.00"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              value={profile.session_price > 0 ? profile.session_price.toString() : ''}
              onChangeText={(text) => {
                const value = parseFloat(text.replace(',', '.')) || 0;
                setProfile((prev) => ({ ...prev, session_price: value }));
              }}
            />
            <Text style={styles.helperText}>
              Este valor será cobrado dos pacientes ao agendar sessões.
            </Text>
          </View>

          {/* Duração da Sessão */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Duração da Sessão</Text>
            <View style={styles.durationContainer}>
              {[30, 45, 50, 60].map((mins) => {
                const isSelected = profile.session_duration === mins;
                return (
                  <TouchableOpacity
                    key={mins}
                    style={[styles.durationButton, isSelected && styles.durationButtonActive]}
                    onPress={() => setProfile((prev) => ({ ...prev, session_duration: mins }))}
                  >
                    <Text style={[styles.durationText, isSelected && styles.durationTextActive]}>
                      {mins} min
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Abordagem */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Abordagem Terapêutica</Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setShowApproach(!showApproach)}
            >
              <Text style={profile.approach ? styles.selectButtonText : styles.selectButtonPlaceholder}>
                {profile.approach || 'Selecione sua abordagem'}
              </Text>
              <Ionicons
                name={showApproach ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#94A3B8"
              />
            </TouchableOpacity>
            {showApproach && (
              <View style={styles.optionsContainer}>
                {APPROACH_OPTIONS.map((approach) => (
                  <TouchableOpacity
                    key={approach}
                    style={[
                      styles.optionItem,
                      profile.approach === approach && styles.optionItemSelected,
                    ]}
                    onPress={() => {
                      setProfile((prev) => ({ ...prev, approach }));
                      setShowApproach(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        profile.approach === approach && styles.optionTextSelected,
                      ]}
                    >
                      {approach}
                    </Text>
                    {profile.approach === approach && (
                      <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Especializações */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Especializações *</Text>
            <Text style={styles.helperText}>
              Selecione as áreas em que você atua ({profile.specializations.length} selecionadas)
            </Text>
            <View style={styles.tagsContainer}>
              {SPECIALIZATIONS_OPTIONS.map((spec) => {
                const isSelected = profile.specializations.includes(spec);
                return (
                  <TouchableOpacity
                    key={spec}
                    style={[styles.tag, isSelected && styles.tagSelected]}
                    onPress={() => toggleSpecialization(spec)}
                  >
                    <Text style={[styles.tagText, isSelected && styles.tagTextSelected]}>
                      {spec}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Bio */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sobre Você</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Conte um pouco sobre sua experiência, formação e como você trabalha..."
              placeholderTextColor="#94A3B8"
              value={profile.bio}
              onChangeText={(text) => setProfile((prev) => ({ ...prev, bio: text }))}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{profile.bio.length}/500 caracteres</Text>
          </View>
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
                  <Text style={styles.saveButtonText}>Salvar Alterações</Text>
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
    gap: 24,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.foreground,
  },
  helperText: {
    fontSize: 13,
    color: '#64748B',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: theme.colors.foreground,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  textArea: {
    minHeight: 120,
  },
  charCount: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'right',
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
  selectButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  selectButtonText: {
    fontSize: 16,
    color: theme.colors.foreground,
  },
  selectButtonPlaceholder: {
    fontSize: 16,
    color: '#94A3B8',
  },
  optionsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    marginTop: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  optionItem: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  optionItemSelected: {
    backgroundColor: 'rgba(107, 70, 193, 0.1)',
  },
  optionText: {
    fontSize: 15,
    color: theme.colors.foreground,
  },
  optionTextSelected: {
    fontWeight: '600',
    color: theme.colors.primary,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  tag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  tagSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  tagText: {
    fontSize: 14,
    color: theme.colors.foreground,
  },
  tagTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
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
