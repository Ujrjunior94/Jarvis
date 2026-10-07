import React, { useState } from 'react';
import { Play, ShieldAlert, CheckCircle2, Terminal } from 'lucide-react';
import { ToolPermission, ToolResult } from '../types/jarvis';

interface ToolInfo {
  name: string;
  description: string;
  project: string;
  permission: ToolPermission;
  parameters: Record<string, any>;
}

interface ToolsSandboxViewProps {
  tools: ToolInfo[];
  onExecuteToolDirect: (
    toolName: string,
    params: Record<string, unknown>,
    confirmedToken?: string
  ) => Promise<ToolResult>;
  isDark: boolean;
}

export const ToolsSandboxView: React.FC<ToolsSandboxViewProps> = ({
  tools,
  onExecuteToolDirect,
  isDark,
}) => {
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [activeToolResult, setActiveToolResult] = useState<ToolResult | null>(null);
  const [runningTool, setRunningTool] = useState<string | null>(null);
  const [customDate, setCustomDate] = useState('2026-10-06');
  const [customPeriod, setCustomPeriod] = useState('semana');

  const filteredTools =
    selectedProject === 'all' ? tools : tools.filter((t) => t.project === selectedProject);

  const handleRun = async (tool: ToolInfo, confirmedToken?: string) => {
    setRunningTool(tool.name);
    try {
      const sampleParams: Record<string, unknown> = {
        data: customDate,
        periodo: customPeriod,
        descricao: 'Abastecimento teste sandbox',
        valor: 85.0,
        categoria: 'Combustível',
        alvo: 'combustível',
      };
      const res = await onExecuteToolDirect(tool.name, sampleParams, confirmedToken);
      setActiveToolResult(res);
    } finally {
      setRunningTool(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 pb-24 md:pb-10 space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <p className="text-xs font-mono text-sky-400">Modo Desenvolvimento & Auditoria de Ferramentas</p>
          <h1 className={`text-2xl font-bold font-display mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Catálogo de Ferramentas e Mocks ({tools.length})
          </h1>
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Teste individualmente cada ferramenta de Posto ADM, RotaPlanner e Controle de Gastos validando permissões (READ, CONFIRM, CRITICAL) e contratos JSON.
          </p>
        </div>

        {/* Filtros de Projeto */}
        <div className={`flex items-center gap-1 p-1 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
          {[
            { id: 'all', label: 'Todas' },
            { id: 'posto-adm', label: 'Posto ADM (8)' },
            { id: 'rotaplanner', label: 'RotaPlanner (9)' },
            { id: 'controle-gastos', label: 'Gastos (7)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedProject(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                selectedProject === tab.id
                  ? 'bg-sky-500 text-slate-950 font-semibold'
                  : isDark
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Parâmetros de Teste Rápido */}
      <div className={`p-4 rounded-2xl border flex flex-wrap items-center gap-4 text-xs ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
        <span className="font-semibold text-sky-400">Parâmetros de Simulação:</span>
        <label className="flex items-center gap-2">
          <span className="text-slate-400">Data (Posto ADM):</span>
          <input
            type="date"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
            className={`px-2.5 py-1.5 rounded-lg font-mono border ${
              isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
            }`}
          />
        </label>
        <label className="flex items-center gap-2">
          <span className="text-slate-400">Período (RotaPlanner):</span>
          <select
            value={customPeriod}
            onChange={(e) => setCustomPeriod(e.target.value)}
            className={`px-2.5 py-1.5 rounded-lg font-mono border ${
              isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
            }`}
          >
            <option value="hoje">hoje</option>
            <option value="semana">semana</option>
            <option value="mes_passado">mes_passado</option>
          </select>
        </label>
      </div>

      {/* Resultado da Execução em Destaque */}
      {activeToolResult && (
        <div
          className={`p-5 rounded-2xl border ${
            activeToolResult.requiresConfirmation
              ? 'border-amber-500/50 bg-amber-500/10'
              : activeToolResult.success
              ? 'border-sky-500/40 bg-slate-900'
              : 'border-rose-500/50 bg-rose-500/10'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 text-xs">
              <Terminal className="w-4 h-4 text-sky-400" />
              <span className="font-mono font-bold text-white">{activeToolResult.toolName}</span>
              <span>·</span>
              <span className="font-mono text-slate-300">Permissão: {activeToolResult.permission}</span>
              <span>·</span>
              <span className="font-mono text-amber-300">
                {activeToolResult.isMock ? 'MOCK ADAPTER' : 'PRODUCTION API'}
              </span>
              <span>·</span>
              <span className="font-mono tabular-nums text-slate-400">{activeToolResult.durationMs}ms</span>
            </div>

            {activeToolResult.requiresConfirmation && activeToolResult.confirmationToken && (
              <button
                onClick={() => {
                  const found = tools.find((t) => t.name === activeToolResult.toolName);
                  if (found) handleRun(found, activeToolResult.confirmationToken);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-semibold text-xs hover:bg-emerald-400 transition-colors flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar Execução ({activeToolResult.permission})</span>
              </button>
            )}
          </div>

          <p className="text-sm text-slate-200 mb-3">{activeToolResult.message}</p>

          <pre className="p-3 rounded-xl bg-slate-950 text-slate-300 font-mono text-xs overflow-x-auto max-h-64">
            {JSON.stringify(activeToolResult, null, 2)}
          </pre>
        </div>
      )}

      {/* Grid de Ferramentas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTools.map((tool) => (
          <div
            key={tool.name}
            className={`p-4 rounded-2xl border flex flex-col justify-between ${
              isDark ? 'bg-slate-900/75 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono font-bold text-sm text-sky-400">{tool.name}</span>
                <span
                  className={`text-[11px] font-mono font-semibold ${
                    tool.permission === ToolPermission.CRITICAL
                      ? 'text-rose-400'
                      : tool.permission === ToolPermission.CONFIRM
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {tool.permission}
                </span>
              </div>

              <p className="text-[11px] font-mono text-slate-500 mt-0.5">Projeto: {tool.project}</p>

              <p className={`text-xs mt-2.5 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                {tool.description}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-500">
                {Object.keys(tool.parameters || {}).length} parâmetros
              </span>

              <button
                onClick={() => handleRun(tool)}
                disabled={runningTool === tool.name}
                className="px-3 py-1.5 rounded-lg bg-sky-500/15 text-sky-300 hover:bg-sky-500/25 text-xs font-medium transition-colors flex items-center gap-1.5 min-h-[36px]"
              >
                {tool.permission !== ToolPermission.READ ? (
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                <span>{runningTool === tool.name ? 'Executando...' : 'Testar Mock'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
