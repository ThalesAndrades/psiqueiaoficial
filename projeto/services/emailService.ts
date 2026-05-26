import { supabase } from '../lib/supabase';
import { FunctionsHttpError } from '@supabase/supabase-js';

export type EmailTemplate = 
  | 'appointment-confirmation' 
  | 'appointment-reminder' 
  | 'appointment-cancelled' 
  | 'welcome' 
  | 'invitation';

export interface SendEmailOptions {
  to: string;
  subject?: string;
  html?: string;
  text?: string;
  template?: EmailTemplate;
  templateData?: Record<string, any>;
}

export const emailService = {
  /**
   * Send an email
   */
  async sendEmail(options: SendEmailOptions): Promise<{ success: boolean; error: string | null }> {
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: options,
      });

      if (error) {
        let errorMessage = error.message;
        if (error instanceof FunctionsHttpError) {
          try {
            const statusCode = error.context?.status ?? 500;
            const textContent = await error.context?.text();
            errorMessage = `[Code: ${statusCode}] ${textContent || error.message || 'Unknown error'}`;
          } catch {
            errorMessage = `${error.message || 'Failed to send email'}`;
          }
        }
        console.error('Error sending email:', errorMessage);
        return { success: false, error: errorMessage };
      }

      return { success: data?.success || false, error: null };
    } catch (error: any) {
      console.error('Error sending email:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Send appointment confirmation email
   */
  async sendAppointmentConfirmation(
    to: string,
    patientName: string,
    psychologistName: string,
    date: string,
    time: string,
    duration: number,
    meetLink?: string
  ): Promise<{ success: boolean; error: string | null }> {
    return this.sendEmail({
      to,
      template: 'appointment-confirmation',
      templateData: {
        patientName,
        psychologistName,
        date,
        time,
        duration,
        meetLink,
      },
    });
  },

  /**
   * Send appointment reminder email
   */
  async sendAppointmentReminder(
    to: string,
    patientName: string,
    psychologistName: string,
    date: string,
    time: string,
    duration: number,
    meetLink?: string
  ): Promise<{ success: boolean; error: string | null }> {
    return this.sendEmail({
      to,
      template: 'appointment-reminder',
      templateData: {
        patientName,
        psychologistName,
        date,
        time,
        duration,
        meetLink,
      },
    });
  },

  /**
   * Send invitation email
   */
  async sendInvitation(
    to: string,
    invitationCode: string,
    userType: 'patient' | 'psychologist'
  ): Promise<{ success: boolean; error: string | null }> {
    return this.sendEmail({
      to,
      template: 'invitation',
      templateData: {
        invitationCode,
        userType,
      },
    });
  },
};
