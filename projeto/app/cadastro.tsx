import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { FadeInView, LoadingSpinner, toastManager } from '../components';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function CadastroScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [invitationCode, setInvitationCode] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedType, setSelectedType] = useState<'patient' | 'psychologist'>('patient');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateForm = () => {
    if (!email || !password || !fullName || !invitationCode) {
      setError('Por favor, preencha todos os campos obrigatórios');
      return false;
    }

    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres');
      return false;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Email inválido');
      return false;
    }

    return true;
  };

  const handleRegister = useCallback(async () => {
    if (!validateForm()) {
      return;
    }

    setIsRegistering(true);
    setError(null);

    // Create user account
    const result = await signUp(email, password, selectedType, fullName, invitationCode.trim().toUpperCase(), phone);

    if (result.error) {
      setError(result.error);
      toastManager.show({ type: 'error', message: result.error });
      setIsRegistering(false);
    } else {
      toastManager.show({ type: 'success', message: 'Cadastro realizado com sucesso! Você já está logado.' });
      // Navigation will be handled by AuthContext
    }
  }, [email, password, confirmPassword, fullName, phone, selectedType, invitationCode, signUp]);

  return (
    <LinearGradient colors={['#0F172A', '#1E293B', '#312E81']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <FadeInView delay={0}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.logo}>PsiquèIA</Text>
            <Text style={styles.tagline}>Crie sua conta e comece sua jornada</Text>
          </View>
        </FadeInView>

        <FadeInView delay={100}>
          <View style={styles.card}>
            <Text style={styles.title}>Criar Conta</Text>

            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[styles.typeButton, selectedType === 'patient' && styles.typeButtonActive]}
                onPress={() => setSelectedType('patient')}
              >
                <Text style={[styles.typeButtonText, selectedType === 'patient' && styles.typeButtonTextActive]}>
                  Paciente
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeButton, selectedType === 'psychologist' && styles.typeButtonActive]}
                onPress={() => setSelectedType('psychologist')}
              >
                <Text style={[styles.typeButtonText, selectedType === 'psychologist' && styles.typeButtonTextActive]}>
                  Psicólogo
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Código de Convite *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="key-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Código fornecido pela equipe"
                  placeholderTextColor="#94A3B8"
                  value={invitationCode}
                  onChangeText={setInvitationCode}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Nome Completo *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Nome completo"
                  placeholderTextColor="#94A3B8"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email *</Text>
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
              <Text style={styles.inputLabel}>Telefone</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="call-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="(00) 00000-0000"
                  placeholderTextColor="#94A3B8"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Senha *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Mínimo 6 caracteres"
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

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Confirmar Senha *</Text>
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

            <TouchableOpacity 
              style={styles.registerButton} 
              onPress={handleRegister}
              disabled={isRegistering}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#3B82F6', '#2563EB', '#7C3AED']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.registerGradient}
              >
                {isRegistering ? (
                  <LoadingSpinner size={24} color="#FFFFFF" />
                ) : (
                  <Text style={styles.registerText}>Criar Conta</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </FadeInView>

        <FadeInView delay={200}>
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Já tem conta?{' '}
              <Text style={styles.footerLink} onPress={() => router.back()}>
                Fazer login
              </Text>
            </Text>
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
  logo: {
    fontSize: 48,
    fontWeight: '200',
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
    marginBottom: 24,
    textAlign: 'center',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
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
    marginBottom: 20,
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
  helpText: {
    fontSize: 11,
    fontWeight: '400',
    color: '#94A3B8',
    marginTop: 6,
    paddingHorizontal: 16,
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
  registerButton: {
    marginTop: 8,
  },
  registerGradient: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  registerText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  footer: {
    marginTop: 32,
    alignItems: 'center',
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
});
