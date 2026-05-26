import { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { theme } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { profileService } from '../../services';
import { LoadingSpinner } from '../../components';

export default function OnboardingPsychologist() {
  const router = useRouter();
  const { userProfile, refreshUserProfile } = useAuth();

  const handleComplete = async () => {
    if (!userProfile?.id) return;
    
    // Mark onboarding as completed
    const { data, error } = await profileService.updateUserProfile(userProfile.id, {
      onboarding_completed: true,
    });
    
    if (error) {
      console.error('Failed to complete onboarding:', error);
      return;
    }
    
    // Refresh profile to get updated onboarding_completed status
    await refreshUserProfile();
    
    // Navigate to psychologist dashboard
    router.replace('/(psychologist)');
  };

  const handleSkip = async () => {
    await handleComplete();
  };

  if (!userProfile) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner size={40} color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <LinearGradient
      colors={['#E8F0FE', '#F3F0FF', '#E0F7F7']}
      style={styles.container}
    >
      <Text style={styles.logo}>PsiquèIA</Text>

      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>Pular</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="briefcase" size={100} color={theme.colors.primary} />
          </View>
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.title}>Bem-vindo, Psicólogo!</Text>
          <Text style={styles.description}>
            Gerencie seu consultório de forma eficiente com ferramentas profissionais e insights em tempo real.
          </Text>
          
          <View style={styles.features}>
            <View style={styles.feature}>
              <Ionicons name="calendar" size={24} color={theme.colors.primary} />
              <Text style={styles.featureText}>Agenda completa e organizada</Text>
            </View>
            
            <View style={styles.feature}>
              <Ionicons name="people" size={24} color={theme.colors.primary} />
              <Text style={styles.featureText}>Gestão de pacientes</Text>
            </View>
            
            <View style={styles.feature}>
              <Ionicons name="wallet" size={24} color={theme.colors.primary} />
              <Text style={styles.featureText}>Controle financeiro</Text>
            </View>
            
            <View style={styles.feature}>
              <Ionicons name="videocam" size={24} color={theme.colors.primary} />
              <Text style={styles.featureText}>Sessões online integradas</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity onPress={handleComplete}>
          <LinearGradient
            colors={[theme.colors.primary, '#5B3BA1', theme.colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Começar</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </LinearGradient>
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
  },
  logo: {
    position: 'absolute',
    top: 24,
    left: 24,
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  skipButton: {
    position: 'absolute',
    top: 24,
    right: 24,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconCircle: {
    width: 200,
    height: 200,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.foreground,
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    fontWeight: '500',
    color: '#475569',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  features: {
    gap: 16,
    width: '100%',
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  featureText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.foreground,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 16,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
