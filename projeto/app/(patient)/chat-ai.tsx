import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { theme } from '../../constants/theme';
import { AIChat } from '../../components/ai/AIChat';

export default function AIChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: () => (
            <View style={styles.headerTitle}>
              <View style={styles.aiIcon}>
                <Ionicons name="sparkles" size={20} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.headerTitleText}>PsiquèIA</Text>
                <Text style={styles.headerSubtitle}>Assistente de Bem-Estar</Text>
              </View>
            </View>
          ),
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.foreground} />
            </TouchableOpacity>
          ),
          headerStyle: {
            backgroundColor: '#FFFFFF',
          },
          headerShadowVisible: true,
        }}
      />
      
      <AIChat
        placeholder="Digite sua mensagem..."
        welcomeMessage="Olá! Sou a PsiquèIA, sua assistente de bem-estar emocional. Estou aqui para apoiar você entre as sessões, oferecer insights sobre seu progresso e ajudar com técnicas de autocuidado. Como posso ajudar você hoje?"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aiIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitleText: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.foreground,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  backButton: {
    padding: 8,
  },
});
