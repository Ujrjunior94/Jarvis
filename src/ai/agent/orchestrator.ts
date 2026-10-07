import {
  AgentContext,
  AttachmentInput,
  ConversationMessage,
  Intent,
  PendingConfirmation,
  ToolResult,
} from '../../types/jarvis';
import { memoryStore } from '../memory/store';
import { interpretNaturalIntent } from './intent';
import { toolRegistry } from '../../tools/registry';
import { permissionGuard } from '../../permissions/guard';
import { buildJarvisSystemPrompt } from '../prompts/system';
import { AIProviderFactory } from '../provider';

/**
 * Orquestrador Central do Agente JARVIS
 * Separa rigorosamente:
 * 1. Interpretação de Intenção e Contexto
 * 2. Verificação de Confirmações Pendentes (Permissões CONFIRM / CRITICAL)
 * 3. Execução Estruturada de Ferramentas
 * 4. Síntese de Resposta Final (sem jamais expor cadeia de pensamento interna)
 */
export interface OrchestratorTurnOutput {
  userMessage: ConversationMessage;
  assistantMessage: ConversationMessage;
  intent: Intent;
  toolResults: ToolResult[];
  pendingConfirmation?: PendingConfirmation;
}

export async function processUserTurn(params: {
  message: string;
  conversationId?: string;
  confirmedToken?: string;
  cancelToken?: string;
  attachment?: AttachmentInput;
}): Promise<OrchestratorTurnOutput> {
  const conversationId = params.conversationId || 'conv_principal';
  const prefs = memoryStore.getPreferences();
  const shortTerm = memoryStore.getShortTermContext();
  const currentDate = '2026-10-06';

  const context: AgentContext = {
    user: {
      id: 'usr_ubirajara',
      name: 'Ubirajara Junior',
      role: 'admin',
      preferences: prefs,
    },
    conversationId,
    currentDate,
    confirmedToken: params.confirmedToken,
    attachment: params.attachment,
    memorySnapshot: {
      lastIntent: shortTerm.lastIntent,
      lastProject: shortTerm.lastProject,
      lastPeriod: shortTerm.lastPeriod,
      lastToolCalled: shortTerm.lastToolCalled,
      activeTopic: shortTerm.activeTopic,
    },
  };

  // Registrar mensagem do usuário
  const userMsg: ConversationMessage = {
    id: `msg_u_${Date.now()}`,
    role: 'user',
    content: params.message,
    timestamp: new Date().toISOString(),
    attachment: params.attachment
      ? {
          name: params.attachment.name,
          mimeType: params.attachment.mimeType,
        }
      : undefined,
  };
  memoryStore.appendMessage(conversationId, userMsg);

  // Caso 1: Cancelamento explícito de operação crítica/confirm
  if (params.cancelToken) {
    permissionGuard.cancelConfirmation(params.cancelToken);
    const cancelMsg: ConversationMessage = {
      id: `msg_a_${Date.now() + 1}`,
      role: 'assistant',
      content: 'Operação cancelada conforme solicitado. Nenhuma alteração foi realizada no sistema.',
      timestamp: new Date().toISOString(),
      providerUsed: prefs.aiProvider,
    };
    memoryStore.appendMessage(conversationId, cancelMsg);
    return {
      userMessage: userMsg,
      assistantMessage: cancelMsg,
      intent: {
        intent: 'cancelar_operacao',
        confidence: 1,
        project: 'system',
        entities: {},
        rawQuery: params.message,
      },
      toolResults: [],
    };
  }

  // Verificar se o usuário respondeu "sim" / "confirmo" no texto para uma confirmação pendente
  const normalizedText = params.message.toLowerCase().trim();
  const latestPending = permissionGuard.getLatestPendingConfirmation();
  const isVerbalConfirmation =
    latestPending &&
    (normalizedText === 'sim' ||
      normalizedText === 'confirmo' ||
      normalizedText === 'confirmar' ||
      normalizedText === 'pode excluir' ||
      normalizedText === 'autorizo');

  const activeConfirmToken = params.confirmedToken || (isVerbalConfirmation ? latestPending?.token : undefined);

  if (activeConfirmToken) {
    const pendingObj = permissionGuard.getPendingConfirmation(activeConfirmToken);
    if (pendingObj) {
      context.confirmedToken = activeConfirmToken;
      const toolResult = await toolRegistry.executeTool(
        pendingObj.toolName,
        pendingObj.inputParams,
        context
      );

      const assistantMsg: ConversationMessage = {
        id: `msg_a_${Date.now() + 1}`,
        role: 'assistant',
        content: toolResult.message,
        timestamp: new Date().toISOString(),
        toolResults: [toolResult],
        providerUsed: prefs.aiProvider,
      };
      memoryStore.appendMessage(conversationId, assistantMsg);

      return {
        userMessage: userMsg,
        assistantMessage: assistantMsg,
        intent: {
          intent: `confirmacao_${pendingObj.toolName}`,
          confidence: 1,
          project: pendingObj.project,
          suggestedTool: pendingObj.toolName,
          entities: {},
          rawQuery: params.message,
        },
        toolResults: [toolResult],
      };
    }
  }

  // 2. Interpretar intenção natural + contexto
  const intent = interpretNaturalIntent(params.message, context);
  memoryStore.updateShortTermContext({
    lastIntent: intent.intent,
    lastPeriod: intent.entities.period || shortTerm.lastPeriod || 'semana',
  });

  // Se o usuário pediu para guardar um fato na memória ("JARVIS, lembre que...")
  if (
    normalizedText.startsWith('jarvis, lembre que') ||
    normalizedText.startsWith('lembre que') ||
    normalizedText.startsWith('memorize que')
  ) {
    const cleanedFact = params.message.replace(/^(jarvis,\s*)?(lembre|memorize)\s+que\s+/i, '').trim();
    const savedFact = memoryStore.addLongTermFact(cleanedFact, 'preferencia', 'Comando Direto');
    const memMsg: ConversationMessage = {
      id: `msg_a_${Date.now() + 1}`,
      role: 'assistant',
      content: `Registrado na memória de longo prazo: *"${savedFact.fact}"*.`,
      timestamp: new Date().toISOString(),
      intent,
      providerUsed: prefs.aiProvider,
    };
    memoryStore.appendMessage(conversationId, memMsg);
    return {
      userMessage: userMsg,
      assistantMessage: memMsg,
      intent,
      toolResults: [],
    };
  }

  // 3. Executar ferramenta(s) se aplicável
  const toolResults: ToolResult[] = [];
  let pendingConfirmation: PendingConfirmation | undefined;

  if (intent.suggestedTool) {
    const toolArgs: Record<string, unknown> = {
      data: intent.entities.date,
      turno: intent.entities.shift,
      periodo: intent.entities.period,
      descontarApenasCombustivel: intent.entities.discountFuel,
      alvo: intent.entities.targetId || intent.entities.category,
      valor: intent.entities.amount,
      categoria: intent.entities.category,
      descricao: intent.entities.description,
      alteracaoProposta: intent.entities.description,
    };

    const result = await toolRegistry.executeTool(intent.suggestedTool, toolArgs, context);
    toolResults.push(result);

    if (result.requiresConfirmation && result.confirmationToken) {
      pendingConfirmation = permissionGuard.getPendingConfirmation(result.confirmationToken);
    }
  }

  // 4. Gerar resposta final limpa pelo AI Provider (sem expor cadeia de pensamento)
  let finalAnswerText: string;
  let providerUsed: string = prefs.aiProvider;

  if (pendingConfirmation) {
    finalAnswerText = pendingConfirmation.summary;
  } else if (toolResults.length > 0 && !toolResults[0].success) {
    // Nunca inventar resposta quando uma ferramenta estiver indisponível
    finalAnswerText = toolResults[0].message;
  } else {
    const provider = AIProviderFactory.getProvider(prefs.aiProvider);
    const systemPrompt = buildJarvisSystemPrompt({
      currentDate,
      facts: memoryStore.getFullMemory().longTermFacts,
      shortTermContext: memoryStore.getShortTermContext(),
    });

    const aiRes = await provider.generateResponse({
      systemPrompt,
      userMessage: params.message,
      history: memoryStore.getConversation(conversationId).messages,
      attachment: params.attachment,
      toolOutputs: toolResults,
    });

    finalAnswerText = aiRes.text;
    providerUsed = `${aiRes.provider} (${aiRes.model})`;
  }

  const assistantMsg: ConversationMessage = {
    id: `msg_a_${Date.now() + 1}`,
    role: 'assistant',
    content: finalAnswerText,
    timestamp: new Date().toISOString(),
    intent,
    toolResults: toolResults.length > 0 ? toolResults : undefined,
    pendingConfirmation,
    providerUsed,
  };

  memoryStore.appendMessage(conversationId, assistantMsg);

  return {
    userMessage: userMsg,
    assistantMessage: assistantMsg,
    intent,
    toolResults,
    pendingConfirmation,
  };
}
