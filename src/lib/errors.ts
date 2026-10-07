import { Request, Response, NextFunction } from 'express';
import { ErrorCategory } from '../types/jarvis';

export { ErrorCategory };

export class JarvisError extends Error {
  public readonly category: ErrorCategory;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(category: ErrorCategory, message: string, statusCode = 400, details?: unknown) {
    super(message);
    this.name = 'JarvisError';
    this.category = category;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, JarvisError.prototype);
  }
}

/**
 * Sanitiza mensagens de erro removendo potenciais chaves de API, senhas e caminhos internos de arquivos.
 */
export function sanitizeErrorMessage(message: string): string {
  if (!message) return 'Erro interno no processamento.';

  return message
    // Mascara chaves estilo Google AIza...
    .replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_API_KEY]')
    // Mascara chaves estilo sk-...
    .replace(/sk-[a-zA-Z0-9_-]{20,}/g, '[REDACTED_API_KEY]')
    // Mascara bearer tokens
    .replace(/Bearer\s+[a-zA-Z0-9._-]+/gi, 'Bearer [REDACTED_TOKEN]')
    // Mascara caminhos absolutos no sistema de arquivos
    .replace(/\/app\/[a-zA-Z0-9_\-/.]+/g, '[INTERNAL_PATH]')
    .replace(/\/home\/[a-zA-Z0-9_\-/.]+/g, '[INTERNAL_PATH]')
    .replace(/C:\\[a-zA-Z0-9_\-\\.]+/g, '[INTERNAL_PATH]');
}

/**
 * Express Error Handler centralizado.
 * Garante que nenhuma stack trace, caminho interno ou chave sensível vaze para o cliente.
 */
export function centralErrorHandler(
  err: Error | JarvisError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const isJarvis = err instanceof JarvisError;
  const statusCode = isJarvis ? err.statusCode : 500;
  const category = isJarvis ? err.category : ErrorCategory.INTERNAL_ERROR;
  const safeMessage = sanitizeErrorMessage(err.message || 'Erro inesperado.');

  res.status(statusCode).json({
    success: false,
    error: {
      category,
      message: safeMessage,
      timestamp: new Date().toISOString(),
      ...(isJarvis && err.details ? { details: err.details } : {}),
    },
  });
}
