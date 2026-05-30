import { supabase } from '../lib/supabase';

export interface Invitation {
  id: string;
  email: string;
  invitation_code: string;
  user_type: 'patient' | 'psychologist';
  invited_by: string | null;
  used: boolean;
  used_at: string | null;
  used_by: string | null;
  expires_at: string;
  created_at: string;
}

export interface InvitationValidationResult {
  valid: boolean;
  error?: string;
  user_type?: 'patient' | 'psychologist';
  email?: string;
}

export const invitationService = {
  /**
   * Validate an invitation code
   */
  async validateInvitation(code: string, email: string): Promise<InvitationValidationResult> {
    try {
      const { data, error } = await supabase.rpc('validate_invitation', {
        p_code: code,
        p_email: email,
      });

      if (error) {
        console.error('Error validating invitation:', error);
        return {
          valid: false,
          error: 'Erro ao validar convite',
        };
      }

      return data as InvitationValidationResult;
    } catch (error: any) {
      console.error('Error validating invitation:', error);
      return {
        valid: false,
        error: 'Erro ao validar convite',
      };
    }
  },

  /**
   * Get all invitations (admin only)
   */
  async getAllInvitations(): Promise<{ data: Invitation[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error getting invitations:', error);
        return { data: null, error: error.message };
      }

      return { data, error: null };
    } catch (error: any) {
      console.error('Error getting invitations:', error);
      return { data: null, error: error.message };
    }
  },

  /**
   * Create a new invitation (admin only)
   */
  async createInvitation(
    email: string,
    userType: 'patient' | 'psychologist',
    invitedBy: string
  ): Promise<{ data: Invitation | null; error: string | null }> {
    try {
      // Generate invitation code
      const { data: codeData, error: codeError } = await supabase.rpc('generate_invitation_code');

      if (codeError) {
        console.error('Error generating invitation code:', codeError);
        return { data: null, error: 'Erro ao gerar código de convite' };
      }

      const code = codeData as string;

      // Create invitation
      const { data, error } = await supabase
        .from('invitations')
        .insert({
          email,
          invitation_code: code,
          user_type: userType,
          invited_by: invitedBy,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating invitation:', error);
        return { data: null, error: error.message };
      }

      return { data, error: null };
    } catch (error: any) {
      console.error('Error creating invitation:', error);
      return { data: null, error: error.message };
    }
  },

  /**
   * Create admin users (for initial setup)
   */
  async createAdminUser(
    email: string,
    password: string,
    fullName: string,
    userType: 'patient' | 'psychologist',
    phone?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('create-admin-user', {
        body: {
          email,
          password,
          fullName,
          userType,
          phone,
        },
      });

      if (error) {
        console.error('Error creating admin user:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error creating admin user:', error);
      return { success: false, error: error.message };
    }
  },
};
