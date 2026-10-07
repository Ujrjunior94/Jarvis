import {
  Project,
  Tool,
  ToolPermission,
} from '../../types/jarvis';
import { postoAdmAdapter } from '../../integrations/posto-adm/adapter';
import { rotaPlannerAdapter } from '../../integrations/rotaplanner/adapter';
import { controleGastosAdapter } from '../../integrations/gastos/adapter';
import { memoryStore } from '../../ai/memory/store';

export async function getConnectedProjectsOverview(): Promise<Project[]> {
  const postoHealth = await postoAdmAdapter.checkStatus();
  const rotaHealth = await rotaPlannerAdapter.checkStatus();
  const gastosHealth = await controleGastosAdapter.checkStatus();

  return [
    {
      id: 'posto-adm',
      name: 'POSTO ADM',
      description: 'Sistema de gerenciamento de posto de combustível (escalas, funcionários, turnos, férias e folgas).',
      repositoryUrl: 'https://github.com/Ujrjunior94/Projeto-posto1',
      status: postoHealth.status,
      mode: postoHealth.isMock ? 'MOCK' : 'REAL',
      apiUrlConfigured: !postoHealth.isMock,
      lastChecked: new Date().toISOString(),
      version: '1.0.0-adapter',
      toolsCount: 8,
    },
    {
      id: 'rotaplanner',
      name: 'ROTAPLANNER',
      description: 'Sistema de planejamento de entregas, rotas, ganhos brutos, combustível, despesas e manutenção.',
      repositoryUrl: 'https://github.com/Ujrjunior94/Rotaplanner',
      status: rotaHealth.status,
      mode: rotaHealth.isMock ? 'MOCK' : 'REAL',
      apiUrlConfigured: !rotaHealth.isMock,
      lastChecked: new Date().toISOString(),
      version: '1.0.0-adapter',
      toolsCount: 9,
    },
    {
      id: 'controle-gastos',
      name: 'CONTROLE DE GASTOS',
      description: 'Sistema de gestão de finanças pessoais, categorias e saldo (arquitetura preparada para acoplamento futuro).',
      status: gastosHealth.status,
      mode: 'PLANNED',
      apiUrlConfigured: Boolean(controleGastosAdapter.getApiUrl()),
      lastChecked: new Date().toISOString(),
      version: '0.1.0-prepared',
      toolsCount: 7,
    },
  ];
}

export const consultarProjetosSistemaTool: Tool = {
  name: 'consultarProjetosSistema',
  description: 'Lista todos os projetos que o JARVIS controla, seus repositórios, status de conexão e ferramentas disponíveis.',
  project: 'system',
  permission: ToolPermission.READ,
  parameters: {},
  validate: () => ({ valid: true, parsed: {} }),
  execute: async () => {
    const start = Date.now();
    const projects = await getConnectedProjectsOverview();
    return {
      success: true,
      toolName: 'consultarProjetosSistema',
      project: 'system',
      permission: ToolPermission.READ,
      isMock: false,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - start,
      data: {
        totalProjetos: projects.length,
        arquitetura: 'Camada de Orquestração Desacoplada',
        projetos: projects,
      },
      message: `O JARVIS orquestra 3 ecossistemas independentes: POSTO ADM (${projects[0].status}), ROTAPLANNER (${projects[1].status}) e CONTROLE DE GASTOS (${projects[2].status}).`,
    };
  },
};

export const consultarStatusSaudeTool: Tool = {
  name: 'consultarStatusSaude',
  description: 'Verifica a saúde do núcleo JARVIS, provedor de IA ativo, banco de memória e conectividade das integrações.',
  project: 'system',
  permission: ToolPermission.READ,
  parameters: {},
  validate: () => ({ valid: true, parsed: {} }),
  execute: async () => {
    const start = Date.now();
    const projects = await getConnectedProjectsOverview();
    const dbStatus = memoryStore.getDatabaseStatus();
    const prefs = memoryStore.getPreferences();

    return {
      success: true,
      toolName: 'consultarStatusSaude',
      project: 'system',
      permission: ToolPermission.READ,
      isMock: false,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - start,
      data: {
        version: '1.0.0',
        aiProvider: prefs.aiProvider,
        aiModel: prefs.aiModel,
        memory: dbStatus,
        projects,
      },
      message: `Sistema JARVIS V1 saudável. Provedor IA: ${prefs.aiProvider} (${prefs.aiModel}). Memória: ${dbStatus.details}.`,
    };
  },
};

export const systemTools: Tool<any, any>[] = [
  consultarProjetosSistemaTool,
  consultarStatusSaudeTool,
];
