import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { FadeInView, LoadingSpinner } from '../components';
import { toastManager } from '../components';
import { authService } from '../services/authService';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function EsqueciSenhaScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResetPassword = useCallback(async () => {
    if (!email) {
      setError('Por favor, digite seu email');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Email inválido');
      return;
    }

    setIsSending(true);
    setError(null);

    const result = await authService.resetPassword(email);

    setIsSending(false);

    if (result.error) {
      setError(result.error);
      toastManager.show({ type: 'error', message: result.error });
    } else {
      setEmailSent(true);
      toastManager.show({ type: 'success', message: 'Email de recuperação enviado! Verifique sua caixa de entrada.' });
    }
  }, [email]);

  if (emailSent) {
    return (
      <LinearGradient colors={['#0F172A', '#1E293B', '#312E81']} style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <FadeInView delay={0}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={styles.successIconContainer}>
                <Ionicons name="mail-outline" size={64} color="#06B6D4" />
              </View>
              <Text style={styles.logo}>Email Enviado</Text>
            </View>
          </FadeInView>

          <FadeInView delay={100}>
            <View style={styles.card}>
              <Text style={styles.successTitle}>Verifique seu email</Text>
              <Text style={styles.successMessage}>
                Enviamos instruções de recuperação de senha para:
              </Text>
              <Text style={styles.emailText}>{email}</Text>
              <Text style={styles.successMessage}>
                Siga as instruções no email para redefinir sua senha.
              </Text>

              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={20} color="#06B6D4" />
                <Text style={styles.infoText}>
                  Não recebeu o email? Verifique sua caixa de spam ou tente novamente em alguns minutos.
                </Text>
              </View>

              <TouchableOpacity 
                style={styles.backToLoginButton} 
                onPress={() => router.back()}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#3B82F6', '#2563EB', '#7C3AED']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.buttonText}>Voltar para Login</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </FadeInView>
        </ScrollView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#0F172A', '#1E293B', '#312E81']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <FadeInView delay={0}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.logo}>Recuperar Senha</Text>
            <Text style={styles.tagline}>Digite seu email para receber instruções</Text>
          </View>
        </FadeInView>

        <FadeInView delay={100}>
          <View style={styles.card}>
            <Text style={styles.title}>Esqueceu sua senha?</Text>
            <Text style={styles.description}>
              Sem problemas! Digite seu email e enviaremos instruções para redefinir sua senha.
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Digite seu email"
                  placeholderTextColor="#94A3B8"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoFocus
                />
              </View>
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity 
              style={styles.resetButton} 
              onPress={handleResetPassword}
              disabled={isSending}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#3B82F6', '#2563EB', '#7C3AED']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                {isSending ? (
                  <LoadingSpinner size={24} color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="mail-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.buttonText}>Enviar Instruções</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => router.back()}
            >
              <Text style={styles.cancelText}>Voltar para login</Text>
            </TouchableOpacity>
          </View>
        </FadeInView>

        <FadeInView delay={200}>
          <View style={styles.footer}>
            <View style={styles.secureInfo}>
              <Ionicons name="shield-checkmark" size={16} color="#06B6D4" />
              <Text style={styles.secureText}>Processo seguro e criptografado</Text>
            </View>
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
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 8,
  },
  successIconContainer: {
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
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    fontWeight: '400',
    color: '#CBD5E1',
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 20,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 14,
    fontWeight: '400',
    color: '#CBD5E1',
    marginBottom: 12,
    textAlign: 'center',
    lineHeight: 20,
  },
  emailText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#06B6D4',
    marginBottom: 24,
    textAlign: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '400',
    color: '#CBD5E1',
    lineHeight: 18,
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
  resetButton: {
    marginBottom: 16,
  },
  backToLoginButton: {
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
  footer: {
    marginTop: 32,
    alignItems: 'center',
  },
  secureInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  secureText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#CBD5E1',
  },
});
