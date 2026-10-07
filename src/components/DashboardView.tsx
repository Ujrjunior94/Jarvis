import React from 'react';
import {
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  WifiOff,
  Wifi,
} from 'lucide-react';
import { IntegrationStatus, Memory, Project } from '../types/jarvis';

interface DashboardViewProps {
  projects: Project[];
  memory: Memory;
  healthData: any;
  simulationFlags: { postoOffline: boolean; rotaOffline: boolean };
  onToggleOfflineSimulation: (target: 'posto-adm' | 'rotaplanner', offline: boolean) => Promise<void>;
  onQuickPrompt: (prompt: string) => void;
  isDark: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  projects,
  memory,
  healthData,
  simulationFlags,
  onToggleOfflineSimulation,
  onQuickPrompt,
  isDark,
}) => {
  const renderStatusIndicator = (status: IntegrationStatus) => {
    switch (status) {
      case IntegrationStatus.ONLINE:
        return (
          <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium text-xs">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>ONLINE (API Real)</span>
          </span>
        );
      case IntegrationStatus.MOCK:
        return (
          <span className="inline-flex items-center gap-1.5 text-sky-400 font-medium text-xs">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>ONLINE · MODO MOCK</span>
          </span>
        );
      case IntegrationStatus.OFFLINE:
        return (
          <span className="inline-flex items-center gap-1.5 text-rose-400 font-medium text-xs">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>OFFLINE</span>
          </span>
        );
      case IntegrationStatus.NOT_CONFIGURED:
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-amber-400 font-medium text-xs">
            <Clock className="w-3.5 h-3.5" />
            <span>NÃO CONFIGURADO (Preparado)</span>
          </span>
        );
    }
  };

  const totalTools =
    projects.reduce((acc, p) => acc + p.toolsCount, 0) + 2;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 pb-24 md:pb-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <p className="text-xs font-mono text-sky-400">Núcleo de Orquestração Pessoal · V1.0.0</p>
          <h1 className={`text-2xl md:text-3xl font-bold tracking-tight mt-1 font-display ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Ecossistemas Conectados ao JARVIS
          </h1>
          <p className={`text-sm mt-1 max-w-2xl ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Arquitetura modular desacoplada: cada projeto permanece em seu próprio repositório enquanto o JARVIS atua como camada inteligente de consulta, auditoria e execução segura.
          </p>
        </div>

        <button
          onClick={() => onQuickPrompt('JARVIS, quais são meus projetos?')}
          className="px-4 py-2.5 rounded-xl bg-sky-500 text-slate-950 font-semibold text-xs hover:bg-sky-400 transition-colors flex items-center gap-2 self-start md:self-auto whitespace-nowrap min-h-[42px]"
        >
          <span>Consultar Status no Chat</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'}`}>
          <span className="text-xs text-slate-400">Versão do JARVIS</span>
          <p className="text-xl font-bold font-mono tabular-nums mt-1 text-sky-400">
            v{healthData?.version || '1.0.0'}
          </p>
          <span className="text-[11px] text-slate-500">Saúde: /api/health OK</span>
        </div>

        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'}`}>
          <span className="text-xs text-slate-400">Provedor de IA</span>
          <p className={`text-base font-bold font-mono mt-1 truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {memory.preferences.aiProvider.toUpperCase()}
          </p>
          <span className="text-[11px] text-slate-500 font-mono truncate block">
            {memory.preferences.aiModel}
          </span>
        </div>

        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'}`}>
          <span className="text-xs text-slate-400">Ferramentas Ativas</span>
          <p className={`text-xl font-bold font-mono tabular-nums mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {totalTools}
          </p>
          <span className="text-[11px] text-slate-500">READ · CONFIRM · CRITICAL</span>
        </div>

        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'}`}>
          <span className="text-xs text-slate-400">Memória Ativa</span>
          <p className={`text-xl font-bold font-mono tabular-nums mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {memory.longTermFacts.length} fatos
          </p>
          <span className="text-[11px] text-slate-500">Curto e Longo Prazo</span>
        </div>

        <div className={`p-4 rounded-2xl border col-span-2 lg:col-span-1 ${isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'}`}>
          <span className="text-xs text-slate-400">Última Atividade</span>
          <p className={`text-sm font-semibold font-mono tabular-nums mt-1.5 truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {memory.toolHistory[0]?.toolName || 'Núcleo Inicializado'}
          </p>
          <span className="text-[11px] text-slate-500 font-mono">
            {memory.toolHistory[0]
              ? new Date(memory.toolHistory[0].timestamp).toLocaleTimeString('pt-BR')
              : 'Pronto para comando'}
          </span>
        </div>
      </div>

      <div>
        <h2 className={`text-lg font-semibold mb-3.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          01. Projetos Controlados pela Camada de Orquestração
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {projects.map((proj) => {
            const isPosto = proj.id === 'posto-adm';
            const isRota = proj.id === 'rotaplanner';
            const isSimulatedOff =
              (isPosto && simulationFlags.postoOffline) ||
              (isRota && simulationFlags.rotaOffline);

            return (
              <div
                key={proj.id}
                className={`p-5 rounded-2xl border flex flex-col justify-between ${
                  isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className={`text-base font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {proj.name}
                    </h3>
                    {renderStatusIndicator(proj.status)}
                  </div>

                  <p className={`text-xs mt-2.5 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    {proj.description}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-800/60 space-y-1.5 text-xs text-slate-400">
                    <div className="flex items-center justify-between">
                      <span>Modo de Operação:</span>
                      <span className="font-mono text-slate-200">
                        {proj.mode === 'MOCK'
                          ? 'Adapter MOCK Desacoplado'
                          : proj.mode === 'PLANNED'
                          ? 'Arquitetura Preparada (V3)'
                          : 'API Produção'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Ferramentas Registradas:</span>
                      <span className="font-mono tabular-nums text-sky-400">{proj.toolsCount} tools</span>
                    </div>
                    {proj.repositoryUrl && (
                      <div className="pt-1">
                        <a
                          href={proj.repositoryUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sky-400 hover:underline font-mono text-[11px]"
                        >
                          <span>{proj.repositoryUrl.replace('https://github.com/', '')}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800/60 flex flex-col gap-2">
                  {isPosto && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onQuickPrompt('JARVIS, analise a escala e procure erros.')}
                        className="flex-1 py-2 px-3 rounded-lg bg-sky-500/15 text-sky-300 hover:bg-sky-500/25 text-xs font-medium transition-colors text-center"
                      >
                        Auditar Escala
                      </button>
                      <button
                        onClick={() => onToggleOfflineSimulation('posto-adm', !isSimulatedOff)}
                        className={`py-2 px-3 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1 ${
                          isSimulatedOff
                            ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                            : 'border-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                        title="Simular queda da API do Posto ADM para testar regra de tratamento de erro do JARVIS"
                      >
                        {isSimulatedOff ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                        <span>{isSimulatedOff ? 'Reconectar' : 'Simular Offline'}</span>
                      </button>
                    </div>
                  )}

                  {isRota && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onQuickPrompt('JARVIS, quanto ganhei essa semana?')}
                        className="flex-1 py-2 px-3 rounded-lg bg-sky-500/15 text-sky-300 hover:bg-sky-500/25 text-xs font-medium transition-colors text-center"
                      >
                        Consultar Ganhos
                      </button>
                      <button
                        onClick={() => onToggleOfflineSimulation('rotaplanner', !isSimulatedOff)}
                        className={`py-2 px-3 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1 ${
                          isSimulatedOff
                            ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                            : 'border-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                        title="Simular queda da API do RotaPlanner"
                      >
                        {isSimulatedOff ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                        <span>{isSimulatedOff ? 'Reconectar' : 'Simular Offline'}</span>
                      </button>
                    </div>
                  )}

                  {proj.id === 'controle-gastos' && (
                    <button
                      onClick={() => onQuickPrompt('JARVIS, exclua essa despesa.')}
                      className="w-full py-2 px-3 rounded-lg bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 text-xs font-medium transition-colors text-center"
                    >
                      Testar Trava de Permissão CRITICAL
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className={`text-lg font-semibold mb-3.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          02. Registro Auditável de Execução de Ferramentas (Logs)
        </h2>
        <div
          className={`rounded-2xl border overflow-hidden ${
            isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          {memory.toolHistory.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              Nenhuma ferramenta executada ainda nesta sessão. Utilize o Chat ou o Sandbox de Ferramentas para testar.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className={`border-b ${isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                    <th className="py-3 px-4 font-medium">Horário</th>
                    <th className="py-3 px-4 font-medium">Ferramenta</th>
                    <th className="py-3 px-4 font-medium">Projeto</th>
                    <th className="py-3 px-4 font-medium">Permissão</th>
                    <th className="py-3 px-4 font-medium">Origem</th>
                    <th className="py-3 px-4 font-medium text-right">Duração</th>
                    <th className="py-3 px-4 font-medium">Resultado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {memory.toolHistory.slice(0, 8).map((log) => (
                    <tr key={log.id} className={isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}>
                      <td className="py-2.5 px-4 font-mono tabular-nums text-slate-400">
                        {new Date(log.timestamp).toLocaleTimeString('pt-BR')}
                      </td>
                      <td className="py-2.5 px-4 font-mono font-semibold text-sky-400">{log.toolName}</td>
                      <td className="py-2.5 px-4 font-mono">{log.project}</td>
                      <td className="py-2.5 px-4 font-mono">
                        <span
                          className={
                            log.permission === 'CRITICAL'
                              ? 'text-rose-400 font-semibold'
                              : log.permission === 'CONFIRM'
                              ? 'text-amber-400 font-semibold'
                              : 'text-emerald-400'
                          }
                        >
                          {log.permission}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-400">
                        {log.isMock ? 'MOCK' : 'REAL'}
                      </td>
                      <td className="py-2.5 px-4 font-mono tabular-nums text-right text-slate-400">
                        {log.durationMs}ms
                      </td>
                      <td className="py-2.5 px-4 max-w-xs truncate">{log.actionSummary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
