import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import { authService } from '../services/authService';
import { profileService, UserProfile } from '../services/profileService';
import { supabase } from '../lib/supabase';

export type UserType = 'patient' | 'psychologist' | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userProfile: UserProfile | null;
  loading: boolean;
  userType: UserType;
  isAuthenticated: boolean;
  hasCompletedOnboarding: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, userType: 'patient' | 'psychologist', fullName: string, invitationCode: string, phone?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  deleteAccount: (password: string) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // P0: Fetch profile with retry, logs, and timeout
  const fetchProfile = async (
    userId: string, 
    retries = 3
  ): Promise<{ success: boolean; error?: string }> => {
    console.log(`[AuthContext] ====== FETCHING PROFILE ======`);
    console.log(`[AuthContext] UserId: ${userId}`);
    console.log(`[AuthContext] Retries left: ${retries}`);
    
    try {
      const { data, error } = await profileService.getUserProfile(userId);
      
      if (error) {
        console.error('[AuthContext] ❌ Profile fetch ERROR:', error);
        
        // Retry on network errors
        if (retries > 0 && (error.includes('network') || error.includes('timeout') || error.includes('Failed to fetch'))) {
          console.log('[AuthContext] 🔄 Retrying profile fetch in 500ms...');
          await new Promise(resolve => setTimeout(resolve, 500));
          return fetchProfile(userId, retries - 1);
        }
        
        return { success: false, error };
      }
      
      if (!data) {
        console.error('[AuthContext] ❌ No profile data returned for userId:', userId);
        return { success: false, error: 'Perfil não encontrado' };
      }
      
      console.log('[AuthContext] ✅ Profile loaded successfully!');
      console.log('[AuthContext] User Type:', data.user_type);
      console.log('[AuthContext] Email:', data.email);
      console.log('[AuthContext] Onboarding:', data.onboarding_completed);
      console.log('[AuthContext] ============================');
      setUserProfile(data);
      return { success: true };
    } catch (err: any) {
      console.error('[AuthContext] ❌ EXCEPTION fetching profile:', err);
      return { success: false, error: err.message || 'Erro ao carregar perfil' };
    }
  };

  // Inicializa sessão ao montar
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const { data } = await authService.getSession();
        if (mounted && data?.user) {
          setSession(data);
          setUser(data.user);
          await fetchProfile(data.user.id);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();
    return () => { mounted = false; };
  }, []);

  // Listener de mudanças de auth
  useEffect(() => {
    const { data: { subscription } } = authService.onAuthStateChange(async (event, newSession) => {
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setUserProfile(null);
        return;
      }

      // SIGNED_IN, TOKEN_REFRESHED, USER_UPDATED and PASSWORD_RECOVERY all
      // carry a session — propagate it so OAuth (Google/Apple) returns and
      // password-reset deep links are recognized everywhere in the app.
      if (newSession?.user) {
        setSession(newSession);
        setUser(newSession.user);

        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          await fetchProfile(newSession.user.id);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Auto-refresh de token
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });

    return () => subscription.remove();
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    console.log('[AuthContext] ========== SIGN IN START ==========');
    console.log('[AuthContext] Email:', email);
    
    try {
      const { data, error } = await authService.signIn({ email, password });
      if (error) {
        console.error('[AuthContext] ❌ AUTH ERROR:', error);
        setLoading(false);
        return { error };
      }

      if (!data?.user) {
        console.error('[AuthContext] ❌ No user data returned');
        setLoading(false);
        return { error: 'Erro ao autenticar' };
      }

      console.log('[AuthContext] ✅ Auth successful!');
      console.log('[AuthContext] User ID:', data.user.id);
      console.log('[AuthContext] User Email:', data.user.email);
      console.log('[AuthContext] Now loading profile...');
      setUser(data.user);
      setSession(data.session);
      
      // P0: Wait for profile with 5s timeout (increased from 2s)
      const profileResult = await Promise.race([
        fetchProfile(data.user.id),
        new Promise<{ success: boolean; error: string }>(resolve => 
          setTimeout(() => {
            console.error('[AuthContext] ⏱️ PROFILE LOAD TIMEOUT (5s)');
            resolve({ 
              success: false, 
              error: 'Timeout ao carregar perfil (5s)' 
            });
          }, 5000)
        )
      ]);
      
      if (!profileResult.success) {
        console.error('[AuthContext] ❌ PROFILE LOAD FAILED:', profileResult.error);
        console.error('[AuthContext] Clearing auth state...');
        // Clear auth state on profile failure
        setUser(null);
        setSession(null);
        setLoading(false);
        return { 
          error: `Login realizado mas perfil não carregou: ${profileResult.error}. Tente novamente.` 
        };
      }
      
      console.log('[AuthContext] ✅ SIGN IN COMPLETE WITH PROFILE');
      console.log('[AuthContext] =====================================');
      setLoading(false);
      return { error: null };
    } catch (err: any) {
      console.error('[AuthContext] ❌ EXCEPTION DURING SIGN IN:', err);
      setLoading(false);
      return { error: err.message || 'Erro ao fazer login' };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    type: 'patient' | 'psychologist',
    fullName: string,
    invitationCode: string,
    phone?: string
  ) => {
    setLoading(true);
    console.log('[AuthContext] Starting sign up for:', email, 'type:', type);

    try {
      const { data, error } = await authService.signUp({
        email,
        password,
        userType: type,
        fullName,
        phone,
        invitationCode,
      });
      if (error) {
        console.error('[AuthContext] Sign up error:', error);
        setLoading(false);
        return { error };
      }

      if (!data?.user) {
        console.error('[AuthContext] No user data returned');
        setLoading(false);
        return { error: 'Erro ao criar conta' };
      }

      console.log('[AuthContext] Sign up successful, loading profile...');
      setUser(data.user);
      setSession(data.session);
      
      // P0: Wait for profile with 5s timeout
      const profileResult = await Promise.race([
        fetchProfile(data.user.id),
        new Promise<{ success: boolean; error: string }>(resolve => 
          setTimeout(() => resolve({ 
            success: false, 
            error: 'Timeout ao carregar perfil' 
          }), 5000)
        )
      ]);
      
      if (!profileResult.success) {
        console.error('[AuthContext] Profile load failed after signup:', profileResult.error);
        setUser(null);
        setSession(null);
        setLoading(false);
        return { 
          error: `Conta criada mas perfil não carregou: ${profileResult.error}. Tente fazer login.` 
        };
      }
      
      console.log('[AuthContext] Sign up complete with profile');
      setLoading(false);
      return { error: null };
    } catch (err: any) {
      console.error('[AuthContext] Exception during sign up:', err);
      setLoading(false);
      return { error: err.message || 'Erro ao criar conta' };
    }
  };

  const signOut = async () => {
    await authService.signOut();
    setUser(null);
    setSession(null);
    setUserProfile(null);
  };

  const deleteAccount = async (password: string) => {
    const { error } = await authService.deleteAccount(password);
    if (!error) {
      setUser(null);
      setSession(null);
      setUserProfile(null);
    }
    return { error };
  };

  const refreshProfile = async () => {
    if (!user) return;
    console.log('[AuthContext] Refreshing profile...');
    await fetchProfile(user.id);
  };

  const completeOnboarding = async () => {
    if (!user || !userProfile) return;

    try {
      const { error } = await profileService.updateUserProfile(user.id, {
        onboarding_completed: true,
      });

      if (!error) {
        setUserProfile(prev => prev ? { ...prev, onboarding_completed: true } : null);
      }
    } catch (err) {
      console.error('Exception completing onboarding:', err);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    userProfile,
    loading,
    userType: userProfile?.user_type || null,
    isAuthenticated: !!user,
    hasCompletedOnboarding: userProfile?.onboarding_completed || false,
    signIn,
    signUp,
    signOut,
    deleteAccount,
    refreshProfile,
    completeOnboarding,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
