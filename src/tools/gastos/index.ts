import {
  ErrorCategory,
  Tool,
  ToolPermission,
  ToolResult,
} from '../../types/jarvis';
import { controleGastosAdapter } from '../../integrations/gastos/adapter';

/**
 * Módulo de Ferramentas: CONTROLE DE GASTOS
 * Preparado para integração futura quando o terceiro projeto for construído.
 * Inclui controles de permissão rigorosos (READ, CONFIRM, CRITICAL).
 */

export const consultarGastosTool: Tool<{ categoria?: string }> = {
  name: 'consultarGastos',
  description: 'Consulta despesas pessoais no módulo Controle de Gastos (atualmente em modo preparado/sandbox).',
  project: 'controle-gastos',
  permission: ToolPermission.READ,
  parameters: {
    categoria: {
      type: 'string',
      description: 'Categoria opcional para filtrar (ex: Combustível, Alimentação).',
      required: false,
    },
  },
  validate: (input) => ({
    valid: true,
    parsed: { categoria: typeof input.categoria === 'string' ? input.categoria : undefined },
  }),
  execute: async (input) => {
    const start = Date.now();
    const res = await controleGastosAdapter.consultarGastos(input.categoria);
    return {
      success: true,
      toolName: 'consultarGastos',
      project: 'controle-gastos',
      permission: ToolPermission.READ,
      isMock: true,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - start,
      data: res,
      message: `Controle de Gastos (Sandbox preparado): ${res.quantidadeItens} lançamentos somando R$ ${res.totalGastos.toFixed(2)}.`,
    };
  },
};

export const registrarGastoTool: Tool<{ descricao: string; valor: number; categoria: string; data?: string }> = {
  name: 'registrarGasto',
  description: 'Registra uma nova despesa no módulo Controle de Gastos (Nível CONFIRM: requer confirmação do usuário).',
  project: 'controle-gastos',
  permission: ToolPermission.CONFIRM,
  parameters: {
    descricao: {
      type: 'string',
      description: 'Descrição do gasto (ex: Abastecimento, Supermercado).',
      required: true,
    },
    valor: {
      type: 'number',
      description: 'Valor em reais (R$).',
      required: true,
    },
    categoria: {
      type: 'string',
      description: 'Categoria financeira.',
      required: true,
    },
    data: {
      type: 'string',
      description: 'Data opcional YYYY-MM-DD.',
      required: false,
    },
  },
  validate: (input) => {
    const valor = Number(input.valor ?? 85);
    if (isNaN(valor) || valor <= 0) {
      return { valid: false, error: 'O valor do gasto deve ser um número positivo.' };
    }
    const descricao =
      typeof input.descricao === 'string' && input.descricao.trim()
        ? input.descricao.trim()
        : 'Despesa registrada via assistente';
    const categoria =
      typeof input.categoria === 'string' && input.categoria.trim() ? input.categoria.trim() : 'Combustível';
    return {
      valid: true,
      parsed: {
        descricao,
        valor,
        categoria,
        data: typeof input.data === 'string' ? input.data : undefined,
      },
    };
  },
  prepareConfirmation: (input) => ({
    summary: `Deseja confirmar o registro da despesa de R$ ${input.valor.toFixed(2)} em "${input.categoria}" (${input.descricao})?`,
    details: input,
  }),
  execute: async (input) => {
    const start = Date.now();
    const res = await controleGastosAdapter.registrarGasto(input);
    return {
      success: true,
      toolName: 'registrarGasto',
      project: 'controle-gastos',
      permission: ToolPermission.CONFIRM,
      isMock: true,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - start,
      data: res,
      message: `Despesa de R$ ${res.registrado.valor.toFixed(2)} (${res.registrado.descricao}) registrada com sucesso.`,
    };
  },
};

export const editarGastoTool: Tool<{ id: string; valor?: number; descricao?: string; categoria?: string }> = {
  name: 'editarGasto',
  description: 'Edita um lançamento existente no Controle de Gastos (Nível CONFIRM).',
  project: 'controle-gastos',
  permission: ToolPermission.CONFIRM,
  parameters: {
    id: { type: 'string', description: 'ID do gasto (ex: gasto_01).', required: true },
    valor: { type: 'number', description: 'Novo valor em R$.', required: false },
    descricao: { type: 'string', description: 'Nova descrição.', required: false },
    categoria: { type: 'string', description: 'Nova categoria.', required: false },
  },
  validate: (input) => ({
    valid: true,
    parsed: {
      id: typeof input.id === 'string' && input.id ? input.id : 'gasto_01',
      valor: input.valor !== undefined ? Number(input.valor) : undefined,
      descricao: typeof input.descricao === 'string' ? input.descricao : undefined,
      categoria: typeof input.categoria === 'string' ? input.categoria : undefined,
    },
  }),
  prepareConfirmation: (input) => ({
    summary: `Deseja confirmar a alteração do lançamento ${input.id} no Controle de Gastos?`,
    details: input,
  }),
  execute: async (input) => {
    const start = Date.now();
    try {
      const res = await controleGastosAdapter.editarGasto(input);
      return {
        success: true,
        toolName: 'editarGasto',
        project: 'controle-gastos',
        permission: ToolPermission.CONFIRM,
        isMock: true,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - start,
        data: res,
        message: `Gasto ${res.atualizado.id} atualizado com sucesso.`,
      };
    } catch (err) {
      return {
        success: false,
        toolName: 'editarGasto',
        project: 'controle-gastos',
        permission: ToolPermission.CONFIRM,
        isMock: true,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - start,
        message: err instanceof Error ? err.message : 'Erro ao editar gasto',
        errorCategory: ErrorCategory.NOT_FOUND,
      };
    }
  },
};

export const excluirGastoTool: Tool<{ alvo?: string }> = {
  name: 'excluirGasto',
  description:
    'Exclui uma despesa registrada (Nível CRITICAL: O JARVIS nunca executa automaticamente sem confirmação explícita).',
  project: 'controle-gastos',
  permission: ToolPermission.CRITICAL,
  parameters: {
    alvo: {
      type: 'string',
      description: 'ID, categoria ou descrição da despesa a ser excluída (ex: combustível, gasto_01).',
      required: false,
    },
  },
  validate: (input) => ({
    valid: true,
    parsed: {
      alvo: typeof input.alvo === 'string' && input.alvo.trim() ? input.alvo.trim() : 'combustível',
    },
  }),
  prepareConfirmation: (input) => {
    const item = controleGastosAdapter.encontrarGastoParaExclusao(input.alvo);
    if (item) {
      return {
        summary: `Encontrei a despesa de R$ ${item.valor.toFixed(2)} registrada em ${item.categoria.toLowerCase()} (${item.descricao}). Deseja realmente excluir?`,
        details: { id: item.id, valor: item.valor, categoria: item.categoria, descricao: item.descricao },
      };
    }
    return {
      summary: `Deseja realmente excluir o registro financeiro referente a "${input.alvo}"? Esta é uma operação crítica irreversível.`,
      details: input,
    };
  },
  execute: async (input) => {
    const start = Date.now();
    try {
      const res = await controleGastosAdapter.excluirGasto(input.alvo || 'combustível');
      return {
        success: true,
        toolName: 'excluirGasto',
        project: 'controle-gastos',
        permission: ToolPermission.CRITICAL,
        isMock: true,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - start,
        data: res,
        message: `A despesa de R$ ${res.excluido.valor.toFixed(2)} (${res.excluido.descricao}) foi excluída permanentemente após sua confirmação.`,
      };
    } catch (err) {
      return {
        success: false,
        toolName: 'excluirGasto',
        project: 'controle-gastos',
        permission: ToolPermission.CRITICAL,
        isMock: true,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - start,
        message: err instanceof Error ? err.message : 'Despesa não localizada para exclusão.',
        errorCategory: ErrorCategory.NOT_FOUND,
      };
    }
  },
};

export const consultarCategoriasTool: Tool = {
  name: 'consultarCategorias',
  description: 'Lista as categorias financeiras configuradas na estrutura do Controle de Gastos.',
  project: 'controle-gastos',
  permission: ToolPermission.READ,
  parameters: {},
  validate: () => ({ valid: true, parsed: {} }),
  execute: async () => {
    const start = Date.now();
    const res = await controleGastosAdapter.consultarCategorias();
    return {
      success: true,
      toolName: 'consultarCategorias',
      project: 'controle-gastos',
      permission: ToolPermission.READ,
      isMock: true,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - start,
      data: res,
      message: `${res.categorias.length} categorias disponíveis no módulo Controle de Gastos.`,
    };
  },
};

export const calcularSaldoTool: Tool = {
  name: 'calcularSaldo',
  description: 'Calcula o saldo disponível no módulo preparado de Controle de Gastos.',
  project: 'controle-gastos',
  permission: ToolPermission.READ,
  parameters: {},
  validate: () => ({ valid: true, parsed: {} }),
  execute: async () => {
    const start = Date.now();
    const res = await controleGastosAdapter.calcularSaldo();
    return {
      success: true,
      toolName: 'calcularSaldo',
      project: 'controle-gastos',
      permission: ToolPermission.READ,
      isMock: true,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - start,
      data: res,
      message: `Saldo calculado (Sandbox): Receita Base R$ ${res.receitaEstimada.toFixed(2)} - Despesas R$ ${res.totalDespesas.toFixed(2)} = R$ ${res.saldoDisponivel.toFixed(2)}.`,
    };
  },
};

export const gerarResumoFinanceiroTool: Tool = {
  name: 'gerarResumoFinanceiro',
  description: 'Gera o resumo consolidado e estado de prontidão arquitetural do módulo Controle de Gastos.',
  project: 'controle-gastos',
  permission: ToolPermission.READ,
  parameters: {},
  validate: () => ({ valid: true, parsed: {} }),
  execute: async () => {
    const start = Date.now();
    const res = await controleGastosAdapter.gerarResumoFinanceiro();
    return {
      success: true,
      toolName: 'gerarResumoFinanceiro',
      project: 'controle-gastos',
      permission: ToolPermission.READ,
      isMock: true,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - start,
      data: res,
      message: `Resumo financeiro gerado. ${res.observacaoArquitetura}`,
    };
  },
};

export const gastosTools: Tool<any, any>[] = [
  consultarGastosTool,
  registrarGastoTool,
  editarGastoTool,
  excluirGastoTool,
  consultarCategoriasTool,
  calcularSaldoTool,
  gerarResumoFinanceiroTool,
];
