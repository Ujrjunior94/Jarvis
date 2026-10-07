# JARVIS — Núcleo de Assistência Digital (V1.1)

O **JARVIS** é um assistente pessoal de inteligência artificial construído como uma **camada de orquestração desacoplada**, projetado para gerenciar, auditar e consultar ecossistemas independentes por texto, voz e visão multimodal.

Nesta versão **V1.1 (Core Stabilization & Production Readiness)**, o núcleo foi estabilizado com data e hora dinâmicas no fuso horário `America/Bahia`, proteção estrita de confirmação criptográfica de uso único com expiração e vínculo de conversa/usuário, camada de abstração de autenticação (`AuthProvider`), suporte multi-fornecedor (`Gemini`, `OpenRouter`, `OpenAI`, `Heuristic`), proteção de sandbox de ferramentas via `TOOL_SANDBOX_ENABLED`, limites de segurança para arquivos e sanitização de erros.

---

## 🏛️ Princípio Fundamental de Arquitetura

O código dos projetos externos **NÃO é incorporado diretamente no JARVIS**. Cada sistema vive em seu próprio repositório e infraestrutura:

```text
                     ┌────────────────────────┐
                     │         JARVIS         │
                     │  Camada de Orquestração │
                     └───────────┬────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│    Posto ADM     │   │   RotaPlanner    │   │Controle de Gastos│
│  (Projeto-posto1)│   │  (Rotaplanner)   │   │ (Módulo Futuro)  │
│  [Adapter MOCK]  │   │  [Adapter MOCK]  │   │ [Adapter MOCK]   │
└──────────────────┘   └──────────────────┘   └──────────────────┘
```

---

## 🚀 Novidades da Versão 1.1

- 🕒 **Data e Hora Dinâmica (`America/Bahia`):** Remoção de todas as datas estáticas. Função centralizada `getCurrentDateTime()` com cálculo de intervalos relativos (*hoje*, *amanhã*, *ontem*, *esta semana*, *mês passado*).
- 🧠 **Provedores de IA Desacoplados:** Fábrica multi-modelo respeitando `AI_PROVIDER` e `AI_MODEL`:
  - **Google Gemini (@google/genai):** Padrão `gemini-3.8-flash`, com suporte a texto, documentos e imagens.
  - **OpenRouter Gateway:** Modelos configuráveis via `OPENROUTER_API_KEY`.
  - **OpenAI:** Suporte a `gpt-4o-mini` / `gpt-4o` via `OPENAI_API_KEY`.
  - **Heuristic / Fallback:** Fallback determinístico factual que **nunca inventa dados nem alucina** quando um provedor não está configurado ou a rede falha.
- 🔐 **Confirmação Criptográfica Segura (`PermissionGuard`):** Tokens descartáveis de uso único com hash de 24 bytes, validade de 5 minutos, e validação contra usuário e conversa de origem.
- 🛡️ **Camada de Autenticação (`src/auth/`):** Abstração `AuthProvider`, `DevAuthProvider` com modo de desenvolvimento explícito, e preparação para `SupabaseAuthProvider`. Rotas mutáveis da API protegidas contra acesso anônimo em produção.
- 🔒 **Proteção Sandbox (`TOOL_SANDBOX_ENABLED`):** Execução direta de ferramentas bloqueada em produção (HTTP 403), canalizando execuções através do Orquestrador.
- 📂 **Segurança de Uploads:** Validação rigorosa de arquivos (apenas PNG, JPEG, WEBP e PDF; limite de 10 MB por arquivo e máximo de 4 anexos por turno).
- 🏥 **Health Check Auditável (`GET /api/health`):** Informa o estado real de cada serviço (`ONLINE`, `MOCK`, `OFFLINE`, `NOT_CONFIGURED`), modo de memória (`IN_MEMORY` vs `SUPABASE`) e data/hora atual sem vazar segredos.
- 🧪 **30 Testes Automatizados (Vitest):** Suíte cobrindo data/hora, intenção, contexto conversacional, permissões, expiração de token, memória, autenticação, upload e sanitização de erros.

---

## 🛠️ Tecnologias Utilizadas

- **Framework:** React 19 + TypeScript + Vite 8
- **Estilização:** Tailwind CSS v4 (Design Mobile-First com suporte a modo Escuro e Claro)
- **Servidor:** Express 4 + Node.js (com vite middleware integrado em dev)
- **SDK de IA:** `@google/genai` (v2.4+) + Fetch para OpenRouter / OpenAI
- **PWA:** `vite-plugin-pwa` (Service Worker offline-first e manifesto Web App)
- **Voz:** Web Speech API nativa (Reconhecimento de fala STT e Síntese TTS em `pt-BR`)
- **Testes:** Vitest 5

---

## 📦 Como Executar Localmente

1. **Instale as dependências:**
   ```bash
   npm install
   ```

2. **Configure o ambiente:**
   ```bash
   cp .env.example .env.local
   ```

3. **Execute os testes automatizados:**
   ```bash
   npm test
   ```

4. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
   Acesse: `http://localhost:3000`
