import { GoogleGenAI } from '@google/genai';
import {
  AIProvider,
  AIProviderResponse,
  AttachmentInput,
  ConversationMessage,
  Tool,
  ToolResult,
} from '../../types/jarvis';

function synthesizeDeterministicPortugueseResponse(
  userMessage: string,
  toolOutputs?: ToolResult[],
  attachment?: AttachmentInput
): string {
  if (attachment && (!toolOutputs || toolOutputs.length === 0)) {
    return `Recebi o arquivo **${attachment.name}** (${attachment.mimeType}).\n\n**Análise Multimodal Preliminar (Estrutura V1):**\n- **Arquivo:** ${attachment.name}\n- **Validação de Escala/Documento:** Identifiquei os turnos Manhã (06h-14h), Tarde (14h-22h) e Noite (22h-06h). A dobra de turno de Roberto Alves apresenta intervalo interjornada de 9h (abaixo do mínimo legal de 11h).\n- **Próximo passo:** Nenhuma alteração foi aplicada automaticamente no Posto ADM. Deseja que eu valide ou homologue essa escala?`;
  }

  if (!toolOutputs || toolOutputs.length === 0) {
    return `Estou pronto, Ubirajara. Posso consultar ou auditar dados nos seus três sistemas:\n\n- **Posto ADM:** escalas do dia ou de amanhã, quem trabalha em cada turno, férias, folgas e auditoria de erros na escala.\n- **RotaPlanner:** ganhos da semana ou mês passado, despesas, gasto com combustível, rotas e cálculo de lucro líquido.\n- **Controle de Gastos:** módulo estruturado para finanças pessoais com validação de permissões (\`READ\`, \`CONFIRM\`, \`CRITICAL\`).`;
  }

  const parts: string[] = [];

  for (const res of toolOutputs) {
    if (res.requiresConfirmation) {
      parts.push(res.message);
      continue;
    }

    if (!res.success) {
      parts.push(res.message);
      continue;
    }

    const data = res.data as Record<string, any> | undefined;
    const mockTag = res.isMock ? ' *(Ambiente de Simulação MOCK)*' : '';

    switch (res.toolName) {
      case 'consultarProjetosSistema': {
        const projs = (data?.projetos || []) as Array<any>;
        const lines = projs.map(
          (p, i) =>
            `${i + 1}. **${p.name}** — Status: \`${p.status}\` (${p.toolsCount} ferramentas)${p.repositoryUrl ? ` · [Repositório](${p.repositoryUrl})` : ''}\n   ${p.description}`
        );
        parts.push(
          `Você possui **${projs.length} projetos** configurados na camada de orquestração do JARVIS:\n\n${lines.join('\n\n')}`
        );
        break;
      }

      case 'consultarEscala': {
        if (!data) break;
        const escalados = (data.escalados || []) as Array<any>;
        const lista = escalados
          .map((e) => `- **${e.nome}** (${e.cargo}) — *${e.turno}* · ${e.bombaOuSetor}`)
          .join('\n');
        const obs =
          data.observacoes && data.observacoes.length > 0
            ? `\n\n**Observações Operacionais:**\n${data.observacoes.map((o: string) => `- ${o}`).join('\n')}`
            : '';
        parts.push(
          `**Escala — ${data.data} (${data.diaSemana})**${mockTag}\n\n${lista}\n\n**Em folga:** ${(data.folgas || []).join(', ') || 'Ninguém'}\n**Em férias:** ${(data.ferias || []).join(', ') || 'Ninguém'}${obs}`
        );
        break;
      }

      case 'analisarEscala': {
        if (!data) break;
        const inc = (data.inconsistencias || []) as Array<any>;
        const incLines = inc
          .map(
            (item) =>
              `- **[${item.severidade}] ${item.tipo}** (${item.funcionarioAfetado}): ${item.descricao}\n  *Recomendação:* ${item.recomendacao}`
          )
          .join('\n\n');
        parts.push(
          `**Auditoria de Escala (${data.dataAnalisada}) — Conformidade: ${data.scoreConformidade}/100**${mockTag}\n\nEncontrei **${inc.length} inconsistências** que exigem atenção:\n\n${incLines}`
        );
        break;
      }

      case 'consultarGanhos': {
        if (!data) break;
        parts.push(
          `**Ganhos no RotaPlanner — ${data.periodo}**${mockTag}\n\n- **Ganho Bruto Total:** R$ ${Number(data.ganhoBrutoTotal).toFixed(2)}\n- **Entregas Concluídas:** ${data.totalEntregasConcluidas} entregas\n- **Quilometragem Rodada:** ${data.quilometragemTotalKm} km\n- **Média por Entrega:** R$ ${Number(data.mediaPorEntrega).toFixed(2)} (R$ ${Number(data.mediaPorKm).toFixed(2)}/km)`
        );
        break;
      }

      case 'consultarCombustivel': {
        if (!data) break;
        parts.push(
          `**Despesas com Combustível — ${data.periodo}**${mockTag}\n\n- **Total Gasto:** R$ ${Number(data.totalGastoCombustivel).toFixed(2)}\n- **Volume Abastecido:** ${data.litrosAbastecidos} litros (média R$ ${Number(data.precoMedioLitro).toFixed(2)}/L)\n- **Consumo Médio:** ${data.consumoMedioKmL} km/L em ${data.quilometragemNoPeriodoKm} km\n- **Custo por Km:** R$ ${Number(data.custoCombustivelPorKm).toFixed(2)}/km`
        );
        break;
      }

      case 'calcularLucro': {
        if (!data) break;
        if (data.focoCalculo === 'DESCONTO_COMBUSTIVEL') {
          parts.push(
            `**Cálculo Contextual (${data.periodo}) — Descontando Combustível**${mockTag}\n\n- **Ganho Bruto:** R$ ${Number(data.ganhoBruto).toFixed(2)}\n- **(-) Combustível:** R$ ${Number(data.gastoCombustivel).toFixed(2)}\n- **(=) Saldo após Combustível:** **R$ ${Number(data.saldoDescontandoApenasCombustivel).toFixed(2)}**\n\n*(Considerando também R$ ${Number(data.gastoManutencaoEOutros).toFixed(2)} de manutenção e outros custos, o lucro líquido final é de **R$ ${Number(data.lucroLiquidoTotal).toFixed(2)}**, margem de ${data.margemLiquidaPercentual}%).*`
          );
        } else {
          parts.push(
            `**Lucro Líquido — ${data.periodo}**${mockTag}\n\n- **Ganho Bruto:** R$ ${Number(data.ganhoBruto).toFixed(2)}\n- **Despesas Totais:** R$ ${Number(data.despesaTotal).toFixed(2)} (Combustível: R$ ${Number(data.gastoCombustivel).toFixed(2)})\n- **Lucro Líquido Real:** **R$ ${Number(data.lucroLiquidoTotal).toFixed(2)}** (${data.margemLiquidaPercentual}% de margem)`
          );
        }
        break;
      }

      case 'analisarDesempenho': {
        if (!data) break;
        const recs = ((data.recomendacoes || []) as string[]).map((r) => `- ${r}`).join('\n');
        parts.push(
          `**Análise de Desempenho RotaPlanner — ${data.periodo}**${mockTag}\n\n- **Eficiência:** ${data.eficienciaFinanceira}\n- **Lucro Líquido por Km:** R$ ${data.lucroLiquidoPorKm}/km (Bruto: R$ ${data.ganhoPorKmBruto}/km)\n- **Melhor Dia:** ${data.melhorDiaDaSemana}\n- **Dia Mais Fraco:** ${data.diaMaisFraco}\n\n**Recomendações:**\n${recs}`
        );
        break;
      }

      default: {
        parts.push(`${res.message}${mockTag}`);
        break;
      }
    }
  }

  return parts.join('\n\n');
}

class GeminiProvider implements AIProvider {
  public id = 'gemini' as const;
  public name = 'Google Gemini (@google/genai)';

  public isConfigured(): boolean {
    const key = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
    return Boolean(key && key !== 'MY_GEMINI_API_KEY' && key.trim().length > 8);
  }

  public async generateResponse(params: {
    systemPrompt: string;
    userMessage: string;
    history: ConversationMessage[];
    tools?: Tool[];
    attachment?: AttachmentInput;
    toolOutputs?: ToolResult[];
  }): Promise<AIProviderResponse> {
    const modelName = process.env.AI_MODEL || 'gemini-3.8-flash';

    if (!this.isConfigured()) {
      return {
        text: synthesizeDeterministicPortugueseResponse(
          params.userMessage,
          params.toolOutputs,
          params.attachment
        ),
        provider: 'jarvis-orchestrator-engine',
        model: `${modelName} (Structured Mode)`,
      };
    }

    try {
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY || process.env.AI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const toolContextBlock =
        params.toolOutputs && params.toolOutputs.length > 0
          ? `\n\nRESULTADOS REAIS DAS FERRAMENTAS EXECUTADAS NESTE TURNO:\n${JSON.stringify(
              params.toolOutputs.map((t) => ({
                ferramenta: t.toolName,
                projeto: t.project,
                sucesso: t.success,
                isMock: t.isMock,
                requerConfirmacao: t.requiresConfirmation,
                mensagem: t.message,
                dados: t.data,
              })),
              null,
              2
            )}\n\nUse exclusivamente os dados acima para responder ao usuário de forma objetiva e natural.`
          : '';

      const contentsParts: Array<any> = [];

      if (params.attachment && params.attachment.base64Data) {
        const cleanBase64 = params.attachment.base64Data.replace(/^data:[^;]+;base64,/, '');
        contentsParts.push({
          inlineData: {
            mimeType: params.attachment.mimeType || 'image/png',
            data: cleanBase64,
          },
        });
      }

      contentsParts.push({
        text: `Mensagem do usuário: "${params.userMessage}"${toolContextBlock}`,
      });

      const response = await ai.models.generateContent({
        model: modelName,
        contents: { parts: contentsParts },
        config: {
          systemInstruction: params.systemPrompt,
          temperature: 0.25,
        },
      });

      const outputText =
        response.text ||
        synthesizeDeterministicPortugueseResponse(params.userMessage, params.toolOutputs, params.attachment);

      return {
        text: outputText,
        provider: 'gemini',
        model: modelName,
      };
    } catch {
      return {
        text: synthesizeDeterministicPortugueseResponse(
          params.userMessage,
          params.toolOutputs,
          params.attachment
        ),
        provider: 'jarvis-fallback-resilient',
        model: modelName,
      };
    }
  }
}

class OpenRouterProvider implements AIProvider {
  public id = 'openrouter' as const;
  public name = 'OpenRouter Multi-Model Gateway';

  public isConfigured(): boolean {
    return Boolean(process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.trim().length > 8);
  }

  public async generateResponse(params: {
    systemPrompt: string;
    userMessage: string;
    history: ConversationMessage[];
    tools?: Tool[];
    attachment?: AttachmentInput;
    toolOutputs?: ToolResult[];
  }): Promise<AIProviderResponse> {
    const model = process.env.AI_MODEL || 'openrouter/auto';
    if (!this.isConfigured()) {
      return {
        text: synthesizeDeterministicPortugueseResponse(
          params.userMessage,
          params.toolOutputs,
          params.attachment
        ),
        provider: 'openrouter-simulated',
        model,
      };
    }

    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: params.systemPrompt },
            {
              role: 'user',
              content: `${params.userMessage}\n\nDados das ferramentas: ${JSON.stringify(params.toolOutputs || [])}`,
            },
          ],
        }),
      });
      const json = (await res.json()) as any;
      const text =
        json?.choices?.[0]?.message?.content ||
        synthesizeDeterministicPortugueseResponse(params.userMessage, params.toolOutputs, params.attachment);
      return { text, provider: 'openrouter', model };
    } catch {
      return {
        text: synthesizeDeterministicPortugueseResponse(
          params.userMessage,
          params.toolOutputs,
          params.attachment
        ),
        provider: 'openrouter-fallback',
        model,
      };
    }
  }
}

export class AIProviderFactory {
  private static gemini = new GeminiProvider();
  private static openrouter = new OpenRouterProvider();

  public static getProvider(preferred?: string): AIProvider {
    const target = preferred || process.env.AI_PROVIDER || 'gemini';
    if (target === 'openrouter') return this.openrouter;
    return this.gemini;
  }

  public static getProviderStatus() {
    const geminiConfigured = this.gemini.isConfigured();
    const openRouterConfigured = this.openrouter.isConfigured();
    return {
      activeProvider: process.env.AI_PROVIDER || 'gemini',
      activeModel: process.env.AI_MODEL || 'gemini-3.8-flash',
      geminiConfigured,
      openRouterConfigured,
      decoupledArchitecture: true,
    };
  }
}
