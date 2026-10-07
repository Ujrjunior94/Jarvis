import {
  AgentContext,
  ErrorCategory,
  Tool,
  ToolPermission,
  ToolResult,
} from '../types/jarvis';
import { postoTools } from './posto';
import { rotaTools } from './rota';
import { gastosTools } from './gastos';
import { systemTools } from './system';
import { permissionGuard } from '../permissions/guard';
import { jarvisLogger } from '../lib/logger';
import { memoryStore } from '../ai/memory/store';

/**
 * Registro Central de Ferramentas do JARVIS
 * Concentra validação de entrada, checagem de permissões (READ / CONFIRM / CRITICAL),
 * execução isolada, tratamento de erros e auditoria de logs.
 */
class ToolRegistry {
  private tools: Map<string, Tool<any, any>> = new Map();

  constructor() {
    const allTools = [...postoTools, ...rotaTools, ...gastosTools, ...systemTools];
    for (const tool of allTools) {
      this.tools.set(tool.name, tool);
    }
  }

  public getAllTools(): Tool<any, any>[] {
    return Array.from(this.tools.values());
  }

  public getToolsByProject(project: string): Tool<any, any>[] {
    return this.getAllTools().filter((t) => t.project === project);
  }

  public getTool(name: string): Tool<any, any> | undefined {
    return this.tools.get(name);
  }

  public async executeTool(
    toolName: string,
    rawInput: Record<string, unknown>,
    context: AgentContext
  ): Promise<ToolResult> {
    const start = Date.now();
    const tool = this.getTool(toolName);

    if (!tool) {
      const res: ToolResult = {
        success: false,
        toolName,
        project: 'system',
        permission: ToolPermission.READ,
        isMock: false,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - start,
        message: `Ferramenta "${toolName}" não encontrada no registro do JARVIS.`,
        errorCategory: ErrorCategory.TOOL_UNAVAILABLE,
      };
      jarvisLogger.logToolExecution({
        toolName,
        project: 'system',
        permission: ToolPermission.READ,
        durationMs: res.durationMs,
        success: false,
        isMock: false,
        actionSummary: res.message,
        inputParams: rawInput,
        errorCategory: ErrorCategory.TOOL_UNAVAILABLE,
      });
      return res;
    }

    // 1. Validação estrita de entrada
    const validation = tool.validate(rawInput || {});
    if (!validation.valid) {
      const res: ToolResult = {
        success: false,
        toolName: tool.name,
        project: tool.project,
        permission: tool.permission,
        isMock: true,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - start,
        message: `Parâmetros inválidos para ${tool.name}: ${validation.error}`,
        errorCategory: ErrorCategory.INVALID_INPUT,
      };
      jarvisLogger.logToolExecution({
        toolName: tool.name,
        project: tool.project,
        permission: tool.permission,
        durationMs: res.durationMs,
        success: false,
        isMock: true,
        actionSummary: res.message,
        inputParams: rawInput,
        errorCategory: ErrorCategory.INVALID_INPUT,
      });
      return res;
    }

    const parsedInput = (validation.parsed || rawInput || {}) as Record<string, unknown>;
    const prefs = memoryStore.getPreferences();

    // 2. Verificação de Permissões (READ / CONFIRM / CRITICAL)
    const needsConfirmation = permissionGuard.requiresUserConfirmation(
      tool.permission,
      context.confirmedToken,
      prefs.requireConfirmLevelApproval
    );

    if (needsConfirmation) {
      const prep = tool.prepareConfirmation
        ? tool.prepareConfirmation(parsedInput)
        : {
            summary: `A ferramenta ${tool.name} possui nível de permissão ${tool.permission}. Deseja autorizar a execução?`,
            details: parsedInput,
          };

      const confirmation = permissionGuard.createConfirmationRequest({
        toolName: tool.name,
        project: tool.project,
        permission: tool.permission,
        inputParams: parsedInput,
        summary: prep.summary,
      });

      const res: ToolResult = {
        success: false,
        toolName: tool.name,
        project: tool.project,
        permission: tool.permission,
        isMock: true,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - start,
        data: prep.details,
        message: prep.summary,
        errorCategory: ErrorCategory.CONFIRMATION_REQUIRED,
        requiresConfirmation: true,
        confirmationToken: confirmation.token,
        pendingActionSummary: prep.summary,
      };

      jarvisLogger.logToolExecution({
        toolName: tool.name,
        project: tool.project,
        permission: tool.permission,
        durationMs: res.durationMs,
        success: true,
        isMock: true,
        actionSummary: `[AGUARDANDO CONFIRMAÇÃO ${tool.permission}] ${prep.summary}`,
        inputParams: parsedInput,
        errorCategory: ErrorCategory.CONFIRMATION_REQUIRED,
      });

      return res;
    }

    // Se havia token de confirmação válido, consumi-lo
    if (context.confirmedToken) {
      permissionGuard.consumeConfirmation(context.confirmedToken);
    }

    // 3. Execução da ferramenta
    const result = await tool.execute(parsedInput, context);

    // 4. Registro em Log Auditável
    jarvisLogger.logToolExecution({
      toolName: tool.name,
      project: tool.project,
      permission: tool.permission,
      durationMs: result.durationMs,
      success: result.success,
      isMock: result.isMock,
      user: context.user.name,
      actionSummary: result.message,
      inputParams: parsedInput,
      errorCategory: result.errorCategory,
    });

    // 5. Atualização da Memória de Curto Prazo
    if (result.success) {
      memoryStore.updateShortTermContext({
        lastProject: tool.project,
        lastToolCalled: tool.name,
        lastPeriod: (parsedInput.periodo as string) || context.memorySnapshot.lastPeriod || 'semana',
      });
    }

    return result;
  }
}

export const toolRegistry = new ToolRegistry();
