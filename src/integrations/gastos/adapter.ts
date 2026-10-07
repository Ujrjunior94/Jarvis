import { IntegrationStatus } from '../../types/jarvis';
import { getRelativeDate } from '../../lib/datetime';

export interface GastoPessoalItem {
  id: string;
  data: string;
  descricao: string;
  categoria: string;
  valor: number;
  origem: 'Sandbox Controle de Gastos' | 'RotaPlanner Sync';
}

class ControleGastosAdapter {
  private sandboxItems: GastoPessoalItem[] = [
    {
      id: 'gasto_01',
      data: getRelativeDate(0),
      descricao: 'Abastecimento parcial combustível',
      categoria: 'Combustível',
      valor: 85.0,
      origem: 'Sandbox Controle de Gastos',
    },
    {
      id: 'gasto_02',
      data: getRelativeDate(-1),
      descricao: 'Supermercado Semanal',
      categoria: 'Alimentação',
      valor: 342.9,
      origem: 'Sandbox Controle de Gastos',
    },
    {
      id: 'gasto_03',
      data: getRelativeDate(-3),
      descricao: 'Assinatura Internet Fibra',
      categoria: 'Moradia / Contas',
      valor: 129.9,
      origem: 'Sandbox Controle de Gastos',
    },
  ];

  public getApiUrl(): string | undefined {
    const url = process.env.CONTROLE_GASTOS_API_URL;
    return url && url.trim().length > 0 ? url.trim() : undefined;
  }

  public async checkStatus(): Promise<{ status: IntegrationStatus; isMock: boolean; message: string }> {
    if (this.getApiUrl()) {
      return {
        status: IntegrationStatus.ONLINE,
        isMock: false,
        message: `Conectado ao Controle de Gastos (${this.getApiUrl()})`,
      };
    }

    return {
      status: IntegrationStatus.NOT_CONFIGURED,
      isMock: true,
      message:
        'Projeto ainda em fase de criação. Interfaces prontas no JARVIS (operando em Sandbox de Validação para testes de permissão).',
    };
  }

  public async consultarGastos(categoria?: string) {
    let lista = [...this.sandboxItems];
    if (categoria) {
      const c = categoria.toLowerCase();
      lista = lista.filter((g) => g.categoria.toLowerCase().includes(c) || g.descricao.toLowerCase().includes(c));
    }
    const total = lista.reduce((acc, g) => acc + g.valor, 0);
    return {
      statusIntegracao: 'PREPARADO_PARA_FUTURO_PROJETO',
      isMockData: true,
      totalGastos: Number(total.toFixed(2)),
      quantidadeItens: lista.length,
      itens: lista,
    };
  }

  public async registrarGasto(params: { descricao: string; valor: number; categoria: string; data?: string }) {
    const novo: GastoPessoalItem = {
      id: `gasto_${Date.now().toString().slice(-4)}`,
      data: params.data || new Date().toISOString().split('T')[0],
      descricao: params.descricao,
      categoria: params.categoria || 'Geral',
      valor: Number(params.valor),
      origem: 'Sandbox Controle de Gastos',
    };
    this.sandboxItems.unshift(novo);
    return {
      statusIntegracao: 'PREPARADO_PARA_FUTURO_PROJETO',
      isMockData: true,
      registrado: novo,
    };
  }

  public async editarGasto(params: { id: string; valor?: number; descricao?: string; categoria?: string }) {
    const idx = this.sandboxItems.findIndex((i) => i.id === params.id);
    if (idx === -1) {
      throw new Error(`NOT_FOUND: Gasto com ID ${params.id} não encontrado.`);
    }
    this.sandboxItems[idx] = {
      ...this.sandboxItems[idx],
      valor: params.valor !== undefined ? Number(params.valor) : this.sandboxItems[idx].valor,
      descricao: params.descricao || this.sandboxItems[idx].descricao,
      categoria: params.categoria || this.sandboxItems[idx].categoria,
    };
    return {
      statusIntegracao: 'PREPARADO_PARA_FUTURO_PROJETO',
      isMockData: true,
      atualizado: this.sandboxItems[idx],
    };
  }

  public encontrarGastoParaExclusao(termoOuId?: string): GastoPessoalItem | undefined {
    if (!termoOuId) return this.sandboxItems[0];
    const norm = termoOuId.toLowerCase();
    return (
      this.sandboxItems.find(
        (i) =>
          i.id.toLowerCase() === norm ||
          i.categoria.toLowerCase().includes(norm) ||
          i.descricao.toLowerCase().includes(norm) ||
          String(i.valor) === norm
      ) || this.sandboxItems[0]
    );
  }

  public async excluirGasto(idOuTermo: string) {
    const alvo = this.encontrarGastoParaExclusao(idOuTermo);
    if (!alvo) {
      throw new Error('NOT_FOUND: Nenhuma despesa encontrada para exclusão.');
    }
    this.sandboxItems = this.sandboxItems.filter((i) => i.id !== alvo.id);
    return {
      statusIntegracao: 'PREPARADO_PARA_FUTURO_PROJETO',
      isMockData: true,
      excluido: alvo,
    };
  }

  public async consultarCategorias() {
    return {
      statusIntegracao: 'PREPARADO_PARA_FUTURO_PROJETO',
      isMockData: true,
      categorias: ['Combustível', 'Alimentação', 'Moradia / Contas', 'Manutenção Veicular', 'Saúde', 'Lazer'],
    };
  }

  public async calcularSaldo(receitaBase = 6500.0) {
    const totalGastos = this.sandboxItems.reduce((acc, g) => acc + g.valor, 0);
    return {
      statusIntegracao: 'PREPARADO_PARA_FUTURO_PROJETO',
      isMockData: true,
      receitaEstimada: receitaBase,
      totalDespesas: Number(totalGastos.toFixed(2)),
      saldoDisponivel: Number((receitaBase - totalGastos).toFixed(2)),
    };
  }

  public async gerarResumoFinanceiro() {
    const saldo = await this.calcularSaldo();
    return {
      ...saldo,
      observacaoArquitetura:
        'Módulo Controle de Gastos estruturado. Pronto para apontar para CONTROLE_GASTOS_API_URL assim que o terceiro repositório for publicado.',
    };
  }
}

export const controleGastosAdapter = new ControleGastosAdapter();
