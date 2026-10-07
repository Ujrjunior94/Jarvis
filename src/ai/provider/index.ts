import { GoogleGenAI } from '@google/genai';
import {
  AIProvider,
  AIProviderResponse,
  AttachmentInput,
  ConversationMessage,
  Tool,
  ToolResult,
} from '../../types/jarvis';
import { getCurrentDateTime } from '../../lib/datetime';

/**
 * Sintetizador determinístico factual do JARVIS.
 * NUNCA inventa dados de sistemas externos nem finge análises que não ocorreram.
 * Usa estritamente os resultados das ferramentas executadas pelo orquestrador.
 */
export function synthesizeDeterministicPortugueseResponse(
  userMessage: string,
  toolOutputs?: ToolResult[],
  attachment?: AttachmentInput
): string {
  if (attachment && (!toolOutputs || toolOutputs.length === 0)) {
    return `Recebi o anexo **${attachment.name}** (${attachment.mimeType}).\n\nNenhuma ferramenta de processamento de imagem ou extração de dados foi vinculada a este turno. No momento, o processamento multimodal automatizado requer uma chave de API configurada para o provedor de IA com capacidade de visão (ex: Gemini ou modelo compatível no OpenRouter). O arquivo foi registrado com segurança no histórico.`;
  }

  if (!toolOutputs || toolOutputs.length === 0) {
    return `Olá! Núcleo JARVIS operacional. Estou pronto para consultar ou orquestrar operações nos seus sistemas:\n\n- **Posto ADM:** escalas do dia, de amanhã ou períodos específicos, quem trabalha em cada turno, férias, folgas e auditoria de erros operacionais na escala.\n- **RotaPlanner:** ganhos da semana ou mês passado, despesas, consumo e gasto com combustível, rotas e cálculo de lucro líquido real.\n- **Controle de Gastos:** finanças pessoais estruturadas com proteção de permissão (\`READ\`, \`CONFIRM\`, \`CRITICAL\`).\n\nComo posso ajudar agora?`;
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
    const mockTag = res.isMock ? ' *(Ambiente MOCK)*' : '';

    switch (res.toolName) {
      case 'consultarProjetosSistema': {
        const projs = (data?.projetos || []) as Array<any>;
        const lines = projs.map(
          (p, i) =>
            `${i + 1}. **${p.name}** — Status: \`${p.status}\` (${p.toolsCount} ferramentas)${p.repositoryUrl ? ` · [Repositório](${p.repositoryUrl})` : ''}\n   ${p.description}`
        );
        parts.push(
          `Você possui **${projs.length} projetos** cadastrados na camada de orquestração do JARVIS:\n\n${lines.join('\n\n')}`
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
          `**Escala — ${data.data} (${data.diaSemana})**${mockTag}\n\n${lista || 'Nenhum funcionário escalado no filtro selecionado.'}\n\n**Em folga:** ${(data.folgas || []).join(', ') || 'Ninguém'}\n**Em férias:** ${(data.ferias || []).join(', ') || 'Ninguém'}${obs}`
        );
        break;
      }

      case 'consultarFuncionarios': {
        if (!data) break;
        const funcs = (data.funcionarios || []) as Array<any>;
        const lista = funcs
          .map((f) => `- **${f.nome}** (${f.cargo}) — Turno: *${f.turnoPadrao}* · Status: ${f.ativo ? 'Ativo' : 'Inativo'}`)
          .join('\n');
        parts.push(
          `**Quadro de Funcionários — Posto ADM**${mockTag} (${data.total} registrados):\n\n${lista}`
        );
        break;
      }

      case 'consultarFolgas': {
        if (!data) break;
        const folguistas = (data.funcionariosEmFolga || []) as Array<any>;
        const lista = folguistas
          .map((f) => `- **${f.nome}** (${f.cargo}) — Motivo: ${f.motivo}`)
          .join('\n');
        parts.push(
          `**Funcionários de Folga em ${data.data} (${data.diaSemana})**${mockTag} (${data.totalEmFolga} no total):\n\n${lista || 'Nenhum funcionário cadastrado em folga para esta data.'}`
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
            `**Cálculo Contextual (${data.periodo}) — Descontando Combustível**${mockTag}\n\n- **Ganho Bruto:** R$ ${Number(data.ganhoBruto).toFixed(2)}\n- **(-) Combustível:** R$ ${Number(data.gastoCombustivel).toFixed(2)}\n- **(=) Saldo após Combustível:** **R$ ${Number(data.saldoDescontandoApenasCombustivel).toFixed(2)}**\n\n*(Considerando também R$ ${Number(data.gastoManutencaoEOutros).toFixed(2)} de manutenção e outros custos operacionais, o lucro líquido final é de **R$ ${Number(data.lucroLiquidoTotal).toFixed(2)}**, com margem líquida de ${data.margemLiquidaPercentual}%).*`
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

      case 'consultarGastos': {
        if (!data) break;
        const itens = (data.gastos || []) as Array<any>;
        const linhas = itens
          .map((g) => `- **${g.descricao}**: R$ ${Number(g.valor).toFixed(2)} (${g.categoria}) em ${g.data}`)
          .join('\n');
        parts.push(
          `**Gastos Registrados (${data.periodo})**${mockTag} — Total: R$ ${Number(data.total).toFixed(2)}:\n\n${linhas || 'Nenhum gasto registrado neste período.'}`
        );
        break;
      }

      case 'calcularSaldo':
      case 'gerarResumoFinanceiro': {
        if (!data) break;
        parts.push(
          `**Resumo Financeiro — Controle de Gastos**${mockTag}\n\n- **Receitas:** R$ ${Number(data.totalReceitas).toFixed(2)}\n- **Despesas:** R$ ${Number(data.totalDespesas).toFixed(2)}\n- **Saldo Líquido:** **R$ ${Number(data.saldoLiquido).toFixed(2)}** (${data.status})\n- **Economia:** ${data.taxaEconomiaPercentual}% das receitas`
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

/**
 * 1. Provedor Determinístico Factual (Heuristic / Fallback)
 */
export class HeuristicProvider implements AIProvider {
  public id = 'heuristic' as const;
  public name = 'Fallback Determinístico Seguro (Heuristic)';

  public isConfigured(): boolean {
    return true;
  }

  public async generateResponse(params: {
    systemPrompt: string;
    userMessage: string;
    history: ConversationMessage[];
    tools?: Tool[];
    attachment?: AttachmentInput;
    toolOutputs?: ToolResult[];
  }): Promise<AIProviderResponse> {
    return {
      text: synthesizeDeterministicPortugueseResponse(
        params.userMessage,
        params.toolOutputs,
        params.attachment
      ),
      provider: 'heuristic',
      model: 'deterministic-orchestrator-v1.1',
    };
  }
}

/**
 * 2. Provedor Google Gemini (@google/genai)
 */
export class GeminiProvider implements AIProvider {
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
        provider: 'heuristic',
        model: `${modelName} (Fallback: Chave não configurada)`,
      };
    }

    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
      const ai = new GoogleGenAI({
        apiKey,
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
            )}\n\nATENÇÃO: Use estritamente as informações acima. Nunca invente valores ou nomes que não constem nos resultados.`
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
        provider: 'heuristic',
        model: `${modelName} (Fallback após falha)`,
      };
    }
  }
}

/**
 * 3. Provedor OpenRouter Multi-Model Gateway
 */
export class OpenRouterProvider implements AIProvider {
  public id = 'openrouter' as const;
  public name = 'OpenRouter Gateway';

  public isConfigured(): boolean {
    const key = process.env.OPENROUTER_API_KEY;
    return Boolean(key && key.trim().length > 8);
  }

  public async generateResponse(params: {
    systemPrompt: string;
    userMessage: string;
    history: ConversationMessage[];
    tools?: Tool[];
    attachment?: AttachmentInput;
    toolOutputs?: ToolResult[];
  }): Promise<AIProviderResponse> {
    const model = process.env.AI_MODEL || 'anthropic/claude-3.5-sonnet';

    if (!this.isConfigured()) {
      return {
        text: synthesizeDeterministicPortugueseResponse(
          params.userMessage,
          params.toolOutputs,
          params.attachment
        ),
        provider: 'heuristic',
        model: `${model} (Fallback: Chave não configurada)`,
      };
    }

    try {
      const messages: Array<{ role: string; content: any }> = [
        { role: 'system', content: params.systemPrompt },
      ];

      // Incluir últimas mensagens de histórico para continuidade
      const recentHistory = params.history.slice(-4);
      for (const h of recentHistory) {
        messages.push({
          role: h.role === 'assistant' ? 'assistant' : 'user',
          content: h.content,
        });
      }

      const toolDataText =
        params.toolOutputs && params.toolOutputs.length > 0
          ? `\n\nDados factuais das ferramentas executadas:\n${JSON.stringify(params.toolOutputs, null, 2)}`
          : '';

      // Anexo multimodal
      if (params.attachment && params.attachment.base64Data) {
        // Se for imagem e o modelo for padrão ou suportar visão
        const isImage = params.attachment.mimeType.startsWith('image/');
        if (isImage) {
          const rawBase64 = params.attachment.base64Data.startsWith('data:')
            ? params.attachment.base64Data
            : `data:${params.attachment.mimeType};base64,${params.attachment.base64Data}`;

          messages.push({
            role: 'user',
            content: [
              { type: 'text', text: `${params.userMessage}${toolDataText}` },
              { type: 'image_url', image_url: { url: rawBase64 } },
            ],
          });
        } else {
          // Documento não-imagem (ex: PDF): informar claramente se não for aceito como image_url
          messages.push({
            role: 'user',
            content: `${params.userMessage}\n\n[Anexo recebido: ${params.attachment.name} (${params.attachment.mimeType}). Documentos PDF via OpenRouter requerem modelo multimodal específico].${toolDataText}`,
          });
        }
      } else {
        messages.push({
          role: 'user',
          content: `${params.userMessage}${toolDataText}`,
        });
      }

      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
          'X-Title': 'JARVIS Core',
        },
        body: JSON.stringify({
          model,
          messages,
        }),
      });

      if (!res.ok) {
        throw new Error(`OpenRouter HTTP ${res.status}`);
      }

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
        provider: 'heuristic',
        model: `${model} (Fallback após falha)`,
      };
    }
  }
}

/**
 * 4. Provedor OpenAI
 */
export class OpenAIProvider implements AIProvider {
  public id = 'openai' as const;
  public name = 'OpenAI API';

  public isConfigured(): boolean {
    const key = process.env.OPENAI_API_KEY;
    return Boolean(key && key.trim().length > 8);
  }

  public async generateResponse(params: {
    systemPrompt: string;
    userMessage: string;
    history: ConversationMessage[];
    tools?: Tool[];
    attachment?: AttachmentInput;
    toolOutputs?: ToolResult[];
  }): Promise<AIProviderResponse> {
    const model = process.env.AI_MODEL || 'gpt-4o-mini';

    if (!this.isConfigured()) {
      return {
        text: synthesizeDeterministicPortugueseResponse(
          params.userMessage,
          params.toolOutputs,
          params.attachment
        ),
        provider: 'heuristic',
        model: `${model} (Fallback: Chave não configurada)`,
      };
    }

    try {
      const messages: Array<{ role: string; content: any }> = [
        { role: 'system', content: params.systemPrompt },
      ];

      const toolDataText =
        params.toolOutputs && params.toolOutputs.length > 0
          ? `\n\nDados factuais das ferramentas executadas:\n${JSON.stringify(params.toolOutputs, null, 2)}`
          : '';

      if (params.attachment && params.attachment.base64Data && params.attachment.mimeType.startsWith('image/')) {
        const rawBase64 = params.attachment.base64Data.startsWith('data:')
          ? params.attachment.base64Data
          : `data:${params.attachment.mimeType};base64,${params.attachment.base64Data}`;

        messages.push({
          role: 'user',
          content: [
            { type: 'text', text: `${params.userMessage}${toolDataText}` },
            { type: 'image_url', image_url: { url: rawBase64 } },
          ],
        });
      } else {
        messages.push({
          role: 'user',
          content: `${params.userMessage}${toolDataText}`,
        });
      }

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
        }),
      });

      if (!res.ok) {
        throw new Error(`OpenAI HTTP ${res.status}`);
      }

      const json = (await res.json()) as any;
      const text =
        json?.choices?.[0]?.message?.content ||
        synthesizeDeterministicPortugueseResponse(params.userMessage, params.toolOutputs, params.attachment);

      return { text, provider: 'openai', model };
    } catch {
      return {
        text: synthesizeDeterministicPortugueseResponse(
          params.userMessage,
          params.toolOutputs,
          params.attachment
        ),
        provider: 'heuristic',
        model: `${model} (Fallback após falha)`,
      };
    }
  }
}

/**
 * AIProviderFactory que realmente respeita AI_PROVIDER e AI_MODEL
 */
export class AIProviderFactory {
  private static gemini = new GeminiProvider();
  private static openrouter = new OpenRouterProvider();
  private static openai = new OpenAIProvider();
  private static heuristic = new HeuristicProvider();

  public static getProvider(preferred?: string): AIProvider {
    const target = (preferred || process.env.AI_PROVIDER || 'gemini').toLowerCase();

    switch (target) {
      case 'openrouter':
        return this.openrouter;
      case 'openai':
        return this.openai;
      case 'heuristic':
        return this.heuristic;
      case 'gemini':
      default:
        return this.gemini;
    }
  }

  public static getProviderStatus() {
    const target = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
    const activeProvider = this.getProvider(target);

    return {
      activeProvider: activeProvider.id,
      activeModel: process.env.AI_MODEL || (target === 'gemini' ? 'gemini-3.8-flash' : target === 'openai' ? 'gpt-4o-mini' : 'auto'),
      isConfigured: activeProvider.isConfigured(),
      geminiConfigured: this.gemini.isConfigured(),
      openRouterConfigured: this.openrouter.isConfigured(),
      openAIConfigured: this.openai.isConfigured(),
      decoupledArchitecture: true,
    };
  }
}
