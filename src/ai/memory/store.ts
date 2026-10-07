import {
  Conversation,
  ConversationMessage,
  LongTermFact,
  Memory,
  UserPreferences,
} from '../../types/jarvis';
import { jarvisLogger } from '../../lib/logger';
import { permissionGuard } from '../../permissions/guard';
import { getCurrentDateTime } from '../../lib/datetime';
import { createMemoryProvider, MemoryMode, MemoryProvider } from './provider';

class JarvisMemoryStore {
  private provider: MemoryProvider;

  // Cache em memória para acesso síncrono rápido
  private shortTerm: Memory['shortTerm'] = {
    lastIntent: undefined,
    lastProject: undefined,
    lastPeriod: 'semana',
    lastToolCalled: undefined,
    lastNumericResult: undefined,
    activeTopic: undefined,
    items: [],
  };

  private longTermFacts: LongTermFact[] = [];
  private preferences: UserPreferences;
  private conversations: Map<string, Conversation> = new Map();

  constructor() {
    this.provider = createMemoryProvider();
    const now = getCurrentDateTime();

    this.preferences = {
      voiceEnabled: true,
      autoSpeakResponses: false,
      speechRate: 1.05,
      theme: 'dark',
      aiProvider: (process.env.AI_PROVIDER as UserPreferences['aiProvider']) || 'gemini',
      aiModel: process.env.AI_MODEL || 'gemini-3.8-flash',
      requireCriticalConfirmation: true,
      requireConfirmLevelApproval: true,
      showStructuredToolOutput: true,
    };

    this.longTermFacts = [
      {
        id: 'fact_1',
        category: 'sistema',
        fact: 'O usuário gerencia o sistema Posto ADM (repositório Projeto-posto1) para escalas, turnos e férias de frentistas.',
        source: 'Configuração Inicial V1',
        createdAt: now.iso,
      },
      {
        id: 'fact_2',
        category: 'sistema',
        fact: 'O usuário utiliza o RotaPlanner para acompanhar rotas, entregas, ganhos, combustível e manutenção.',
        source: 'Configuração Inicial V1',
        createdAt: now.iso,
      },
      {
        id: 'fact_3',
        category: 'preferencia',
        fact: 'Prefere respostas diretas, objetivas e em português do Brasil, sempre exigindo confirmação para ações críticas.',
        source: 'Configuração Inicial V1',
        createdAt: now.iso,
      },
    ];

    const defaultConvId = 'conv_principal';
    this.conversations.set(defaultConvId, {
      id: defaultConvId,
      title: 'Central de Comando JARVIS',
      createdAt: now.iso,
      updatedAt: now.iso,
      messages: [
        {
          id: 'msg_welcome',
          role: 'assistant',
          content:
            'Olá. Núcleo JARVIS V1.1 operacional. Estou conectado aos adaptadores de **Posto ADM**, **RotaPlanner** e preparado para o **Controle de Gastos**.\n\nVocê pode pedir para consultar escalas, verificar quem trabalha amanhã, calcular seus ganhos da semana descontando combustível ou auditar inconsistências na escala.',
          timestamp: now.iso,
          providerUsed: 'system-init',
        },
      ],
    });
  }

  public getMemoryMode(): MemoryMode {
    return this.provider.getMode();
  }

  public getProviderName(): string {
    return this.provider.name;
  }

  public isPersistentConfigured(): boolean {
    return this.provider.isConfigured() && this.provider.getMode() === 'SUPABASE';
  }

  public getFullMemory(): Memory {
    return {
      shortTerm: { ...this.shortTerm },
      longTermFacts: [...this.longTermFacts],
      preferences: { ...this.preferences },
      conversations: Array.from(this.conversations.values()),
      toolHistory: jarvisLogger.getLogs(50),
      pendingConfirmations: permissionGuard.listPending(),
    };
  }

  public updateShortTermContext(update: Partial<Omit<Memory['shortTerm'], 'items'>>): void {
    this.shortTerm = {
      ...this.shortTerm,
      ...update,
    };
  }

  public setShortTermItem(key: string, value: unknown): void {
    const existingIdx = this.shortTerm.items.findIndex((i) => i.key === key);
    const item = {
      key,
      value,
      updatedAt: getCurrentDateTime().iso,
    };
    if (existingIdx >= 0) {
      this.shortTerm.items[existingIdx] = item;
    } else {
      this.shortTerm.items.unshift(item);
    }
  }

  public getShortTermContext() {
    return { ...this.shortTerm };
  }

  public addLongTermFact(
    fact: string,
    category: LongTermFact['category'] = 'pessoal',
    source = 'Conversa'
  ): LongTermFact {
    const newFact: LongTermFact = {
      id: `fact_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      category,
      fact: fact.trim(),
      source,
      createdAt: getCurrentDateTime().iso,
    };
    this.longTermFacts.unshift(newFact);
    return newFact;
  }

  public removeLongTermFact(id: string): boolean {
    const initialLen = this.longTermFacts.length;
    this.longTermFacts = this.longTermFacts.filter((f) => f.id !== id);
    return this.longTermFacts.length < initialLen;
  }

  public getPreferences(): UserPreferences {
    return { ...this.preferences };
  }

  public updatePreferences(partial: Partial<UserPreferences>): UserPreferences {
    this.preferences = {
      ...this.preferences,
      ...partial,
    };
    return { ...this.preferences };
  }

  public getConversation(id = 'conv_principal'): Conversation {
    let conv = this.conversations.get(id);
    if (!conv) {
      const now = getCurrentDateTime();
      conv = {
        id,
        title: `Sessão ${now.formattedPtBR.split(' às ')[0]}`,
        createdAt: now.iso,
        updatedAt: now.iso,
        messages: [],
      };
      this.conversations.set(id, conv);
    }
    return conv;
  }

  public appendMessage(conversationId: string, message: ConversationMessage): void {
    const conv = this.getConversation(conversationId);
    conv.messages.push(message);
    conv.updatedAt = getCurrentDateTime().iso;
    if (conv.messages.length === 2 && message.role === 'user') {
      conv.title = message.content.slice(0, 42);
    }
  }

  public clearConversation(conversationId = 'conv_principal'): Conversation {
    const now = getCurrentDateTime();
    const conv: Conversation = {
      id: conversationId,
      title: 'Nova Sessão JARVIS',
      createdAt: now.iso,
      updatedAt: now.iso,
      messages: [
        {
          id: `msg_${Date.now()}`,
          role: 'assistant',
          content: 'Histórico da sessão reiniciado. Contexto de curto prazo limpo. Como posso ajudar?',
          timestamp: now.iso,
        },
      ],
    };
    this.conversations.set(conversationId, conv);
    this.shortTerm = {
      lastIntent: undefined,
      lastProject: undefined,
      lastPeriod: 'semana',
      lastToolCalled: undefined,
      lastNumericResult: undefined,
      activeTopic: undefined,
      items: [],
    };
    return conv;
  }

  public getToolHistory() {
    return jarvisLogger.getLogs(50);
  }

  /**
   * Retorna o status real da persistência do banco de dados sem enganar o usuário ou a API
   */
  public getDatabaseStatus(): {
    mode: MemoryMode;
    configured: boolean;
    details: string;
  } {
    const isSupabase = this.isPersistentConfigured();
    return {
      mode: isSupabase ? 'SUPABASE' : 'IN_MEMORY',
      configured: isSupabase,
      details: isSupabase
        ? 'Conectado e persistindo dados no Supabase / PostgreSQL'
        : 'Memória volátil em RAM (MEMORY_MODE=IN_MEMORY). Banco de dados persistente não configurado.',
    };
  }
}

export const memoryStore = new JarvisMemoryStore();
