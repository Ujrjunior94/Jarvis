import React, { useState } from 'react';
import { Plus, Trash2, Database, History } from 'lucide-react';
import { LongTermFact, Memory } from '../types/jarvis';

interface MemoryViewProps {
  memory: Memory;
  onAddFact: (fact: string, category: LongTermFact['category']) => Promise<void>;
  onRemoveFact: (id: string) => Promise<void>;
  onClearLogs: () => Promise<void>;
  isDark: boolean;
}

export const MemoryView: React.FC<MemoryViewProps> = ({
  memory,
  onAddFact,
  onRemoveFact,
  onClearLogs,
  isDark,
}) => {
  const [newFact, setNewFact] = useState('');
  const [category, setCategory] = useState<LongTermFact['category']>('preferencia');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFact.trim()) return;
    await onAddFact(newFact.trim(), category);
    setNewFact('');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-24 md:pb-10 space-y-8">
      <div className="border-b border-slate-800/80 pb-4">
        <p className="text-xs font-mono text-sky-400">Arquitetura de Memória Seletiva · Preparada para Supabase/PostgreSQL</p>
        <h1 className={`text-2xl font-bold font-display mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Memória de Curto e Longo Prazo
        </h1>
        <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          O JARVIS separa o contexto imediato da conversa (Short-Term), fatos estruturados (Long-Term), preferências do usuário e auditoria de ferramentas.
        </p>
      </div>

      {/* 1. Short-Term Memory */}
      <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-900/75 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-2 mb-3">
          <Database className="w-4 h-4 text-sky-400" />
          <h2 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            01. Short-Term Memory (Contexto da Conversa Atual)
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className="text-slate-400 block">Última Intenção</span>
            <span className="font-mono font-semibold text-sky-400 mt-1 block">
              {memory.shortTerm.lastIntent || 'Nenhuma'}
            </span>
          </div>
          <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className="text-slate-400 block">Projeto em Foco</span>
            <span className="font-mono font-semibold mt-1 block">
              {memory.shortTerm.lastProject || 'Global'}
            </span>
          </div>
          <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className="text-slate-400 block">Período Contextual</span>
            <span className="font-mono font-semibold mt-1 block">
              {memory.shortTerm.lastPeriod || 'semana'}
            </span>
          </div>
          <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className="text-slate-400 block">Última Ferramenta</span>
            <span className="font-mono font-semibold mt-1 block">
              {memory.shortTerm.lastToolCalled || 'Nenhuma'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Long-Term Memory Facts */}
      <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-900/75 border-slate-800' : 'bg-white border-slate-200'}`}>
        <h2 className={`text-base font-semibold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          02. Long-Term Memory (Fatos Relevantes e Regras Pessoais)
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 mb-5">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as LongTermFact['category'])}
            className={`px-3 py-2.5 rounded-xl text-xs font-medium border ${
              isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            <option value="preferencia">Preferência</option>
            <option value="trabalho">Trabalho / Posto</option>
            <option value="financeiro">Financeiro / Rotas</option>
            <option value="sistema">Sistema</option>
            <option value="pessoal">Pessoal</option>
          </select>

          <input
            type="text"
            value={newFact}
            onChange={(e) => setNewFact(e.target.value)}
            placeholder="Adicionar fato relevante (ex: Minha meta semanal no RotaPlanner é R$ 2.800,00)"
            className={`flex-1 px-3.5 py-2.5 rounded-xl text-xs border ${
              isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
            }`}
          />

          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-sky-500 text-slate-950 font-semibold text-xs hover:bg-sky-400 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Memorizar Fato</span>
          </button>
        </form>

        <div className="space-y-2.5">
          {memory.longTermFacts.map((item) => (
            <div
              key={item.id}
              className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 text-xs ${
                isDark ? 'bg-slate-950/80 border-slate-800/80' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-1">
                  <span className="font-mono text-sky-400 uppercase">{item.category}</span>
                  <span>·</span>
                  <span>Origem: {item.source}</span>
                </div>
                <p className={isDark ? 'text-slate-200' : 'text-slate-800'}>{item.fact}</p>
              </div>
              <button
                onClick={() => onRemoveFact(item.id)}
                className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                title="Remover fato da memória"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Tool History */}
      <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-900/75 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-sky-400" />
            <h2 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              03. Histórico de Ferramentas Executadas ({memory.toolHistory.length})
            </h2>
          </div>
          {memory.toolHistory.length > 0 && (
            <button
              onClick={onClearLogs}
              className="text-xs text-slate-400 hover:text-rose-400 transition-colors"
            >
              Limpar Logs
            </button>
          )}
        </div>

        <div className="space-y-2">
          {memory.toolHistory.slice(0, 10).map((t) => (
            <div
              key={t.id}
              className={`p-3 rounded-xl border text-xs flex flex-wrap items-center justify-between gap-2 ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold text-sky-400">{t.toolName}</span>
                <span>·</span>
                <span className="font-mono text-slate-400">{t.project}</span>
                <span>·</span>
                <span className="text-slate-300">{t.actionSummary}</span>
              </div>
              <span className="font-mono tabular-nums text-slate-500">
                {new Date(t.timestamp).toLocaleTimeString('pt-BR')} ({t.durationMs}ms)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
