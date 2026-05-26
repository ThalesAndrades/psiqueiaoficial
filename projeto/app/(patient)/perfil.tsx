import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, Modal, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import Ionicons from '@expo/vector-icons/Ionicons';
import { theme } from '../../constants/theme';
import { useState } from 'react';

export default function PerfilScreen() {
  const router = useRouter();
  const { signOut, deleteAccount, userProfile } = useAuth();
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  const handleLogout = async () => {
    await signOut();
    router.replace('/login');
  };

  const handleDeleteAccount = () => {
    setDeletePassword('');
    setDeleteModalVisible(true);
  };

  const confirmDeleteAccount = async () => {
    if (!deletePassword) {
      const msg = 'Digite sua senha para confirmar';
      if (Platform.OS === 'web') alert(msg); else Alert.alert('Senha obrigatória', msg);
      return;
    }
    setDeleting(true);
    const { error } = await deleteAccount(deletePassword);
    setDeleting(false);

    if (error) {
      if (Platform.OS === 'web') {
        alert(`Erro ao excluir conta: ${error}`);
      } else {
        Alert.alert('Erro', `Não foi possível excluir sua conta: ${error}`);
      }
      return;
    }
    setDeleteModalVisible(false);
    setDeletePassword('');
    router.replace('/login');
  };

  return (
    <LinearGradient colors={['#E8E3F5', '#E3EBF8', '#E0F7FA']} style={styles.container}>
      <View style={styles.content}>
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={60} color={theme.colors.primary} />
          </View>
          <Text style={styles.name}>{userProfile?.full_name || 'Usuário'}</Text>
          <Text style={styles.email}>{userProfile?.email || ''}</Text>
        </View>

        <View style={styles.menuSection}>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.push('/(patient)/editar-perfil')}
          >
            <Ionicons name="person-outline" size={24} color={theme.colors.foreground} />
            <Text style={styles.menuText}>Editar Perfil</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.push('/(patient)/bem-estar-ativo')}
          >
            <Ionicons name="fitness-outline" size={24} color={theme.colors.foreground} />
            <Text style={styles.menuText}>Bem-Estar Ativo</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="settings-outline" size={24} color={theme.colors.foreground} />
            <Text style={styles.menuText}>Configurações</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="help-circle-outline" size={24} color={theme.colors.foreground} />
            <Text style={styles.menuText}>Ajuda</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#EF4444" />
            <Text style={[styles.menuText, { color: '#EF4444' }]}>Sair</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.menuItem, styles.dangerMenuItem]} 
            onPress={handleDeleteAccount}
            disabled={deleting}
          >
            <Ionicons name="trash-outline" size={24} color="#DC2626" />
            <Text style={[styles.menuText, styles.dangerText]}>
              {deleting ? 'Excluindo...' : 'Excluir Conta'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Excluir Conta</Text>
            <Text style={styles.modalMessage}>
              Esta ação é permanente. Digite sua senha para confirmar.
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Senha atual"
              placeholderTextColor="#94A3B8"
              secureTextEntry
              value={deletePassword}
              onChangeText={setDeletePassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!deleting}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => { setDeleteModalVisible(false); setDeletePassword(''); }}
                disabled={deleting}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton]}
                onPress={confirmDeleteAccount}
                disabled={deleting}
              >
                <Text style={styles.deleteButtonText}>
                  {deleting ? 'Excluindo...' : 'Excluir'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    paddingTop: 60,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.foreground,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    fontWeight: '400',
    color: theme.colors.muted,
  },
  menuSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 24,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.foreground,
  },
  dangerMenuItem: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(220, 38, 38, 0.1)',
  },
  dangerText: {
    color: '#DC2626',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.foreground,
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 15,
    color: theme.colors.muted,
    lineHeight: 22,
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: theme.colors.foreground,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: theme.colors.muted + '20',
  },
  cancelButtonText: {
    color: theme.colors.foreground,
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#DC2626',
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
