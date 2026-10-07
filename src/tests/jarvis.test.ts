import { describe, it, expect, beforeEach } from 'vitest';
import { interpretNaturalIntent } from '../ai/agent/intent';
import { toolRegistry } from '../tools/registry';
import { postoAdmAdapter } from '../integrations/posto-adm/adapter';
import { memoryStore } from '../ai/memory/store';
import { processUserTurn } from '../ai/agent/orchestrator';
import { AgentContext, ErrorCategory, ToolPermission } from '../types/jarvis';

const mockContext: AgentContext = {
  user: {
    id: 'usr_test',
    name: 'Ubirajara Junior',
    role: 'admin',
    preferences: memoryStore.getPreferences(),
  },
  conversationId: 'conv_test',
  currentDate: '2026-10-06',
  memorySnapshot: {
    lastPeriod: 'semana',
  },
};

describe('JARVIS V1 — Suíte de Testes do Núcleo de Assistência Digital', () => {
  beforeEach(() => {
    postoAdmAdapter.setSimulatedOffline(false);
    memoryStore.clearConversation('conv_test');
  });

  it('1. Interpretação de Intenção: deve transformar "Quem trabalha amanhã de manhã?" em consultar_escala com data e turno corretos', () => {
    const intent = interpretNaturalIntent('JARVIS, quem trabalha amanhã de manhã?', mockContext);
    expect(intent.intent).toBe('consultar_escala');
    expect(intent.project).toBe('posto-adm');
    expect(intent.suggestedTool).toBe('consultarEscala');
    expect(intent.entities.date).toBe('2026-10-07');
    expect(intent.entities.shift).toBe('manha');
  });

  it('2. Contexto Conversacional: deve compreender "E descontando combustível?" e "E no mês passado?"', () => {
    const firstIntent = interpretNaturalIntent('JARVIS, quanto ganhei essa semana?', mockContext);
    expect(firstIntent.suggestedTool).toBe('consultarGanhos');
    expect(firstIntent.entities.period).toBe('semana');

    const followUpFuel = interpretNaturalIntent('E descontando combustível?', {
      ...mockContext,
      memorySnapshot: {
        lastIntent: firstIntent.intent,
        lastProject: 'rotaplanner',
        lastPeriod: 'semana',
        lastToolCalled: 'consultarGanhos',
      },
    });
    expect(followUpFuel.suggestedTool).toBe('calcularLucro');
    expect(followUpFuel.entities.discountFuel).toBe(true);

    const followUpLastMonth = interpretNaturalIntent('E no mês passado?', {
      ...mockContext,
      memorySnapshot: {
        lastIntent: followUpFuel.intent,
        lastProject: 'rotaplanner',
        lastPeriod: 'semana',
        lastToolCalled: 'calcularLucro',
      },
    });
    expect(followUpLastMonth.suggestedTool).toBe('calcularLucro');
    expect(followUpLastMonth.entities.period).toBe('mes_passado');
  });

  it('3. Execução de Ferramentas MOCK: consultarEscala e analisarEscala retornam dados estruturados com isMock=true', async () => {
    const resEscala = await toolRegistry.executeTool(
      'consultarEscala',
      { data: '2026-10-06', turno: 'all' },
      mockContext
    );
    expect(resEscala.success).toBe(true);
    expect(resEscala.isMock).toBe(true);
    expect(resEscala.permission).toBe(ToolPermission.READ);

    const resAnalise = await toolRegistry.executeTool(
      'analisarEscala',
      { data: '2026-10-06' },
      mockContext
    );
    expect(resAnalise.success).toBe(true);
    expect((resAnalise.data as any).inconsistencias.length).toBeGreaterThan(0);
  });

  it('4. Sistema de Permissões (CRITICAL): nunca executa excluirGasto sem confirmação explícita', async () => {
    const attemptWithoutConfirm = await toolRegistry.executeTool(
      'excluirGasto',
      { alvo: 'combustível' },
      mockContext
    );

    expect(attemptWithoutConfirm.success).toBe(false);
    expect(attemptWithoutConfirm.requiresConfirmation).toBe(true);
    expect(attemptWithoutConfirm.errorCategory).toBe(ErrorCategory.CONFIRMATION_REQUIRED);
    expect(attemptWithoutConfirm.confirmationToken).toBeDefined();
    expect(attemptWithoutConfirm.message).toContain('Deseja realmente excluir?');

    const confirmedExecution = await toolRegistry.executeTool(
      'excluirGasto',
      { alvo: 'combustível' },
      {
        ...mockContext,
        confirmedToken: attemptWithoutConfirm.confirmationToken,
      }
    );

    expect(confirmedExecution.success).toBe(true);
    expect(confirmedExecution.permission).toBe(ToolPermission.CRITICAL);
  });

  it('5. Tratamento de Erros: quando o Posto ADM está offline, informa indisponibilidade e nunca inventa dados', async () => {
    postoAdmAdapter.setSimulatedOffline(true);

    const resOffline = await toolRegistry.executeTool(
      'consultarEscala',
      { data: '2026-10-06' },
      mockContext
    );

    expect(resOffline.success).toBe(false);
    expect(resOffline.errorCategory).toBe(ErrorCategory.CONNECTION_ERROR);
    expect(resOffline.message).toBe('Não consegui acessar o Posto ADM neste momento.');
  });

  it('6. Memória e Orquestrador: registra fatos de longo prazo e processa turno completo sem expor pensamento interno', async () => {
    const turn = await processUserTurn({
      message: 'JARVIS, quais são meus projetos?',
      conversationId: 'conv_test',
    });

    expect(turn.assistantMessage.content).toContain('POSTO ADM');
    expect(turn.assistantMessage.content).toContain('ROTAPLANNER');
    expect(turn.assistantMessage.content).toContain('CONTROLE DE GASTOS');
    expect(turn.toolResults.length).toBe(1);
    expect(turn.toolResults[0].toolName).toBe('consultarProjetosSistema');
  });
});
