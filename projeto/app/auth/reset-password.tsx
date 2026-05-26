import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { FadeInView, LoadingSpinner } from '../../components';
import { toastManager } from '../../components';
import { authService } from '../../services/authService';
import Ionicons from '@expo/vector-icons/Ionicons';
import { supabase } from '../../lib/supabase';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasValidToken, setHasValidToken] = useState(false);

  useEffect(() => {
    // Check if we have a valid recovery token in the URL
    const checkRecoveryToken = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        // If there's a session and it's a recovery session, we're good
        if (session) {
          setHasValidToken(true);
        } else {
          // No valid session, show error
          setError('Link de recuperação inválido ou expirado. Solicite um novo link.');
        }
      } catch (err) {
        console.error('Error checking recovery token:', err);
        setError('Erro ao verificar token de recuperação.');
      }
    };

    checkRecoveryToken();
  }, [params]);

  const handleResetPassword = useCallback(async () => {
    if (!newPassword || !confirmPassword) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    if (newPassword.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    if (!hasValidToken) {
      setError('Sessão inválida. Solicite um novo link de recuperação.');
      return;
    }

    setIsUpdating(true);
    setError(null);

    const result = await authService.updatePassword(newPassword);

    setIsUpdating(false);

    if (result.error) {
      setError(result.error);
      toastManager.show({ type: 'error', message: result.error });
    } else {
      toastManager.show({ type: 'success', message: 'Senha atualizada com sucesso!' });
      
      // Wait a bit and redirect to login
      setTimeout(() => {
        router.replace('/login');
      }, 1500);
    }
  }, [newPassword, confirmPassword, hasValidToken, router]);

  return (
    <LinearGradient colors={['#0F172A', '#1E293B', '#312E81']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <FadeInView delay={0}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="key-outline" size={64} color="#06B6D4" />
            </View>
            <Text style={styles.logo}>Redefinir Senha</Text>
            <Text style={styles.tagline}>Crie uma nova senha segura</Text>
          </View>
        </FadeInView>

        <FadeInView delay={100}>
          <View style={styles.card}>
            {!hasValidToken && error ? (
              <>
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={20} color="#EF4444" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
                
                <TouchableOpacity 
                  style={styles.backButton} 
                  onPress={() => router.replace('/esqueci-senha')}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#3B82F6', '#2563EB', '#7C3AED']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.buttonGradient}
                  >
                    <Text style={styles.buttonText}>Solicitar Novo Link</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.description}>
                  Digite sua nova senha abaixo. Certifique-se de que é forte e fácil de lembrar.
                </Text>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Nova Senha</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Mínimo 6 caracteres"
                      placeholderTextColor="#94A3B8"
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={!showNewPassword}
                      autoFocus
                    />
                    <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={styles.eyeIcon}>
                      <Ionicons name={showNewPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#94A3B8" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Confirmar Nova Senha</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Digite a senha novamente"
                      placeholderTextColor="#94A3B8"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirmPassword}
                    />
                    <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                      <Ionicons name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#94A3B8" />
                    </TouchableOpacity>
                  </View>
                </View>

                {error && (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={16} color="#EF4444" />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                <View style={styles.securityTips}>
                  <Text style={styles.securityTitle}>Dicas de Segurança:</Text>
                  <View style={styles.tipRow}>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    <Text style={styles.tipText}>Use pelo menos 8 caracteres</Text>
                  </View>
                  <View style={styles.tipRow}>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    <Text style={styles.tipText}>Combine letras, números e símbolos</Text>
                  </View>
                  <View style={styles.tipRow}>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    <Text style={styles.tipText}>Não use informações pessoais</Text>
                  </View>
                </View>

                <TouchableOpacity 
                  style={styles.resetButton} 
                  onPress={handleResetPassword}
                  disabled={isUpdating}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#3B82F6', '#2563EB', '#7C3AED']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.buttonGradient}
                  >
                    {isUpdating ? (
                      <LoadingSpinner size={24} color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                        <Text style={styles.buttonText}>Atualizar Senha</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => router.replace('/login')}
                >
                  <Text style={styles.cancelText}>Voltar para login</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </FadeInView>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: Platform.select({ ios: 60, android: 48, default: 48 }),
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  logo: {
    fontSize: 32,
    fontWeight: '600',
    color: '#60A5FA',
    marginBottom: 12,
  },
  tagline: {
    fontSize: 15,
    fontWeight: '300',
    color: '#CBD5E1',
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 24,
    padding: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  description: {
    fontSize: 14,
    fontWeight: '400',
    color: '#CBD5E1',
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E2E8F0',
    marginBottom: 8,
    paddingHorizontal: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
    flex: 1,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    color: '#FFFFFF',
    fontSize: 15,
  },
  eyeIcon: {
    padding: 8,
  },
  securityTips: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  securityTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#60A5FA',
    marginBottom: 12,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  tipText: {
    fontSize: 12,
    fontWeight: '400',
    color: '#CBD5E1',
  },
  resetButton: {
    marginBottom: 16,
  },
  backButton: {
    marginTop: 8,
  },
  buttonGradient: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94A3B8',
  },
});
