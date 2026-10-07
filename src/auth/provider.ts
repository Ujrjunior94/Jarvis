import { AuthMode, AuthProvider, AuthUser } from './types';

/**
 * Provedor de Autenticação em Modo Desenvolvimento
 * Permite operação local segura mantendo a distinção explícita de que é modo DEV.
 * Suporta autenticação opcional por token JARVIS_API_KEY ou cabeçalho Bearer.
 */
export class DevAuthProvider implements AuthProvider {
  public id = 'development';
  public name = 'Modo Desenvolvimento Local';

  public getMode(): AuthMode {
    return 'DEVELOPMENT';
  }

  public isConfigured(): boolean {
    return true;
  }

  public getDefaultDevUser(): AuthUser {
    return {
      id: 'usr_dev_master',
      name: 'Ubirajara Junior',
      email: 'ubirajaraaux@gmail.com',
      role: 'admin',
      isAnonymous: false,
    };
  }

  public async verifyToken(token?: string): Promise<AuthUser | null> {
    // Se o token for fornecido e começar com dev_ ou bater com JARVIS_API_KEY
    const serverDevKey = process.env.JARVIS_API_KEY || process.env.DEV_AUTH_TOKEN;

    if (serverDevKey && token) {
      if (token === serverDevKey || token === `Bearer ${serverDevKey}`) {
        return this.getDefaultDevUser();
      }
      return null;
    }

    // Em modo de desenvolvimento, se não houver chave obrigatória exigida, retorna o usuário padrão de desenvolvimento
    if (process.env.NODE_ENV !== 'production') {
      return this.getDefaultDevUser();
    }

    return null;
  }
}

/**
 * Provedor de Autenticação preparado para Supabase Auth
 * Verifica se as credenciais do Supabase existem no ambiente antes de declarar suporte.
 */
export class SupabaseAuthProvider implements AuthProvider {
  public id = 'supabase';
  public name = 'Supabase Auth';

  public isConfigured(): boolean {
    return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
  }

  public getMode(): AuthMode {
    return this.isConfigured() ? 'SUPABASE_AUTH' : 'DEVELOPMENT';
  }

  public getDefaultDevUser(): AuthUser {
    return {
      id: 'usr_supabase_unconfigured',
      name: 'Usuário Supabase Não Configurado',
      role: 'viewer',
      isAnonymous: true,
    };
  }

  public async verifyToken(token?: string): Promise<AuthUser | null> {
    if (!this.isConfigured() || !token) {
      return null;
    }

    // Preparado para verificação via Supabase JWT client-side / REST API
    try {
      const cleanToken = token.replace(/^Bearer\s+/i, '');
      const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
        headers: {
          Authorization: `Bearer ${cleanToken}`,
          apikey: process.env.SUPABASE_ANON_KEY!,
        },
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return {
        id: data.id,
        email: data.email,
        name: data.user_metadata?.name || data.email || 'Usuário Supabase',
        role: data.app_metadata?.role || 'operator',
        isAnonymous: false,
      };
    } catch {
      return null;
    }
  }
}

// Instância singleton ativa
let currentAuthProvider: AuthProvider = new DevAuthProvider();

export function getAuthProvider(): AuthProvider {
  if (process.env.AUTH_PROVIDER === 'supabase' && process.env.SUPABASE_URL) {
    if (!(currentAuthProvider instanceof SupabaseAuthProvider)) {
      currentAuthProvider = new SupabaseAuthProvider();
    }
  } else {
    if (!(currentAuthProvider instanceof DevAuthProvider)) {
      currentAuthProvider = new DevAuthProvider();
    }
  }
  return currentAuthProvider;
}

export function setAuthProvider(provider: AuthProvider): void {
  currentAuthProvider = provider;
}
