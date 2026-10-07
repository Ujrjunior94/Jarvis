import React, { useEffect, useState, useCallback } from 'react';
import {
  MessageSquare,
  LayoutDashboard,
  Wrench,
  Brain,
  Settings,
  Sun,
  Moon,
  Shield,
  Activity,
  Clock,
} from 'lucide-react';
import {
  AttachmentInput,
  LongTermFact,
  Memory,
  Project,
  ToolResult,
  UserPreferences,
} from './types/jarvis';
import { ChatView } from './components/ChatView';
import { DashboardView } from './components/DashboardView';
import { ToolsSandboxView } from './components/ToolsSandboxView';
import { MemoryView } from './components/MemoryView';
import { SettingsView } from './components/SettingsView';
import { PWAInstallButton } from './components/PWAInstallButton';
import { getCurrentDateTime } from './lib/datetime';

type AppTab = 'chat' | 'dashboard' | 'tools' | 'memory' | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('chat');
  const [isDark, setIsDark] = useState<boolean>(true);
  const [memory, setMemory] = useState<Memory | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tools, setTools] = useState<any[]>([]);
  const [healthData, setHealthData] = useState<any>(null);
  const [simulationFlags, setSimulationFlags] = useState({
    postoOffline: false,
    rotaOffline: false,
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentTimeDisplay, setCurrentTimeDisplay] = useState<string>(() => {
    const dt = getCurrentDateTime();
    return `${dt.time} · ${dt.dayOfWeek}`;
  });

  // Atualizador de relógio em tempo real (America/Bahia)
  useEffect(() => {
    const timer = setInterval(() => {
      const dt = getCurrentDateTime();
      setCurrentTimeDisplay(`${dt.time} · ${dt.dayOfWeek}`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sincronizar classe dark no HTML
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setHealthData(data);
      }
    } catch {
      // Falha silenciosa em dev
    }
  }, []);

  const fetchMemory = useCallback(async () => {
    try {
      const res = await fetch('/api/memory');
      if (res.ok) {
        const data = await res.json();
        setMemory(data);
        if (data.preferences?.theme) {
          setIsDark(data.preferences.theme === 'dark');
        }
      }
    } catch {
      // Falha silenciosa
    }
  }, []);

  const fetchTools = useCallback(async () => {
    try {
      const res = await fetch('/api/tools');
      if (res.ok) {
        const data = await res.json();
        setTools(data.tools || []);
      }
    } catch {
      // Falha silenciosa
    }
  }, []);

  const fetchIntegrations = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations');
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
        if (data.simulationFlags) {
          setSimulationFlags(data.simulationFlags);
        }
      }
    } catch {
      // Falha silenciosa
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    fetchMemory();
    fetchTools();
    fetchIntegrations();
  }, [fetchHealth, fetchMemory, fetchTools, fetchIntegrations]);

  const handleSendMessage = async (text: string, attachment?: AttachmentInput) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          conversationId: 'conv_principal',
          attachment,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.memory) {
          setMemory(data.memory);
        }
      }
    } finally {
      setIsLoading(false);
      fetchHealth();
    }
  };

  const handleConfirmAction = async (token: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmedToken: token,
          conversationId: 'conv_principal',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.memory) {
          setMemory(data.memory);
        }
      }
    } finally {
      setIsLoading(false);
      fetchHealth();
    }
  };

  const handleCancelAction = async (token: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cancelToken: token,
          conversationId: 'conv_principal',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.memory) {
          setMemory(data.memory);
        }
      }
    } finally {
      setIsLoading(false);
      fetchHealth();
    }
  };

  const handleClearHistory = async () => {
    try {
      const res = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clear_conversation',
          conversationId: 'conv_principal',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.memory) {
          setMemory(data.memory);
        }
      }
    } catch {
      // Silencioso
    }
  };

  const handleExecuteToolDirect = async (
    toolName: string,
    params: Record<string, unknown>,
    confirmedToken?: string
  ): Promise<ToolResult> => {
    const res = await fetch('/api/tools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toolName,
        params,
        confirmedToken,
      }),
    });
    const json = await res.json();
    fetchMemory();
    return json;
  };

  const handleAddFact = async (fact: string, category: LongTermFact['category']) => {
    const res = await fetch('/api/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add_fact',
        fact,
        category,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.memory) setMemory(data.memory);
    }
  };

  const handleRemoveFact = async (factId: string) => {
    const res = await fetch('/api/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'remove_fact',
        factId,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.memory) setMemory(data.memory);
    }
  };

  const handleClearLogs = async () => {
    const res = await fetch('/api/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'clear_logs' }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.memory) setMemory(data.memory);
    }
  };

  const handleUpdatePreferences = async (partial: Partial<UserPreferences>) => {
    const res = await fetch('/api/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_preferences',
        preferences: partial,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.memory) {
        setMemory(data.memory);
        if (data.preferences?.theme) {
          setIsDark(data.preferences.theme === 'dark');
        }
      }
    }
  };

  const handleToggleOfflineSimulation = async (
    target: 'posto-adm' | 'rotaplanner',
    offline: boolean
  ) => {
    const res = await fetch('/api/integrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target,
        simulateOffline: offline,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setProjects(data.projects || []);
      setSimulationFlags(data.simulationFlags || simulationFlags);
      fetchHealth();
    }
  };

  const currentConvo = memory?.conversations.find((c) => c.id === 'conv_principal');
  const messages = currentConvo ? currentConvo.messages : [];

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* CABEÇALHO GLOBAL */}
      <header
        className={`sticky top-0 z-40 border-b backdrop-blur-md px-4 py-2.5 transition-colors ${
          isDark
            ? 'bg-slate-950/80 border-slate-800/80'
            : 'bg-white/80 border-slate-200 shadow-xs'
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Logo e Nome */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-md shadow-sky-500/20">
              <span className="font-display font-black text-white text-base tracking-wider">J</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-black text-lg tracking-tight bg-gradient-to-r from-sky-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">
                  JARVIS
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20 font-semibold">
                  V1.1 CORE
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                <span className="inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Núcleo Ativo
                </span>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500" />
                  {currentTimeDisplay}
                </span>
              </div>
            </div>
          </div>

          {/* Badges de Estado e Ações Topo */}
          <div className="flex items-center gap-2">
            {/* Status do AI Provider e Memória */}
            <div className="hidden lg:flex items-center gap-2">
              <div
                className={`text-[11px] font-mono px-2.5 py-1 rounded-lg border ${
                  isDark ? 'bg-slate-900/90 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                IA: <span className="text-sky-400 font-semibold">{healthData?.aiProvider?.provider || 'Gemini'}</span>{' '}
                <span className="text-slate-500">({healthData?.aiProvider?.model || '3.8-flash'})</span>
              </div>
              <div
                className={`text-[11px] font-mono px-2.5 py-1 rounded-lg border ${
                  isDark ? 'bg-slate-900/90 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                Memória:{' '}
                <span className="text-emerald-400 font-semibold">
                  {healthData?.memoryMode || 'IN_MEMORY'}
                </span>
              </div>
            </div>

            {/* PWA Install Button */}
            <PWAInstallButton />

            {/* Alternador de Tema */}
            <button
              onClick={() => {
                const next = !isDark;
                setIsDark(next);
                handleUpdatePreferences({ theme: next ? 'dark' : 'light' });
              }}
              title={isDark ? 'Ativar Modo Claro' : 'Ativar Modo Escuro'}
              className={`p-2 rounded-xl border transition-colors ${
                isDark
                  ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900'
              }`}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>
          </div>
        </div>
      </header>

      {/* ÁREA DE CONTEÚDO PRINCIPAL */}
      <main className="flex-1 flex flex-col">
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col">
            <ChatView
              messages={messages}
              memory={memory || {
                shortTerm: { items: [] },
                longTermFacts: [],
                preferences: {
                  voiceEnabled: true,
                  autoSpeakResponses: false,
                  speechRate: 1,
                  theme: 'dark',
                  aiProvider: 'gemini',
                  aiModel: 'gemini-3.8-flash',
                  requireCriticalConfirmation: true,
                  requireConfirmLevelApproval: true,
                  showStructuredToolOutput: true,
                },
                conversations: [],
                toolHistory: [],
                pendingConfirmations: [],
              }}
              isLoading={isLoading}
              onSendMessage={handleSendMessage}
              onConfirmAction={handleConfirmAction}
              onCancelAction={handleCancelAction}
              onClearHistory={handleClearHistory}
              isDark={isDark}
            />
          </div>
        )}

        {activeTab === 'dashboard' && (
          <DashboardView
            projects={projects}
            memory={memory || {
              shortTerm: { items: [] },
              longTermFacts: [],
              preferences: {
                voiceEnabled: true,
                autoSpeakResponses: false,
                speechRate: 1,
                theme: 'dark',
                aiProvider: 'gemini',
                aiModel: 'gemini-3.8-flash',
                requireCriticalConfirmation: true,
                requireConfirmLevelApproval: true,
                showStructuredToolOutput: true,
              },
              conversations: [],
              toolHistory: [],
              pendingConfirmations: [],
            }}
            healthData={healthData}
            simulationFlags={simulationFlags}
            onToggleOfflineSimulation={handleToggleOfflineSimulation}
            onQuickPrompt={(prompt) => {
              setActiveTab('chat');
              handleSendMessage(prompt);
            }}
            isDark={isDark}
          />
        )}

        {activeTab === 'tools' && (
          <ToolsSandboxView
            tools={tools}
            sandboxEnabled={healthData?.security?.toolSandboxEnabled ?? true}
            onExecuteToolDirect={handleExecuteToolDirect}
            isDark={isDark}
          />
        )}

        {activeTab === 'memory' && (
          <MemoryView
            memory={memory || {
              shortTerm: { items: [] },
              longTermFacts: [],
              preferences: {
                voiceEnabled: true,
                autoSpeakResponses: false,
                speechRate: 1,
                theme: 'dark',
                aiProvider: 'gemini',
                aiModel: 'gemini-3.8-flash',
                requireCriticalConfirmation: true,
                requireConfirmLevelApproval: true,
                showStructuredToolOutput: true,
              },
              conversations: [],
              toolHistory: [],
              pendingConfirmations: [],
            }}
            onAddFact={handleAddFact}
            onRemoveFact={handleRemoveFact}
            onClearLogs={handleClearLogs}
            isDark={isDark}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            memory={memory || {
              shortTerm: { items: [] },
              longTermFacts: [],
              preferences: {
                voiceEnabled: true,
                autoSpeakResponses: false,
                speechRate: 1,
                theme: 'dark',
                aiProvider: 'gemini',
                aiModel: 'gemini-3.8-flash',
                requireCriticalConfirmation: true,
                requireConfirmLevelApproval: true,
                showStructuredToolOutput: true,
              },
              conversations: [],
              toolHistory: [],
              pendingConfirmations: [],
            }}
            projects={projects}
            healthData={healthData}
            onUpdatePreferences={handleUpdatePreferences}
            isDark={isDark}
          />
        )}
      </main>

      {/* BARRA DE NAVEGAÇÃO INFERIOR MOBILE-FIRST */}
      <nav
        className={`fixed bottom-0 left-0 right-0 z-30 border-t backdrop-blur-lg px-2 py-1.5 transition-colors ${
          isDark
            ? 'bg-slate-950/90 border-slate-800/80'
            : 'bg-white/90 border-slate-200 shadow-lg'
        }`}
      >
        <div className="max-w-md mx-auto grid grid-cols-5 gap-1">
          {[
            { id: 'chat', label: 'Chat', icon: <MessageSquare className="w-5 h-5" /> },
            { id: 'dashboard', label: 'Painel', icon: <LayoutDashboard className="w-5 h-5" /> },
            { id: 'tools', label: 'Ferramentas', icon: <Wrench className="w-5 h-5" /> },
            { id: 'memory', label: 'Memória', icon: <Brain className="w-5 h-5" /> },
            { id: 'settings', label: 'Ajustes', icon: <Settings className="w-5 h-5" /> },
          ].map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as AppTab)}
                className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all ${
                  isActive
                    ? 'text-sky-400 bg-sky-500/10 font-medium scale-105'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {item.icon}
                <span className="text-[11px] mt-0.5 tracking-tight font-medium">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
