import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { interpretNaturalIntent } from '../ai/agent/intent';
import { isToolSandboxEnabled, toolRegistry } from '../tools/registry';
import { postoAdmAdapter } from '../integrations/posto-adm/adapter';
import { rotaPlannerAdapter } from '../integrations/rotaplanner/adapter';
import { controleGastosAdapter } from '../integrations/gastos/adapter';
import { memoryStore } from '../ai/memory/store';
import { processUserTurn } from '../ai/agent/orchestrator';
import { AgentContext, ErrorCategory, ToolPermission } from '../types/jarvis';
import {
  getCurrentDateTime,
  getRelativeDate,
  resolvePeriodInterval,
  setMockCurrentDateTime,
  resetMockCurrentDateTime,
} from '../lib/datetime';
import { permissionGuard } from '../permissions/guard';
import {
  validateSingleAttachment,
  validateAttachments,
  MAX_FILE_SIZE_BYTES,
} from '../lib/validation';
import { sanitizeErrorMessage, JarvisError } from '../lib/errors';
import { AIProviderFactory, HeuristicProvider } from '../ai/provider';
import { DevAuthProvider, SupabaseAuthProvider } from '../auth/provider';

describe('JARVIS V1.1 — Suíte Completa de Testes de Estabilidade e Segurança', () => {
  const baseSimulatedDate = new Date('2026-10-07T14:30:00Z');

  beforeEach(() => {
    setMockCurrentDateTime(baseSimulatedDate);
    postoAdmAdapter.setSimulatedOffline(false);
    rotaPlannerAdapter.setSimulatedOffline(false);
    memoryStore.clearConversation('conv_test');
    permissionGuard.reset();
  });

  afterEach(() => {
    resetMockCurrentDateTime();
  });

  const getTestContext = (): AgentContext => {
    const dt = getCurrentDateTime();
    return {
      user: {
        id: 'usr_ubirajara',
        name: 'Ubirajara Junior',
        role: 'admin',
        preferences: memoryStore.getPreferences(),
      },
      conversationId: 'conv_test',
      currentDate: dt.date,
      memorySnapshot: {
        lastPeriod: 'semana',
      },
    };
  };

  // ===========================================================================
  // 1. DATA E HORA CENTRALIZADA (America/Bahia)
  // ===========================================================================
  describe('1. Data e Hora Dinâmica (America/Bahia)', () => {
    it('deve retornar objeto completo com fuso horário America/Bahia sem datas estáticas', () => {
      const dt = getCurrentDateTime();
      expect(dt.timezone).toBe('America/Bahia');
      expect(dt.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(dt.time).toMatch(/^\d{2}:\d{2}:\d{2}$/);
      expect(dt.dayOfWeek).toBeDefined();
      expect(dt.timestamp).toBeGreaterThan(0);
      expect(dt.iso).toContain('-03:00');
    });

    it('deve calcular corretamente datas relativas (ontem, amanhã, deslocamento)', () => {
      const hoje = getCurrentDateTime().date;
      const amanha = getRelativeDate(1);
      const ontem = getRelativeDate(-1);

      expect(amanha).not.toBe(hoje);
      expect(ontem).not.toBe(hoje);
      expect(getRelativeDate(0)).toBe(hoje);
    });

    it('deve resolver intervalos dinâmicos para esta_semana e mes_passado', () => {
      const semana = resolvePeriodInterval('esta_semana');
      expect(semana.inicio).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(semana.fim).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      const mesPassado = resolvePeriodInterval('mes_passado');
      expect(mesPassado.inicio).toMatch(/^\d{4}-\d{2}-01$/);
      expect(mesPassado.label).toBe('Mês Passado');
    });
  });

  // ===========================================================================
  // 2. INTENT ENGINE & LINGUAGEM NATURAL
  // ===========================================================================
  describe('2. Intent Engine (Variações Naturais)', () => {
    it('"JARVIS, quem trabalha amanhã de manhã?" -> consultarEscala (amanhã, manhã)', () => {
      const ctx = getTestContext();
      const amanhaEsperado = getRelativeDate(1);
      const intent = interpretNaturalIntent('JARVIS, quem trabalha amanhã de manhã?', ctx);

      expect(intent.suggestedTool).toBe('consultarEscala');
      expect(intent.project).toBe('posto-adm');
      expect(intent.entities.date).toBe(amanhaEsperado);
      expect(intent.entities.shift).toBe('manha');
    });

    it('"Quem trabalha amanhã?" -> consultarEscala (amanhã, todos os turnos)', () => {
      const ctx = getTestContext();
      const amanhaEsperado = getRelativeDate(1);
      const intent = interpretNaturalIntent('Quem trabalha amanhã?', ctx);

      expect(intent.suggestedTool).toBe('consultarEscala');
      expect(intent.entities.date).toBe(amanhaEsperado);
      expect(intent.entities.shift).toBe('all');
    });

    it('"Quem está de folga amanhã?" -> consultarFolgas (amanhã)', () => {
      const ctx = getTestContext();
      const amanhaEsperado = getRelativeDate(1);
      const intent = interpretNaturalIntent('Quem está de folga amanhã?', ctx);

      expect(intent.suggestedTool).toBe('consultarFolgas');
      expect(intent.project).toBe('posto-adm');
      expect(intent.entities.date).toBe(amanhaEsperado);
    });

    it('"Quanto ganhei essa semana?" -> consultarGanhos', () => {
      const ctx = getTestContext();
      const intent = interpretNaturalIntent('Quanto ganhei essa semana?', ctx);

      expect(intent.suggestedTool).toBe('consultarGanhos');
      expect(intent.project).toBe('rotaplanner');
      expect(intent.entities.period).toBe('semana');
    });

    it('"Quanto gastei com combustível?" -> consultarCombustivel', () => {
      const ctx = getTestContext();
      const intent = interpretNaturalIntent('Quanto gastei com combustível?', ctx);

      expect(intent.suggestedTool).toBe('consultarCombustivel');
      expect(intent.project).toBe('rotaplanner');
    });

    it('"Analise minha escala." -> analisarEscala', () => {
      const ctx = getTestContext();
      const intent = interpretNaturalIntent('Analise minha escala.', ctx);

      expect(intent.suggestedTool).toBe('analisarEscala');
      expect(intent.project).toBe('posto-adm');
    });

    it('"Quais são meus projetos?" -> consultarProjetosSistema', () => {
      const ctx = getTestContext();
      const intent = interpretNaturalIntent('Quais são meus projetos?', ctx);

      expect(intent.suggestedTool).toBe('consultarProjetosSistema');
      expect(intent.project).toBe('system');
    });
  });

  // ===========================================================================
  // 3. CONTEXTO CONVERSACIONAL (CONTINUIDADE MULTI-TURNO)
  // ===========================================================================
  describe('3. Contexto Conversacional', () => {
    it('deve encadear "Quanto ganhei essa semana?" -> "E descontando combustível?" -> "E no mês passado?"', () => {
      const ctx = getTestContext();

      // Turno 1
      const t1 = interpretNaturalIntent('Quanto ganhei essa semana?', ctx);
      expect(t1.suggestedTool).toBe('consultarGanhos');

      // Turno 2 (Contextual)
      const ctxT2: AgentContext = {
        ...ctx,
        memorySnapshot: {
          lastIntent: t1.intent,
          lastProject: 'rotaplanner',
          lastPeriod: 'semana',
          lastToolCalled: 'consultarGanhos',
        },
      };
      const t2 = interpretNaturalIntent('E descontando combustível?', ctxT2);
      expect(t2.suggestedTool).toBe('calcularLucro');
      expect(t2.project).toBe('rotaplanner');
      expect(t2.entities.discountFuel).toBe(true);

      // Turno 3 (Altera apenas o período mantendo o cálculo anterior)
      const ctxT3: AgentContext = {
        ...ctx,
        memorySnapshot: {
          lastIntent: t2.intent,
          lastProject: 'rotaplanner',
          lastPeriod: 'semana',
          lastToolCalled: 'calcularLucro',
        },
      };
      const t3 = interpretNaturalIntent('E no mês passado?', ctxT3);
      expect(t3.suggestedTool).toBe('calcularLucro');
      expect(t3.project).toBe('rotaplanner');
      expect(t3.entities.period).toBe('mes_passado');
      expect(t3.entities.discountFuel).toBe(true);
    });
  });

  // ===========================================================================
  // 4. SISTEMA DE PERMISSÕES E CONFIRMAÇÃO SEGURA
  // ===========================================================================
  describe('4. Permissões e Confirmação Criptográfica', () => {
    const userId = 'usr_ubirajara';
    const convId = 'conv_principal';

    it('1. Confirmação válida: deve criar token com expiração, validar e consumir', () => {
      const conf = permissionGuard.createConfirmationRequest({
        toolName: 'excluirGasto',
        project: 'controle-gastos',
        permission: ToolPermission.CRITICAL,
        inputParams: { id: 'gasto_01' },
        summary: 'Excluir despesa',
        userId,
        conversationId: convId,
      });

      expect(conf.token).toMatch(/^jarvis_sec_conf_/);
      expect(conf.expiresAt).toBeDefined();

      const val = permissionGuard.validateAndConsumeConfirmation(conf.token, userId, convId);
      expect(val.valid).toBe(true);
      expect(val.confirmation?.toolName).toBe('excluirGasto');
    });

    it('2. Token reutilizado: deve rejeitar com razão REUSED no segundo consumo', () => {
      const conf = permissionGuard.createConfirmationRequest({
        toolName: 'excluirGasto',
        project: 'controle-gastos',
        permission: ToolPermission.CRITICAL,
        inputParams: {},
        summary: 'Excluir despesa',
        userId,
        conversationId: convId,
      });

      const first = permissionGuard.validateAndConsumeConfirmation(conf.token, userId, convId);
      expect(first.valid).toBe(true);

      const second = permissionGuard.validateAndConsumeConfirmation(conf.token, userId, convId);
      expect(second.valid).toBe(false);
      expect(second.reason).toBe('REUSED');
    });

    it('3. Token expirado: deve rejeitar com razão EXPIRED quando a validade expira', () => {
      const conf = permissionGuard.createConfirmationRequest({
        toolName: 'validarEscala',
        project: 'posto-adm',
        permission: ToolPermission.CONFIRM,
        inputParams: {},
        summary: 'Homologar escala',
        userId,
        conversationId: convId,
        ttlMs: -1000, // Criado no passado
      });

      const res = permissionGuard.validateAndConsumeConfirmation(conf.token, userId, convId);
      expect(res.valid).toBe(false);
      expect(res.reason).toBe('EXPIRED');
    });

    it('4. Token de outra conversa: deve rejeitar com razão CONVERSATION_MISMATCH', () => {
      const conf = permissionGuard.createConfirmationRequest({
        toolName: 'excluirGasto',
        project: 'controle-gastos',
        permission: ToolPermission.CRITICAL,
        inputParams: {},
        summary: 'Excluir despesa',
        userId,
        conversationId: 'conversa_A',
      });

      const res = permissionGuard.validateAndConsumeConfirmation(conf.token, userId, 'conversa_B');
      expect(res.valid).toBe(false);
      expect(res.reason).toBe('CONVERSATION_MISMATCH');
    });

    it('5. Token de outro usuário: deve rejeitar com razão USER_MISMATCH', () => {
      const conf = permissionGuard.createConfirmationRequest({
        toolName: 'excluirGasto',
        project: 'controle-gastos',
        permission: ToolPermission.CRITICAL,
        inputParams: {},
        summary: 'Excluir despesa',
        userId: 'usr_proprietario',
        conversationId: convId,
      });

      const res = permissionGuard.validateAndConsumeConfirmation(conf.token, 'usr_atacante', convId);
      expect(res.valid).toBe(false);
      expect(res.reason).toBe('USER_MISMATCH');
    });

    it('6. Cancelamento explícito: cancela o token e impede execução futura', () => {
      const conf = permissionGuard.createConfirmationRequest({
        toolName: 'excluirGasto',
        project: 'controle-gastos',
        permission: ToolPermission.CRITICAL,
        inputParams: {},
        summary: 'Excluir',
        userId,
        conversationId: convId,
      });

      const cancel = permissionGuard.cancelConfirmation(conf.token, userId, convId);
      expect(cancel.success).toBe(true);

      const attempt = permissionGuard.validateAndConsumeConfirmation(conf.token, userId, convId);
      expect(attempt.valid).toBe(false);
    });
  });

  // ===========================================================================
  // 5. MEMÓRIA & PERSISTÊNCIA REAL
  // ===========================================================================
  describe('5. Memória e Modos Reais', () => {
    it('deve reportar honestamente IN_MEMORY quando Supabase não estiver configurado', () => {
      const status = memoryStore.getDatabaseStatus();
      expect(status.mode).toBe('IN_MEMORY');
      expect(status.configured).toBe(false);
      expect(status.details).toContain('MEMORY_MODE=IN_MEMORY');
    });

    it('permite registrar, listar e remover fatos de longo prazo', () => {
      const novoFato = memoryStore.addLongTermFact('O carro utilizado nas entregas é um Polo 1.0', 'trabalho');
      expect(novoFato.id).toBeDefined();

      const fatos = memoryStore.getFullMemory().longTermFacts;
      expect(fatos.some((f) => f.fact.includes('Polo 1.0'))).toBe(true);

      const removido = memoryStore.removeLongTermFact(novoFato.id);
      expect(removido).toBe(true);
    });
  });

  // ===========================================================================
  // 6. AUTENTICAÇÃO E CONTROLE DE ACESSO
  // ===========================================================================
  describe('6. Camada de Autenticação (AuthProvider)', () => {
    it('deve prover usuário de desenvolvimento explícito em modo dev', async () => {
      const devAuth = new DevAuthProvider();
      expect(devAuth.getMode()).toBe('DEVELOPMENT');

      const user = await devAuth.verifyToken();
      expect(user).toBeDefined();
      expect(user?.role).toBe('admin');
    });

    it('SupabaseAuthProvider reporta isConfigured = false sem envs', () => {
      const supabaseAuth = new SupabaseAuthProvider();
      expect(supabaseAuth.isConfigured()).toBe(false);
      expect(supabaseAuth.getMode()).toBe('DEVELOPMENT');
    });
  });

  // ===========================================================================
  // 7. SEGURANÇA DE ARQUIVOS E UPLOAD
  // ===========================================================================
  describe('7. Segurança de Arquivos e Upload', () => {
    it('aceita arquivos válidos (PNG, JPEG, WEBP, PDF)', () => {
      const validPng = {
        name: 'escala.png',
        mimeType: 'image/png',
        base64Data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      };
      expect(validateSingleAttachment(validPng).valid).toBe(true);

      const validPdf = {
        name: 'relatorio.pdf',
        mimeType: 'application/pdf',
        base64Data: 'data:application/pdf;base64,JVBERi0xLjQKJeLjz9MK',
      };
      expect(validateSingleAttachment(validPdf).valid).toBe(true);
    });

    it('rejeita extensões/MIME types não permitidos (ex: executáveis, html, scripts)', () => {
      const invalidExe = {
        name: 'script.exe',
        mimeType: 'application/x-msdownload',
        base64Data: 'data:application/octet-stream;base64,TVqQAAMAAAAEAAAA',
      };
      const res = validateSingleAttachment(invalidExe);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('Formato de arquivo não suportado');
    });

    it('rejeita arquivos que excedem o limite de 10 MB', () => {
      // Simula uma string Base64 gigante (> 10MB)
      const fakeLargeBase64 = 'A'.repeat(Math.ceil((11 * 1024 * 1024 * 4) / 3));
      const largeFile = {
        name: 'imagem_gigante.png',
        mimeType: 'image/png',
        base64Data: fakeLargeBase64,
      };
      const res = validateSingleAttachment(largeFile);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('muito grande');
    });

    it('rejeita lotes com mais de 4 arquivos', () => {
      const fiveFiles = Array(5).fill({
        name: 'foto.png',
        mimeType: 'image/png',
        base64Data: 'dGVzdGU=',
      });
      const res = validateAttachments(fiveFiles);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('Número máximo de 4 arquivos excedido');
    });
  });

  // ===========================================================================
  // 8. CONTROLE DE ERROS E SANITIZAÇÃO
  // ===========================================================================
  describe('8. Controle de Erros e Sanitização', () => {
    it('deve mascarar chaves de API e caminhos internos em mensagens de erro', () => {
      const leaked = 'Erro no servidor: chave AIzaSyD12345678901234567890123456789012 e arquivo em /app/src/secret.ts';
      const clean = sanitizeErrorMessage(leaked);

      expect(clean).not.toContain('AIzaSyD');
      expect(clean).toContain('[REDACTED_API_KEY]');
      expect(clean).not.toContain('/app/src');
      expect(clean).toContain('[INTERNAL_PATH]');
    });

    it('deve instanciar JarvisError com categorias estritas', () => {
      const err = new JarvisError(ErrorCategory.AUTH_ERROR, 'Credencial inválida', 401);
      expect(err.category).toBe(ErrorCategory.AUTH_ERROR);
      expect(err.statusCode).toBe(401);
    });
  });

  // ===========================================================================
  // 9. PROVEDORES DE IA E FALLBACK DETERMINÍSTICO
  // ===========================================================================
  describe('9. AI Providers & Fallback', () => {
    it('HeuristicProvider responde de forma determinística factual usando saídas das ferramentas', async () => {
      const heuristic = new HeuristicProvider();
      const res = await heuristic.generateResponse({
        systemPrompt: 'System',
        userMessage: 'Quantos projetos eu tenho?',
        history: [],
        toolOutputs: [
          {
            success: true,
            toolName: 'consultarProjetosSistema',
            project: 'system',
            permission: ToolPermission.READ,
            isMock: true,
            timestamp: new Date().toISOString(),
            durationMs: 12,
            message: '3 projetos',
            data: {
              projetos: [
                { name: 'POSTO ADM', status: 'ONLINE', toolsCount: 8 },
                { name: 'ROTAPLANNER', status: 'ONLINE', toolsCount: 9 },
                { name: 'CONTROLE DE GASTOS', status: 'PLANNED', toolsCount: 7 },
              ],
            },
          },
        ],
      });

      expect(res.provider).toBe('heuristic');
      expect(res.text).toContain('3 projetos');
      expect(res.text).toContain('POSTO ADM');
    });

    it('AIProviderFactory retorna Gemini, OpenRouter, OpenAI e Heuristic respeitando parâmetros', () => {
      expect(AIProviderFactory.getProvider('gemini').id).toBe('gemini');
      expect(AIProviderFactory.getProvider('openrouter').id).toBe('openrouter');
      expect(AIProviderFactory.getProvider('openai').id).toBe('openai');
      expect(AIProviderFactory.getProvider('heuristic').id).toBe('heuristic');
    });
  });

  // ===========================================================================
  // 10. FLUXO COMPLETO DO ORQUESTRADOR
  // ===========================================================================
  describe('10. Processamento do Orquestrador de Agente', () => {
    it('executa turno completo de consulta com resposta factual estruturada', async () => {
      memoryStore.updatePreferences({ aiProvider: 'heuristic' });
      const turn = await processUserTurn({
        message: 'JARVIS, quais são meus projetos?',
        conversationId: 'conv_test',
      });

      expect(turn.assistantMessage.content).toContain('POSTO ADM');
      expect(turn.assistantMessage.content).toContain('ROTAPLANNER');
      expect(turn.assistantMessage.content).toContain('CONTROLE DE GASTOS');
      expect(turn.toolResults.length).toBe(1);
    }, 10000);
  });
});
