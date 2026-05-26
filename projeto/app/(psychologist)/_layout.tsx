import { Tabs, useRouter } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { theme } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { LoadingSpinner } from '../../components';
import { AnimatedTabBar } from '../../components/ui/AnimatedTabBar';
import { useEffect } from 'react';

// P0: Validate tab configuration
const PSYCHOLOGIST_TABS = ['index', 'pacientes', 'agenda', 'perfil'] as const;

export default function PsychologistLayout() {
  const router = useRouter();
  const { userProfile, loading } = useAuth();
  
  // P0: Runtime validation in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[PsychologistLayout] Visible tabs:', PSYCHOLOGIST_TABS);
    if (PSYCHOLOGIST_TABS.includes('diario' as any)) {
      console.error('[PsychologistLayout] ERROR: diario should NOT be in psychologist tabs!');
    }
  }

  const wrongUserType = !!userProfile && userProfile.user_type !== 'psychologist';

  // Effect-based navigation — avoid router.replace() during render to prevent
  // ping-pong between layouts during transient profile updates.
  useEffect(() => {
    if (wrongUserType) {
      router.replace('/(patient)');
    }
  }, [wrongUserType, router]);

  if (loading || !userProfile || wrongUserType) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner size={40} color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
        }}
        tabBar={(props) => (
          <AnimatedTabBar 
            {...props} 
            visibleTabs={[...PSYCHOLOGIST_TABS]}
          />
        )}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Início',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="pacientes"
          options={{
            title: 'Pacientes',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="people" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="agenda"
          options={{
            title: 'Agenda',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="calendar" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="perfil"
          options={{
            title: 'Perfil',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-circle" size={size} color={color} />
            ),
          }}
        />

        {/* Hidden tabs - accessible via navigation */}
        <Tabs.Screen
          name="financeiro"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="editar-perfil"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="disponibilidade"
          options={{
            href: null,
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
});
