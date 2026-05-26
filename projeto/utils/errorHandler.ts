import { FunctionsHttpError } from '@supabase/supabase-js';

/**
 * Interface para o resultado padronizado de operações
 */
export interface ServiceResult<T> {
  data: T | null;
  error: string | null;
}

/**
 * Interface para erros estruturados
 */
export interface StructuredError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Códigos de erro padronizados
 */
export const ErrorCodes = {
  UNKNOWN: 'UNKNOWN_ERROR',
  NETWORK: 'NETWORK_ERROR',
  AUTH: 'AUTH_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  PERMISSION: 'PERMISSION_DENIED',
  SERVER: 'SERVER_ERROR',
} as const;

/**
 * Extrai mensagem de erro de uma FunctionsHttpError do Supabase
 * @param error - Erro da função do Supabase
 * @returns Mensagem de erro formatada
 */
export async function extractSupabaseFunctionError(error: FunctionsHttpError): Promise<string> {
  try {
    const statusCode = error.context?.status ?? 500;
    const textContent = await error.context?.text();
    
    if (textContent) {
      try {
        const errorData = JSON.parse(textContent);
        return errorData.error || errorData.message || textContent;
      } catch {
        return textContent;
      }
    }
    
    return `[Code: ${statusCode}] ${error.message || 'Erro desconhecido'}`;
  } catch {
    return error.message || 'Erro ao processar resposta do servidor';
  }
}

/**
 * Trata erros de forma padronizada para serviços
 * @param error - Erro capturado
 * @param context - Contexto para logging
 * @returns Mensagem de erro formatada
 */
export async function handleServiceError(
  error: unknown,
  context: string
): Promise<string> {
  console.error(`[${context}] Error:`, error);

  if (error instanceof FunctionsHttpError) {
    return await extractSupabaseFunctionError(error);
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Ocorreu um erro inesperado. Tente novamente.';
}

/**
 * Wrapper para operações assíncronas com tratamento de erro padronizado
 * @param operation - Função assíncrona a ser executada
 * @param context - Contexto para logging
 * @returns Resultado padronizado com data ou error
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  context: string
): Promise<ServiceResult<T>> {
  try {
    const data = await operation();
    return { data, error: null };
  } catch (error) {
    const errorMessage = await handleServiceError(error, context);
    return { data: null, error: errorMessage };
  }
}

/**
 * Valida se um valor é um email válido
 * @param email - Email a ser validado
 * @returns true se válido, false caso contrário
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida se um valor é um UUID válido
 * @param uuid - UUID a ser validado
 * @returns true se válido, false caso contrário
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Valida se um valor monetário é válido
 * @param amount - Valor a ser validado
 * @returns true se válido (positivo e com até 2 casas decimais)
 */
export function isValidAmount(amount: number): boolean {
  return typeof amount === 'number' && amount > 0 && Number.isFinite(amount);
}

/**
 * Sanitiza uma string removendo caracteres potencialmente perigosos
 * @param input - String a ser sanitizada
 * @returns String sanitizada
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove < e >
    .slice(0, 10000); // Limita tamanho
}
