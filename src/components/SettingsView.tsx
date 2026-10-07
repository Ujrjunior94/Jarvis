import React, { useState } from 'react';
import { Shield, Cpu, Volume2, Link2, Palette, Wrench, Database } from 'lucide-react';
import { Memory, Project, UserPreferences } from '../types/jarvis';

interface SettingsViewProps {
  memory: Memory;
  projects: Project[];
  healthData: any;
  onUpdatePreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
  isDark: boolean;
}

type SettingsTab = 'ia' | 'memoria' | 'voz' | 'integracoes' | 'seguranca' | 'ferramentas' | 'aparencia';

export const SettingsView: React.FC<SettingsViewProps> = ({
  memory,
  projects,
  healthData,
  onUpdatePreferences,
  isDark,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('ia');
  const prefs = memory.preferences;

  const tabs: Array<{ id: SettingsTab; label: string; icon: React.ReactNode }> = [
    { id: 'ia', label: 'IA', icon: <Cpu className="w-4 h-4" /> },
    { id: 'memoria', label: 'Memória', icon: <Database className="w-4 h-4" /> },
    { id: 'voz', label: 'Voz', icon: <Volume2 className="w-4 h-4" /> },
    { id: 'integracoes', label: 'Integrações', icon: <Link2 className="w-4 h-4" /> },
    { id: 'seguranca', label: 'Segurança', icon: <Shield className="w-4 h-4" /> },
    { id: 'ferramentas', label: 'Ferramentas', icon: <Wrench className="w-4 h-4" /> },
    { id: 'aparencia', label: 'Aparência', icon: <Palette className="w-4 h-4" /> },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-24 md:pb-10 space-y-6">
      <div className="border-b border-slate-800/80 pb-4">
        <p className="text-xs font-mono text-sky-400">Painel de Governança · Segredos Protegidos no Servidor</p>
        <h1 className={`text-2xl font-bold font-display mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Configurações do Núcleo JARVIS
        </h1>
      </div>

      {/* Navegação das 7 Seções Obrigatórias */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-colors whitespace-nowrap shrink-0 min-h-[40px] border ${
              activeTab === t.id
                ? 'bg-sky-500 text-slate-950 font-semibold border-sky-400'
                : isDark
                ? 'bg-slate-900/80 border-slate-800 text-slate-300 hover:text-white'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Conteúdo da Seção */}
      <div className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'}`}>
        {activeTab === 'ia' && (
          <div className="space-y-5">
            <div>
              <h2 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Camada AI Provider (Desacoplada do Fornecedor)
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                O JARVIS utiliza a abstração <code className="font-mono text-sky-400">AIProvider</code> permitindo alternar entre Gemini, OpenRouter e OpenAI via configuração/variáveis de ambiente sem reescrever o sistema.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1.5">Provedor Ativo</label>
                <select
                  value={prefs.aiProvider}
                  onChange={(e) =>
                    onUpdatePreferences({
                      aiProvider: e.target.value as UserPreferences['aiProvider'],
                    })
                  }
                  className={`w-full px-3.5 py-2.5 rounded-xl border font-mono ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="gemini">Google Gemini (@google/genai)</option>
                  <option value="openrouter">OpenRouter Gateway</option>
                  <option value="openai">OpenAI Compatible</option>
                  <option value="heuristic">Motor Determinístico Local</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1.5">Modelo Configurado</label>
                <select
                  value={prefs.aiModel}
                  onChange={(e) => onUpdatePreferences({ aiModel: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl border font-mono ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="gemini-3.8-flash">gemini-3.8-flash</option>
                  <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite</option>
                  <option value="openrouter/auto">openrouter/auto</option>
                </select>
              </div>
            </div>

            <div className={`p-4 rounded-xl border text-xs ${isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
              <p className="font-semibold text-sky-400 mb-1">Proteção de Chaves de API</p>
              <p>
                Por regra de segurança da arquitetura JARVIS, chaves secretas (<code className="font-mono">GEMINI_API_KEY</code>, <code className="font-mono">OPENROUTER_API_KEY</code>) são lidas exclusivamente no backend (<code className="font-mono">.env.local</code>) e nunca são enviadas ou exibidas no frontend.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'memoria' && (
          <div className="space-y-4 text-xs">
            <h2 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Banco de Memória e Contexto
            </h2>
            <p className="text-slate-400">
              Status do Repositório: <strong className="text-sky-400">{healthData?.memoryDetails?.details || 'Configurado'}</strong>
            </p>
            <div className="space-y-2 pt-2">
              <p>• <strong>Short-Term Memory:</strong> retém intenção, período (semana/mês passado) e projeto ativo para perguntas de continuidade.</p>
              <p>• <strong>Long-Term Memory:</strong> armazena apenas fatos estratégicos validados ({memory.longTermFacts.length} fatos registrados).</p>
              <p>• <strong>Supabase / PostgreSQL:</strong> variáveis <code className="font-mono">SUPABASE_URL</code> e <code className="font-mono">DATABASE_URL</code> mapeadas no servidor.</p>
            </div>
          </div>
        )}

        {activeTab === 'voz' && (
          <div className="space-y-4 text-xs">
            <h2 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Interface de Voz (Speech-to-Text & Text-to-Speech)
            </h2>
            <label className="flex items-center justify-between py-2 border-b border-slate-800/60">
              <span>Habilitar captura de comando por microfone (STT pt-BR)</span>
              <input
                type="checkbox"
                checked={prefs.voiceEnabled}
                onChange={(e) => onUpdatePreferences({ voiceEnabled: e.target.checked })}
                className="w-4 h-4 accent-sky-500"
              />
            </label>
            <label className="flex items-center justify-between py-2 border-b border-slate-800/60">
              <span>Ler respostas do JARVIS automaticamente em voz alta (TTS)</span>
              <input
                type="checkbox"
                checked={prefs.autoSpeakResponses}
                onChange={(e) => onUpdatePreferences({ autoSpeakResponses: e.target.checked })}
                className="w-4 h-4 accent-sky-500"
              />
            </label>
            <div>
              <label className="block text-slate-400 mb-1">Velocidade da Fala ({prefs.speechRate}x)</label>
              <input
                type="range"
                min="0.8"
                max="1.4"
                step="0.05"
                value={prefs.speechRate}
                onChange={(e) => onUpdatePreferences({ speechRate: parseFloat(e.target.value) })}
                className="w-48 accent-sky-500"
              />
            </div>
          </div>
        )}

        {activeTab === 'integracoes' && (
          <div className="space-y-4 text-xs">
            <h2 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Adapters de Integração Externa
            </h2>
            <div className="space-y-3">
              {projects.map((p) => (
                <div
                  key={p.id}
                  className={`p-3.5 rounded-xl border flex items-center justify-between ${
                    isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div>
                    <p className="font-semibold text-sm">{p.name}</p>
                    <p className="text-slate-400 mt-0.5">{p.description}</p>
                  </div>
                  <span className="font-mono text-sky-400">{p.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'seguranca' && (
          <div className="space-y-4 text-xs">
            <h2 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Política de Permissões (READ · CONFIRM · CRITICAL)
            </h2>
            <label className="flex items-center justify-between py-2 border-b border-slate-800/60">
              <span>Exigir confirmação explícita para operações CRITICAL (Exclusões permanentes)</span>
              <input type="checkbox" checked={true} disabled className="w-4 h-4 accent-sky-500" />
            </label>
            <label className="flex items-center justify-between py-2 border-b border-slate-800/60">
              <span>Exigir aprovação humana para operações nível CONFIRM (Registrar/Alterar dados)</span>
              <input
                type="checkbox"
                checked={prefs.requireConfirmLevelApproval}
                onChange={(e) => onUpdatePreferences({ requireConfirmLevelApproval: e.target.checked })}
                className="w-4 h-4 accent-sky-500"
              />
            </label>
          </div>
        )}

        {activeTab === 'ferramentas' && (
          <div className="space-y-4 text-xs">
            <h2 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Auditoria de Execução de Ferramentas
            </h2>
            <label className="flex items-center justify-between py-2">
              <span>Exibir payload JSON estruturado das ferramentas expandido por padrão no chat</span>
              <input
                type="checkbox"
                checked={prefs.showStructuredToolOutput}
                onChange={(e) => onUpdatePreferences({ showStructuredToolOutput: e.target.checked })}
                className="w-4 h-4 accent-sky-500"
              />
            </label>
          </div>
        )}

        {activeTab === 'aparencia' && (
          <div className="space-y-4 text-xs">
            <h2 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Tema Visual e Experiência Mobile PWA
            </h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onUpdatePreferences({ theme: 'dark' })}
                className={`px-4 py-2.5 rounded-xl border font-medium ${
                  prefs.theme === 'dark'
                    ? 'bg-sky-500 text-slate-950 border-sky-400'
                    : 'border-slate-700 text-slate-400'
                }`}
              >
                Modo Escuro (Obsidian Slate)
              </button>
              <button
                onClick={() => onUpdatePreferences({ theme: 'light' })}
                className={`px-4 py-2.5 rounded-xl border font-medium ${
                  prefs.theme === 'light'
                    ? 'bg-sky-500 text-slate-950 border-sky-400'
                    : 'border-slate-300 text-slate-600'
                }`}
              >
                Modo Claro (Daylight)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
