/**
 * Modal de denúncia de usuário. Reutilizável em qualquer tela que mostre
 * outro usuário (perfil de psicólogo, perfil de paciente).
 *
 * Props:
 *   - visible / onClose: controle externo
 *   - reportedUserId: alvo da denúncia
 *   - reportedUserName: nome para exibir
 *
 * NÃO permite auto-denúncia (DB constraint user_reports_no_self_report;
 * UI também esconde o botão quando reportedUserId === userProfile.id).
 */
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { theme } from '../../constants/theme';
import {
  moderationService,
  REPORT_REASONS,
  REPORT_REASON_LABEL,
  ReportReason,
} from '../../services/moderationService';

interface ReportUserModalProps {
  visible: boolean;
  onClose: () => void;
  reportedUserId: string;
  reportedUserName: string;
}

export function ReportUserModal({
  visible,
  onClose,
  reportedUserId,
  reportedUserName,
}: ReportUserModalProps) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason) {
      Alert.alert('Selecione um motivo', 'Escolha por que você está denunciando este usuário.');
      return;
    }

    setSubmitting(true);
    const { error } = await moderationService.createReport(
      reportedUserId,
      reason,
      description.trim() || undefined,
    );
    setSubmitting(false);

    if (error) {
      Alert.alert('Erro', `Não foi possível enviar a denúncia: ${error}`);
      return;
    }

    Alert.alert(
      'Denúncia recebida',
      'Sua denúncia foi enviada para a equipe de moderação. Você receberá uma resposta em até 7 dias úteis.',
      [
        {
          text: 'OK',
          onPress: () => {
            setReason(null);
            setDescription('');
            onClose();
          },
        },
      ],
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} disabled={submitting}>
            <Ionicons name="close" size={28} color={theme.colors.foreground} />
          </TouchableOpacity>
          <Text style={styles.title}>Denunciar usuário</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 32 }}>
          <Text style={styles.lead}>
            Você está denunciando <Text style={{ fontWeight: '700' }}>{reportedUserName}</Text>.
            Denúncias falsas ou abusivas podem resultar em suspensão da sua conta.
          </Text>

          <Text style={styles.sectionLabel}>Motivo</Text>
          {REPORT_REASONS.map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.reasonRow, reason === r && styles.reasonRowSelected]}
              onPress={() => setReason(r)}
              disabled={submitting}
            >
              <Ionicons
                name={reason === r ? 'radio-button-on' : 'radio-button-off'}
                size={22}
                color={reason === r ? theme.colors.primary : '#94A3B8'}
              />
              <Text style={styles.reasonText}>{REPORT_REASON_LABEL[r]}</Text>
            </TouchableOpacity>
          ))}

          <Text style={styles.sectionLabel}>Descreva o que aconteceu (opcional)</Text>
          <TextInput
            style={styles.textArea}
            multiline
            numberOfLines={5}
            placeholder="Conte com suas palavras o que motivou esta denúncia. Inclua datas, contexto, mensagens recebidas se possível."
            placeholderTextColor="#94A3B8"
            value={description}
            onChangeText={setDescription}
            maxLength={1000}
            editable={!submitting}
          />
          <Text style={styles.counter}>{description.length}/1000</Text>

          <TouchableOpacity
            style={[styles.submitButton, (!reason || submitting) && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!reason || submitting}
          >
            <Text style={styles.submitText}>
              {submitting ? 'Enviando...' : 'Enviar denúncia'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            Em caso de risco imediato à vida ou denúncia de crime, ligue 188 (CVV), 192 (SAMU)
            ou 190 (Polícia). Esta denúncia é uma ferramenta interna da plataforma e não
            substitui canais oficiais.
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.2)',
  },
  title: { fontSize: 17, fontWeight: '700', color: theme.colors.foreground },
  body: { padding: 20 },
  lead: { color: theme.colors.foreground, fontSize: 14, lineHeight: 20, marginBottom: 24 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: 'rgba(148, 163, 184, 0.06)',
  },
  reasonRowSelected: {
    backgroundColor: 'rgba(107, 70, 193, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(107, 70, 193, 0.3)',
  },
  reasonText: { marginLeft: 12, color: theme.colors.foreground, fontSize: 15 },
  textArea: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.3)',
    borderRadius: 10,
    padding: 12,
    color: theme.colors.foreground,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  counter: { textAlign: 'right', color: '#94A3B8', fontSize: 11, marginTop: 4, marginBottom: 24 },
  submitButton: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: { opacity: 0.4 },
  submitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  disclaimer: {
    marginTop: 16,
    color: '#64748B',
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
});
