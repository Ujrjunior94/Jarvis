import express, { Request, Response } from 'express';
import { processUserTurn } from '../ai/agent/orchestrator';
import { memoryStore } from '../ai/memory/store';
import { toolRegistry } from '../tools/registry';
import { getConnectedProjectsOverview } from '../tools/system';
import { postoAdmAdapter } from '../integrations/posto-adm/adapter';
import { rotaPlannerAdapter } from '../integrations/rotaplanner/adapter';
import { controleGastosAdapter } from '../integrations/gastos/adapter';
import { AIProviderFactory } from '../ai/provider';
import { jarvisLogger } from '../lib/logger';

export function createApiRouter() {
  const router = express.Router();

  router.get('/health', async (_req: Request, res: Response) => {
    const postoStatus = await postoAdmAdapter.checkStatus();
    const rotaStatus = await rotaPlannerAdapter.checkStatus();
    const gastosStatus = await controleGastosAdapter.checkStatus();
    const providerInfo = AIProviderFactory.getProviderStatus();
    const dbInfo = memoryStore.getDatabaseStatus();

    const mapToolState = (st: string, isMock: boolean) => {
      if (st === 'OFFLINE') return 'offline';
      if (st === 'NOT_CONFIGURED') return 'not_configured';
      return isMock ? 'mock' : 'online';
    };

    res.json({
      status: 'ok',
      version: '1.0.0',
      ai: 'configured',
      aiDetails: providerInfo,
      memory: dbInfo.configured ? 'configured' : 'not_configured',
      memoryDetails: dbInfo,
      tools: {
        posto: mapToolState(postoStatus.status, postoStatus.isMock),
        rota: mapToolState(rotaStatus.status, rotaStatus.isMock),
        gastos: mapToolState(gastosStatus.status, gastosStatus.isMock),
      },
      timestamp: new Date().toISOString(),
    });
  });

  const handleAgentTurn = async (req: Request, res: Response) => {
    try {
      const { message, conversationId, confirmedToken, cancelToken, attachment } = req.body || {};

      if ((!message || typeof message !== 'string') && !confirmedToken && !cancelToken) {
        res.status(400).json({
          error: 'INVALID_INPUT',
          message: 'O parâmetro "message" é obrigatório e deve ser um texto válido.',
        });
        return;
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
      });

      res.json({
        success: true,
        ...turnOutput,
        memory: memoryStore.getFullMemory(),
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: 'AGENT_EXECUTION_ERROR',
        message: err instanceof Error ? err.message : 'Erro interno ao processar comando no JARVIS.',
      });
    }
  };

  router.post('/chat', handleAgentTurn);
  router.post('/agent', handleAgentTurn);

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
      tools,
      logs: jarvisLogger.getLogs(50),
    });
  });

  router.post('/tools', async (req: Request, res: Response) => {
    try {
      const { toolName, params, confirmedToken } = req.body || {};
      if (!toolName || typeof toolName !== 'string') {
        res.status(400).json({ error: 'Nome da ferramenta (toolName) é obrigatório.' });
        return;
      }

      const prefs = memoryStore.getPreferences();
      const shortTerm = memoryStore.getShortTermContext();
      const result = await toolRegistry.executeTool(toolName, params || {}, {
        user: {
          id: 'usr_ubirajara',
          name: 'Ubirajara Junior',
          role: 'admin',
          preferences: prefs,
        },
        conversationId: 'conv_principal',
        currentDate: '2026-10-06',
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
      res.status(500).json({
        success: false,
        message: err instanceof Error ? err.message : 'Erro ao executar ferramenta.',
      });
    }
  });

  router.get('/memory', (_req: Request, res: Response) => {
    res.json(memoryStore.getFullMemory());
  });

  router.post('/memory', (req: Request, res: Response) => {
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

    res.status(400).json({ error: 'Ação de memória inválida.' });
  });

  router.get('/integrations', async (_req: Request, res: Response) => {
    const projects = await getConnectedProjectsOverview();
    res.json({
      projects,
      simulationFlags: {
        postoOffline: postoAdmAdapter.isSimulatedOffline(),
        rotaOffline: rotaPlannerAdapter.isSimulatedOffline(),
      },
    });
  });

  router.post('/integrations', async (req: Request, res: Response) => {
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
  });

  return router;
}
