import {
  AgentContext,
  AttachmentInput,
  ConversationMessage,
  Intent,
  PendingConfirmation,
  ToolResult,
  User,
} from '../../types/jarvis';
import { memoryStore } from '../memory/store';
import { interpretNaturalIntent } from './intent';
import { toolRegistry } from '../../tools/registry';
import { permissionGuard } from '../../permissions/guard';
import { buildJarvisSystemPrompt } from '../prompts/system';
import { AIProviderFactory } from '../provider';
import { getCurrentDateTime } from '../../lib/datetime';
import { assertValidAttachments } from '../../lib/validation';

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
  user?: User;
}): Promise<OrchestratorTurnOutput> {
  const currentDt = getCurrentDateTime();
  const conversationId = params.conversationId || 'conv_principal';
  const prefs = memoryStore.getPreferences();
  const shortTerm = memoryStore.getShortTermContext();
  const currentDate = currentDt.date;

  // Validação estrita de anexo (rejeita arquivos inválidos ou gigantes)
  if (params.attachment) {
    assertValidAttachments([params.attachment]);
  }

  const user: User = params.user || {
    id: 'usr_dev_master',
    name: 'Ubirajara Junior',
    role: 'admin',
    preferences: prefs,
  };

  const context: AgentContext = {
    user,
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

  const userMsg: ConversationMessage = {
    id: `msg_u_${Date.now()}`,
    role: 'user',
    content: params.message,
    timestamp: currentDt.iso,
    attachment: params.attachment
      ? {
          name: params.attachment.name,
          mimeType: params.attachment.mimeType,
        }
      : undefined,
  };
  memoryStore.appendMessage(conversationId, userMsg);

  // 1. Cancelamento explícito de token
  if (params.cancelToken) {
    const cancelResult = permissionGuard.cancelConfirmation(
      params.cancelToken,
      user.id,
      conversationId
    );
    const cancelMsg: ConversationMessage = {
      id: `msg_a_${Date.now() + 1}`,
      role: 'assistant',
      content: cancelResult.success
        ? 'Operação cancelada com segurança. Nenhuma alteração foi realizada nos seus sistemas.'
        : `Não foi possível cancelar: ${cancelResult.error || 'confirmação não encontrada'}.`,
      timestamp: getCurrentDateTime().iso,
      providerUsed: 'permission-guard',
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

  // 2. Verificação de confirmação explícita ou verbal
  const normalizedText = params.message.toLowerCase().trim();
  const userPendingList = permissionGuard.listPending(user.id, conversationId);
  const latestPending = userPendingList.length > 0 ? userPendingList[userPendingList.length - 1] : undefined;

  const isVerbalConfirmation =
    latestPending &&
    (normalizedText === 'sim' ||
      normalizedText === 'confirmo' ||
      normalizedText === 'confirmar' ||
      normalizedText === 'pode excluir' ||
      normalizedText === 'autorizo');

  const activeConfirmToken = params.confirmedToken || (isVerbalConfirmation ? latestPending?.token : undefined);

  if (activeConfirmToken) {
    const validation = permissionGuard.validateAndConsumeConfirmation(
      activeConfirmToken,
      user.id,
      conversationId
    );

    if (validation.valid && validation.confirmation) {
      const pendingObj = validation.confirmation;
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
        timestamp: getCurrentDateTime().iso,
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
    } else if (!validation.valid) {
      const errorMsg: ConversationMessage = {
        id: `msg_a_${Date.now() + 1}`,
        role: 'assistant',
        content: `Falha na confirmação: ${validation.error}`,
        timestamp: getCurrentDateTime().iso,
        providerUsed: 'permission-guard',
      };
      memoryStore.appendMessage(conversationId, errorMsg);

      return {
        userMessage: userMsg,
        assistantMessage: errorMsg,
        intent: {
          intent: 'falha_confirmacao',
          confidence: 1,
          project: 'system',
          entities: {},
          rawQuery: params.message,
        },
        toolResults: [],
      };
    }
  }

  // 3. Interpretação de Intenção
  const intent = interpretNaturalIntent(params.message, context);
  memoryStore.updateShortTermContext({
    lastIntent: intent.intent,
    lastPeriod: intent.entities.period || shortTerm.lastPeriod || 'semana',
  });

  // 4. Comando direto de memória: "JARVIS, lembre que..."
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
      content: `Registrado com sucesso na memória: *"${savedFact.fact}"*.`,
      timestamp: getCurrentDateTime().iso,
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

  // 5. Execução de Ferramenta
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

  // 6. Geração da resposta final via AI Provider
  let finalAnswerText: string;
  let providerUsed: string = prefs.aiProvider;

  if (pendingConfirmation) {
    finalAnswerText = pendingConfirmation.summary;
  } else if (toolResults.length > 0 && !toolResults[0].success) {
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
    timestamp: getCurrentDateTime().iso,
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
