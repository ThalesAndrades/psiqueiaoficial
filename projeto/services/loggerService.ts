class LoggerService {
  private isDevelopment = __DEV__;

  error(context: string, message: string, error?: unknown) {
    console.error(`[${context}] ${message}`);
    if (error) {
      console.error(error);
    }
  }

  warn(context: string, message: string) {
    if (this.isDevelopment) {
      console.warn(`[${context}] ${message}`);
    }
  }

  info(context: string, message: string, data?: unknown) {
    if (this.isDevelopment) {
      console.log(`[${context}] ${message}`, data || '');
    }
  }

  log(context: string, message: string, data?: unknown) {
    if (this.isDevelopment) {
      console.log(`[${context}] ${message}`, data || '');
    }
  }

  // Alias dev-only para detalhes verbosos (auth, profile fetch, deep links).
  // Em produção isto é no-op para não vazar PII em React Native dev logs.
  debug(context: string, message: string, data?: unknown) {
    if (this.isDevelopment) {
      console.log(`[${context}] ${message}`, data ?? '');
    }
  }
}

export const logger = new LoggerService();
