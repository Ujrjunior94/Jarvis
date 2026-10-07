import { AgentContext, Intent, ProjectId } from '../../types/jarvis';
import { getCurrentDateTime, getRelativeDate } from '../../lib/datetime';

export function interpretNaturalIntent(rawMessage: string, context: AgentContext): Intent {
  const text = rawMessage.toLowerCase().trim();
  const currentDt = getCurrentDateTime();
  const baseDate = context.currentDate || currentDt.date;

  // Resolução dinâmica de datas relativas
  let date = baseDate;
  if (text.includes('amanhã') || text.includes('amanha')) {
    date = getRelativeDate(1);
  } else if (text.includes('ontem')) {
    date = getRelativeDate(-1);
  } else if (text.includes('hoje')) {
    date = currentDt.date;
  } else {
    const matchIso = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (matchIso) {
      date = matchIso[1];
    }
  }

  // Turnos operacionais do Posto ADM (remover amanhã para evitar falso positivo com manhã)
  const textWithoutAmanha = text.replace(/amanh[aã]/g, '');
  let shift: Intent['entities']['shift'] = 'all';
  if (textWithoutAmanha.includes('manhã') || textWithoutAmanha.includes('manha')) {
    shift = 'manha';
  } else if (textWithoutAmanha.includes('tarde')) {
    shift = 'tarde';
  } else if (textWithoutAmanha.includes('noite') || textWithoutAmanha.includes('madrugada')) {
    shift = 'noite';
  }

  // Resolução dinâmica de períodos
  let period: Intent['entities']['period'] =
    (context.memorySnapshot.lastPeriod as Intent['entities']['period']) || 'semana';

  if (text.includes('mês passado') || text.includes('mes passado') || text.includes('último mês')) {
    period = 'mes_passado';
  } else if (text.includes('este mês') || text.includes('este mes') || text.includes('mês atual') || text.includes('mes atual')) {
    period = 'mes_atual';
  } else if (text.includes('hoje') || text.includes('do dia')) {
    period = 'hoje';
  } else if (text.includes('essa semana') || text.includes('esta semana') || text.includes('semana')) {
    period = 'semana';
  }

  // Extração de valor numérico
  let amount: number | undefined;
  const amountMatch = text.match(/(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?)/i);
  if (amountMatch && !text.match(/202\d/)) {
    amount = parseFloat(amountMatch[1].replace(',', '.'));
  }

  // 1. Follow-up: "E descontando combustível?"
  const isFollowUpDiscountFuel =
    (text.includes('descontando') ||
      text.includes('menos o') ||
      text.includes('tirando') ||
      text.includes('abater') ||
      text.includes('desconta')) &&
    (text.includes('combustível') ||
      text.includes('combustivel') ||
      text.includes('gasolina') ||
      text.includes('etanol') ||
      text.includes('diesel'));

  if (isFollowUpDiscountFuel) {
    const retainedPeriod = (context.memorySnapshot.lastPeriod as Intent['entities']['period']) || period;
    return {
      intent: 'calcular_lucro_descontando_combustivel',
      confidence: 0.98,
      project: 'rotaplanner',
      suggestedTool: 'calcularLucro',
      entities: {
        period: retainedPeriod,
        discountFuel: true,
      },
      rawQuery: rawMessage,
    };
  }

  // 2. Follow-up curto de período: "E no mês passado?", "E ontem?", "E hoje?", "E semana passada?"
  const isShortFollowUpPeriod =
    (text.startsWith('e ') || text.startsWith('e no ') || text.startsWith('e na ') || text.length < 32) &&
    (text.includes('mês passado') ||
      text.includes('mes passado') ||
      text.includes('mês atual') ||
      text.includes('hoje') ||
      text.includes('semana passada') ||
      text.includes('esta semana') ||
      text.includes('essa semana') ||
      text.includes('semana'));

  if (isShortFollowUpPeriod && context.memorySnapshot.lastToolCalled) {
    const prevTool = context.memorySnapshot.lastToolCalled;
    const prevProject: ProjectId = context.memorySnapshot.lastProject || 'rotaplanner';
    const isLucroCalculation = prevTool === 'calcularLucro';

    return {
      intent: `context_followup_${prevTool}`,
      confidence: 0.96,
      project: prevProject,
      suggestedTool: prevTool,
      entities: {
        period,
        date,
        discountFuel: isLucroCalculation,
      },
      rawQuery: rawMessage,
    };
  }

  // 3. Consulta de Projetos e Sistema: "Quais são meus projetos?"
  if (
    text.includes('quais são meus projetos') ||
    text.includes('quais sao meus projetos') ||
    text.includes('meus projetos') ||
    text.includes('sistemas conectados') ||
    text.includes('status dos projetos') ||
    text.includes('quais projetos')
  ) {
    return {
      intent: 'consultar_projetos_conectados',
      confidence: 0.98,
      project: 'system',
      suggestedTool: 'consultarProjetosSistema',
      entities: {},
      rawQuery: rawMessage,
    };
  }

  // 4. Folgas: "Quem está de folga amanhã?", "Quem folga amanhã?"
  if (
    (text.includes('folga') || text.includes('folgas') || text.includes('folgam')) &&
    (text.includes('quem') || text.includes('amanhã') || text.includes('amanha') || text.includes('hoje'))
  ) {
    return {
      intent: 'consultar_folgas',
      confidence: 0.97,
      project: 'posto-adm',
      suggestedTool: 'consultarFolgas',
      entities: { date },
      rawQuery: rawMessage,
    };
  }

  // 5. Análise de Escala: "Analise minha escala.", "Procure erros na escala"
  if (
    (text.includes('analise') ||
      text.includes('analisar') ||
      text.includes('audite') ||
      text.includes('auditar') ||
      text.includes('procure erros') ||
      text.includes('inconsist')) &&
    text.includes('escala')
  ) {
    return {
      intent: 'analisar_escala',
      confidence: 0.97,
      project: 'posto-adm',
      suggestedTool: 'analisarEscala',
      entities: { date },
      rawQuery: rawMessage,
    };
  }

  // 6. Escala Geral: "JARVIS, quem trabalha amanhã de manhã?", "Quem trabalha amanhã?", "Quem está escalado?"
  if (
    text.includes('quem trabalha') ||
    text.includes('escala') ||
    text.includes('plantão') ||
    text.includes('plantao') ||
    text.includes('escalado') ||
    text.includes('quem está trabalhando') ||
    text.includes('quem esta trabalhando')
  ) {
    return {
      intent: 'consultar_escala',
      confidence: 0.96,
      project: 'posto-adm',
      suggestedTool: 'consultarEscala',
      entities: { date, shift },
      rawQuery: rawMessage,
    };
  }

  // 7. Gasto com Combustível: "Quanto gastei com combustível?", "Despesas de gasolina"
  if (
    (text.includes('quanto gastei') || text.includes('gasto com') || text.includes('despesa com')) &&
    (text.includes('combustível') || text.includes('combustivel') || text.includes('gasolina') || text.includes('abastecimento'))
  ) {
    return {
      intent: 'consultar_combustivel',
      confidence: 0.97,
      project: 'rotaplanner',
      suggestedTool: 'consultarCombustivel',
      entities: { period },
      rawQuery: rawMessage,
    };
  }

  // 8. Ganhos: "Quanto ganhei essa semana?", "Meus ganhos", "Faturamento"
  if (
    text.includes('quanto ganhei') ||
    text.includes('meus ganhos') ||
    text.includes('faturamento') ||
    text.includes('ganhos da semana')
  ) {
    return {
      intent: 'consultar_ganhos',
      confidence: 0.96,
      project: 'rotaplanner',
      suggestedTool: 'consultarGanhos',
      entities: { period },
      rawQuery: rawMessage,
    };
  }

  // 9. Lucro Líquido: "Qual foi meu lucro?", "Lucro líquido"
  if (
    text.includes('lucro') ||
    (text.includes('ganhei') && text.includes('líquido')) ||
    (text.includes('ganhei') && text.includes('liquido'))
  ) {
    return {
      intent: 'calcular_lucro',
      confidence: 0.95,
      project: 'rotaplanner',
      suggestedTool: 'calcularLucro',
      entities: { period, discountFuel: false },
      rawQuery: rawMessage,
    };
  }

  // 10. Despesas gerais com exclusão (CRITICAL action)
  if (
    (text.includes('exclua') || text.includes('excluir') || text.includes('apague') || text.includes('remover')) &&
    (text.includes('despesa') || text.includes('gasto') || text.includes('combustível') || text.includes('combustivel'))
  ) {
    let targetCategory = 'combustível';
    if (text.includes('mercado') || text.includes('alimentação')) targetCategory = 'alimentação';
    if (text.includes('internet')) targetCategory = 'internet';

    return {
      intent: 'excluir_despesa',
      confidence: 0.97,
      project: 'controle-gastos',
      suggestedTool: 'excluirGasto',
      entities: {
        category: targetCategory,
        targetId: targetCategory,
      },
      rawQuery: rawMessage,
    };
  }

  // 11. Registro de Gasto
  if (
    (text.includes('registre') || text.includes('registrar') || text.includes('adicione') || text.includes('lançar')) &&
    (text.includes('gasto') || text.includes('despesa'))
  ) {
    return {
      intent: 'registrar_gasto',
      confidence: 0.95,
      project: 'controle-gastos',
      suggestedTool: 'registrarGasto',
      entities: {
        amount: amount || 85.0,
        category: text.includes('combust') ? 'Combustível' : 'Alimentação',
        description: rawMessage,
        date,
      },
      rawQuery: rawMessage,
    };
  }

  // 12. Validação / Alteração de Escala (CONFIRM action)
  if (
    (text.includes('valide') || text.includes('validar') || text.includes('homologar') || text.includes('alterar')) &&
    text.includes('escala')
  ) {
    return {
      intent: 'validar_escala',
      confidence: 0.94,
      project: 'posto-adm',
      suggestedTool: 'validarEscala',
      entities: {
        date,
        description: rawMessage,
      },
      rawQuery: rawMessage,
    };
  }

  // 13. Férias no Posto ADM
  if (text.includes('férias') || text.includes('ferias')) {
    return {
      intent: 'consultar_ferias',
      confidence: 0.95,
      project: 'posto-adm',
      suggestedTool: 'consultarFerias',
      entities: {},
      rawQuery: rawMessage,
    };
  }

  // 14. Funcionários do Posto
  if (
    text.includes('funcionário') ||
    text.includes('funcionarios') ||
    text.includes('frentista') ||
    text.includes('equipe do posto')
  ) {
    return {
      intent: 'consultar_funcionarios',
      confidence: 0.94,
      project: 'posto-adm',
      suggestedTool: 'consultarFuncionarios',
      entities: {},
      rawQuery: rawMessage,
    };
  }

  // 15. Turnos do Posto
  if (text.includes('turno') || text.includes('horários do posto') || text.includes('horarios do posto')) {
    return {
      intent: 'consultar_turnos',
      confidence: 0.93,
      project: 'posto-adm',
      suggestedTool: 'consultarTurnos',
      entities: {},
      rawQuery: rawMessage,
    };
  }

  // 16. Informações operacionais do posto
  if (text.includes('informações do posto') || text.includes('sobre o posto') || text.includes('bombas')) {
    return {
      intent: 'consultar_informacoes_posto',
      confidence: 0.92,
      project: 'posto-adm',
      suggestedTool: 'consultarInformacoesPosto',
      entities: {},
      rawQuery: rawMessage,
    };
  }

  // 17. Desempenho no RotaPlanner
  if (
    (text.includes('analise') || text.includes('analisar') || text.includes('desempenho')) &&
    (text.includes('ganho') || text.includes('lucro') || text.includes('entrega') || text.includes('financ'))
  ) {
    return {
      intent: 'analisar_desempenho',
      confidence: 0.95,
      project: 'rotaplanner',
      suggestedTool: 'analisarDesempenho',
      entities: { period },
      rawQuery: rawMessage,
    };
  }

  // 18. Combustível no RotaPlanner
  if (
    text.includes('combustível') ||
    text.includes('combustivel') ||
    text.includes('abastecimento') ||
    text.includes('gasolina')
  ) {
    return {
      intent: 'consultar_combustivel',
      confidence: 0.95,
      project: 'rotaplanner',
      suggestedTool: 'consultarCombustivel',
      entities: { period },
      rawQuery: rawMessage,
    };
  }

  // 19. Despesas no RotaPlanner
  if (text.includes('despesa') && !text.includes('pessoal')) {
    return {
      intent: 'consultar_despesas_rota',
      confidence: 0.91,
      project: 'rotaplanner',
      suggestedTool: 'consultarDespesas',
      entities: { period },
      rawQuery: rawMessage,
    };
  }

  // 20. Manutenção do Veículo
  if (
    text.includes('manutenção') ||
    text.includes('manutencao') ||
    text.includes('óleo') ||
    text.includes('oleo') ||
    text.includes('revisão') ||
    text.includes('revisao')
  ) {
    return {
      intent: 'consultar_manutencao',
      confidence: 0.94,
      project: 'rotaplanner',
      suggestedTool: 'consultarManutencao',
      entities: {},
      rawQuery: rawMessage,
    };
  }

  // 21. Rotas e Entregas
  if (text.includes('analise as rotas') || text.includes('otimizar rota')) {
    return {
      intent: 'analisar_rotas',
      confidence: 0.93,
      project: 'rotaplanner',
      suggestedTool: 'analisarRotas',
      entities: {},
      rawQuery: rawMessage,
    };
  }

  if (text.includes('rota') || text.includes('rotas')) {
    return {
      intent: 'consultar_rotas',
      confidence: 0.92,
      project: 'rotaplanner',
      suggestedTool: 'consultarRotas',
      entities: { date },
      rawQuery: rawMessage,
    };
  }

  if (text.includes('entrega') || text.includes('entregas')) {
    return {
      intent: 'consultar_entregas',
      confidence: 0.92,
      project: 'rotaplanner',
      suggestedTool: 'consultarEntregas',
      entities: { period },
      rawQuery: rawMessage,
    };
  }

  // 22. Controle de Gastos
  if (text.includes('saldo') || text.includes('resumo financeiro') || text.includes('controle de gastos')) {
    return {
      intent: 'gerar_resumo_financeiro',
      confidence: 0.92,
      project: 'controle-gastos',
      suggestedTool: 'gerarResumoFinanceiro',
      entities: {},
      rawQuery: rawMessage,
    };
  }

  if (text.includes('meus gastos') || text.includes('consultar gastos')) {
    return {
      intent: 'consultar_gastos',
      confidence: 0.91,
      project: 'controle-gastos',
      suggestedTool: 'consultarGastos',
      entities: {},
      rawQuery: rawMessage,
    };
  }

  return {
    intent: 'conversa_geral',
    confidence: 0.75,
    project: 'system',
    entities: { date, period },
    rawQuery: rawMessage,
  };
}
