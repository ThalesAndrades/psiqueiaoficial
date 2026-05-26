import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { FadeInView, LoadingSpinner, toastManager } from '../components';
import Ionicons from '@expo/vector-icons/Ionicons';
import { theme } from '../constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = useCallback(async () => {
    if (!email || !password) {
      setError('Por favor, preencha email e senha');
      return;
    }

    setIsLoggingIn(true);
    setError(null);
    
    const result = await signIn(email, password);
    
    if (result.error) {
      let errorMsg = result.error;
      if (errorMsg.includes('Invalid login credentials')) {
        errorMsg = 'Email ou senha incorretos';
      } else if (errorMsg.includes('Email not confirmed')) {
        errorMsg = 'Email não confirmado. Verifique sua caixa de entrada.';
      } else if (errorMsg.includes('User not found')) {
        errorMsg = 'Usuário não encontrado';
      }
      
      setError(errorMsg);
      toastManager.show({ type: 'error', message: errorMsg });
      setIsLoggingIn(false);
    } else {
      // Success - AuthContext will handle navigation via index.tsx
      toastManager.show({ type: 'success', message: 'Login realizado com sucesso!' });
    }
  }, [email, password, signIn]);

  return (
    <LinearGradient colors={['#0F172A', '#1E293B', '#312E81']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <FadeInView delay={0}>
          <View style={styles.header}>
            <Text style={styles.logo}>PsiquèIA</Text>
            <Text style={styles.tagline}>Transformando o cuidado em saúde mental</Text>
          </View>
        </FadeInView>

        <FadeInView delay={100}>
          <View style={styles.card}>
            <Text style={styles.title}>Bem-vindo de volta</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#94A3B8"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Senha</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Senha"
                  placeholderTextColor="#94A3B8"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                  <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity 
              style={styles.forgotButton}
              onPress={() => router.push('/esqueci-senha')}
            >
              <Text style={styles.forgotText}>Esqueceu a senha?</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.loginButton} 
              onPress={handleLogin}
              disabled={isLoggingIn}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#3B82F6', '#2563EB', '#7C3AED']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.loginGradient}
              >
                {isLoggingIn ? (
                  <LoadingSpinner size={24} color="#FFFFFF" />
                ) : (
                  <Text style={styles.loginText}>Entrar</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>


          </View>
        </FadeInView>

        <FadeInView delay={200}>
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Não tem conta?{' '}
              <Text style={styles.footerLink} onPress={() => router.push('/cadastro')}>Criar conta</Text>
            </Text>
            <View style={styles.secureInfo}>
              <Ionicons name="shield-checkmark" size={16} color="#06B6D4" />
              <Text style={styles.secureText}>Seguro e criptografado</Text>
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
    paddingTop: 48,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 64,
  },
  logo: {
    fontSize: 60,
    fontWeight: '200',
    color: '#60A5FA',
    marginBottom: 16,
  },
  tagline: {
    fontSize: 16,
    fontWeight: '300',
    color: '#CBD5E1',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 24,
    padding: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 32,
    textAlign: 'center',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  typeButtonActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    borderColor: '#3B82F6',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#CBD5E1',
    textAlign: 'center',
  },
  typeButtonTextActive: {
    color: '#FFFFFF',
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
    textTransform: 'uppercase' as const,
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
    fontSize: 16,
  },
  eyeIcon: {
    padding: 8,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#06B6D4',
  },
  loginButton: {
    marginBottom: 16,
  },
  loginGradient: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  loginText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: 'rgba(107, 70, 193, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(107, 70, 193, 0.2)',
    marginBottom: 32,
  },
  demoButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    gap: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  socialButton: {
    width: 56,
    height: 56,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    marginTop: 32,
    alignItems: 'center',
    gap: 24,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#CBD5E1',
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#06B6D4',
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
