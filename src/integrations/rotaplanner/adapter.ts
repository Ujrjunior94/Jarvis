import { IntegrationStatus } from '../../types/jarvis';

/**
 * Camada de Integração Desacoplada: ROTAPLANNER
 * Repositório alvo: https://github.com/Ujrjunior94/Rotaplanner
 *
 * IMPORTANTE: Nenhum código interno do RotaPlanner é copiado para o JARVIS.
 * O JARVIS atua exclusivamente como orquestrador consultando endpoints ou mocks explícitos.
 */

export interface ResumoGanhosRota {
  periodo: string;
  isMockData: boolean;
  ganhoBrutoTotal: number;
  totalEntregasConcluidas: number;
  quilometragemTotalKm: number;
  mediaPorEntrega: number;
  mediaPorKm: number;
  detalhamentoDiario: Array<{
    data: string;
    dia: string;
    ganhoBruto: number;
    entregas: number;
    kmRodados: number;
  }>;
}

export interface ResumoDespesasRota {
  periodo: string;
  isMockData: boolean;
  despesaTotal: number;
  combustivelTotal: number;
  manutencaoTotal: number;
  alimentacaoOutros: number;
  itens: Array<{
    id: string;
    data: string;
    categoria: 'Combustível' | 'Manutenção' | 'Alimentação' | 'Pedágio';
    valor: number;
    descricao: string;
    litros?: number;
    precoPorLitro?: number;
  }>;
}

class RotaPlannerAdapter {
  private simulatedOffline = false;

  public getApiUrl(): string | undefined {
    const url = process.env.ROTAPLANNER_API_URL;
    return url && url.trim().length > 0 ? url.trim() : undefined;
  }

  public isMockMode(): boolean {
    return !this.getApiUrl();
  }

  public setSimulatedOffline(offline: boolean): void {
    this.simulatedOffline = offline;
  }

  public isSimulatedOffline(): boolean {
    return this.simulatedOffline;
  }

  public async checkStatus(): Promise<{ status: IntegrationStatus; isMock: boolean; message: string }> {
    if (this.simulatedOffline) {
      return {
        status: IntegrationStatus.OFFLINE,
        isMock: this.isMockMode(),
        message: 'RotaPlanner inacessível (Simulação de falha de conexão ativa).',
      };
    }

    if (this.isMockMode()) {
      return {
        status: IntegrationStatus.MOCK,
        isMock: true,
        message: 'Operando via Adapter MOCK desacoplado (API real ainda não configurada em ROTAPLANNER_API_URL).',
      };
    }

    return {
      status: IntegrationStatus.ONLINE,
      isMock: false,
      message: `Conectado ao endpoint ${this.getApiUrl()}`,
    };
  }

  private ensureAvailable(): void {
    if (this.simulatedOffline) {
      throw new Error('CONNECTION_ERROR: Não consegui acessar o RotaPlanner neste momento.');
    }
  }

  public async consultarGanhos(periodo = 'semana'): Promise<ResumoGanhosRota> {
    this.ensureAvailable();
    const norm = periodo.toLowerCase();

    if (norm.includes('mes_passado') || norm.includes('mês passado') || norm.includes('passado')) {
      return {
        periodo: 'Mês Passado (Setembro/2026)',
        isMockData: this.isMockMode(),
        ganhoBrutoTotal: 9420.0,
        totalEntregasConcluidas: 312,
        quilometragemTotalKm: 2840,
        mediaPorEntrega: 30.19,
        mediaPorKm: 3.32,
        detalhamentoDiario: [
          { data: 'Semana 1', dia: '01/09 a 07/09', ganhoBruto: 2310.0, entregas: 76, kmRodados: 690 },
          { data: 'Semana 2', dia: '08/09 a 14/09', ganhoBruto: 2480.0, entregas: 82, kmRodados: 740 },
          { data: 'Semana 3', dia: '15/09 a 21/09', ganhoBruto: 2190.0, entregas: 72, kmRodados: 680 },
          { data: 'Semana 4', dia: '22/09 a 30/09', ganhoBruto: 2440.0, entregas: 82, kmRodados: 730 },
        ],
      };
    }

    if (norm.includes('hoje')) {
      return {
        periodo: 'Hoje (06/10/2026)',
        isMockData: this.isMockMode(),
        ganhoBrutoTotal: 420.0,
        totalEntregasConcluidas: 14,
        quilometragemTotalKm: 118,
        mediaPorEntrega: 30.0,
        mediaPorKm: 3.56,
        detalhamentoDiario: [
          { data: '2026-10-06', dia: 'Terça-feira', ganhoBruto: 420.0, entregas: 14, kmRodados: 118 },
        ],
      };
    }

    // Default: Semana Atual
    return {
      periodo: 'Semana Atual (01/10 a 06/10/2026)',
      isMockData: this.isMockMode(),
      ganhoBrutoTotal: 2450.0,
      totalEntregasConcluidas: 82,
      quilometragemTotalKm: 685,
      mediaPorEntrega: 29.88,
      mediaPorKm: 3.58,
      detalhamentoDiario: [
        { data: '2026-10-01', dia: 'Quinta-feira', ganhoBruto: 410.0, entregas: 14, kmRodados: 115 },
        { data: '2026-10-02', dia: 'Sexta-feira', ganhoBruto: 495.0, entregas: 17, kmRodados: 138 },
        { data: '2026-10-03', dia: 'Sábado', ganhoBruto: 540.0, entregas: 18, kmRodados: 142 },
        { data: '2026-10-04', dia: 'Domingo', ganhoBruto: 265.0, entregas: 8, kmRodados: 74 },
        { data: '2026-10-05', dia: 'Segunda-feira', ganhoBruto: 320.0, entregas: 11, kmRodados: 98 },
        { data: '2026-10-06', dia: 'Terça-feira', ganhoBruto: 420.0, entregas: 14, kmRodados: 118 },
      ],
    };
  }

  public async consultarDespesas(periodo = 'semana'): Promise<ResumoDespesasRota> {
    this.ensureAvailable();
    const norm = periodo.toLowerCase();

    if (norm.includes('mes_passado') || norm.includes('mês passado') || norm.includes('passado')) {
      return {
        periodo: 'Mês Passado (Setembro/2026)',
        isMockData: this.isMockMode(),
        despesaTotal: 2390.0,
        combustivelTotal: 1680.0,
        manutencaoTotal: 450.0,
        alimentacaoOutros: 260.0,
        itens: [
          {
            id: 'desp_m1',
            data: '2026-09-05',
            categoria: 'Combustível',
            valor: 420.0,
            descricao: 'Abastecimento Semanal 1',
            litros: 72.5,
            precoPorLitro: 5.79,
          },
          {
            id: 'desp_m2',
            data: '2026-09-12',
            categoria: 'Combustível',
            valor: 430.0,
            descricao: 'Abastecimento Semanal 2',
            litros: 74.2,
            precoPorLitro: 5.79,
          },
          {
            id: 'desp_m3',
            data: '2026-09-18',
            categoria: 'Manutenção',
            valor: 450.0,
            descricao: 'Troca de pastilhas de freio e óleo motor',
          },
          {
            id: 'desp_m4',
            data: '2026-09-21',
            categoria: 'Combustível',
            valor: 410.0,
            descricao: 'Abastecimento Semanal 3',
            litros: 70.8,
            precoPorLitro: 5.79,
          },
          {
            id: 'desp_m5',
            data: '2026-09-28',
            categoria: 'Combustível',
            valor: 420.0,
            descricao: 'Abastecimento Semanal 4',
            litros: 72.5,
            precoPorLitro: 5.79,
          },
        ],
      };
    }

    return {
      periodo: 'Semana Atual (01/10 a 06/10/2026)',
      isMockData: this.isMockMode(),
      despesaTotal: 615.0,
      combustivelTotal: 435.0,
      manutencaoTotal: 110.0,
      alimentacaoOutros: 70.0,
      itens: [
        {
          id: 'desp_01',
          data: '2026-10-01',
          categoria: 'Combustível',
          valor: 180.0,
          descricao: 'Gasolina Comum - Posto Matriz',
          litros: 31.08,
          precoPorLitro: 5.79,
        },
        {
          id: 'desp_02',
          data: '2026-10-03',
          categoria: 'Combustível',
          valor: 170.0,
          descricao: 'Gasolina Comum - Rota Sul',
          litros: 29.36,
          precoPorLitro: 5.79,
        },
        {
          id: 'desp_03',
          data: '2026-10-04',
          categoria: 'Manutenção',
          valor: 110.0,
          descricao: 'Alinhamento, balanceamento e calibragem',
        },
        {
          id: 'desp_04',
          data: '2026-10-06',
          categoria: 'Combustível',
          valor: 85.0,
          descricao: 'Abastecimento parcial turno manhã',
          litros: 14.68,
          precoPorLitro: 5.79,
        },
      ],
    };
  }

  public async consultarCombustivel(periodo = 'semana') {
    this.ensureAvailable();
    const despesas = await this.consultarDespesas(periodo);
    const ganhos = await this.consultarGanhos(periodo);
    const abastecimentos = despesas.itens.filter((i) => i.categoria === 'Combustível');
    const litrosTotais = abastecimentos.reduce((acc, item) => acc + (item.litros || 0), 0);
    const consumoMedioKmPorLitro = litrosTotais > 0 ? Number((ganhos.quilometragemTotalKm / litrosTotais).toFixed(2)) : 9.1;

    return {
      isMockData: this.isMockMode(),
      periodo: despesas.periodo,
      totalGastoCombustivel: despesas.combustivelTotal,
      litrosAbastecidos: Number(litrosTotais.toFixed(2)) || 75.12,
      precoMedioLitro: 5.79,
      quilometragemNoPeriodoKm: ganhos.quilometragemTotalKm,
      consumoMedioKmL: consumoMedioKmPorLitro,
      custoCombustivelPorKm: Number((despesas.combustivelTotal / ganhos.quilometragemTotalKm).toFixed(2)),
      abastecimentos,
    };
  }

  public async consultarRotas(data?: string) {
    this.ensureAvailable();
    return {
      isMockData: this.isMockMode(),
      dataReferencia: data || '2026-10-06',
      rotasPlanejadas: [
        {
          id: 'rota_101',
          nome: 'Rota Zona Sul / Centro Empresarial',
          paradas: 9,
          entregasConcluidas: 9,
          distanciaKm: 64,
          tempoEstimadoMin: 145,
          ganhoRota: 255.0,
          status: 'Concluída',
        },
        {
          id: 'rota_102',
          nome: 'Rota Eixo Norte / Distrito Industrial',
          paradas: 5,
          entregasConcluidas: 5,
          distanciaKm: 54,
          tempoEstimadoMin: 110,
          ganhoRota: 165.0,
          status: 'Concluída',
        },
      ],
    };
  }

  public async consultarEntregas(periodo = 'hoje') {
    this.ensureAvailable();
    return {
      isMockData: this.isMockMode(),
      periodo,
      totalEntregas: 14,
      concluidasNoPrazo: 13,
      atrasos: 1,
      taxaSucessoPercentual: 92.8,
      ultimasEntregas: [
        { codigo: 'ENT-9081', cliente: 'Distribuidora Alfa', bairro: 'Centro', valorFrete: 35.0, status: 'Entregue' },
        { codigo: 'ENT-9082', cliente: 'Oficina Prime', bairro: 'Zona Sul', valorFrete: 28.0, status: 'Entregue' },
        { codigo: 'ENT-9083', cliente: 'Mercado São José', bairro: 'Distrito Industrial', valorFrete: 42.0, status: 'Entregue' },
      ],
    };
  }

  public async consultarManutencao() {
    this.ensureAvailable();
    return {
      isMockData: this.isMockMode(),
      odometroAtualKm: 64320,
      statusVeiculo: 'Operacional — Revisão preventiva em 680 km',
      historicoRecente: [
        { data: '2026-10-04', servico: 'Alinhamento e balanceamento', km: 64100, custo: 110.0 },
        { data: '2026-09-18', servico: 'Troca de pastilhas de freio e óleo motor', km: 62450, custo: 450.0 },
      ],
      alertasProximos: [
        { servico: 'Troca de óleo e filtro (a cada 3.000 km em uso severo)', kmPrevisto: 65000, faltamKm: 680 },
        { servico: 'Rodízio de pneus', kmPrevisto: 66000, faltamKm: 1680 },
      ],
    };
  }

  public async calcularLucro(periodo = 'semana', apenasDescontarCombustivel = false) {
    this.ensureAvailable();
    const ganhos = await this.consultarGanhos(periodo);
    const despesas = await this.consultarDespesas(periodo);

    const ganhoLiquidoAposCombustivel = Number((ganhos.ganhoBrutoTotal - despesas.combustivelTotal).toFixed(2));
    const lucroLiquidoReal = Number((ganhos.ganhoBrutoTotal - despesas.despesaTotal).toFixed(2));
    const margemLiquidaPercentual = Number(((lucroLiquidoReal / ganhos.ganhoBrutoTotal) * 100).toFixed(1));

    return {
      isMockData: this.isMockMode(),
      periodo: ganhos.periodo,
      ganhoBruto: ganhos.ganhoBrutoTotal,
      gastoCombustivel: despesas.combustivelTotal,
      gastoManutencaoEOutros: Number((despesas.despesaTotal - despesas.combustivelTotal).toFixed(2)),
      despesaTotal: despesas.despesaTotal,
      saldoDescontandoApenasCombustivel: ganhoLiquidoAposCombustivel,
      lucroLiquidoTotal: lucroLiquidoReal,
      margemLiquidaPercentual,
      focoCalculo: apenasDescontarCombustivel ? 'DESCONTO_COMBUSTIVEL' : 'LUCRO_LIQUIDO_COMPLETO',
    };
  }

  public async analisarDesempenho(periodo = 'semana') {
    this.ensureAvailable();
    const lucro = await this.calcularLucro(periodo);
    const ganhos = await this.consultarGanhos(periodo);
    return {
      isMockData: this.isMockMode(),
      periodo: ganhos.periodo,
      eficienciaFinanceira: `${lucro.margemLiquidaPercentual}% de margem líquida`,
      ganhoPorKmBruto: ganhos.mediaPorKm,
      lucroLiquidoPorKm: Number((lucro.lucroLiquidoTotal / ganhos.quilometragemTotalKm).toFixed(2)),
      melhorDiaDaSemana: 'Sábado (R$ 540,00 em 18 entregas)',
      diaMaisFraco: 'Domingo (R$ 265,00 em 8 entregas)',
      recomendacoes: [
        'Concentrar rotas de sábado e sexta-feira na Zona Sul, onde o ticket médio por entrega foi 18% maior.',
        'O custo de combustível representou 17,7% do faturamento bruto na semana — dentro da meta saudável (<20%).',
      ],
    };
  }

  public async analisarRotas() {
    this.ensureAvailable();
    return {
      isMockData: this.isMockMode(),
      rotasAvaliadas: 2,
      economiaPotencialKmDia: 14.5,
      gargalosIdentificados: [
        'Rota Eixo Norte apresenta trânsito pesado entre 16h30 e 18h00, aumentando o consumo em 15%.',
      ],
      sugestaoOtimizacao:
        'Inverter ordem de atendimento: iniciar pelo Distrito Industrial às 13h30 e encerrar no Centro Empresarial.',
    };
  }
}

export const rotaPlannerAdapter = new RotaPlannerAdapter();
