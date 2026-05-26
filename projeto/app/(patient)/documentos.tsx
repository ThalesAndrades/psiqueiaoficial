import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { theme } from '../../constants/theme';
import { googleService } from '../../services/googleService';
import { LoadingSpinner, FadeInView } from '../../components';
import { toastManager } from '../../components/ui/Toast';

interface SharedDocument {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number | null;
  drive_url: string;
  thumbnail_url: string | null;
  description: string | null;
  shared_at: string;
}

export default function DocumentosScreen() {
  const insets = useSafeAreaInsets();
  const [documents, setDocuments] = useState<SharedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDocuments = async () => {
    setLoading(true);
    const { data, error } = await googleService.getSharedDocuments();
    
    if (error) {
      toastManager.show({ type: 'error', message: 'Não foi possível carregar documentos' });
      setLoading(false);
      return;
    }

    if (data) {
      setDocuments(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDocuments();
    setRefreshing(false);
  };

  const handleOpenDocument = async (doc: SharedDocument) => {
    try {
      const supported = await Linking.canOpenURL(doc.drive_url);
      if (supported) {
        await Linking.openURL(doc.drive_url);
      } else {
        toastManager.show({ type: 'error', message: 'Não foi possível abrir o documento' });
      }
    } catch (error) {
      toastManager.show({ type: 'error', message: 'Não foi possível abrir o documento' });
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return 'document-text';
    if (mimeType.includes('image')) return 'image';
    if (mimeType.includes('video')) return 'videocam';
    if (mimeType.includes('audio')) return 'musical-notes';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'grid';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'easel';
    if (mimeType.includes('document') || mimeType.includes('word')) return 'document';
    return 'document-attach';
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Tamanho desconhecido';
    const kb = bytes / 1024;
    const mb = kb / 1024;
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    return `${kb.toFixed(2)} KB`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner size={40} color={theme.colors.primary} />
        <Text style={styles.loadingText}>Carregando documentos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#F0E8FF', '#E8F4FF', '#E0F7FA']} style={styles.background}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
          <Text style={styles.headerTitle}>Documentos Compartilhados</Text>
          <TouchableOpacity onPress={handleRefresh} disabled={refreshing}>
            <Ionicons 
              name="refresh" 
              size={24} 
              color={refreshing ? '#94A3B8' : theme.colors.primary} 
            />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) + 70 }]}
          showsVerticalScrollIndicator={false}
        >
          {documents.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="folder-open-outline" size={64} color="#CBD5E1" />
              </View>
              <Text style={styles.emptyTitle}>Nenhum documento compartilhado</Text>
              <Text style={styles.emptyDesc}>
                Seu psicólogo pode compartilhar materiais de apoio e exercícios aqui
              </Text>
            </View>
          ) : (
            documents.map((doc, index) => (
              <FadeInView key={doc.id} delay={index * 50}>
                <TouchableOpacity
                  style={styles.documentCard}
                  onPress={() => handleOpenDocument(doc)}
                  activeOpacity={0.7}
                >
                  <View style={styles.documentIcon}>
                    <Ionicons name={getFileIcon(doc.file_type) as any} size={32} color={theme.colors.primary} />
                  </View>
                  
                  <View style={styles.documentInfo}>
                    <Text style={styles.documentName} numberOfLines={2}>
                      {doc.file_name}
                    </Text>
                    {doc.description && (
                      <Text style={styles.documentDesc} numberOfLines={2}>
                        {doc.description}
                      </Text>
                    )}
                    <View style={styles.documentMeta}>
                      <Text style={styles.metaText}>{formatFileSize(doc.file_size)}</Text>
                      <Text style={styles.metaDot}>•</Text>
                      <Text style={styles.metaText}>{formatDate(doc.shared_at)}</Text>
                    </View>
                  </View>

                  <View style={styles.documentAction}>
                    <LinearGradient
                      colors={[theme.colors.primary, '#8B5CF6']}
                      style={styles.actionButton}
                    >
                      <Ionicons name="open-outline" size={20} color="#FFFFFF" />
                    </LinearGradient>
                  </View>
                </TouchableOpacity>
              </FadeInView>
            ))
          )}
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  header: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.foreground,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    gap: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.foreground,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 40,
  },
  documentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  documentIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(107, 70, 193, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.foreground,
    marginBottom: 4,
  },
  documentDesc: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: 8,
  },
  documentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  metaDot: {
    fontSize: 12,
    color: '#94A3B8',
  },
  documentAction: {
    // container
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
