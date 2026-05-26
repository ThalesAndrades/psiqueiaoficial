import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';

interface ActivityPermissionDisclosureProps {
  onAccept: () => void;
  onDecline: () => void;
}

export function ActivityPermissionDisclosure({
  onAccept,
  onDecline,
}: ActivityPermissionDisclosureProps) {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons
          name="walk"
          size={64}
          color={theme.colors.primary}
        />
        <Text style={styles.title}>
          Conecte seu bem-estar físico e mental
        </Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.subtitle}>Por que precisamos disso?</Text>
        <Text style={styles.description}>
          O PsiquèIA gostaria de acessar os dados de reconhecimento de atividade
          do seu dispositivo (como caminhada, corrida ou repouso) para ajudar você
          a entender como sua atividade física impacta seu bem-estar emocional.
        </Text>

        <View style={styles.benefitsContainer}>
          <Text style={styles.benefitsTitle}>Benefícios:</Text>

          <View style={styles.benefit}>
            <MaterialCommunityIcons
              name="chart-line"
              size={24}
              color={theme.colors.primary}
            />
            <Text style={styles.benefitText}>
              Visualize correlações entre atividade e humor
            </Text>
          </View>

          <View style={styles.benefit}>
            <MaterialCommunityIcons
              name="lightbulb-on"
              size={24}
              color={theme.colors.primary}
            />
            <Text style={styles.benefitText}>
              Receba insights personalizados para melhorar seu bem-estar
            </Text>
          </View>

          <View style={styles.benefit}>
            <MaterialCommunityIcons
              name="account-check"
              size={24}
              color={theme.colors.primary}
            />
            <Text style={styles.benefitText}>
              Compartilhe com seu terapeuta para melhor acompanhamento
            </Text>
          </View>
        </View>

        <View style={styles.privacyContainer}>
          <Text style={styles.privacyTitle}>Sua privacidade é importante:</Text>
          <Text style={styles.privacyText}>
            • Seus dados são privados e usados apenas para gerar insights{'\n'}
            • Nunca usamos seus dados para publicidade{'\n'}
            • Você pode desativar isso a qualquer momento nas configurações
          </Text>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.declineButton]}
          onPress={onDecline}
        >
          <Text style={styles.declineButtonText}>Agora Não</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.acceptButton]}
          onPress={onAccept}
        >
          <Text style={styles.acceptButtonText}>Ativar Agora</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.foreground,
    marginTop: 16,
    textAlign: 'center',
  },
  content: {
    marginBottom: 32,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.foreground,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 24,
  },
  benefitsContainer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  benefitsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.foreground,
    marginBottom: 12,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  benefitText: {
    fontSize: 13,
    color: '#4B5563',
    marginLeft: 12,
    flex: 1,
    lineHeight: 18,
  },
  privacyContainer: {
    backgroundColor: '#EDE9FE',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  privacyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5B21B6',
    marginBottom: 8,
  },
  privacyText: {
    fontSize: 13,
    color: theme.colors.primary,
    lineHeight: 18,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButton: {
    backgroundColor: '#E5E7EB',
  },
  declineButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.foreground,
  },
  acceptButton: {
    backgroundColor: theme.colors.primary,
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
