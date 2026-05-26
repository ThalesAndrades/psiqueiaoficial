import { supabase } from '../lib/supabase';
import { FunctionsHttpError } from '@supabase/supabase-js';

export interface PaymentIntent {
  clientSecret: string;
  paymentIntentId: string;
}

export interface CheckoutSession {
  url: string;
  sessionId: string;
}

export interface ConnectAccountStatus {
  hasAccount: boolean;
  accountId?: string;
  onboardingCompleted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted?: boolean;
}

export const paymentService = {
  /**
   * Create a payment intent for a session (with Connect split)
   */
  async createPaymentIntent(
    appointmentId: string,
    description?: string,
  ): Promise<{ data: PaymentIntent | null; error: string | null }> {
    try {
      const { data, error } = await supabase.functions.invoke('stripe-payment?action=create-payment-intent', {
        body: {
          action: 'create-payment-intent',
          appointmentId,
          currency: 'brl',
          description: description || 'Pagamento de sessão de terapia',
        },
      });

      if (error) {
        let errorMessage = error.message;
        if (error instanceof FunctionsHttpError) {
          try {
            const statusCode = error.context?.status ?? 500;
            const textContent = await error.context?.text();
            const errorData = textContent ? JSON.parse(textContent) : {};
            errorMessage = errorData.error || textContent || error.message || 'Unknown error';
          } catch {
            errorMessage = error.message || 'Failed to create payment intent';
          }
        }
        return { data: null, error: errorMessage };
      }

      return { data, error: null };
    } catch (error: any) {
      console.error('Error creating payment intent:', error);
      return { data: null, error: error.message };
    }
  },

  /**
   * Create a checkout session for patient (simplified)
   */
  async createCheckoutSession(
    appointmentId: string,
    successUrl: string,
    cancelUrl: string,
  ): Promise<{ data: CheckoutSession | null; error: string | null }> {
    try {
      // Stripe function dispatches on ?action= query OR body.action — body is
      // the reliable channel since supabase-js does not forward query strings
      // appended to the function slug. Amount is sourced server-side from the
      // appointment row, so never sent here.
      const { data, error } = await supabase.functions.invoke('stripe-payment?action=create-checkout', {
        body: {
          action: 'create-checkout',
          appointmentId,
          successUrl,
          cancelUrl,
        },
      });

      if (error) {
        let errorMessage = error.message;
        if (error instanceof FunctionsHttpError) {
          try {
            const statusCode = error.context?.status ?? 500;
            const textContent = await error.context?.text();
            const errorData = textContent ? JSON.parse(textContent) : {};
            errorMessage = errorData.error || textContent || error.message || 'Erro ao criar checkout';
          } catch {
            errorMessage = error.message || 'Erro ao criar checkout';
          }
        }
        return { data: null, error: errorMessage };
      }

      return { data, error: null };
    } catch (error: any) {
      console.error('[PaymentService] Create checkout error:', error);
      return { data: null, error: error.message };
    }
  },

  /**
   * Get payment status
   */
  async getPaymentStatus(paymentIntentId: string): Promise<{ 
    data: { status: string; amount: number; currency: string } | null; 
    error: string | null 
  }> {
    try {
      const { data, error } = await supabase.functions.invoke(
        `stripe-payment?action=payment-status&payment_intent_id=${paymentIntentId}`,
        { body: { action: 'payment-status', payment_intent_id: paymentIntentId } }
      );

      if (error) {
        let errorMessage = error.message;
        if (error instanceof FunctionsHttpError) {
          try {
            const statusCode = error.context?.status ?? 500;
            const textContent = await error.context?.text();
            errorMessage = `[Code: ${statusCode}] ${textContent || error.message || 'Unknown error'}`;
          } catch {
            errorMessage = `${error.message || 'Failed to get payment status'}`;
          }
        }
        return { data: null, error: errorMessage };
      }

      return { data, error: null };
    } catch (error: any) {
      console.error('Error getting payment status:', error);
      return { data: null, error: error.message };
    }
  },

  /**
   * Create Stripe Connect account for psychologist
   */
  async createConnectAccount(): Promise<{ data: { url: string; accountId: string } | null; error: string | null }> {
    try {
      const { data, error } = await supabase.functions.invoke('stripe-payment?action=create-connect-account', {
        body: { action: 'create-connect-account' },
      });

      if (error) {
        let errorMessage = error.message;
        if (error instanceof FunctionsHttpError) {
          try {
            const statusCode = error.context?.status ?? 500;
            const textContent = await error.context?.text();
            errorMessage = `[Code: ${statusCode}] ${textContent || error.message || 'Unknown error'}`;
          } catch {
            errorMessage = `${error.message || 'Failed to create connect account'}`;
          }
        }
        return { data: null, error: errorMessage };
      }

      return { data, error: null };
    } catch (error: any) {
      console.error('Error creating connect account:', error);
      return { data: null, error: error.message };
    }
  },

  /**
   * Verify if psychologist can receive payments
   */
  async verifyPsychologist(psychologistId: string): Promise<{
    data: {
      canReceivePayments: boolean;
      hasAccount: boolean;
      onboardingCompleted: boolean;
    } | null;
    error: string | null;
  }> {
    try {
      const { data, error } = await supabase.functions.invoke('stripe-payment?action=verify-psychologist', {
        body: { action: 'verify-psychologist', psychologistId },
      });

      if (error) {
        let errorMessage = error.message;
        if (error instanceof FunctionsHttpError) {
          try {
            const statusCode = error.context?.status ?? 500;
            const textContent = await error.context?.text();
            const errorData = textContent ? JSON.parse(textContent) : {};
            errorMessage = errorData.error || textContent || error.message || 'Unknown error';
          } catch {
            errorMessage = error.message || 'Failed to verify psychologist';
          }
        }
        return { data: null, error: errorMessage };
      }

      return { data, error: null };
    } catch (error: any) {
      console.error('Error verifying psychologist:', error);
      return { data: null, error: error.message };
    }
  },

  /**
   * Get Stripe Connect account status
   */
  async getConnectAccountStatus(): Promise<{ 
    data: ConnectAccountStatus | null;
    error: string | null;
  }> {
    try {
      const { data, error } = await supabase.functions.invoke('stripe-payment?action=connect-account-status', {
        body: { action: 'connect-account-status' },
      });

      if (error) {
        let errorMessage = error.message;
        if (error instanceof FunctionsHttpError) {
          try {
            const statusCode = error.context?.status ?? 500;
            const textContent = await error.context?.text();
            const errorData = textContent ? JSON.parse(textContent) : {};
            errorMessage = errorData.error || textContent || error.message || 'Unknown error';
          } catch {
            errorMessage = error.message || 'Failed to get account status';
          }
        }
        return { data: null, error: errorMessage };
      }

      return { data, error: null };
    } catch (error: any) {
      console.error('Error getting connect account status:', error);
      return { data: null, error: error.message };
    }
  },

  /**
   * Create Stripe Connect account link (for re-onboarding)
   */
  async createConnectAccountLink(): Promise<{ data: { url: string } | null; error: string | null }> {
    try {
      const { data, error } = await supabase.functions.invoke('stripe-payment?action=create-connect-account-link', {
        body: { action: 'create-connect-account-link' },
      });

      if (error) {
        let errorMessage = error.message;
        if (error instanceof FunctionsHttpError) {
          try {
            const statusCode = error.context?.status ?? 500;
            const textContent = await error.context?.text();
            errorMessage = `[Code: ${statusCode}] ${textContent || error.message || 'Unknown error'}`;
          } catch {
            errorMessage = `${error.message || 'Failed to create account link'}`;
          }
        }
        return { data: null, error: errorMessage };
      }

      return { data, error: null };
    } catch (error: any) {
      console.error('Error creating connect account link:', error);
      return { data: null, error: error.message };
    }
  },

  /**
   * Create Stripe Dashboard login link
   */
  async createLoginLink(): Promise<{ data: { url: string } | null; error: string | null }> {
    try {
      const { data, error } = await supabase.functions.invoke('stripe-payment?action=create-login-link', {
        body: { action: 'create-login-link' },
      });

      if (error) {
        let errorMessage = error.message;
        if (error instanceof FunctionsHttpError) {
          try {
            const statusCode = error.context?.status ?? 500;
            const textContent = await error.context?.text();
            errorMessage = `[Code: ${statusCode}] ${textContent || error.message || 'Unknown error'}`;
          } catch {
            errorMessage = `${error.message || 'Failed to create login link'}`;
          }
        }
        return { data: null, error: errorMessage };
      }

      return { data, error: null };
    } catch (error: any) {
      console.error('Error creating login link:', error);
      return { data: null, error: error.message };
    }
  },


};
