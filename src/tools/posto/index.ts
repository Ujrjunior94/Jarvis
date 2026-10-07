import {
  AgentContext,
  ErrorCategory,
  Tool,
  ToolPermission,
  ToolResult,
} from '../../types/jarvis';
import { postoAdmAdapter } from '../../integrations/posto-adm/adapter';
import { getCurrentDateTime } from '../../lib/datetime';

function handlePostoError(toolName: string, permission: ToolPermission, start: number, err: unknown): ToolResult {
  const msg = err instanceof Error ? err.message : 'Erro desconhecido ao acessar Posto ADM';
  const isOffline = msg.includes('CONNECTION_ERROR');
  return {
    success: false,
    toolName,
    project: 'posto-adm',
    permission,
    isMock: postoAdmAdapter.isMockMode(),
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - start,
    message: isOffline
      ? 'Não consegui acessar o Posto ADM neste momento.'
      : `Falha ao executar ${toolName} no Posto ADM: ${msg}`,
    errorCategory: isOffline ? ErrorCategory.CONNECTION_ERROR : ErrorCategory.TOOL_UNAVAILABLE,
  };
}

export const consultarEscalaTool: Tool<{ data?: string; turno?: string }> = {
  name: 'consultarEscala',
  description: 'Consulta a escala de trabalho dos funcionários do Posto ADM para uma data e turno específicos.',
  project: 'posto-adm',
  permission: ToolPermission.READ,
  parameters: {
    data: {
      type: 'string',
      description: 'Data da escala no formato YYYY-MM-DD (ex: 2026-10-07).',
      required: false,
    },
    turno: {
      type: 'string',
      description: 'Filtro opcional de turno: manha, tarde, noite ou all.',
      required: false,
      enum: ['manha', 'tarde', 'noite', 'all'],
    },
  },
  validate: (input) => {
    const data = typeof input.data === 'string' && input.data.trim() ? input.data.trim() : getCurrentDateTime().date;
    const turno = typeof input.turno === 'string' ? input.turno : 'all';
    return { valid: true, parsed: { data, turno } };
  },
  execute: async (input, context: AgentContext) => {
    const start = Date.now();
    try {
      const targetDate = input.data || context.currentDate || getCurrentDateTime().date;
      const result = await postoAdmAdapter.consultarEscala(targetDate, input.turno);
      return {
        success: true,
        toolName: 'consultarEscala',
        project: 'posto-adm',
        permission: ToolPermission.READ,
        isMock: result.isMockData,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - start,
        data: result,
        message: `Escala de ${result.data} (${result.diaSemana}) consultada com sucesso (${result.escalados.length} profissionais escalados).`,
      };
    } catch (err) {
      return handlePostoError('consultarEscala', ToolPermission.READ, start, err);
    }
  },
};

export const consultarFuncionariosTool: Tool<{ status?: string }> = {
  name: 'consultarFuncionarios',
  description: 'Lista o quadro de funcionários cadastrados no Posto ADM com cargos, turnos e status atual.',
  project: 'posto-adm',
  permission: ToolPermission.READ,
  parameters: {
    status: {
      type: 'string',
      description: 'Filtro opcional por status (Ativo, Férias, Folga).',
      required: false,
    },
  },
  validate: (input) => ({
    valid: true,
    parsed: { status: typeof input.status === 'string' ? input.status : undefined },
  }),
  execute: async (input) => {
    const start = Date.now();
    try {
      const res = await postoAdmAdapter.consultarFuncionarios(input.status);
      return {
        success: true,
        toolName: 'consultarFuncionarios',
        project: 'posto-adm',
        permission: ToolPermission.READ,
        isMock: res.isMockData,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - start,
        data: res,
        message: `Foram encontrados ${res.total} funcionários registrados no Posto ADM.`,
      };
    } catch (err) {
      return handlePostoError('consultarFuncionarios', ToolPermission.READ, start, err);
    }
  },
};

export const consultarTurnosTool: Tool = {
  name: 'consultarTurnos',
  description: 'Consulta os turnos configurados no Posto ADM, horários e efetivo mínimo por ilha/caixa.',
  project: 'posto-adm',
  permission: ToolPermission.READ,
  parameters: {},
  validate: () => ({ valid: true, parsed: {} }),
  execute: async () => {
    const start = Date.now();
    try {
      const res = await postoAdmAdapter.consultarTurnos();
      return {
        success: true,
        toolName: 'consultarTurnos',
        project: 'posto-adm',
        permission: ToolPermission.READ,
        isMock: res.isMockData,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - start,
        data: res,
        message: `Configuração de ${res.turnosConfigurados.length} turnos carregada (${res.regimeEscala}).`,
      };
    } catch (err) {
      return handlePostoError('consultarTurnos', ToolPermission.READ, start, err);
    }
  },
};

export const consultarFeriasTool: Tool = {
  name: 'consultarFerias',
  description: 'Consulta funcionários em férias no momento e próximas férias programadas no Posto ADM.',
  project: 'posto-adm',
  permission: ToolPermission.READ,
  parameters: {},
  validate: () => ({ valid: true, parsed: {} }),
  execute: async () => {
    const start = Date.now();
    try {
      const res = await postoAdmAdapter.consultarFerias();
      return {
        success: true,
        toolName: 'consultarFerias',
        project: 'posto-adm',
        permission: ToolPermission.READ,
        isMock: res.isMockData,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - start,
        data: res,
        message: `Controle de férias consultado: ${res.emFeriasAgora.length} em férias agora e ${res.proximasFeriasProgramadas.length} programadas.`,
      };
    } catch (err) {
      return handlePostoError('consultarFerias', ToolPermission.READ, start, err);
    }
  },
};

export const consultarFolgasTool: Tool<{ data?: string }> = {
  name: 'consultarFolgas',
  description: 'Consulta as folgas (DSR) do dia e o cronograma semanal de folgas do Posto ADM.',
  project: 'posto-adm',
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
      const res = await postoAdmAdapter.consultarFolgas(input.data);
      return {
        success: true,
        toolName: 'consultarFolgas',
        project: 'posto-adm',
        permission: ToolPermission.READ,
        isMock: res.isMockData,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - start,
        data: res,
        message: `Cronograma de folgas consultado para ${res.dataReferencia}.`,
      };
    } catch (err) {
      return handlePostoError('consultarFolgas', ToolPermission.READ, start, err);
    }
  },
};

export const consultarInformacoesPostoTool: Tool = {
  name: 'consultarInformacoesPosto',
  description: 'Retorna informações operacionais gerais da unidade Posto ADM (bombas, bicos, combustíveis, quadro).',
  project: 'posto-adm',
  permission: ToolPermission.READ,
  parameters: {},
  validate: () => ({ valid: true, parsed: {} }),
  execute: async () => {
    const start = Date.now();
    try {
      const res = await postoAdmAdapter.consultarInformacoesPosto();
      return {
        success: true,
        toolName: 'consultarInformacoesPosto',
        project: 'posto-adm',
        permission: ToolPermission.READ,
        isMock: res.isMockData,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - start,
        data: res,
        message: `Informações operacionais do ${res.nome} obtidas.`,
      };
    } catch (err) {
      return handlePostoError('consultarInformacoesPosto', ToolPermission.READ, start, err);
    }
  },
};

export const analisarEscalaTool: Tool<{ data?: string }> = {
  name: 'analisarEscala',
  description:
    'Analisa a escala do Posto ADM em busca de erros, conflitos trabalhistas (interjornada < 11h), furos de cobertura ou dobras.',
  project: 'posto-adm',
  permission: ToolPermission.READ,
  parameters: {
    data: {
      type: 'string',
      description: 'Data opcional para auditoria da escala (YYYY-MM-DD).',
      required: false,
    },
  },
  validate: (input) => ({
    valid: true,
    parsed: { data: typeof input.data === 'string' ? input.data : undefined },
  }),
  execute: async (input, context) => {
    const start = Date.now();
    try {
      const res = await postoAdmAdapter.analisarEscala(input.data || context.currentDate);
      return {
        success: true,
        toolName: 'analisarEscala',
        project: 'posto-adm',
        permission: ToolPermission.READ,
        isMock: res.isMockData,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - start,
        data: res,
        message: res.resumoAnalise,
      };
    } catch (err) {
      return handlePostoError('analisarEscala', ToolPermission.READ, start, err);
    }
  },
};

export const validarEscalaTool: Tool<{ data: string; alteracaoProposta?: string }> = {
  name: 'validarEscala',
  description: 'Homologa ou altera a validação oficial da escala no Posto ADM (Requer nível CONFIRM).',
  project: 'posto-adm',
  permission: ToolPermission.CONFIRM,
  parameters: {
    data: {
      type: 'string',
      description: 'Data da escala a ser validada/homologada.',
      required: true,
    },
    alteracaoProposta: {
      type: 'string',
      description: 'Descrição da alteração ou homologação de turno.',
      required: false,
    },
  },
  validate: (input) => {
    const data = typeof input.data === 'string' && input.data.trim() ? input.data.trim() : getCurrentDateTime().date;
    const alteracaoProposta =
      typeof input.alteracaoProposta === 'string'
        ? input.alteracaoProposta
        : 'Homologação e ajuste preventivo da escala';
    return { valid: true, parsed: { data, alteracaoProposta } };
  },
  prepareConfirmation: (input) => ({
    summary: `Deseja confirmar a homologação/alteração da escala do dia ${input.data} (${input.alteracaoProposta}) no Posto ADM?`,
    details: input,
  }),
  execute: async (input) => {
    const start = Date.now();
    try {
      const res = await postoAdmAdapter.validarEscala(input);
      return {
        success: true,
        toolName: 'validarEscala',
        project: 'posto-adm',
        permission: ToolPermission.CONFIRM,
        isMock: res.isMockData,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - start,
        data: res,
        message: `Escala de ${res.data} validada e registrada com status: ${res.statusValidacao}.`,
      };
    } catch (err) {
      return handlePostoError('validarEscala', ToolPermission.CONFIRM, start, err);
    }
  },
};

export const postoTools: Tool<any, any>[] = [
  consultarEscalaTool,
  consultarFuncionariosTool,
  consultarTurnosTool,
  consultarFeriasTool,
  consultarFolgasTool,
  consultarInformacoesPostoTool,
  analisarEscalaTool,
  validarEscalaTool,
];
