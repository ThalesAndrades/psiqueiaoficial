/**
 * Botão "Denunciar usuário" embutido. Wrappa o ReportUserModal e gerencia
 * o estado de visibilidade. Pode ser plugado em qualquer tela que mostre
 * um perfil — perfil-de-psicologo, plano-de-tratamento, agenda, etc.
 *
 * Uso:
 *   <ReportUserButton
 *     reportedUserId={psychologist.id}
 *     reportedUserName={psychologist.full_name}
 *   />
 *
 * Esconde-se automaticamente quando o usuário corrente seria o alvo da
 * denúncia (não permitimos auto-denúncia — o DB também rejeita).
 */
import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../../hooks/useAuth';
import { ReportUserModal } from './ReportUserModal';

interface ReportUserButtonProps {
  reportedUserId: string;
  reportedUserName: string;
  compact?: boolean;
}

export function ReportUserButton({
  reportedUserId,
  reportedUserName,
  compact = false,
}: ReportUserButtonProps) {
  const { user } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);

  // Não exibe se o alvo for o próprio usuário corrente
  if (user?.id === reportedUserId) {
    return null;
  }

  return (
    <View>
      <TouchableOpacity
        style={[styles.button, compact && styles.buttonCompact]}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="flag-outline" size={compact ? 14 : 16} color="#EF4444" />
        <Text style={[styles.text, compact && styles.textCompact]}>Denunciar</Text>
      </TouchableOpacity>
      <ReportUserModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        reportedUserId={reportedUserId}
        reportedUserName={reportedUserName}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    alignSelf: 'flex-start',
  },
  buttonCompact: { paddingHorizontal: 8, paddingVertical: 4 },
  text: { marginLeft: 6, color: '#EF4444', fontSize: 13, fontWeight: '600' },
  textCompact: { fontSize: 11, marginLeft: 4 },
});
