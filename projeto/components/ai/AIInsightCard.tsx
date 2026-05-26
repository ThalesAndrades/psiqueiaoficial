import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { theme } from '../../constants/theme';
import { aiService } from '../../services/aiService';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useTypingEffect } from '../../hooks/useTypingEffect';

interface AIInsightCardProps {
  userContext?: any;
  onRefresh?: () => void;
}

export function AIInsightCard({ userContext, onRefresh }: AIInsightCardProps) {
  const [insight, setInsight] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { displayedText, isTyping, skip } = useTypingEffect(insight, { speed: 25 });

  const loadInsight = async () => {
    setLoading(true);
    setError(null);

    const { data, error: insightError } = await aiService.getDailyInsight(userContext);

    if (insightError) {
      setError('Não foi possível gerar insight');
      setLoading(false);
      return;
    }

    if (data) {
      setInsight(data.response);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadInsight();
  }, []);

  const handleRefresh = () => {
    loadInsight();
    onRefresh?.();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['rgba(107, 70, 193, 0.1)', 'rgba(59, 130, 246, 0.1)', 'rgba(20, 184, 166, 0.1)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <View style={styles.loadingContainer}>
            <LoadingSpinner size={24} color={theme.colors.primary} />
            <Text style={styles.loadingText}>Gerando insight personalizado...</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={24} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={handleRefresh} style={styles.retryButton}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(107, 70, 193, 0.1)', 'rgba(59, 130, 246, 0.1)', 'rgba(20, 184, 166, 0.1)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <View style={styles.aiIcon}>
              <Ionicons name="sparkles" size={20} color={theme.colors.primary} />
            </View>
            <Text style={styles.title}>Insight do Dia</Text>
          </View>
          <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
            <Ionicons name="refresh" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          activeOpacity={isTyping ? 0.7 : 1}
          onPress={isTyping ? skip : undefined}
        >
          <Text style={styles.insightText}>
            {displayedText}
            {isTyping && <Text style={styles.cursor}>▌</Text>}
          </Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Ionicons name="information-circle-outline" size={14} color="#64748B" />
          <Text style={styles.footerText}>Gerado por IA • PsiquèIA</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  gradient: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(107, 70, 193, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.foreground,
  },
  refreshButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(107, 70, 193, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightText: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.foreground,
    lineHeight: 23,
    marginBottom: 16,
  },
  cursor: {
    color: theme.colors.primary,
    fontWeight: '700',
    opacity: 0.8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  loadingContainer: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  errorContainer: {
    alignItems: 'center',
    gap: 12,
    padding: 20,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  retryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
  },
});
