/**
 * JARVIS — Núcleo de Assistência Digital
 * Definições de tipos centrais estritos (V1)
 */

export enum ToolPermission {
  READ = 'READ',
  CONFIRM = 'CONFIRM',
  CRITICAL = 'CRITICAL',
}

export enum IntegrationStatus {
  ONLINE = 'ONLINE',
  MOCK = 'MOCK',
  OFFLINE = 'OFFLINE',
  NOT_CONFIGURED = 'NOT_CONFIGURED',
}

export enum ErrorCategory {
  NONE = 'NONE',
  NOT_FOUND = 'NOT_FOUND',
  TOOL_UNAVAILABLE = 'TOOL_UNAVAILABLE',
  AUTH_ERROR = 'AUTH_ERROR',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  UNAUTHORIZED = 'UNAUTHORIZED',
  CONFIRMATION_REQUIRED = 'CONFIRMATION_REQUIRED',
}

export type ProjectId = 'posto-adm' | 'rotaplanner' | 'controle-gastos' | 'system';

export interface Project {
  id: ProjectId;
  name: string;
  description: string;
  repositoryUrl?: string;
  status: IntegrationStatus;
  mode: 'REAL' | 'MOCK' | 'PLANNED';
  apiUrlConfigured: boolean;
  lastChecked: string;
  version: string;
  toolsCount: number;
}

export interface Integration {
  projectId: ProjectId;
  name: string;
  status: IntegrationStatus;
  isMock: boolean;
  endpoint?: string;
  latencyMs?: number;
  checkHealth: () => Promise<{ status: IntegrationStatus; message: string }>;
}

export interface ToolParameterSchema {
  type: 'string' | 'number' | 'boolean' | 'object';
  description: string;
  required?: boolean;
  enum?: string[];
}

export interface ToolResult<T = unknown> {
  success: boolean;
  toolName: string;
  project: ProjectId;
  permission: ToolPermission;
  isMock: boolean;
  timestamp: string;
  durationMs: number;
  data?: T;
  message: string;
  errorCategory?: ErrorCategory;
  requiresConfirmation?: boolean;
  confirmationToken?: string;
  pendingActionSummary?: string;
}

export interface Tool<TInput = Record<string, unknown>, TOutput = unknown> {
  name: string;
  description: string;
  project: ProjectId;
  permission: ToolPermission;
  parameters: Record<string, ToolParameterSchema>;
  validate: (input: Record<string, unknown>) => { valid: boolean; error?: string; parsed?: TInput };
  execute: (input: TInput, context: AgentContext) => Promise<ToolResult<TOutput>>;
  prepareConfirmation?: (input: TInput) => {
    summary: string;
    details: Record<string, unknown>;
  };
}

export interface Intent {
  intent: string;
  confidence: number;
  project: ProjectId;
  suggestedTool?: string;
  entities: {
    date?: string;
    shift?: 'manha' | 'tarde' | 'noite' | 'madrugada' | 'all';
    period?: 'hoje' | 'semana' | 'mes_atual' | 'mes_passado';
    category?: string;
    amount?: number;
    description?: string;
    employeeName?: string;
    targetId?: string;
    discountFuel?: boolean;
    [key: string]: unknown;
  };
  rawQuery: string;
}

export interface User {
  id: string;
  name: string;
  role: 'admin' | 'operator';
  preferences: UserPreferences;
}

export interface UserPreferences {
  voiceEnabled: boolean;
  autoSpeakResponses: boolean;
  speechRate: number;
  theme: 'dark' | 'light';
  aiProvider: 'gemini' | 'openrouter' | 'openai' | 'heuristic';
  aiModel: string;
  requireCriticalConfirmation: boolean;
  requireConfirmLevelApproval: boolean;
  showStructuredToolOutput: boolean;
}

export interface ShortTermMemoryItem {
  key: string;
  value: unknown;
  updatedAt: string;
  expiresAt?: string;
}

export interface LongTermFact {
  id: string;
  category: 'pessoal' | 'trabalho' | 'preferencia' | 'sistema' | 'financeiro';
  fact: string;
  source: string;
  createdAt: string;
}

export interface ToolExecutionLog {
  id: string;
  toolName: string;
  project: ProjectId;
  permission: ToolPermission;
  timestamp: string;
  durationMs: number;
  success: boolean;
  isMock: boolean;
  user: string;
  actionSummary: string;
  inputParams: Record<string, unknown>;
  errorCategory?: ErrorCategory;
}

export interface PendingConfirmation {
  token: string;
  toolName: string;
  project: ProjectId;
  permission: ToolPermission;
  inputParams: Record<string, unknown>;
  summary: string;
  createdAt: string;
}

export interface AttachmentInput {
  name: string;
  mimeType: string;
  base64Data: string;
  sizeBytes?: number;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  intent?: Intent;
  toolResults?: ToolResult[];
  pendingConfirmation?: PendingConfirmation;
  attachment?: {
    name: string;
    mimeType: string;
    previewUrl?: string;
  };
  providerUsed?: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ConversationMessage[];
}

export interface Memory {
  shortTerm: {
    lastIntent?: string;
    lastProject?: ProjectId;
    lastPeriod?: string;
    lastToolCalled?: string;
    lastNumericResult?: number;
    activeTopic?: string;
    items: ShortTermMemoryItem[];
  };
  longTermFacts: LongTermFact[];
  preferences: UserPreferences;
  conversations: Conversation[];
  toolHistory: ToolExecutionLog[];
  pendingConfirmations: PendingConfirmation[];
}

export interface AgentContext {
  user: User;
  conversationId: string;
  currentDate: string;
  confirmedToken?: string;
  attachment?: AttachmentInput;
  memorySnapshot: {
    lastIntent?: string;
    lastProject?: ProjectId;
    lastPeriod?: string;
    lastToolCalled?: string;
    activeTopic?: string;
  };
}

export interface AIProviderResponse {
  text: string;
  provider: string;
  model: string;
  toolCalls?: Array<{
    name: string;
    args: Record<string, unknown>;
  }>;
}

export interface AIProvider {
  id: 'gemini' | 'openrouter' | 'openai' | 'heuristic';
  name: string;
  isConfigured: () => boolean;
  generateResponse: (params: {
    systemPrompt: string;
    userMessage: string;
    history: ConversationMessage[];
    tools?: Tool[];
    attachment?: AttachmentInput;
    toolOutputs?: ToolResult[];
  }) => Promise<AIProviderResponse>;
}
