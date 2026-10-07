import React, { useEffect, useState, useCallback } from 'react';
import {
  MessageSquare,
  LayoutDashboard,
  Wrench,
  Brain,
  Settings,
  Sun,
  Moon,
} from 'lucide-react';
import {
  AttachmentInput,
  LongTermFact,
  Memory,
  Project,
  ToolResult,
  UserPreferences,
} from './types/jarvis';
import { PWAInstallButton } from './components/PWAInstallButton';
import { ChatView } from './components/ChatView';
import { DashboardView } from './components/DashboardView';
import { ToolsSandboxView } from './components/ToolsSandboxView';
import { MemoryView } from './components/MemoryView';
import { SettingsView } from './components/SettingsView';

type ActiveSection = 'chat' | 'dashboard' | 'tools' | 'memory' | 'settings';

export function App() {
  const [activeSection, setActiveSection] = useState<ActiveSection>('chat');
  const [memory, setMemory] = useState<Memory | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [toolsList, setToolsList] = useState<any[]>([]);
  const [healthData, setHealthData] = useState<any>(null);
  const [simulationFlags, setSimulationFlags] = useState({
    postoOffline: false,
    rotaOffline: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  const fetchInitialData = useCallback(async () => {
    try {
      const [memRes, intRes, toolsRes, healthRes] = await Promise.all([
        fetch('/api/memory'),
        fetch('/api/integrations'),
        fetch('/api/tools'),
        fetch('/api/health'),
      ]);
      if (memRes.ok) setMemory(await memRes.json());
      if (intRes.ok) {
        const intJson = await intRes.json();
        setProjects(intJson.projects || []);
        if (intJson.simulationFlags) setSimulationFlags(intJson.simulationFlags);
      }
      if (toolsRes.ok) {
        const toolsJson = await toolsRes.json();
        setToolsList(toolsJson.tools || []);
      }
      if (healthRes.ok) setHealthData(await healthRes.json());
    } catch (err) {
      console.error('Erro ao inicializar interface do JARVIS:', err);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

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
      const data = await res.json();
      if (data.memory) {
        setMemory(data.memory);
      } else {
        await fetchInitialData();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmAction = async (token: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Confirmo a operação.',
          confirmedToken: token,
        }),
      });
      const data = await res.json();
      if (data.memory) setMemory(data.memory);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelAction = async (token: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Cancelar operação.',
          cancelToken: token,
        }),
      });
      const data = await res.json();
      if (data.memory) setMemory(data.memory);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = async () => {
    const res = await fetch('/api/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'clear_conversation' }),
    });
    const data = await res.json();
    if (data.memory) setMemory(data.memory);
  };

  const handleExecuteToolDirect = async (
    toolName: string,
    params: Record<string, unknown>,
    confirmedToken?: string
  ): Promise<ToolResult> => {
    const res = await fetch('/api/tools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toolName, params, confirmedToken }),
    });
    const result = await res.json();
    await fetchInitialData();
    return result;
  };

  const handleToggleOfflineSimulation = async (
    target: 'posto-adm' | 'rotaplanner',
    offline: boolean
  ) => {
    const res = await fetch('/api/integrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target, simulateOffline: offline }),
    });
    if (res.ok) {
      const data = await res.json();
      setProjects(data.projects || []);
      setSimulationFlags(data.simulationFlags);
      await fetchInitialData();
    }
  };

  const handleAddFact = async (fact: string, category: LongTermFact['category']) => {
    const res = await fetch('/api/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_fact', fact, category }),
    });
    const data = await res.json();
    if (data.memory) setMemory(data.memory);
  };

  const handleRemoveFact = async (factId: string) => {
    const res = await fetch('/api/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove_fact', factId }),
    });
    const data = await res.json();
    if (data.memory) setMemory(data.memory);
  };

  const handleClearLogs = async () => {
    const res = await fetch('/api/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'clear_logs' }),
    });
    const data = await res.json();
    if (data.memory) setMemory(data.memory);
  };

  const handleUpdatePreferences = async (preferences: Partial<UserPreferences>) => {
    const res = await fetch('/api/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_preferences', preferences }),
    });
    const data = await res.json();
    if (data.memory) setMemory(data.memory);
  };

  const isDark = (memory?.preferences.theme || 'dark') === 'dark';

  const currentMessages =
    memory?.conversations?.[0]?.messages || [];

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Top Bar Contract: 3 Zonas Limpas (Wordmark | 5 Nav Links | 2 Primary Actions) */}
      <header
        className={`sticky top-0 z-30 h-14 px-4 md:px-6 flex items-center justify-between border-b backdrop-blur-md ${
          isDark
            ? 'bg-slate-950/85 border-slate-800/80'
            : 'bg-white/85 border-slate-200'
        }`}
      >
        {/* Zona 1: Brand Wordmark */}
        <a
          href="#chat"
          onClick={(e) => {
            e.preventDefault();
            setActiveSection('chat');
          }}
          className={`text-lg font-bold tracking-wider font-display ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}
        >
          JARVIS
        </a>

        {/* Zona 2: Links de Navegação Desktop */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium">
          {[
            { id: 'chat', label: 'Assistente' },
            { id: 'dashboard', label: 'Ecossistemas' },
            { id: 'tools', label: 'Ferramentas' },
            { id: 'memory', label: 'Memória' },
            { id: 'settings', label: 'Configurações' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id as ActiveSection)}
              className={`py-1 transition-colors whitespace-nowrap ${
                activeSection === item.id
                  ? 'text-sky-400 border-b-2 border-sky-400 font-semibold'
                  : isDark
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Zona 3: 1-2 Ações Primárias (PWA Install + Alternador de Tema) */}
        <div className="flex items-center gap-2.5">
          <PWAInstallButton />
          <button
            onClick={() =>
              handleUpdatePreferences({ theme: isDark ? 'light' : 'dark' })
            }
            className={`min-h-[38px] min-w-[38px] rounded-lg flex items-center justify-center border transition-colors ${
              isDark
                ? 'border-slate-800 bg-slate-900 text-slate-300 hover:text-sky-400'
                : 'border-slate-200 bg-slate-100 text-slate-700 hover:text-sky-600'
            }`}
            title={isDark ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1">
        {!memory ? (
          <div className="flex items-center justify-center h-64 text-xs text-slate-400">
            Inicializando núcleo de orquestração JARVIS...
          </div>
        ) : (
          <>
            {activeSection === 'chat' && (
              <ChatView
                messages={currentMessages}
                memory={memory}
                isLoading={isLoading}
                onSendMessage={handleSendMessage}
                onConfirmAction={handleConfirmAction}
                onCancelAction={handleCancelAction}
                onClearHistory={handleClearHistory}
                isDark={isDark}
              />
            )}

            {activeSection === 'dashboard' && (
              <DashboardView
                projects={projects}
                memory={memory}
                healthData={healthData}
                simulationFlags={simulationFlags}
                onToggleOfflineSimulation={handleToggleOfflineSimulation}
                onQuickPrompt={(prompt) => {
                  setActiveSection('chat');
                  handleSendMessage(prompt);
                }}
                isDark={isDark}
              />
            )}

            {activeSection === 'tools' && (
              <ToolsSandboxView
                tools={toolsList}
                onExecuteToolDirect={handleExecuteToolDirect}
                isDark={isDark}
              />
            )}

            {activeSection === 'memory' && (
              <MemoryView
                memory={memory}
                onAddFact={handleAddFact}
                onRemoveFact={handleRemoveFact}
                onClearLogs={handleClearLogs}
                isDark={isDark}
              />
            )}

            {activeSection === 'settings' && (
              <SettingsView
                memory={memory}
                projects={projects}
                healthData={healthData}
                onUpdatePreferences={handleUpdatePreferences}
                isDark={isDark}
              />
            )}
          </>
        )}
      </main>

      {/* Barra de Navegação Inferior Mobile-First (Thumb Zone Ergonomics) */}
      <nav
        className={`md:hidden fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 items-center h-16 border-t backdrop-blur-md ${
          isDark
            ? 'bg-slate-950/90 border-slate-800 text-slate-400'
            : 'bg-white/95 border-slate-200 text-slate-600'
        }`}
      >
        {[
          { id: 'chat', label: 'JARVIS', icon: <MessageSquare className="w-5 h-5" /> },
          { id: 'dashboard', label: 'Projetos', icon: <LayoutDashboard className="w-5 h-5" /> },
          { id: 'tools', label: 'Tools', icon: <Wrench className="w-5 h-5" /> },
          { id: 'memory', label: 'Memória', icon: <Brain className="w-5 h-5" /> },
          { id: 'settings', label: 'Ajustes', icon: <Settings className="w-5 h-5" /> },
        ].map((tab) => {
          const active = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as ActiveSection)}
              className={`min-h-[44px] flex flex-col items-center justify-center transition-colors ${
                active ? 'text-sky-400 font-semibold' : ''
              }`}
            >
              {tab.icon}
              <span className="text-[10px] tracking-tight mt-1">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default App;
