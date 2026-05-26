import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { theme } from '../constants/theme';
import { FadeInView, LoadingSpinner } from '../components';
import { useAuth } from '../hooks/useAuth';

export default function SplashScreen() {
  const router = useRouter();
  const { user, userProfile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    // OPTIMIZED: Immediate navigation (no delay)
    console.log('[SplashScreen] Navigation logic - user:', !!user, 'profile:', !!userProfile);
    
    // Not authenticated - redirect to login
    if (!user) {
      console.log('[SplashScreen] No user, redirecting to login');
      router.replace('/login');
      return;
    }

    // Authenticated but profile still loading - wait for it
    if (!userProfile) {
      console.log('[SplashScreen] Waiting for profile to load...');
      // Profile will load in background, AuthContext will trigger re-render
      return;
    }

    console.log('[SplashScreen] Profile loaded:', userProfile.user_type, 'onboarding:', userProfile.onboarding_completed);

    // Check onboarding
    if (!userProfile.onboarding_completed) {
      if (userProfile.user_type === 'patient') {
        console.log('[SplashScreen] Redirecting to patient onboarding');
        router.replace('/(onboarding-patient)');
      } else if (userProfile.user_type === 'psychologist') {
        console.log('[SplashScreen] Redirecting to psychologist onboarding');
        router.replace('/(onboarding-psychologist)');
      } else {
        console.error('[SplashScreen] Invalid user_type:', userProfile.user_type);
        router.replace('/login');
      }
      return;
    }

    // Go to dashboard
    if (userProfile.user_type === 'patient') {
      console.log('[SplashScreen] Redirecting to patient dashboard');
      router.replace('/(patient)');
    } else if (userProfile.user_type === 'psychologist') {
      console.log('[SplashScreen] Redirecting to psychologist dashboard');
      router.replace('/(psychologist)');
    } else {
      console.error('[SplashScreen] Invalid user_type:', userProfile.user_type);
      router.replace('/login');
    }
  }, [user, userProfile, loading, router]);

  // P0: CRITICAL FIX - Timeout 6s (maior que signIn 5s) para evitar race condition
  useEffect(() => {
    if (!user || userProfile || loading) return;
    
    const timeout = setTimeout(() => {
      console.error('[SplashScreen] Profile load timeout after 6s - user:', user?.id);
      Alert.alert(
        'Erro ao Carregar',
        'Não foi possível carregar seus dados. Verifique sua conexão.',
        [
          { 
            text: 'Tentar Novamente', 
            onPress: () => {
              if (user) {
                console.log('[SplashScreen] Retrying profile load for user:', user.id);
                router.replace('/');
              }
            }
          },
          { 
            text: 'Sair', 
            onPress: () => {
              console.log('[SplashScreen] User chose to sign out');
              router.replace('/login');
            },
            style: 'cancel'
          }
        ]
      );
    }, 6000); // P0: CRITICAL - Increased to 6s (maior que signIn timeout de 5s)
    
    return () => clearTimeout(timeout);
  }, [user, userProfile, loading, router]);

  return (
    <LinearGradient
      colors={['#0F172A', '#1E293B', '#312E81']}
      style={styles.container}
    >
      <FadeInView delay={0} duration={800} style={styles.content}>
        <Text style={styles.logo}>PsiquèIA</Text>
        <FadeInView delay={400} duration={600}>
          <Text style={styles.tagline}>Transformando o cuidado em saúde mental</Text>
        </FadeInView>
        <View style={styles.loadingContainer}>
          <LoadingSpinner size={32} color="#60A5FA" />
        </View>
      </FadeInView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
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
    textAlign: 'center',
  },
  loadingContainer: {
    marginTop: 32,
  },
});
