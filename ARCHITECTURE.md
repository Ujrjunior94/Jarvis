# Arquitetura do Sistema JARVIS

## 1. Regra Fundamental: Orquestração Desacoplada

O JARVIS **não incorpora** o código-fonte do Posto ADM, RotaPlanner ou Controle de Gastos. Cada projeto permanece em seu próprio repositório e ciclo de deploy.

```
JARVIS (Camada de Orquestração Central)
 │
 ├── AI Provider Layer (Gemini / OpenRouter / OpenAI / Local Structured Engine)
 ├── Intent & Context Engine (Resolução de continuidade conversacional)
 ├── Permission Guard (READ | CONFIRM | CRITICAL)
 ├── Memory Store (Short-Term | Long-Term Facts | Preferences | Tool History)
 │
 ├── Tools Registry (Validação + Permissão + Execução + Logs)
 │    ├── tools/posto/       --> integrations/posto-adm/adapter.ts
 │    ├── tools/rota/        --> integrations/rotaplanner/adapter.ts
 │    ├── tools/gastos/      --> integrations/gastos/adapter.ts
 │    └── tools/system/      --> Saúde e Descoberta de Projetos
```

## 2. Estrutura de Diretórios

```
/
├── server.ts                         # Servidor full-stack (Express + API Routes + Vite PWA)
├── src/
│   ├── types/
│   │   └── jarvis.ts                 # Tipos estritos (Tool, ToolResult, Intent, Memory, AIProvider, etc.)
│   ├── ai/
│   │   ├── provider/index.ts         # Abstração multi-modelo (Gemini, OpenRouter, Fallback)
│   │   ├── agent/
│   │   │   ├── intent.ts             # Interpretação de linguagem natural e contexto
│   │   │   └── orchestrator.ts       # Ciclo de vida do turno sem expor cadeia de pensamento
│   │   ├── prompts/system.ts         # Personalidade e diretrizes do JARVIS (pt-BR)
│   │   └── memory/store.ts           # Memória de curto/longo prazo preparada para Supabase/PostgreSQL
│   ├── tools/
│   │   ├── registry.ts               # Registro central, validação e guarda de permissões
│   │   ├── posto/index.ts            # 8 ferramentas do Posto ADM
│   │   ├── rota/index.ts             # 9 ferramentas do RotaPlanner
│   │   ├── gastos/index.ts           # 7 ferramentas preparadas do Controle de Gastos
│   │   └── system/index.ts           # Ferramentas de diagnóstico e listagem de projetos
│   ├── integrations/
│   │   ├── posto-adm/adapter.ts      # Adapter HTTP / MOCK para Posto ADM
│   │   ├── rotaplanner/adapter.ts    # Adapter HTTP / MOCK para RotaPlanner
│   │   └── gastos/adapter.ts         # Adapter preparado para Controle de Gastos
│   ├── permissions/
│   │   └── guard.ts                  # Controle de tokens de confirmação (CONFIRM / CRITICAL)
│   ├── api/
│   │   └── routes.ts                 # Endpoints (/api/chat, /api/agent, /api/tools, /api/memory, /api/health, /api/integrations)
│   ├── components/                   # Interface Mobile-First (ChatView, DashboardView, ToolsSandboxView, MemoryView, SettingsView)
│   ├── lib/
│   │   ├── logger.ts                 # Auditoria de execuções sem vazamento de segredos
│   │   ├── voice.ts                  # Speech-to-Text (STT) e Text-to-Speech (TTS)
│   │   └── usePWAInstall.ts          # Instalação nativa Android/iOS/Desktop
│   └── tests/
│       └── jarvis.test.ts            # Testes automatizados (Vitest)
```
