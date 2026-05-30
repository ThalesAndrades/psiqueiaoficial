/**
 * Grupo de rotas admin. Bloqueio de acesso aqui é redundante (cada tela
 * também checa) mas serve como guarda visual: se isAdmin = false, mostra
 * "acesso negado" e leva o usuário de volta.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { moderationService } from '../../services/moderationService';
import { useAuth } from '../../hooks/useAuth';
import { theme } from '../../constants/theme';

export default function AdminLayout() {
  const { user } = useAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!user) {
        if (!cancelled) {
          setIsAdmin(false);
          setChecking(false);
        }
        return;
      }
      const { data } = await moderationService.isAdmin();
      if (!cancelled) {
        setIsAdmin(data);
        setChecking(false);
      }
    }
    check();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (checking) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Acesso restrito</Text>
        <Text style={styles.body}>
          Esta área é exclusiva para moderadores da plataforma.
        </Text>
        <Text style={styles.link} onPress={() => router.replace('/(patient)')}>
          Voltar
        </Text>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="reports" options={{ title: 'Denúncias' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#FFFFFF' },
  title: { fontSize: 20, fontWeight: '700', color: theme.colors.foreground, marginBottom: 12 },
  body: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  link: { fontSize: 14, color: theme.colors.primary, fontWeight: '600' },
});
