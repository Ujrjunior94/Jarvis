import {
  ErrorCategory,
  ProjectId,
  ToolExecutionLog,
  ToolPermission,
} from '../types/jarvis';

/**
 * Sistema de Logs do JARVIS
 * Registra execuções de ferramentas, duração, status e usuário.
 * Nunca armazena segredos ou chaves de API.
 */
class JarvisLogger {
  private logs: ToolExecutionLog[] = [];
  private readonly maxLogs = 200;

  private sanitizeParams(params: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    const sensitiveKeys = ['key', 'token', 'secret', 'password', 'authorization', 'api_key'];

    for (const [k, v] of Object.entries(params)) {
      if (sensitiveKeys.some((sk) => k.toLowerCase().includes(sk))) {
        sanitized[k] = '[REDACTED]';
      } else {
        sanitized[k] = v;
      }
    }
    return sanitized;
  }

  public logToolExecution(entry: {
    toolName: string;
    project: ProjectId;
    permission: ToolPermission;
    durationMs: number;
    success: boolean;
    isMock: boolean;
    user?: string;
    actionSummary: string;
    inputParams?: Record<string, unknown>;
    errorCategory?: ErrorCategory;
  }): ToolExecutionLog {
    const logItem: ToolExecutionLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      toolName: entry.toolName,
      project: entry.project,
      permission: entry.permission,
      timestamp: new Date().toISOString(),
      durationMs: Math.max(1, Math.round(entry.durationMs)),
      success: entry.success,
      isMock: entry.isMock,
      user: entry.user || 'Ubirajara Junior',
      actionSummary: entry.actionSummary,
      inputParams: this.sanitizeParams(entry.inputParams || {}),
      errorCategory: entry.errorCategory || ErrorCategory.NONE,
    };

    this.logs.unshift(logItem);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    return logItem;
  }

  public getLogs(limit = 50): ToolExecutionLog[] {
    return this.logs.slice(0, limit);
  }

  public clearLogs(): void {
    this.logs = [];
  }
}

export const jarvisLogger = new JarvisLogger();
