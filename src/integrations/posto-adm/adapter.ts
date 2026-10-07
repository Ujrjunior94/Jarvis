import { IntegrationStatus } from '../../types/jarvis';

export interface FuncionarioPosto {
  id: string;
  nome: string;
  cargo: 'Frentista' | 'Caixa' | 'Gerente' | 'Chefe de Pista' | 'Lubrificador';
  turnoPadrao: 'Manhã (06h-14h)' | 'Tarde (14h-22h)' | 'Noite (22h-06h)';
  status: 'Ativo' | 'Férias' | 'Folga' | 'Afastado';
  admissao: string;
}

export interface EscalaDiaItem {
  funcionarioId: string;
  nome: string;
  cargo: string;
  turno: 'Manhã (06h-14h)' | 'Tarde (14h-22h)' | 'Noite (22h-06h)';
  bombaOuSetor: string;
  statusNoDia: 'Escalado' | 'Folga' | 'Férias';
  horasConsecutivasTrabalhadas?: number;
  intervaloInterjornadaHoras?: number;
  observacoes?: string;
}

export interface EscalaDiaPosto {
  data: string;
  diaSemana: string;
  isMockData: boolean;
  postoUnidade: string;
  escalados: EscalaDiaItem[];
  folgas: string[];
  ferias: string[];
  observacoes: string[];
}

export interface InconsistenciaEscala {
  severidade: 'ALTA' | 'MEDIA' | 'BAIXA';
  tipo: string;
  descricao: string;
  funcionarioAfetado?: string;
  turnoAfetado?: string;
  recomendacao: string;
}

const MOCK_FUNCIONARIOS: FuncionarioPosto[] = [
  {
    id: 'func_01',
    nome: 'Carlos Eduardo Silva',
    cargo: 'Chefe de Pista',
    turnoPadrao: 'Manhã (06h-14h)',
    status: 'Ativo',
    admissao: '2022-03-15',
  },
  {
    id: 'func_02',
    nome: 'Marcos Vinícius Souza',
    cargo: 'Frentista',
    turnoPadrao: 'Manhã (06h-14h)',
    status: 'Ativo',
    admissao: '2023-07-01',
  },
  {
    id: 'func_03',
    nome: 'Juliana Ferreira',
    cargo: 'Caixa',
    turnoPadrao: 'Manhã (06h-14h)',
    status: 'Ativo',
    admissao: '2023-01-10',
  },
  {
    id: 'func_04',
    nome: 'Roberto Alves',
    cargo: 'Frentista',
    turnoPadrao: 'Tarde (14h-22h)',
    status: 'Ativo',
    admissao: '2021-11-20',
  },
  {
    id: 'func_05',
    nome: 'Fernanda Lima',
    cargo: 'Caixa',
    turnoPadrao: 'Tarde (14h-22h)',
    status: 'Ativo',
    admissao: '2024-02-05',
  },
  {
    id: 'func_06',
    nome: 'Diego Nascimento',
    cargo: 'Frentista',
    turnoPadrao: 'Tarde (14h-22h)',
    status: 'Folga',
    admissao: '2023-09-12',
  },
  {
    id: 'func_07',
    nome: 'Lucas Mendes',
    cargo: 'Frentista',
    turnoPadrao: 'Noite (22h-06h)',
    status: 'Ativo',
    admissao: '2022-08-19',
  },
  {
    id: 'func_08',
    nome: 'André Gomes',
    cargo: 'Lubrificador',
    turnoPadrao: 'Manhã (06h-14h)',
    status: 'Férias',
    admissao: '2020-05-10',
  },
];

class PostoAdmAdapter {
  private simulatedOffline = false;

  public getApiUrl(): string | undefined {
    const url = process.env.POSTO_ADM_API_URL;
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
        message: 'Posto ADM inacessível (Simulação de falha de conexão ativa).',
      };
    }

    if (this.isMockMode()) {
      return {
        status: IntegrationStatus.MOCK,
        isMock: true,
        message: 'Operando via Adapter MOCK desacoplado (API real ainda não configurada em POSTO_ADM_API_URL).',
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
      throw new Error('CONNECTION_ERROR: Não consegui acessar o Posto ADM neste momento.');
    }
  }

  public async consultarEscala(dataAlvo: string, turnoFiltro?: string): Promise<EscalaDiaPosto> {
    this.ensureAvailable();

    const dateObj = dataAlvo ? new Date(`${dataAlvo}T12:00:00`) : new Date();
    const validDate = isNaN(dateObj.getTime()) ? new Date() : dateObj;
    const formattedDate = validDate.toISOString().split('T')[0];
    const dias = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const diaSemana = dias[validDate.getDay()];

    const isTomorrowOrOdd = validDate.getDate() % 2 !== 0;

    let escalados: EscalaDiaItem[] = [
      {
        funcionarioId: 'func_01',
        nome: 'Carlos Eduardo Silva',
        cargo: 'Chefe de Pista',
        turno: 'Manhã (06h-14h)',
        bombaOuSetor: 'Pista Principal / Coordenação',
        statusNoDia: 'Escalado',
        horasConsecutivasTrabalhadas: 8,
        intervaloInterjornadaHoras: 16,
      },
      {
        funcionarioId: 'func_02',
        nome: 'Marcos Vinícius Souza',
        cargo: 'Frentista',
        turno: 'Manhã (06h-14h)',
        bombaOuSetor: 'Ilha 1 e 2 (Gasolina/Etanol)',
        statusNoDia: 'Escalado',
        horasConsecutivasTrabalhadas: 8,
        intervaloInterjornadaHoras: 16,
      },
      {
        funcionarioId: 'func_03',
        nome: 'Juliana Ferreira',
        cargo: 'Caixa',
        turno: 'Manhã (06h-14h)',
        bombaOuSetor: 'Caixa Central Conveniência',
        statusNoDia: 'Escalado',
        horasConsecutivasTrabalhadas: 8,
        intervaloInterjornadaHoras: 16,
      },
      {
        funcionarioId: 'func_04',
        nome: 'Roberto Alves',
        cargo: 'Frentista',
        turno: 'Tarde (14h-22h)',
        bombaOuSetor: 'Ilha 1, 2 e 3 (Diesel)',
        statusNoDia: 'Escalado',
        horasConsecutivasTrabalhadas: 8,
        intervaloInterjornadaHoras: 9,
      },
      {
        funcionarioId: 'func_05',
        nome: 'Fernanda Lima',
        cargo: 'Caixa',
        turno: 'Tarde (14h-22h)',
        bombaOuSetor: 'Caixa Central',
        statusNoDia: 'Escalado',
        horasConsecutivasTrabalhadas: 8,
        intervaloInterjornadaHoras: 16,
      },
      {
        funcionarioId: 'func_07',
        nome: 'Lucas Mendes',
        cargo: 'Frentista',
        turno: 'Noite (22h-06h)',
        bombaOuSetor: 'Plantão Noturno Geral',
        statusNoDia: 'Escalado',
        horasConsecutivasTrabalhadas: 8,
        intervaloInterjornadaHoras: 16,
      },
    ];

    if (isTomorrowOrOdd) {
      escalados = escalados.map((e) =>
        e.funcionarioId === 'func_04'
          ? {
              ...e,
              observacoes: 'Dobrou turno anterior na noite passada',
              intervaloInterjornadaHoras: 8,
            }
          : e
      );
    }

    if (turnoFiltro && turnoFiltro !== 'all') {
      const normalized = turnoFiltro.toLowerCase();
      escalados = escalados.filter((item) => {
        if (normalized.includes('manh')) return item.turno.startsWith('Manhã');
        if (normalized.includes('tard')) return item.turno.startsWith('Tarde');
        if (normalized.includes('noit') || normalized.includes('madrug')) return item.turno.startsWith('Noite');
        return true;
      });
    }

    return {
      data: formattedDate,
      diaSemana,
      isMockData: this.isMockMode(),
      postoUnidade: 'Posto ADM — Unidade Matriz (MOCK)',
      escalados,
      folgas: ['Diego Nascimento (Frentista - Tarde)'],
      ferias: ['André Gomes (Lubrificador - Retorno em 18/10/2026)'],
      observacoes: [
        'Turno da Tarde operando com apenas 1 frentista devido à folga de Diego Nascimento.',
        'Turno da Noite sem operador de caixa exclusivo (Frentista acumulando função de cobrança).',
      ],
    };
  }

  public async consultarFuncionarios(filtroStatus?: string) {
    this.ensureAvailable();
    let lista = [...MOCK_FUNCIONARIOS];
    if (filtroStatus) {
      const f = filtroStatus.toLowerCase();
      lista = lista.filter((item) => item.status.toLowerCase().includes(f));
    }
    return {
      isMockData: this.isMockMode(),
      total: lista.length,
      funcionarios: lista,
    };
  }

  public async consultarTurnos() {
    this.ensureAvailable();
    return {
      isMockData: this.isMockMode(),
      regimeEscala: '6x1 com revezamento dominical',
      turnosConfigurados: [
        {
          id: 'turno_manha',
          nome: 'Manhã',
          horario: '06:00 às 14:00',
          minimoFrentistas: 2,
          minimoCaixas: 1,
          efetivoAtual: 3,
        },
        {
          id: 'turno_tarde',
          nome: 'Tarde',
          horario: '14:00 às 22:00',
          minimoFrentistas: 2,
          minimoCaixas: 1,
          efetivoAtual: 2,
        },
        {
          id: 'turno_noite',
          nome: 'Noite / Madrugada',
          horario: '22:00 às 06:00',
          minimoFrentistas: 1,
          minimoCaixas: 1,
          efetivoAtual: 1,
        },
      ],
    };
  }

  public async consultarFerias() {
    this.ensureAvailable();
    return {
      isMockData: this.isMockMode(),
      emFeriasAgora: [
        {
          funcionario: 'André Gomes',
          cargo: 'Lubrificador',
          inicio: '2026-09-29',
          fim: '2026-10-18',
          diasRestantes: 12,
        },
      ],
      proximasFeriasProgramadas: [
        {
          funcionario: 'Roberto Alves',
          cargo: 'Frentista',
          inicio: '2026-11-10',
          fim: '2026-11-29',
          status: 'Aprovada',
        },
      ],
    };
  }

  public async consultarFolgas(data?: string) {
    this.ensureAvailable();
    return {
      isMockData: this.isMockMode(),
      dataReferencia: data || new Date().toISOString().split('T')[0],
      folgasDoDia: [
        {
          funcionario: 'Diego Nascimento',
          cargo: 'Frentista',
          turnoHabitual: 'Tarde (14h-22h)',
          tipo: 'Folga Semanal (DSR)',
        },
      ],
      folgasSemana: [
        { dia: 'Quarta-feira', funcionario: 'Diego Nascimento', turno: 'Tarde' },
        { dia: 'Quinta-feira', funcionario: 'Marcos Vinícius Souza', turno: 'Manhã' },
        { dia: 'Sexta-feira', funcionario: 'Fernanda Lima', turno: 'Tarde' },
        { dia: 'Domingo', funcionario: 'Juliana Ferreira', turno: 'Manhã' },
      ],
    };
  }

  public async consultarInformacoesPosto() {
    this.ensureAvailable();
    return {
      isMockData: this.isMockMode(),
      nome: 'Posto ADM — Unidade Matriz',
      repositorioReferencia: 'https://github.com/Ujrjunior94/Projeto-posto1',
      bombasAtivas: 6,
      bicosCombustivel: 24,
      combustiveisDisponiveis: ['Gasolina Comum', 'Gasolina Aditivada', 'Etanol', 'Diesel S10', 'Diesel S500'],
      quadroTotalFuncionarios: MOCK_FUNCIONARIOS.length,
      funcionariosAtivosHoje: 6,
      gerenteResponsavel: 'Ubirajara Junior',
    };
  }

  public async analisarEscala(data?: string) {
    this.ensureAvailable();
    const escala = await this.consultarEscala(data || new Date().toISOString().split('T')[0]);
    const inconsistencias: InconsistenciaEscala[] = [
      {
        severidade: 'ALTA',
        tipo: 'Interjornada Inferior a 11h (Art. 66 CLT)',
        descricao:
          'Roberto Alves está escalado às 14:00 após encerrar cobertura extra às 05:00 (apenas 9h de descanso entre jornadas).',
        funcionarioAfetado: 'Roberto Alves',
        turnoAfetado: 'Tarde (14h-22h)',
        recomendacao: 'Adiantar entrada de frentista reserva ou realocar cobertura para respeitar mínimo de 11h.',
      },
      {
        severidade: 'MEDIA',
        tipo: 'Déficit de Frentistas no Horário de Pico',
        descricao:
          'O turno da Tarde (14h-22h) exige mínimo de 2 frentistas na pista, mas conta apenas com Roberto Alves devido à folga de Diego Nascimento.',
        funcionarioAfetado: 'Diego Nascimento (em folga)',
        turnoAfetado: 'Tarde (14h-22h)',
        recomendacao: 'Deslocar temporariamente Carlos Eduardo (Chefe de Pista) para apoio na Ilha 2 entre 17h e 19h.',
      },
      {
        severidade: 'BAIXA',
        tipo: 'Setor de Troca de Óleo Descoberto',
        descricao: 'André Gomes (Lubrificador) está em férias até 18/10 e não há substituto designado na escala.',
        funcionarioAfetado: 'André Gomes',
        turnoAfetado: 'Manhã (06h-14h)',
        recomendacao: 'Designar frentista habilitado da manhã para cobrir serviços básicos de lubrificação.',
      },
    ];

    return {
      isMockData: this.isMockMode(),
      dataAnalisada: escala.data,
      scoreConformidade: 74,
      statusGeral: 'ATENÇÃO_NECESSÁRIA',
      inconsistencias,
      resumoAnalise: `Foram detectadas ${inconsistencias.length} inconsistências na escala de ${escala.data}: 1 alerta trabalhista de interjornada (<11h), 1 cobertura abaixo do mínimo no turno da tarde e 1 setor sem substituto de férias.`,
    };
  }

  public async validarEscala(params: { data: string; alteracaoProposta?: string }) {
    this.ensureAvailable();
    const analise = await this.analisarEscala(params.data);
    return {
      isMockData: this.isMockMode(),
      data: params.data,
      alteracaoProposta: params.alteracaoProposta || 'Validação preventiva de escala oficial',
      aprovadaAutomaticamente: false,
      pendenciasBloqueantes: analise.inconsistencias.filter((i) => i.severidade === 'ALTA'),
      avisosOperacionais: analise.inconsistencias.filter((i) => i.severidade !== 'ALTA'),
      statusValidacao: 'CONFIRMADO_COM_RESSALVAS',
    };
  }
}

export const postoAdmAdapter = new PostoAdmAdapter();
