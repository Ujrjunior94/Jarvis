import {
  ErrorCategory,
  Tool,
  ToolPermission,
  ToolResult,
} from '../../types/jarvis';
import { rotaPlannerAdapter } from '../../integrations/rotaplanner/adapter';

function handleRotaError(toolName: string, permission: ToolPermission, start: number, err: unknown): ToolResult {
  const msg = err instanceof Error ? err.message : 'Erro ao acessar RotaPlanner';
  const isOffline = msg.includes('CONNECTION_ERROR');
  return {
    success: false,
    toolName,
    project: 'rotaplanner',
    permission,
    isMock: rotaPlannerAdapter.isMockMode(),
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - start,
    message: isOffline
      ? 'Não consegui acessar o RotaPlanner neste momento.'
      : `Falha ao executar ${toolName} no RotaPlanner: ${msg}`,
    errorCategory: isOffline ? ErrorCategory.CONNECTION_ERROR : ErrorCategory.TOOL_UNAVAILABLE,
  };
}

export const consultarGanhosTool: Tool<{ periodo?: string }> = {
  name: 'consultarGanhos',
  description: 'Consulta os ganhos brutos, entregas e quilometragem no RotaPlanner por período (hoje, semana, mes_passado).',
  project: 'rotaplanner',
  permission: ToolPermission.READ,
  parameters: {
    periodo: {
      type: 'string',
      description: 'Período desejado: hoje, semana ou mes_passado.',
      required: false,
      enum: ['hoje', 'semana', 'mes_passado'],
    },
  },
  validate: (input) => ({
    valid: true,
    parsed: { periodo: typeof input.periodo === 'string' ? input.periodo : 'semana' },
  }),
  execute: async (input) => {
    const start = Date.now();
    try {
      const res = await rotaPlannerAdapter.consultarGanhos(input.periodo);
      return {
        success: true,
        toolName: 'consultarGanhos',
        project: 'rotaplanner',
        permission: ToolPermission.READ,
        isMock: res.isMockData,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - start,
        data: res,
        message: `Ganhos brutos em ${res.periodo}: R$ ${res.ganhoBrutoTotal.toFixed(2)} (${res.totalEntregasConcluidas} entregas, ${res.quilometragemTotalKm} km).`,
      };
    } catch (err) {
      return handleRotaError('consultarGanhos', ToolPermission.READ, start, err);
    }
  },
};

export const consultarDespesasTool: Tool<{ periodo?: string }> = {
  name: 'consultarDespesas',
  description: 'Consulta as despesas operacionais (combustível, manutenção, alimentação) registradas no RotaPlanner.',
  project: 'rotaplanner',
  permission: ToolPermission.READ,
  parameters: {
    periodo: {
      type: 'string',
      description: 'Período desejado: hoje, semana ou mes_passado.',
      required: false,
    },
  },
  validate: (input) => ({
    valid: true,
    parsed: { periodo: typeof input.periodo === 'string' ? input.periodo : 'semana' },
  }),
  execute: async (input) => {
    const start = Date.now();
    try {
      const res = await rotaPlannerAdapter.consultarDespesas(input.periodo);
      return {
        success: true,
        toolName: 'consultarDespesas',
        project: 'rotaplanner',
        permission: ToolPermission.READ,
        isMock: res.isMockData,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - start,
        data: res,
        message: `Despesas totais em ${res.periodo}: R$ ${res.despesaTotal.toFixed(2)} (Combustível: R$ ${res.combustivelTotal.toFixed(2)}).`,
      };
    } catch (err) {
      return handleRotaError('consultarDespesas', ToolPermission.READ, start, err);
    }
  },
};

export const consultarCombustivelTool: Tool<{ periodo?: string }> = {
  name: 'consultarCombustivel',
  description: 'Consulta detalhadamente o gasto com combustível, litros abastecidos, média km/L e custo por km no RotaPlanner.',
  project: 'rotaplanner',
  permission: ToolPermission.READ,
  parameters: {
    periodo: {
      type: 'string',
      description: 'Período desejado: semana ou mes_passado.',
      required: false,
    },
  },
  validate: (input) => ({
    valid: true,
    parsed: { periodo: typeof input.periodo === 'string' ? input.periodo : 'semana' },
  }),
  execute: async (input) => {
    const start = Date.now();
    try {
      const res = await rotaPlannerAdapter.consultarCombustivel(input.periodo);
      return {
        success: true,
        toolName: 'consultarCombustivel',
        project: 'rotaplanner',
        permission: ToolPermission.READ,
        isMock: res.isMockData,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - start,
        data: res,
        message: `Gasto com combustível em ${res.periodo}: R$ ${res.totalGastoCombustivel.toFixed(2)} (${res.litrosAbastecidos} L, média de ${res.consumoMedioKmL} km/L).`,
      };
    } catch (err) {
      return handleRotaError('consultarCombustivel', ToolPermission.READ, start, err);
    }
  },
};

export const consultarRotasTool: Tool<{ data?: string }> = {
  name: 'consultarRotas',
  description: 'Consulta as rotas planejadas e executadas no RotaPlanner com distância, paradas e ganhos.',
  project: 'rotaplanner',
  permission: ToolPermission.READ,
  parameters: {
    data: {
      type: 'string',
      description: 'Data opcional YYYY-MM-DD.',
      required: false,
    },
  },
  validate: (input) => ({
    valid: true,
    parsed: { data: typeof input.data === 'string' ? input.data : undefined },
  }),
  execute: async (input) => {
    const start = Date.now();
    try {
      const res = await rotaPlannerAdapter.consultarRotas(input.data);
      return {
        success: true,
        toolName: 'consultarRotas',
        project: 'rotaplanner',
        permission: ToolPermission.READ,
        isMock: res.isMockData,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - start,
        data: res,
        message: `${res.rotasPlanejadas.length} rotas localizadas para ${res.dataReferencia}.`,
      };
    } catch (err) {
      return handleRotaError('consultarRotas', ToolPermission.READ, start, err);
    }
  },
};

export const consultarEntregasTool: Tool<{ periodo?: string }> = {
  name: 'consultarEntregas',
  description: 'Consulta estatísticas de entregas concluídas, prazos e últimos clientes atendidos no RotaPlanner.',
  project: 'rotaplanner',
  permission: ToolPermission.READ,
  parameters: {
    periodo: {
      type: 'string',
      description: 'Período opcional (hoje, semana).',
      required: false,
    },
  },
  validate: (input) => ({
    valid: true,
    parsed: { periodo: typeof input.periodo === 'string' ? input.periodo : 'hoje' },
  }),
  execute: async (input) => {
    const start = Date.now();
    try {
      const res = await rotaPlannerAdapter.consultarEntregas(input.periodo);
      return {
        success: true,
        toolName: 'consultarEntregas',
        project: 'rotaplanner',
        permission: ToolPermission.READ,
        isMock: res.isMockData,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - start,
        data: res,
        message: `${res.totalEntregas} entregas registradas (${res.taxaSucessoPercentual}% no prazo).`,
      };
    } catch (err) {
      return handleRotaError('consultarEntregas', ToolPermission.READ, start, err);
    }
  },
};

export const consultarManutencaoTool: Tool = {
  name: 'consultarManutencao',
  description: 'Consulta o status de manutenção do veículo, odômetro atual e alertas de revisão no RotaPlanner.',
  project: 'rotaplanner',
  permission: ToolPermission.READ,
  parameters: {},
  validate: () => ({ valid: true, parsed: {} }),
  execute: async () => {
    const start = Date.now();
    try {
      const res = await rotaPlannerAdapter.consultarManutencao();
      return {
        success: true,
        toolName: 'consultarManutencao',
        project: 'rotaplanner',
        permission: ToolPermission.READ,
        isMock: res.isMockData,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - start,
        data: res,
        message: `Veículo com ${res.odometroAtualKm} km. Status: ${res.statusVeiculo}.`,
      };
    } catch (err) {
      return handleRotaError('consultarManutencao', ToolPermission.READ, start, err);
    }
  },
};

export const calcularLucroTool: Tool<{ periodo?: string; descontarApenasCombustivel?: boolean }> = {
  name: 'calcularLucro',
  description:
    'Calcula o lucro líquido cruzando ganhos e despesas (ou descontando especificamente o combustível) no RotaPlanner.',
  project: 'rotaplanner',
  permission: ToolPermission.READ,
  parameters: {
    periodo: {
      type: 'string',
      description: 'Período: hoje, semana ou mes_passado.',
      required: false,
    },
    descontarApenasCombustivel: {
      type: 'boolean',
      description: 'Se verdadeiro, destaca o saldo líquido descontando especificamente o combustível.',
      required: false,
    },
  },
  validate: (input) => ({
    valid: true,
    parsed: {
      periodo: typeof input.periodo === 'string' ? input.periodo : 'semana',
      descontarApenasCombustivel: Boolean(input.descontarApenasCombustivel),
    },
  }),
  execute: async (input) => {
    const start = Date.now();
    try {
      const res = await rotaPlannerAdapter.calcularLucro(input.periodo, input.descontarApenasCombustivel);
      return {
        success: true,
        toolName: 'calcularLucro',
        project: 'rotaplanner',
        permission: ToolPermission.READ,
        isMock: res.isMockData,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - start,
        data: res,
        message: `Em ${res.periodo}: Ganho Bruto R$ ${res.ganhoBruto.toFixed(2)} | Descontando Combustível (R$ ${res.gastoCombustivel.toFixed(2)}): R$ ${res.saldoDescontandoApenasCombustivel.toFixed(2)} | Lucro Líquido Final: R$ ${res.lucroLiquidoTotal.toFixed(2)} (${res.margemLiquidaPercentual}%).`,
      };
    } catch (err) {
      return handleRotaError('calcularLucro', ToolPermission.READ, start, err);
    }
  },
};

export const analisarDesempenhoTool: Tool<{ periodo?: string }> = {
  name: 'analisarDesempenho',
  description: 'Analisa a rentabilidade, ganho por km, melhor dia de operação e eficiência financeira no RotaPlanner.',
  project: 'rotaplanner',
  permission: ToolPermission.READ,
  parameters: {
    periodo: {
      type: 'string',
      description: 'Período para análise (semana, mes_passado).',
      required: false,
    },
  },
  validate: (input) => ({
    valid: true,
    parsed: { periodo: typeof input.periodo === 'string' ? input.periodo : 'semana' },
  }),
  execute: async (input) => {
    const start = Date.now();
    try {
      const res = await rotaPlannerAdapter.analisarDesempenho(input.periodo);
      return {
        success: true,
        toolName: 'analisarDesempenho',
        project: 'rotaplanner',
        permission: ToolPermission.READ,
        isMock: res.isMockData,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - start,
        data: res,
        message: `Análise de desempenho (${res.periodo}): ${res.eficienciaFinanceira}, R$ ${res.lucroLiquidoPorKm}/km líquido.`,
      };
    } catch (err) {
      return handleRotaError('analisarDesempenho', ToolPermission.READ, start, err);
    }
  },
};

export const analisarRotasTool: Tool = {
  name: 'analisarRotas',
  description: 'Avalia gargalos de trânsito e sugere otimização de sequência de paradas no RotaPlanner.',
  project: 'rotaplanner',
  permission: ToolPermission.READ,
  parameters: {},
  validate: () => ({ valid: true, parsed: {} }),
  execute: async () => {
    const start = Date.now();
    try {
      const res = await rotaPlannerAdapter.analisarRotas();
      return {
        success: true,
        toolName: 'analisarRotas',
        project: 'rotaplanner',
        permission: ToolPermission.READ,
        isMock: res.isMockData,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - start,
        data: res,
        message: `Otimização de rotas concluída: economia potencial de ${res.economiaPotencialKmDia} km/dia.`,
      };
    } catch (err) {
      return handleRotaError('analisarRotas', ToolPermission.READ, start, err);
    }
  },
};

export const rotaTools: Tool<any, any>[] = [
  consultarGanhosTool,
  consultarDespesasTool,
  consultarCombustivelTool,
  consultarRotasTool,
  consultarEntregasTool,
  consultarManutencaoTool,
  calcularLucroTool,
  analisarDesempenhoTool,
  analisarRotasTool,
];
