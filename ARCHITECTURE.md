# Arquitetura do Sistema JARVIS (V1.1)

## 1. Regra Fundamental: Orquestração Desacoplada

O JARVIS **não incorpora** o código-fonte do Posto ADM, RotaPlanner ou Controle de Gastos. Cada projeto permanece em seu próprio repositório e ciclo de implantação.

O JARVIS atua exclusivamente através de contratos estritos de ferramentas e adaptadores desacoplados:

```text
Entrada do Usuário (Texto / Voz / Anexo)
   │
   ▼
[API Routes: /api/chat, /api/agent] (Autenticadas via AuthProvider Middleware)
   │
   ▼
[Orchestrator: processUserTurn]
   │
   ├─► [Centralized DateTime: America/Bahia]
   │
   ├─► [Validation Guard: Uploads, MIME e Limites]
   │
   ├─► [Intent Engine: Contexto Conversacional e Entidades]
   │
   ├─► [Permission Guard: Confirmação Criptográfica Única (TTL 5m)]
   │
   ├─► [Tool Registry: 24 Ferramentas Contratualizadas]
   │      │
   │      ├─► Posto ADM Adapter (MOCK / API)
   │      ├─► RotaPlanner Adapter (MOCK / API)
   │      └─► Controle de Gastos Adapter (MOCK / API)
   │
   ├─► [Memory Provider: InMemory / Supabase]
   │
   ▼
[AI Provider Factory: Gemini / OpenRouter / OpenAI / Heuristic]
   │
   ▼
Resposta Estruturada Factual (Sem Alucinações, Sem Expor Raciocínio Interno)
```

---

## 2. Componentes Centrais

### 2.1 Módulo de Data e Hora Dinâmica (`src/lib/datetime.ts`)
- Fuso Horário fixo: `America/Bahia` (UTC-3).
- Todas as datas de referência de escalas, ganhos, rotas e despesas derivam de `getCurrentDateTime()`.
- Resolução dinâmica de intervalos:
  - `hoje`: data atual.
  - `amanhã`: `getRelativeDate(1)`.
  - `ontem`: `getRelativeDate(-1)`.
  - `esta_semana`: segunda a domingo da semana corrente.
  - `semana_passada`: semana anterior completa.
  - `mes_atual`: primeiro ao último dia do mês corrente.
  - `mes_passado`: primeiro ao último dia do mês anterior.

### 2.2 Camada de Autenticação (`src/auth/`)
- `AuthProvider`: interface abstrata.
- `DevAuthProvider`: modo de desenvolvimento explícito (`DEVELOPMENT`) para uso local.
- `SupabaseAuthProvider`: preparação para validação de JWTs via Supabase Auth quando credenciais forem fornecidas.
- `authenticateRequest`: middleware Express que bloqueia acesso anônimo em ambiente de produção para rotas mutáveis (`/api/chat`, `/api/agent`, `/api/tools`, `/api/memory`, `/api/integrations`).

### 2.3 Camada de Confirmação Segura (`src/permissions/guard.ts`)
- Níveis de permissão: `READ`, `CONFIRM`, `CRITICAL`.
- Tokens gerados criptograficamente (`crypto.randomBytes(24)`).
- Vínculo obrigatório com `userId` e `conversationId`.
- Expiração temporal configurável (padrão: 5 minutos).
- Consumo estritamente de **uso único** (reutilização rejeitada com motivo `REUSED`).
- Possibilidade de cancelamento explícito pelo usuário (`cancelConfirmation`).

### 2.4 Camada de IA Desacoplada (`src/ai/provider/`)
- Suporte a múltiplos provedores sem dependência de fornecedor único:
  - `GeminiProvider`: Google Gemini via `@google/genai` (padrão `gemini-3.8-flash`).
  - `OpenRouterProvider`: modelos via gateway OpenRouter.
  - `OpenAIProvider`: modelos OpenAI via API REST oficial.
  - `HeuristicProvider`: fallback factual determinístico baseado na saída das ferramentas.
- Caso o provedor escolhido não possua chave configurada ou a rede falhe, o sistema alterna silenciosamente para o `HeuristicProvider`, garantindo zero indisponibilidade e zero alucinação de dados.

### 2.5 Camada de Memória (`src/ai/memory/`)
- Interface `MemoryProvider`.
- `InMemoryMemoryProvider`: memória rápida em RAM para desenvolvimento.
- `SupabaseMemoryProvider`: detecção honesta de variáveis de ambiente. Se ausentes, o sistema informa `MEMORY_MODE = IN_MEMORY`. O endpoint `/api/health` nunca falsifica status de banco de dados conectado.
