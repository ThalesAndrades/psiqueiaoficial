import { supabase } from '../lib/supabase';
import { FunctionsHttpError } from '@supabase/supabase-js';
import * as AuthSession from 'expo-auth-session';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { profileService } from './profileService';

// Dynamically import Apple Authentication only when available
let AppleAuthentication: any = null;
try {
  AppleAuthentication = require('expo-apple-authentication');
} catch (e) {
  console.log('Apple Authentication not available in this environment');
}

export interface SignUpData {
  email: string;
  password: string;
  fullName: string;
  userType: 'patient' | 'psychologist';
  invitationCode: string;
  phone?: string;
  birthDate?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export const authService = {
  async signUp(data: SignUpData) {
    try {
      // Use Edge Function to create user with auto-confirmed email
      const { data: functionData, error: functionError } = await supabase.functions.invoke('create-admin-user', {
        body: {
          email: data.email,
          password: data.password,
          fullName: data.fullName,
          userType: data.userType,
          phone: data.phone,
          birthDate: data.birthDate,
          invitationCode: data.invitationCode,
        },
      });

      if (functionError) {
        let errorMessage = 'Erro ao criar conta';
        if (functionError instanceof FunctionsHttpError) {
          try {
            const textContent = await functionError.context?.text();
            const parsedError = textContent ? JSON.parse(textContent) : null;
            errorMessage = parsedError?.error || textContent || errorMessage;
          } catch {}
        }
        return { data: null, error: errorMessage };
      }

      if (functionData?.error) {
        return { data: null, error: functionData.error };
      }

      // Aguarda trigger handle_new_user executar (otimizado)
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Auto sign in
      return await this.signIn({ email: data.email, password: data.password });
    } catch (error: any) {
      console.error('[AuthService] Sign up error:', error);
      return { data: null, error: error.message || 'Erro ao criar conta' };
    }
  },

  async signIn(data: SignInData) {
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) return { data: null, error: error.message };
    return { data: authData, error: null };
  },

  async signInWithGoogle() {
    try {
      const redirectUrl = AuthSession.makeRedirectUri({
        scheme: 'psiqueia',
        path: 'auth',
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          skipBrowserRedirect: Platform.OS !== 'web',
        },
      });

      if (error) return { data: null, error: error.message, url: null };

      if (Platform.OS === 'web') {
        return { data, error: null, url: null };
      }

      return { data, error: null, url: data.url };
    } catch (err: any) {
      return { data: null, error: err.message, url: null };
    }
  },

  async signInWithApple() {
    try {
      // Check if running in Expo Go (Apple Auth not supported)
      const isExpoGo = Constants.appOwnership === 'expo';
      
      if (isExpoGo) {
        return { 
          data: null, 
          error: 'Apple Sign In não funciona no Expo Go. Use um build de desenvolvimento ou produção.', 
          url: null 
        };
      }

      // iOS: Use native Apple Authentication if available
      if (Platform.OS === 'ios' && AppleAuthentication) {
        const credential = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
        });

        if (!credential.identityToken) {
          return { data: null, error: 'No identity token received', url: null };
        }

        // Sign in with Supabase using identity token
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
        });

        if (error) {
          return { data: null, error: error.message, url: null };
        }

        // Apple only provides full name on first sign-in, save it to metadata
        if (credential.fullName && data.user) {
          const nameParts: string[] = [];
          if (credential.fullName.givenName) nameParts.push(credential.fullName.givenName);
          if (credential.fullName.middleName) nameParts.push(credential.fullName.middleName);
          if (credential.fullName.familyName) nameParts.push(credential.fullName.familyName);
          const fullName = nameParts.join(' ');

          if (fullName) {
            await supabase.auth.updateUser({
              data: {
                full_name: fullName,
                given_name: credential.fullName.givenName || '',
                family_name: credential.fullName.familyName || '',
              },
            });
          }
        }

        return { data, error: null, url: null };
      }

      // Android/Web: Use OAuth flow
      const redirectUrl = AuthSession.makeRedirectUri({
        scheme: 'psiqueia',
        path: 'auth',
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: Platform.OS !== 'web',
        },
      });

      if (error) return { data: null, error: error.message, url: null };

      if (Platform.OS === 'web') {
        return { data, error: null, url: null };
      }

      return { data, error: null, url: data.url };
    } catch (err: any) {
      // Handle user cancellation
      if (err.code === 'ERR_REQUEST_CANCELED') {
        return { data: null, error: 'Login cancelado pelo usuário', url: null };
      }
      return { data: null, error: err.message || 'Erro ao fazer login com Apple', url: null };
    }
  },

  async exchangeCodeForSession(code: string) {
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) return { data: null, error: error.message };
      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: err.message };
    }
  },

  async resetPassword(email: string) {
    try {
      // Use a more reliable redirect URL format
      const redirectUrl = Platform.select({
        ios: 'psiqueia://auth/reset-password',
        android: 'psiqueia://auth/reset-password',
        default: `${window.location.origin}/auth/reset-password`,
      });

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        console.error('Reset password error:', error);
        return { error: error.message };
      }

      return { error: null };
    } catch (err: any) {
      console.error('Reset password error:', err);
      return { error: err.message || 'Erro ao enviar email de recuperação' };
    }
  },

  async updatePassword(newPassword: string) {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.error('Update password error:', error);
        return { error: error.message };
      }

      return { error: null };
    } catch (err: any) {
      console.error('Update password error:', err);
      return { error: err.message || 'Erro ao atualizar senha' };
    }
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) return { error: error.message };
    return { error: null };
  },

  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) return { data: null, error: error.message };
    return { data: data.session, error: null };
  },

  async refreshSession() {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) return { data: null, error: error.message };
    return { data: data.session, error: null };
  },

  async deleteAccount(password: string) {
    try {
      const { data, error } = await supabase.functions.invoke('delete-account', {
        body: { password },
      });

      if (error) {
        let errorMessage = 'Erro ao excluir conta';
        if (error instanceof FunctionsHttpError) {
          try {
            const textContent = await error.context?.text();
            const parsedError = textContent ? JSON.parse(textContent) : null;
            errorMessage = parsedError?.error || textContent || errorMessage;
          } catch {}
        }
        return { error: errorMessage };
      }

      if (data?.error) {
        return { error: data.error };
      }

      return { error: null };
    } catch (err: any) {
      console.error('Delete account error:', err);
      return { error: err.message || 'Erro ao excluir conta' };
    }
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },
};
