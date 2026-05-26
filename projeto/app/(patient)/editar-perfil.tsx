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

interface PatientProfile {
  full_name: string;
  phone: string;
  birth_date: string;
  emergency_contact: string;
  emergency_phone: string;
}

export default function EditarPerfilPatientScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userProfile, refreshProfile } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<PatientProfile>({
    full_name: '',
    phone: '',
    birth_date: '',
    emergency_contact: '',
    emergency_phone: '',
  });

  useEffect(() => {
    loadProfile();
  }, [userProfile]);

  const loadProfile = async () => {
    if (!userProfile?.id) return;
    
    setLoading(true);
    try {
      // Carregar dados do perfil do usuário
      setProfile({
        full_name: userProfile.full_name || '',
        phone: userProfile.phone || '',
        birth_date: userProfile.birth_date || '',
        emergency_contact: '',
        emergency_phone: '',
      });

      // Carregar dados adicionais do perfil do paciente
      const { data } = await profileService.getPatientProfile(userProfile.id);
      if (data) {
        setProfile((prev) => ({
          ...prev,
          emergency_contact: data.emergency_contact || '',
          emergency_phone: data.emergency_phone || '',
        }));
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
    if (!profile.full_name.trim()) {
      toastManager.show({ type: 'error', message: 'O nome completo é obrigatório.' });
      return;
    }

    setSaving(true);
    try {
      // Atualizar perfil do usuário
      const { error: userError } = await profileService.updateUserProfile(userProfile.id, {
        full_name: profile.full_name.trim(),
        phone: profile.phone.trim(),
        birth_date: profile.birth_date || null,
      });

      if (userError) {
        toastManager.show({ type: 'error', message: userError });
        setSaving(false);
        return;
      }

      // Atualizar perfil do paciente
      const { error: patientError } = await profileService.updatePatientProfile(userProfile.id, {
        emergency_contact: profile.emergency_contact.trim(),
        emergency_phone: profile.emergency_phone.trim(),
      });

      if (patientError) {
        console.error('Error updating patient profile:', patientError);
        // Não bloquear se falhar a atualização do perfil do paciente
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

  const formatPhone = (text: string) => {
    // Remove tudo que não é número
    const numbers = text.replace(/\D/g, '');
    
    // Formata como (XX) XXXXX-XXXX
    if (numbers.length <= 2) {
      return numbers;
    } else if (numbers.length <= 7) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    } else if (numbers.length <= 11) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    }
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const formatDate = (text: string) => {
    // Remove tudo que não é número
    const numbers = text.replace(/\D/g, '');
    
    // Formata como DD/MM/AAAA
    if (numbers.length <= 2) {
      return numbers;
    } else if (numbers.length <= 4) {
      return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
    } else if (numbers.length <= 8) {
      return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4)}`;
    }
    return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
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
          headerTitle: 'Editar Perfil',
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
          {/* Nome Completo */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nome Completo *</Text>
            <TextInput
              style={styles.input}
              placeholder="Seu nome completo"
              placeholderTextColor="#94A3B8"
              value={profile.full_name}
              onChangeText={(text) => setProfile((prev) => ({ ...prev, full_name: text }))}
            />
          </View>

          {/* Telefone */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Telefone</Text>
            <TextInput
              style={styles.input}
              placeholder="(00) 00000-0000"
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
              value={profile.phone}
              onChangeText={(text) => setProfile((prev) => ({ ...prev, phone: formatPhone(text) }))}
            />
          </View>

          {/* Data de Nascimento */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Data de Nascimento</Text>
            <TextInput
              style={styles.input}
              placeholder="DD/MM/AAAA"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              value={profile.birth_date}
              onChangeText={(text) => setProfile((prev) => ({ ...prev, birth_date: formatDate(text) }))}
            />
          </View>

          {/* Contato de Emergência */}
          <View style={styles.sectionHeader}>
            <Ionicons name="alert-circle" size={20} color="#F59E0B" />
            <Text style={styles.sectionHeaderTitle}>Contato de Emergência</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Estas informações serão utilizadas apenas em caso de emergência durante as sessões.
          </Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nome do Contato</Text>
            <TextInput
              style={styles.input}
              placeholder="Nome do contato de emergência"
              placeholderTextColor="#94A3B8"
              value={profile.emergency_contact}
              onChangeText={(text) => setProfile((prev) => ({ ...prev, emergency_contact: text }))}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Telefone do Contato</Text>
            <TextInput
              style={styles.input}
              placeholder="(00) 00000-0000"
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
              value={profile.emergency_phone}
              onChangeText={(text) => setProfile((prev) => ({ ...prev, emergency_phone: formatPhone(text) }))}
            />
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
    gap: 20,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.foreground,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.foreground,
  },
  sectionDescription: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
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
