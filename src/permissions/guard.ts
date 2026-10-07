import crypto from 'crypto';
import {
  PendingConfirmation,
  ProjectId,
  ToolPermission,
} from '../types/jarvis';
import { getCurrentDateTime } from '../lib/datetime';

export const CONFIRMATION_DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutos

export interface ConfirmationValidationResult {
  valid: boolean;
  error?: string;
  reason?: 'NOT_FOUND' | 'EXPIRED' | 'REUSED' | 'CONVERSATION_MISMATCH' | 'USER_MISMATCH';
  confirmation?: PendingConfirmation;
}

class PermissionGuard {
  // Confirmações ativas pendentes indexadas pelo token seguro
  private pendingConfirmations: Map<string, PendingConfirmation> = new Map();
  // Registro histórico de tokens já consumidos para detectar reutilização explícita
  private consumedTokens: Set<string> = new Set();
  // Tokens cancelados explicitamente
  private cancelledTokens: Set<string> = new Set();

  public requiresUserConfirmation(
    permission: ToolPermission,
    requireConfirmLevel = true
  ): boolean {
    if (permission === ToolPermission.READ) {
      return false;
    }
    if (permission === ToolPermission.CRITICAL) {
      return true;
    }
    if (permission === ToolPermission.CONFIRM && requireConfirmLevel) {
      return true;
    }
    return false;
  }

  /**
   * Cria uma solicitação de confirmação criptograficamente segura com validade e vínculo estrito de usuário e conversa.
   */
  public createConfirmationRequest(params: {
    toolName: string;
    project: ProjectId;
    permission: ToolPermission;
    inputParams: Record<string, unknown>;
    summary: string;
    userId: string;
    conversationId: string;
    ttlMs?: number;
  }): PendingConfirmation {
    const now = getCurrentDateTime();
    const ttlMs = params.ttlMs ?? CONFIRMATION_DEFAULT_TTL_MS;
    const expiresDate = new Date(now.timestamp + ttlMs);

    // Gerar token seguro de 32 bytes em formato hexadecimal
    const secureRandom = crypto.randomBytes(24).toString('hex');
    const token = `jarvis_sec_conf_${Date.now()}_${secureRandom}`;

    const confirmation: PendingConfirmation = {
      token,
      toolName: params.toolName,
      project: params.project,
      permission: params.permission,
      inputParams: params.inputParams,
      summary: params.summary,
      userId: params.userId || 'usr_dev_master',
      conversationId: params.conversationId || 'default-chat',
      createdAt: now.iso,
      expiresAt: expiresDate.toISOString(),
    };

    this.pendingConfirmations.set(token, confirmation);
    return confirmation;
  }

  /**
   * Valida e consome o token de confirmação de uso único.
   * Verifica:
   * 1. Se já foi reutilizado
   * 2. Se foi cancelado
   * 3. Se existe
   * 4. Se expirou
   * 5. Se pertence ao mesmo usuário
   * 6. Se pertence à mesma conversa
   */
  public validateAndConsumeConfirmation(
    token: string,
    userId: string,
    conversationId: string
  ): ConfirmationValidationResult {
    if (!token) {
      return { valid: false, error: 'Token de confirmação não fornecido.', reason: 'NOT_FOUND' };
    }

    if (this.consumedTokens.has(token)) {
      return {
        valid: false,
        error: 'Este token de confirmação já foi utilizado anteriormente (uso único obrigatório).',
        reason: 'REUSED',
      };
    }

    if (this.cancelledTokens.has(token)) {
      return {
        valid: false,
        error: 'Esta solicitação de confirmação foi cancelada anteriormente.',
        reason: 'NOT_FOUND',
      };
    }

    const pending = this.pendingConfirmations.get(token);
    if (!pending) {
      return {
        valid: false,
        error: 'Token de confirmação inexistente ou inválido.',
        reason: 'NOT_FOUND',
      };
    }

    // Verificar se expirou
    const nowMs = getCurrentDateTime().timestamp;
    const expiryMs = new Date(pending.expiresAt).getTime();
    if (nowMs > expiryMs) {
      // Remover dos pendentes para limpeza
      this.pendingConfirmations.delete(token);
      return {
        valid: false,
        error: `O token de confirmação expirou em ${pending.expiresAt}. Solicite uma nova operação.`,
        reason: 'EXPIRED',
      };
    }

    // Verificar correspondência de usuário
    if (pending.userId !== userId) {
      return {
        valid: false,
        error: 'Operação rejeitada: este token de confirmação pertence a outro usuário.',
        reason: 'USER_MISMATCH',
      };
    }

    // Verificar correspondência de conversa
    if (pending.conversationId !== conversationId) {
      return {
        valid: false,
        error: 'Operação rejeitada: este token de confirmação foi emitido para outra conversa.',
        reason: 'CONVERSATION_MISMATCH',
      };
    }

    // Consumo atômico de uso único
    this.pendingConfirmations.delete(token);
    this.consumedTokens.add(token);

    return {
      valid: true,
      confirmation: pending,
    };
  }

  public consumeConfirmation(token: string): PendingConfirmation | undefined {
    const item = this.pendingConfirmations.get(token);
    if (item) {
      this.pendingConfirmations.delete(token);
      this.consumedTokens.add(token);
    }
    return item;
  }

  /**
   * Cancela explicitamente uma confirmação pendente.
   */
  public cancelConfirmation(
    token: string,
    userId?: string,
    conversationId?: string
  ): { success: boolean; error?: string } {
    const pending = this.pendingConfirmations.get(token);
    if (!pending) {
      return { success: false, error: 'Solicitação de confirmação não encontrada.' };
    }

    if (userId && pending.userId !== userId) {
      return { success: false, error: 'Apenas o usuário solicitante pode cancelar esta confirmação.' };
    }

    if (conversationId && pending.conversationId !== conversationId) {
      return { success: false, error: 'Apenas a conversa de origem pode cancelar esta confirmação.' };
    }

    this.pendingConfirmations.delete(token);
    this.cancelledTokens.add(token);
    return { success: true };
  }

  public getPendingConfirmation(token: string): PendingConfirmation | undefined {
    return this.pendingConfirmations.get(token);
  }

  public listPending(userId?: string, conversationId?: string): PendingConfirmation[] {
    const list = Array.from(this.pendingConfirmations.values());
    return list.filter((p) => {
      if (userId && p.userId !== userId) return false;
      if (conversationId && p.conversationId !== conversationId) return false;
      return true;
    });
  }

  /**
   * Limpa tokens expirados da memória
   */
  public pruneExpired(): number {
    const now = Date.now();
    let count = 0;
    for (const [token, item] of this.pendingConfirmations.entries()) {
      if (now > new Date(item.expiresAt).getTime()) {
        this.pendingConfirmations.delete(token);
        count++;
      }
    }
    return count;
  }

  /**
   * Reseta o estado (usado em testes automatizados)
   */
  public reset(): void {
    this.pendingConfirmations.clear();
    this.consumedTokens.clear();
    this.cancelledTokens.clear();
  }
}

export const permissionGuard = new PermissionGuard();
