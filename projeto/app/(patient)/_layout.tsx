import { Tabs, useRouter } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { theme } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { LoadingSpinner } from '../../components';
import { AnimatedTabBar } from '../../components/ui/AnimatedTabBar';
import { useEffect } from 'react';

export default function PatientLayout() {
  const router = useRouter();
  const { userProfile, loading } = useAuth();

  const wrongUserType = !!userProfile && userProfile.user_type !== 'patient';

  // Navigation is a side effect — move it out of the render path. Render-time
  // router.replace() races with parent re-renders and can ping-pong between
  // patient/psychologist layouts when refreshProfile briefly nulls userProfile.
  useEffect(() => {
    if (wrongUserType) {
      router.replace('/(psychologist)');
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
            visibleTabs={['index', 'diario', 'agenda', 'perfil']} 
          />
        )}
      >
        {/* Main Tabs - 4 principais para melhor UX mobile */}
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
          name="diario"
          options={{
            title: 'Diário',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="journal" size={size} color={color} />
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

        {/* Hidden tabs - accessible via dashboard/navigation */}
        <Tabs.Screen
          name="nova-sessao"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="plano"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="chat-ai"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="documentos"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="payment"
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
          name="bem-estar-ativo"
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
