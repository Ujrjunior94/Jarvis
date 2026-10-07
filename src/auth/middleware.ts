import { Request, Response, NextFunction } from 'express';
import { getAuthProvider } from './provider';
import { AuthUser, UserRole } from './types';
import { ErrorCategory, JarvisError } from '../lib/errors';

// Extender Express Request para carregar o usuário autenticado
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Middleware central de autenticação da API do JARVIS.
 * Em produção: nenhuma rota protegida pode ser acessada anonimamente.
 * Em desenvolvimento: permite operação com usuário dev explícito quando não houver token configurado.
 */
export async function authenticateRequest(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const provider = getAuthProvider();
  const authHeader = req.headers.authorization || (req.headers['x-api-key'] as string);

  try {
    const user = await provider.verifyToken(authHeader);

    if (user) {
      req.user = user;
      return next();
    }

    // Se estiver em produção ou o provedor exigir autenticação explícita
    if (process.env.NODE_ENV === 'production' || provider.getMode() === 'SUPABASE_AUTH') {
      return next(
        new JarvisError(
          ErrorCategory.AUTH_ERROR,
          'Acesso não autorizado. É necessário fornecer um token Bearer válido para acessar este endpoint em produção.',
          401
        )
      );
    }

    // Em ambiente de desenvolvimento local sem token enviado:
    // Utiliza usuário default de desenvolvimento
    req.user = provider.getDefaultDevUser();
    return next();
  } catch (err: any) {
    return next(
      new JarvisError(
        ErrorCategory.AUTH_ERROR,
        'Falha na validação das credenciais de autenticação.',
        401
      )
    );
  }
}

/**
 * Middleware para exigir papel mínimo (ex: 'admin')
 */
export function requireRole(minimumRole: UserRole) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(
        new JarvisError(
          ErrorCategory.AUTH_ERROR,
          'Usuário não autenticado.',
          401
        )
      );
    }

    if (minimumRole === 'admin' && req.user.role !== 'admin') {
      return next(
        new JarvisError(
          ErrorCategory.FORBIDDEN,
          'Acesso negado: privilégios de administrador necessários para esta operação.',
          403
        )
      );
    }

    return next();
  };
}
