import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables!');
  console.error('Please make sure .env file exists with:');
  console.error('- EXPO_PUBLIC_SUPABASE_URL');
  console.error('- EXPO_PUBLIC_SUPABASE_ANON_KEY');
  throw new Error('Missing Supabase configuration. Check .env file.');
}

// SecureStore (Keychain / Keystore) caps values at 2048 bytes per key on iOS,
// and Supabase sessions can exceed that, so we chunk the value across keys.
// On Android/iOS the keys still live in the OS-protected secure storage; we
// keep a tiny manifest in AsyncStorage that just records how many chunks exist.
const SECURE_CHUNK_SIZE = 1800;

const sanitizeKey = (key: string) => key.replace(/[^A-Za-z0-9._-]/g, '_');

const secureStorageAdapter = {
  async getItem(key: string) {
    const safeKey = sanitizeKey(key);
    const manifest = await AsyncStorage.getItem(`${safeKey}.__chunks`);
    if (!manifest) {
      // Migration path from plaintext AsyncStorage sessions: read once, copy
      // into SecureStore, then drop the plaintext copy.
      const legacy = await AsyncStorage.getItem(key);
      if (legacy != null) {
        await secureStorageAdapter.setItem(key, legacy);
        await AsyncStorage.removeItem(key);
        return legacy;
      }
      return null;
    }
    const count = Number(manifest);
    const parts: string[] = [];
    for (let i = 0; i < count; i++) {
      const part = await SecureStore.getItemAsync(`${safeKey}.${i}`);
      if (part == null) return null;
      parts.push(part);
    }
    return parts.join('');
  },
  async setItem(key: string, value: string) {
    const safeKey = sanitizeKey(key);
    // Clear any stale chunks before writing.
    const oldManifest = await AsyncStorage.getItem(`${safeKey}.__chunks`);
    if (oldManifest) {
      const oldCount = Number(oldManifest);
      for (let i = 0; i < oldCount; i++) {
        await SecureStore.deleteItemAsync(`${safeKey}.${i}`);
      }
    }
    const chunks: string[] = [];
    for (let i = 0; i < value.length; i += SECURE_CHUNK_SIZE) {
      chunks.push(value.slice(i, i + SECURE_CHUNK_SIZE));
    }
    for (let i = 0; i < chunks.length; i++) {
      await SecureStore.setItemAsync(`${safeKey}.${i}`, chunks[i]);
    }
    await AsyncStorage.setItem(`${safeKey}.__chunks`, String(chunks.length));
  },
  async removeItem(key: string) {
    const safeKey = sanitizeKey(key);
    const manifest = await AsyncStorage.getItem(`${safeKey}.__chunks`);
    const count = manifest ? Number(manifest) : 0;
    for (let i = 0; i < count; i++) {
      await SecureStore.deleteItemAsync(`${safeKey}.${i}`);
    }
    await AsyncStorage.removeItem(`${safeKey}.__chunks`);
    await AsyncStorage.removeItem(key); // legacy cleanup
  },
};

const createStorageAdapter = () => {
  if (Platform.OS === 'web') {
    return {
      getItem: (key: string) => {
        if (typeof window !== 'undefined' && window.localStorage) {
          return Promise.resolve(window.localStorage.getItem(key));
        }
        return Promise.resolve(null);
      },
      setItem: (key: string, value: string) => {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
          return Promise.resolve();
        }
        return Promise.resolve();
      },
      removeItem: (key: string) => {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
          return Promise.resolve();
        }
        return Promise.resolve();
      },
    };
  }
  return secureStorageAdapter;
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: createStorageAdapter() as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
