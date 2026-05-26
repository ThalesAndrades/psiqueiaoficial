import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Modal, Platform, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { theme } from '../../constants/theme';
import { useAppData } from '../../hooks/useAppData';
import { LoadingSpinner, FadeInView } from '../../components';
import { googleService } from '../../services/googleService';
import { toastManager } from '../../components/ui/Toast';

export default function PacientesScreen() {
  const insets = useSafeAreaInsets();
  const { myPatients, refreshAll } = useAppData();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [fileDescription, setFileDescription] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadPatients();
    }, [])
  );

  const loadPatients = async () => {
    setLoading(true);
    await refreshAll();
    setLoading(false);
  };

  const filteredPatients = myPatients.filter((patient) => {
    const patientName = patient.patient?.full_name || '';
    return patientName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleShareDocument = async () => {
    if (!selectedPatient) {
      toastManager.show({ type: 'error', message: 'Selecione um paciente' });
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const file = result.assets[0];
      
      setUploadingFile(true);

      // Note: This is a simplified version. In production, you would:
      // 1. Upload file to Google Drive first
      // 2. Get the file ID
      // 3. Share with patient

      Alert.alert(
        'Upload de Arquivo',
        'Para compartilhar arquivos, você precisa fazer upload no Google Drive primeiro e então compartilhar aqui usando o ID do arquivo.',
        [
          {
            text: 'Entendi',
            onPress: () => {
              setShareModalVisible(false);
              setFileDescription('');
            },
          },
        ]
      );

      setUploadingFile(false);
    } catch (error: any) {
      console.error('Document picker error:', error);
      toastManager.show({ type: 'error', message: 'Não foi possível selecionar o arquivo' });
      setUploadingFile(false);
    }
  };

  const handleShareFromDrive = async (fileId: string, fileName: string) => {
    if (!selectedPatient) return;

    setUploadingFile(true);
    const { data, error } = await googleService.shareFile({
      fileId,
      fileName,
      patientId: selectedPatient.patient_id,
      description: fileDescription,
    });

    if (error) {
      toastManager.show({ type: 'error', message: `Erro ao Compartilhar: ${error}` });
    } else {
      toastManager.show({ type: 'success', message: 'Documento compartilhado com sucesso!' });
      setShareModalVisible(false);
      setFileDescription('');
    }
    setUploadingFile(false);
  };

  const openShareModal = (patient: any) => {
    setSelectedPatient(patient);
    setShareModalVisible(true);
  };

  if (loading && myPatients.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner size={40} color={theme.colors.primary} />
        <Text style={styles.loadingText}>Carregando pacientes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#E8F4F8', '#F0E8FF', '#E0F2F1']} style={styles.background}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
          <View>
            <Text style={styles.headerLabel}>GESTÃO</Text>
            <Text style={styles.headerTitle}>Pacientes</Text>
          </View>
          <View style={styles.headerStats}>
            <View style={styles.statBadge}>
              <Ionicons name="people" size={16} color={theme.colors.primary} />
              <Text style={styles.statNumber}>{myPatients.length}</Text>
            </View>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar paciente..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <FlatList
          data={filteredPatients}
          keyExtractor={(item) => item.id}
          renderItem={({ item: patient, index }) => (
            <FadeInView delay={index * 50}>
              <View style={styles.patientCard}>
                <View style={styles.patientHeader}>
                  <View style={styles.patientAvatar}>
                    <Ionicons name="person" size={28} color={theme.colors.primary} />
                  </View>
                  <View style={styles.patientInfo}>
                    <Text style={styles.patientName}>{patient.patient?.full_name || 'Nome não disponível'}</Text>
                    <Text style={styles.patientEmail}>{patient.patient?.phone || 'Telefone não disponível'}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      patient.status === 'active' ? styles.statusActive : styles.statusInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        patient.status === 'active' ? styles.statusTextActive : styles.statusTextInactive,
                      ]}
                    >
                      {patient.status === 'active' ? 'Ativo' : 'Inativo'}
                    </Text>
                  </View>
                </View>

                <View style={styles.patientStats}>
                  <View style={styles.stat}>
                    <Ionicons name="calendar" size={16} color="#64748B" />
                    <Text style={styles.statLabel}>Desde</Text>
                    <Text style={styles.statValue}>
                      {new Date(patient.started_at).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                    </Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.stat}>
                    <Ionicons name="time" size={16} color="#64748B" />
                    <Text style={styles.statLabel}>Sessões</Text>
                    <Text style={styles.statValue}>--</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.stat}>
                    <Ionicons name="trending-up" size={16} color="#64748B" />
                    <Text style={styles.statLabel}>Progresso</Text>
                    <Text style={styles.statValue}>--</Text>
                  </View>
                </View>

                <View style={styles.patientActions}>
                  <TouchableOpacity style={styles.actionButton}>
                    <Ionicons name="clipboard-outline" size={18} color={theme.colors.primary} />
                    <Text style={styles.actionButtonText}>Plano</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.actionButton}>
                    <Ionicons name="chatbubble-outline" size={18} color={theme.colors.primary} />
                    <Text style={styles.actionButtonText}>Diário</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => openShareModal(patient)}
                  >
                    <Ionicons name="document-attach" size={18} color={theme.colors.primary} />
                    <Text style={styles.actionButtonText}>Docs</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </FadeInView>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="people-outline" size={64} color="#CBD5E1" />
              </View>
              <Text style={styles.emptyTitle}>
                {searchQuery ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado'}
              </Text>
              <Text style={styles.emptyDesc}>
                {searchQuery
                  ? 'Tente buscar com outro nome'
                  : 'Seus pacientes aparecerão aqui quando forem cadastrados'}
              </Text>
            </View>
          }
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 70 },
          ]}
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
        />
      </LinearGradient>

      {/* Share Document Modal */}
      <Modal
        visible={shareModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setShareModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Compartilhar Documento</Text>
              <TouchableOpacity onPress={() => setShareModalVisible(false)}>
                <Ionicons name="close" size={28} color={theme.colors.foreground} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalPatientName}>
                Para: {selectedPatient?.patient_name || 'Paciente'}
              </Text>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Descrição do documento</Text>
                <TextInput
                  style={styles.textArea}
                  placeholder="Ex: Material de apoio sobre ansiedade..."
                  placeholderTextColor="#94A3B8"
                  value={fileDescription}
                  onChangeText={setFileDescription}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.uploadInfo}>
                <Ionicons name="information-circle" size={20} color="#3B82F6" />
                <Text style={styles.uploadInfoText}>
                  Faça upload do arquivo no Google Drive primeiro, depois insira o ID do arquivo abaixo
                </Text>
              </View>

              <TouchableOpacity
                style={styles.uploadButton}
                onPress={handleShareDocument}
                disabled={uploadingFile}
              >
                {uploadingFile ? (
                  <LoadingSpinner size={20} color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload" size={20} color="#FFFFFF" />
                    <Text style={styles.uploadButtonText}>Selecionar Arquivo</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  headerLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.foreground,
  },
  headerStats: {
    flexDirection: 'row',
    gap: 12,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(107, 70, 193, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(107, 70, 193, 0.2)',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  searchContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.foreground,
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
    paddingHorizontal: 40,
  },
  patientCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  patientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  patientAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(107, 70, 193, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.foreground,
    marginBottom: 4,
  },
  patientEmail: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusActive: {
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
    borderColor: 'rgba(5, 150, 105, 0.2)',
  },
  statusInactive: {
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusTextActive: {
    color: '#059669',
  },
  statusTextInactive: {
    color: '#64748B',
  },
  patientStats: {
    flexDirection: 'row',
    paddingVertical: 16,
    marginBottom: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.foreground,
  },
  patientActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(107, 70, 193, 0.1)',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(107, 70, 193, 0.2)',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.foreground,
  },
  modalBody: {
    gap: 20,
  },
  modalPatientName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  inputContainer: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.foreground,
  },
  textArea: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.foreground,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 100,
  },
  uploadInfo: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  uploadInfoText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#3B82F6',
    lineHeight: 19,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
