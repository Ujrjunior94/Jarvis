import {
  PendingConfirmation,
  ProjectId,
  ToolPermission,
} from '../types/jarvis';

/**
 * Gerenciador de Permissões do JARVIS
 * Níveis:
 * - READ: Execução imediata de leitura e análise
 * - CONFIRM: Exige confirmação explícita antes de alterar ou registrar dados
 * - CRITICAL: Exige confirmação rigorosa antes de excluir ou executar ação destrutiva
 */
class PermissionGuard {
  private pendingConfirmations: Map<string, PendingConfirmation> = new Map();

  public requiresUserConfirmation(
    permission: ToolPermission,
    confirmedToken?: string,
    requireConfirmLevel = true
  ): boolean {
    if (permission === ToolPermission.READ) {
      return false;
    }

    if (confirmedToken && this.pendingConfirmations.has(confirmedToken)) {
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

  public createConfirmationRequest(params: {
    toolName: string;
    project: ProjectId;
    permission: ToolPermission;
    inputParams: Record<string, unknown>;
    summary: string;
  }): PendingConfirmation {
    const token = `conf_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const confirmation: PendingConfirmation = {
      token,
      toolName: params.toolName,
      project: params.project,
      permission: params.permission,
      inputParams: params.inputParams,
      summary: params.summary,
      createdAt: new Date().toISOString(),
    };
    this.pendingConfirmations.set(token, confirmation);
    return confirmation;
  }

  public getPendingConfirmation(token: string): PendingConfirmation | undefined {
    return this.pendingConfirmations.get(token);
  }

  public getLatestPendingConfirmation(): PendingConfirmation | undefined {
    const values = Array.from(this.pendingConfirmations.values());
    if (values.length === 0) return undefined;
    return values[values.length - 1];
  }

  public consumeConfirmation(token: string): PendingConfirmation | undefined {
    const item = this.pendingConfirmations.get(token);
    if (item) {
      this.pendingConfirmations.delete(token);
    }
    return item;
  }

  public cancelConfirmation(token: string): boolean {
    return this.pendingConfirmations.delete(token);
  }

  public listPending(): PendingConfirmation[] {
    return Array.from(this.pendingConfirmations.values());
  }
}

export const permissionGuard = new PermissionGuard();
