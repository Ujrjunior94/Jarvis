import express, { Request, Response, NextFunction } from 'express';
import { processUserTurn } from '../ai/agent/orchestrator';
import { memoryStore } from '../ai/memory/store';
import { isToolSandboxEnabled, toolRegistry } from '../tools/registry';
import { getConnectedProjectsOverview } from '../tools/system';
import { postoAdmAdapter } from '../integrations/posto-adm/adapter';
import { rotaPlannerAdapter } from '../integrations/rotaplanner/adapter';
import { controleGastosAdapter } from '../integrations/gastos/adapter';
import { AIProviderFactory } from '../ai/provider';
import { jarvisLogger } from '../lib/logger';
import { authenticateRequest } from '../auth/middleware';
import { getAuthProvider } from '../auth/provider';
import { centralErrorHandler, ErrorCategory, JarvisError } from '../lib/errors';
import { getCurrentDateTime } from '../lib/datetime';
import { assertValidAttachments } from '../lib/validation';

export function createApiRouter() {
  const router = express.Router();

  /**
   * GET /api/health — Endpoint público de monitoramento e auditoria de estado
   * NUNCA retorna senhas, chaves de API, tokens ou variáveis sensíveis.
   * Informa os status reais: ONLINE | MOCK | OFFLINE | NOT_CONFIGURED
   */
  router.get('/health', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const now = getCurrentDateTime();
      const postoStatus = await postoAdmAdapter.checkStatus();
      const rotaStatus = await rotaPlannerAdapter.checkStatus();
      const gastosStatus = await controleGastosAdapter.checkStatus();
      const providerInfo = AIProviderFactory.getProviderStatus();
      const authProvider = getAuthProvider();
      const sandboxEnabled = isToolSandboxEnabled();

      // Mapeamento estrito dos estados reais conforme especificação
      const resolveAdapterState = (
        status: string,
        isMock: boolean,
        hasUrl: boolean
      ): 'ONLINE' | 'MOCK' | 'OFFLINE' | 'NOT_CONFIGURED' => {
        if (status === 'OFFLINE') return 'OFFLINE';
        if (status === 'NOT_CONFIGURED' || !hasUrl) {
          return isMock ? 'MOCK' : 'NOT_CONFIGURED';
        }
        return isMock ? 'MOCK' : 'ONLINE';
      };

      const postoState = resolveAdapterState(
        postoStatus.status,
        postoStatus.isMock,
        Boolean(postoAdmAdapter.getApiUrl())
      );
      const rotaState = resolveAdapterState(
        rotaStatus.status,
        rotaStatus.isMock,
        Boolean(rotaPlannerAdapter.getApiUrl())
      );
      const gastosState = resolveAdapterState(
        gastosStatus.status,
        gastosStatus.isMock,
        Boolean(controleGastosAdapter.getApiUrl())
      );

      res.json({
        jarvis: {
          name: 'JARVIS — Núcleo de Assistência Digital',
          version: '1.1.0',
          status: 'ONLINE',
          timestamp: now.timestamp,
          isoDate: now.iso,
          currentTime: now.time,
          currentDate: now.date,
          dayOfWeek: now.dayOfWeek,
          timezone: now.timezone,
        },
        aiProvider: {
          provider: providerInfo.activeProvider,
          model: providerInfo.activeModel,
          configured: providerInfo.isConfigured,
        },
        memoryMode: memoryStore.getMemoryMode(),
        integrations: {
          postoAdm: {
            name: 'Posto ADM',
            status: postoState,
            mode: 'MOCK',
            apiConfigured: Boolean(postoAdmAdapter.getApiUrl()),
          },
          rotaplanner: {
            name: 'RotaPlanner',
            status: rotaState,
            mode: 'MOCK',
            apiConfigured: Boolean(rotaPlannerAdapter.getApiUrl()),
          },
          controleGastos: {
            name: 'Controle de Gastos',
            status: gastosState,
            mode: 'PLANNED_MOCK',
            apiConfigured: Boolean(controleGastosAdapter.getApiUrl()),
          },
        },
        security: {
          authMode: authProvider.getMode(),
          toolSandboxEnabled: sandboxEnabled,
          environment: process.env.NODE_ENV || 'development',
        },
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * Handler centralizado para turnos do agente conversacional
   */
  const handleAgentTurn = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { message, conversationId, confirmedToken, cancelToken, attachment } = req.body || {};

      if ((!message || typeof message !== 'string') && !confirmedToken && !cancelToken) {
        throw new JarvisError(
          ErrorCategory.VALIDATION_ERROR,
          'O parâmetro "message" é obrigatório e deve ser uma cadeia de texto válida.',
          400
        );
      }

      // Validação estrita do anexo caso presente
      if (attachment) {
        assertValidAttachments([attachment]);
      }

      const turnOutput = await processUserTurn({
        message: typeof message === 'string' ? message : 'Confirmação de operação',
        conversationId: typeof conversationId === 'string' ? conversationId : 'conv_principal',
        confirmedToken: typeof confirmedToken === 'string' ? confirmedToken : undefined,
        cancelToken: typeof cancelToken === 'string' ? cancelToken : undefined,
        attachment:
          attachment && typeof attachment.name === 'string' && typeof attachment.base64Data === 'string'
            ? attachment
            : undefined,
        user: req.user
          ? {
              id: req.user.id,
              name: req.user.name,
              role: req.user.role === 'admin' ? 'admin' : 'operator',
              preferences: memoryStore.getPreferences(),
            }
          : undefined,
      });

      res.json({
        success: true,
        ...turnOutput,
        memory: memoryStore.getFullMemory(),
      });
    } catch (err) {
      next(err);
    }
  };

  // Rotas conversacionais protegidas por autenticação
  router.post('/chat', authenticateRequest, handleAgentTurn);
  router.post('/agent', authenticateRequest, handleAgentTurn);

  /**
   * GET /api/tools — Lista ferramentas cadastradas e logs
   */
  router.get('/tools', (_req: Request, res: Response) => {
    const tools = toolRegistry.getAllTools().map((t) => ({
      name: t.name,
      description: t.description,
      project: t.project,
      permission: t.permission,
      parameters: t.parameters,
    }));
    res.json({
      total: tools.length,
      sandboxEnabled: isToolSandboxEnabled(),
      tools,
      logs: jarvisLogger.getLogs(50),
    });
  });

  /**
   * POST /api/tools — Execução direta de ferramentas (Protegido por Sandbox Guard e Auth)
   */
  router.post('/tools', authenticateRequest, async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Regra #7: Bloqueia execução arbitrária direta quando o sandbox estiver desativado
      if (!isToolSandboxEnabled()) {
        throw new JarvisError(
          ErrorCategory.FORBIDDEN,
          'A execução direta arbitrária de ferramentas está desativada (TOOL_SANDBOX_ENABLED=false). Todas as operações devem ser orquestradas através do agente.',
          403
        );
      }

      const { toolName, params, confirmedToken } = req.body || {};
      if (!toolName || typeof toolName !== 'string') {
        throw new JarvisError(
          ErrorCategory.VALIDATION_ERROR,
          'O nome da ferramenta (toolName) é obrigatório.',
          400
        );
      }

      const prefs = memoryStore.getPreferences();
      const shortTerm = memoryStore.getShortTermContext();
      const now = getCurrentDateTime();

      const result = await toolRegistry.executeTool(toolName, params || {}, {
        user: {
          id: req.user?.id || 'usr_dev_master',
          name: req.user?.name || 'Ubirajara Junior',
          role: req.user?.role === 'admin' ? 'admin' : 'operator',
          preferences: prefs,
        },
        conversationId: 'conv_principal',
        currentDate: now.date,
        confirmedToken: typeof confirmedToken === 'string' ? confirmedToken : undefined,
        memorySnapshot: {
          lastIntent: shortTerm.lastIntent,
          lastProject: shortTerm.lastProject,
          lastPeriod: shortTerm.lastPeriod,
          lastToolCalled: shortTerm.lastToolCalled,
        },
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  /**
   * GET /api/memory — Consulta snapshot completo de memória
   */
  router.get('/memory', (_req: Request, res: Response) => {
    res.json(memoryStore.getFullMemory());
  });

  /**
   * POST /api/memory — Atualiza dados da memória (Protegido por Auth)
   */
  router.post('/memory', authenticateRequest, (req: Request, res: Response, next: NextFunction) => {
    try {
      const { action, fact, category, factId, preferences, conversationId } = req.body || {};

      if (action === 'add_fact' && typeof fact === 'string' && fact.trim()) {
        const created = memoryStore.addLongTermFact(fact, category || 'pessoal', 'Painel de Memória');
        res.json({ success: true, fact: created, memory: memoryStore.getFullMemory() });
        return;
      }

      if (action === 'remove_fact' && typeof factId === 'string') {
        memoryStore.removeLongTermFact(factId);
        res.json({ success: true, memory: memoryStore.getFullMemory() });
        return;
      }

      if (action === 'update_preferences' && preferences && typeof preferences === 'object') {
        const updated = memoryStore.updatePreferences(preferences);
        res.json({ success: true, preferences: updated, memory: memoryStore.getFullMemory() });
        return;
      }

      if (action === 'clear_conversation') {
        memoryStore.clearConversation(conversationId || 'conv_principal');
        res.json({ success: true, memory: memoryStore.getFullMemory() });
        return;
      }

      if (action === 'clear_logs') {
        jarvisLogger.clearLogs();
        res.json({ success: true, memory: memoryStore.getFullMemory() });
        return;
      }

      throw new JarvisError(
        ErrorCategory.VALIDATION_ERROR,
        'Ação de gerenciamento de memória não reconhecida ou inválida.',
        400
      );
    } catch (err) {
      next(err);
    }
  });

  /**
   * GET /api/integrations — Status das integrações
   */
  router.get('/integrations', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const projects = await getConnectedProjectsOverview();
      res.json({
        projects,
        simulationFlags: {
          postoOffline: postoAdmAdapter.isSimulatedOffline(),
          rotaOffline: rotaPlannerAdapter.isSimulatedOffline(),
        },
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * POST /api/integrations — Simulação de status offline/online (Protegido por Auth)
   */
  router.post('/integrations', authenticateRequest, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { target, simulateOffline } = req.body || {};
      if (target === 'posto-adm') {
        postoAdmAdapter.setSimulatedOffline(Boolean(simulateOffline));
      } else if (target === 'rotaplanner') {
        rotaPlannerAdapter.setSimulatedOffline(Boolean(simulateOffline));
      }

      const projects = await getConnectedProjectsOverview();
      res.json({
        success: true,
        projects,
        simulationFlags: {
          postoOffline: postoAdmAdapter.isSimulatedOffline(),
          rotaOffline: rotaPlannerAdapter.isSimulatedOffline(),
        },
      });
    } catch (err) {
      next(err);
    }
  });

  // Error handler centralizado que sanitiza e formata qualquer falha
  router.use(centralErrorHandler);

  return router;
}
