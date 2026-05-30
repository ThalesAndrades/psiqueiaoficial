/**
 * Painel de moderação — lista de denúncias com filtro por status e
 * action sheet para aplicar warning/suspension/ban.
 *
 * v1 mínimo viável. Próximas iterações: detalhe da denúncia com histórico
 * do usuário, filtros por motivo, bulk actions.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { theme } from '../../constants/theme';
import {
  moderationService,
  UserReport,
  REPORT_REASON_LABEL,
  ReportStatus,
  ModerationActionType,
} from '../../services/moderationService';

const STATUS_TABS: { value: ReportStatus | 'all'; label: string }[] = [
  { value: 'open', label: 'Abertas' },
  { value: 'under_review', label: 'Em análise' },
  { value: 'resolved', label: 'Resolvidas' },
  { value: 'dismissed', label: 'Descartadas' },
  { value: 'all', label: 'Todas' },
];

export default function AdminReportsScreen() {
  const [filter, setFilter] = useState<ReportStatus | 'all'>('open');
  const [reports, setReports] = useState<UserReport[]>([]);
  const [loading, setLoading] = useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    const { data, error } = await moderationService.listReports(
      filter === 'all' ? undefined : filter,
    );
    setLoading(false);
    if (error) {
      Alert.alert('Erro', error);
      return;
    }
    setReports(data);
  }, [filter]);

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [load]),
  );

  const takeAction = (report: UserReport) => {
    Alert.alert(
      'Revisar denúncia',
      `Motivo: ${REPORT_REASON_LABEL[report.reason]}\n\nQual ação aplicar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Descartar (sem ação)',
          onPress: () => applyReview(report, 'dismissed'),
        },
        {
          text: 'Resolver com aviso',
          onPress: () => applyReview(report, 'resolved', { type: 'warning', reasonHint: 'Conduta inadequada — primeira advertência.' }),
        },
        {
          text: 'Suspender 7 dias',
          style: 'destructive',
          onPress: () => applyReview(report, 'resolved', {
            type: 'suspension',
            reasonHint: 'Suspensão de 7 dias por violação dos termos.',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          }),
        },
        {
          text: 'Banir permanente',
          style: 'destructive',
          onPress: () => applyReview(report, 'resolved', { type: 'ban', reasonHint: 'Banimento permanente por violação grave dos termos.' }),
        },
      ],
    );
  };

  const applyReview = async (
    report: UserReport,
    newStatus: ReportStatus,
    action?: { type: ModerationActionType; reasonHint: string; expiresAt?: string },
  ) => {
    const { success, error } = await moderationService.reviewReport(
      report.id,
      report.reported_user_id,
      newStatus,
      action
        ? {
            action: { type: action.type, reason: action.reasonHint, expiresAt: action.expiresAt },
          }
        : undefined,
    );

    if (!success) {
      Alert.alert('Erro', error ?? 'Falha ao revisar denúncia.');
      return;
    }
    load();
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {STATUS_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.value}
            style={[styles.tab, filter === tab.value && styles.tabActive]}
            onPress={() => setFilter(tab.value)}
          >
            <Text style={[styles.tabText, filter === tab.value && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && reports.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : reports.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="checkmark-done-circle-outline" size={48} color="#10B981" />
          <Text style={styles.emptyText}>Nenhuma denúncia neste filtro.</Text>
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(r) => r.id}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => takeAction(item)}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardReason}>{REPORT_REASON_LABEL[item.reason]}</Text>
                <View style={[styles.badge, styles[`badge_${item.status}`]]}>
                  <Text style={styles.badgeText}>{item.status}</Text>
                </View>
              </View>
              {item.description ? (
                <Text style={styles.cardDesc} numberOfLines={3}>
                  {item.description}
                </Text>
              ) : null}
              <View style={styles.cardMeta}>
                <Text style={styles.cardMetaText}>
                  Denunciado: <Text style={styles.mono}>{item.reported_user_id.slice(0, 8)}…</Text>
                </Text>
                <Text style={styles.cardMetaText}>
                  {new Date(item.created_at).toLocaleString('pt-BR')}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.2)',
    flexWrap: 'wrap',
  },
  tab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginRight: 4, marginBottom: 4 },
  tabActive: { backgroundColor: 'rgba(107, 70, 193, 0.12)' },
  tabText: { color: '#64748B', fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: theme.colors.primary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { color: '#64748B', fontSize: 14, marginTop: 12 },
  card: {
    backgroundColor: 'rgba(148, 163, 184, 0.06)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardReason: { fontSize: 15, fontWeight: '700', color: theme.colors.foreground, flex: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginLeft: 8 },
  badge_open: { backgroundColor: 'rgba(245, 158, 11, 0.15)' },
  badge_under_review: { backgroundColor: 'rgba(59, 130, 246, 0.15)' },
  badge_resolved: { backgroundColor: 'rgba(16, 185, 129, 0.15)' },
  badge_dismissed: { backgroundColor: 'rgba(148, 163, 184, 0.15)' },
  badgeText: { fontSize: 11, fontWeight: '700', color: theme.colors.foreground },
  cardDesc: { color: '#475569', fontSize: 13, lineHeight: 19, marginBottom: 8 },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  cardMetaText: { fontSize: 11, color: '#94A3B8' },
  mono: { fontFamily: 'monospace' },
});
