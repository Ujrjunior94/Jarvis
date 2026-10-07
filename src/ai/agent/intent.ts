import { AgentContext, Intent, ProjectId } from '../../types/jarvis';

function addDays(baseDateStr: string, days: number): string {
  const d = new Date(`${baseDateStr}T12:00:00`);
  if (isNaN(d.getTime())) return baseDateStr;
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export function interpretNaturalIntent(rawMessage: string, context: AgentContext): Intent {
  const text = rawMessage.toLowerCase().trim();
  const baseDate = context.currentDate || '2026-10-06';

  let date = baseDate;
  if (text.includes('amanhã') || text.includes('amanha')) {
    date = addDays(baseDate, 1);
  } else if (text.includes('ontem')) {
    date = addDays(baseDate, -1);
  } else {
    const matchIso = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (matchIso) date = matchIso[1];
  }

  let shift: Intent['entities']['shift'] = 'all';
  if (text.includes('manhã') || text.includes('manha')) shift = 'manha';
  else if (text.includes('tarde')) shift = 'tarde';
  else if (text.includes('noite') || text.includes('madrugada')) shift = 'noite';

  let period: Intent['entities']['period'] =
    (context.memorySnapshot.lastPeriod as Intent['entities']['period']) || 'semana';
  if (text.includes('mês passado') || text.includes('mes passado') || text.includes('último mês')) {
    period = 'mes_passado';
  } else if (text.includes('hoje')) {
    period = 'hoje';
  } else if (text.includes('semana')) {
    period = 'semana';
  }

  let amount: number | undefined;
  const amountMatch = text.match(/(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?)/i);
  if (amountMatch && !text.includes('2026')) {
    amount = parseFloat(amountMatch[1].replace(',', '.'));
  }

  const isFollowUpDiscountFuel =
    (text.includes('descontando') || text.includes('menos o') || text.includes('tirando')) &&
    (text.includes('combustível') || text.includes('combustivel') || text.includes('gasolina'));

  if (isFollowUpDiscountFuel) {
    return {
      intent: 'calcular_lucro_descontando_combustivel',
      confidence: 0.96,
      project: 'rotaplanner',
      suggestedTool: 'calcularLucro',
      entities: {
        period,
        discountFuel: true,
      },
      rawQuery: rawMessage,
    };
  }

  const isShortFollowUpPeriod =
    (text.startsWith('e ') || text.length < 32) &&
    (text.includes('mês passado') || text.includes('mes passado') || text.includes('hoje') || text.includes('semana'));

  if (isShortFollowUpPeriod && context.memorySnapshot.lastToolCalled) {
    const prevTool = context.memorySnapshot.lastToolCalled;
    const prevProject: ProjectId = context.memorySnapshot.lastProject || 'rotaplanner';
    return {
      intent: `context_followup_${prevTool}`,
      confidence: 0.94,
      project: prevProject,
      suggestedTool: prevTool,
      entities: {
        period,
        date,
        discountFuel: prevTool === 'calcularLucro',
      },
      rawQuery: rawMessage,
    };
  }

  if (
    text.includes('quais são meus projetos') ||
    text.includes('quais sao meus projetos') ||
    text.includes('meus projetos') ||
    text.includes('sistemas conectados') ||
    text.includes('status dos projetos')
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

  if (
    (text.includes('analise') || text.includes('analisar') || text.includes('procure erros') || text.includes('inconsist')) &&
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

  if (
    text.includes('escala') ||
    text.includes('quem trabalha') ||
    text.includes('plantão') ||
    text.includes('escalado')
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

  if (text.includes('folga') || text.includes('folgas')) {
    return {
      intent: 'consultar_folgas',
      confidence: 0.95,
      project: 'posto-adm',
      suggestedTool: 'consultarFolgas',
      entities: { date },
      rawQuery: rawMessage,
    };
  }

  if (text.includes('funcionário') || text.includes('funcionarios') || text.includes('frentista') || text.includes('equipe')) {
    return {
      intent: 'consultar_funcionarios',
      confidence: 0.93,
      project: 'posto-adm',
      suggestedTool: 'consultarFuncionarios',
      entities: {},
      rawQuery: rawMessage,
    };
  }

  if (text.includes('turno') || text.includes('horários do posto')) {
    return {
      intent: 'consultar_turnos',
      confidence: 0.92,
      project: 'posto-adm',
      suggestedTool: 'consultarTurnos',
      entities: {},
      rawQuery: rawMessage,
    };
  }

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

  if (text.includes('lucro') || (text.includes('ganhei') && text.includes('líquido'))) {
    return {
      intent: 'calcular_lucro',
      confidence: 0.95,
      project: 'rotaplanner',
      suggestedTool: 'calcularLucro',
      entities: { period, discountFuel: false },
      rawQuery: rawMessage,
    };
  }

  if (text.includes('quanto ganhei') || text.includes('meus ganhos') || text.includes('faturamento')) {
    return {
      intent: 'consultar_ganhos',
      confidence: 0.96,
      project: 'rotaplanner',
      suggestedTool: 'consultarGanhos',
      entities: { period },
      rawQuery: rawMessage,
    };
  }

  if (text.includes('combustível') || text.includes('combustivel') || text.includes('abastecimento') || text.includes('gasolina')) {
    return {
      intent: 'consultar_combustivel',
      confidence: 0.95,
      project: 'rotaplanner',
      suggestedTool: 'consultarCombustivel',
      entities: { period },
      rawQuery: rawMessage,
    };
  }

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

  if (text.includes('manutenção') || text.includes('manutencao') || text.includes('óleo') || text.includes('revisão')) {
    return {
      intent: 'consultar_manutencao',
      confidence: 0.94,
      project: 'rotaplanner',
      suggestedTool: 'consultarManutencao',
      entities: {},
      rawQuery: rawMessage,
    };
  }

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

  if (text.includes('saldo') || text.includes('resumo financeiro') || text.includes('controle de gastos')) {
    return {
      intent: 'gerar_resumo_financeiro',
      confidence: 0.91,
      project: 'controle-gastos',
      suggestedTool: 'gerarResumoFinanceiro',
      entities: {},
      rawQuery: rawMessage,
    };
  }

  if (text.includes('meus gastos') || text.includes('consultar gastos')) {
    return {
      intent: 'consultar_gastos',
      confidence: 0.9,
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
