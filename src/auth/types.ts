export type UserRole = 'admin' | 'operator' | 'viewer';

export interface AuthUser {
  id: string;
  email?: string;
  name: string;
  role: UserRole;
  isAnonymous?: boolean;
}

export interface AuthSession {
  user: AuthUser;
  token?: string;
  expiresAt?: string;
}

export type AuthMode = 'DEVELOPMENT' | 'SUPABASE_AUTH' | 'API_BEARER';

export interface AuthProvider {
  id: string;
  name: string;
  getMode: () => AuthMode;
  isConfigured: () => boolean;
  verifyToken: (token?: string) => Promise<AuthUser | null>;
  getDefaultDevUser: () => AuthUser;
}
