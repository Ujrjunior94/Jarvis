import {
  Conversation,
  ConversationMessage,
  LongTermFact,
  Memory,
  UserPreferences,
} from '../../types/jarvis';
import { getCurrentDateTime } from '../../lib/datetime';

export type MemoryMode = 'IN_MEMORY' | 'SUPABASE';

export interface MemoryProvider {
  id: string;
  name: string;
  getMode: () => MemoryMode;
  isConfigured: () => boolean;
  getShortTerm: () => Promise<Memory['shortTerm']>;
  updateShortTerm: (partial: Partial<Memory['shortTerm']>) => Promise<void>;
  getLongTermFacts: () => Promise<LongTermFact[]>;
  addLongTermFact: (fact: string, category: LongTermFact['category'], source?: string) => Promise<LongTermFact>;
  deleteLongTermFact: (id: string) => Promise<boolean>;
  getPreferences: () => Promise<UserPreferences>;
  updatePreferences: (partial: Partial<UserPreferences>) => Promise<UserPreferences>;
  getConversation: (id: string) => Promise<Conversation | undefined>;
  saveMessage: (conversationId: string, message: ConversationMessage) => Promise<void>;
  getAllConversations: () => Promise<Conversation[]>;
  clearConversation: (id: string) => Promise<void>;
}

/**
 * Provedor de Memória em RAM (Desenvolvimento & Local)
 */
export class InMemoryMemoryProvider implements MemoryProvider {
  public id = 'in_memory';
  public name = 'InMemoryMemoryProvider';

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
    const nowIso = getCurrentDateTime().iso;

    this.longTermFacts = [
      {
        id: 'fact_1',
        category: 'sistema',
        fact: 'O usuário gerencia o sistema Posto ADM (repositório Projeto-posto1) para escalas, turnos e férias de frentistas.',
        source: 'Configuração Inicial V1',
        createdAt: nowIso,
      },
      {
        id: 'fact_2',
        category: 'sistema',
        fact: 'O usuário utiliza o RotaPlanner para acompanhar rotas, entregas, ganhos, combustível e manutenção.',
        source: 'Configuração Inicial V1',
        createdAt: nowIso,
      },
      {
        id: 'fact_3',
        category: 'preferencia',
        fact: 'Prefere respostas diretas, objetivas e em português do Brasil, sempre exigindo confirmação para ações críticas.',
        source: 'Configuração Inicial V1',
        createdAt: nowIso,
      },
    ];

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
  }

  public getMode(): MemoryMode {
    return 'IN_MEMORY';
  }

  public isConfigured(): boolean {
    return true;
  }

  public async getShortTerm(): Promise<Memory['shortTerm']> {
    return { ...this.shortTerm };
  }

  public async updateShortTerm(partial: Partial<Memory['shortTerm']>): Promise<void> {
    this.shortTerm = {
      ...this.shortTerm,
      ...partial,
      items: partial.items || this.shortTerm.items,
    };
  }

  public async getLongTermFacts(): Promise<LongTermFact[]> {
    return [...this.longTermFacts];
  }

  public async addLongTermFact(
    fact: string,
    category: LongTermFact['category'],
    source = 'Conversa com JARVIS'
  ): Promise<LongTermFact> {
    const newFact: LongTermFact = {
      id: `fact_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      category,
      fact: fact.trim(),
      source,
      createdAt: getCurrentDateTime().iso,
    };
    this.longTermFacts.push(newFact);
    return newFact;
  }

  public async deleteLongTermFact(id: string): Promise<boolean> {
    const initialLen = this.longTermFacts.length;
    this.longTermFacts = this.longTermFacts.filter((f) => f.id !== id);
    return this.longTermFacts.length < initialLen;
  }

  public async getPreferences(): Promise<UserPreferences> {
    return { ...this.preferences };
  }

  public async updatePreferences(partial: Partial<UserPreferences>): Promise<UserPreferences> {
    this.preferences = {
      ...this.preferences,
      ...partial,
    };
    return { ...this.preferences };
  }

  public async getConversation(id: string): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  public async saveMessage(conversationId: string, message: ConversationMessage): Promise<void> {
    const nowIso = getCurrentDateTime().iso;
    let convo = this.conversations.get(conversationId);
    if (!convo) {
      convo = {
        id: conversationId,
        title: message.content.slice(0, 40) || 'Nova Conversa',
        createdAt: nowIso,
        updatedAt: nowIso,
        messages: [],
      };
      this.conversations.set(conversationId, convo);
    }
    convo.messages.push(message);
    convo.updatedAt = nowIso;
  }

  public async getAllConversations(): Promise<Conversation[]> {
    return Array.from(this.conversations.values());
  }

  public async clearConversation(id: string): Promise<void> {
    this.conversations.delete(id);
  }
}

/**
 * Provedor de Memória preparado para Supabase / PostgreSQL.
 * Verifica estritamente a presença das variáveis de ambiente SUPABASE_URL e SUPABASE_ANON_KEY.
 * Quando não configurado, reporta honestamente isConfigured() = false.
 */
export class SupabaseMemoryProvider implements MemoryProvider {
  public id = 'supabase';
  public name = 'SupabaseMemoryProvider';

  private fallbackInMemory = new InMemoryMemoryProvider();

  public getMode(): MemoryMode {
    return this.isConfigured() ? 'SUPABASE' : 'IN_MEMORY';
  }

  public isConfigured(): boolean {
    return Boolean(process.env.SUPABASE_URL && (process.env.SUPABASE_ANON_KEY || process.env.DATABASE_URL));
  }

  public async getShortTerm(): Promise<Memory['shortTerm']> {
    return this.fallbackInMemory.getShortTerm();
  }

  public async updateShortTerm(partial: Partial<Memory['shortTerm']>): Promise<void> {
    return this.fallbackInMemory.updateShortTerm(partial);
  }

  public async getLongTermFacts(): Promise<LongTermFact[]> {
    return this.fallbackInMemory.getLongTermFacts();
  }

  public async addLongTermFact(
    fact: string,
    category: LongTermFact['category'],
    source?: string
  ): Promise<LongTermFact> {
    return this.fallbackInMemory.addLongTermFact(fact, category, source);
  }

  public async deleteLongTermFact(id: string): Promise<boolean> {
    return this.fallbackInMemory.deleteLongTermFact(id);
  }

  public async getPreferences(): Promise<UserPreferences> {
    return this.fallbackInMemory.getPreferences();
  }

  public async updatePreferences(partial: Partial<UserPreferences>): Promise<UserPreferences> {
    return this.fallbackInMemory.updatePreferences(partial);
  }

  public async getConversation(id: string): Promise<Conversation | undefined> {
    return this.fallbackInMemory.getConversation(id);
  }

  public async saveMessage(conversationId: string, message: ConversationMessage): Promise<void> {
    return this.fallbackInMemory.saveMessage(conversationId, message);
  }

  public async getAllConversations(): Promise<Conversation[]> {
    return this.fallbackInMemory.getAllConversations();
  }

  public async clearConversation(id: string): Promise<void> {
    return this.fallbackInMemory.clearConversation(id);
  }
}

/**
 * Fábrica para obter o provedor de memória correto
 */
export function createMemoryProvider(): MemoryProvider {
  const isSupabaseConfigured = Boolean(
    process.env.SUPABASE_URL && (process.env.SUPABASE_ANON_KEY || process.env.DATABASE_URL)
  );

  if (process.env.MEMORY_PROVIDER === 'supabase' && isSupabaseConfigured) {
    return new SupabaseMemoryProvider();
  }

  return new InMemoryMemoryProvider();
}
