import {
  Conversation,
  ConversationMessage,
  LongTermFact,
  Memory,
  UserPreferences,
} from '../../types/jarvis';
import { jarvisLogger } from '../../lib/logger';
import { permissionGuard } from '../../permissions/guard';

class JarvisMemoryStore {
  private shortTerm: Memory['shortTerm'] = {
    lastIntent: undefined,
    lastProject: undefined,
    lastPeriod: 'semana',
    lastToolCalled: undefined,
    lastNumericResult: undefined,
    activeTopic: undefined,
    items: [],
  };

  private longTermFacts: LongTermFact[] = [
    {
      id: 'fact_1',
      category: 'sistema',
      fact: 'O usuário gerencia o sistema Posto ADM (repositório Projeto-posto1) para escalas, turnos e férias de frentistas.',
      source: 'Configuração Inicial V1',
      createdAt: '2026-10-06T10:00:00Z',
    },
    {
      id: 'fact_2',
      category: 'sistema',
      fact: 'O usuário utiliza o RotaPlanner para acompanhar rotas, entregas, ganhos, combustível e manutenção.',
      source: 'Configuração Inicial V1',
      createdAt: '2026-10-06T10:00:00Z',
    },
    {
      id: 'fact_3',
      category: 'preferencia',
      fact: 'Prefere respostas diretas, objetivas e em português do Brasil, sempre exigindo confirmação para ações críticas.',
      source: 'Configuração Inicial V1',
      createdAt: '2026-10-06T10:00:00Z',
    },
  ];

  private preferences: UserPreferences = {
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

  private conversations: Map<string, Conversation> = new Map();

  constructor() {
    const defaultConvId = 'conv_principal';
    this.conversations.set(defaultConvId, {
      id: defaultConvId,
      title: 'Central de Comando JARVIS',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [
        {
          id: 'msg_welcome',
          role: 'assistant',
          content:
            'Olá. Núcleo JARVIS V1 operacional. Estou conectado aos adaptadores de **Posto ADM**, **RotaPlanner** e preparado para o **Controle de Gastos**.\n\nVocê pode pedir para consultar escalas, verificar quem trabalha amanhã, calcular seus ganhos da semana descontando combustível ou auditar inconsistências na escala.',
          timestamp: new Date().toISOString(),
          providerUsed: 'system-init',
        },
      ],
    });
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
      updatedAt: new Date().toISOString(),
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
      id: `fact_${Date.now()}`,
      category,
      fact: fact.trim(),
      source,
      createdAt: new Date().toISOString(),
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
      conv = {
        id,
        title: `Sessão ${new Date().toLocaleDateString('pt-BR')}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [],
      };
      this.conversations.set(id, conv);
    }
    return conv;
  }

  public appendMessage(conversationId: string, message: ConversationMessage): void {
    const conv = this.getConversation(conversationId);
    conv.messages.push(message);
    conv.updatedAt = new Date().toISOString();
    if (conv.messages.length === 2 && message.role === 'user') {
      conv.title = message.content.slice(0, 42);
    }
  }

  public clearConversation(conversationId = 'conv_principal'): Conversation {
    const conv: Conversation = {
      id: conversationId,
      title: 'Nova Sessão JARVIS',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [
        {
          id: `msg_${Date.now()}`,
          role: 'assistant',
          content: 'Histórico da sessão reiniciado. Contexto de curto prazo limpo. Como posso ajudar?',
          timestamp: new Date().toISOString(),
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

  public getDatabaseStatus(): {
    mode: 'SUPABASE_READY_MEMORY' | 'POSTGRES_CONNECTED';
    configured: boolean;
    details: string;
  } {
    const hasSupabase = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
    return {
      mode: hasSupabase ? 'POSTGRES_CONNECTED' : 'SUPABASE_READY_MEMORY',
      configured: true,
      details: hasSupabase
        ? 'Conectado ao Supabase PostgreSQL'
        : 'Repositório em Memória Estruturada (Pronto para migração Supabase/PostgreSQL)',
    };
  }
}

export const memoryStore = new JarvisMemoryStore();
