# Variáveis de Ambiente (`ENVIRONMENT.md`)

Copie o arquivo `.env.example` para `.env.local` e configure conforme seu ambiente.

| Variável | Padrão | Descrição |
| :--- | :---: | :--- |
| `NODE_ENV` | `development` | Ambiente de execução (`development` ou `production`). Em produção, a autenticação de rotas e o bloqueio de sandbox são ativados. |
| `PORT` | `3000` | Porta local do servidor. |
| `APP_URL` | `http://localhost:3000` | URL pública da aplicação. |
| `AI_PROVIDER` | `gemini` | Provedor de IA ativo (`gemini`, `openrouter`, `openai`, `heuristic`). |
| `AI_MODEL` | `gemini-3.8-flash` | Modelo do provedor selecionado. |
| `GEMINI_API_KEY` | *(Vazio)* | Chave de API do Google Gemini. |
| `OPENROUTER_API_KEY` | *(Vazio)* | Chave de API do OpenRouter Gateway. |
| `OPENAI_API_KEY` | *(Vazio)* | Chave de API da OpenAI. |
| `TOOL_SANDBOX_ENABLED` | `true` (dev) / `false` (prod) | Permite ou bloqueia execução direta de ferramentas via `POST /api/tools`. |
| `AUTH_PROVIDER` | `development` | Provedor de autenticação (`development` ou `supabase`). |
| `JARVIS_API_KEY` | *(Vazio)* | Token Bearer opcional para proteção de API em desenvolvimento/produção. |
| `SUPABASE_URL` | *(Vazio)* | URL do projeto Supabase para persistência de memória e auth. |
| `SUPABASE_ANON_KEY` | *(Vazio)* | Chave pública do Supabase. |
| `DATABASE_URL` | *(Vazio)* | Connection string PostgreSQL (quando aplicável). |
| `POSTO_ADM_API_URL` | *(Vazio)* | URL base da API do Posto ADM (vazio = operando em MOCK). |
| `POSTO_ADM_API_TOKEN` | *(Vazio)* | Token de autenticação da API do Posto ADM. |
| `ROTAPLANNER_API_URL` | *(Vazio)* | URL base da API do RotaPlanner (vazio = operando em MOCK). |
| `ROTAPLANNER_API_TOKEN` | *(Vazio)* | Token de autenticação da API do RotaPlanner. |
| `CONTROLE_GASTOS_API_URL`| *(Vazio)* | URL base da API do Controle de Gastos (projeto futuro). |
| `CONTROLE_GASTOS_API_TOKEN`| *(Vazio)* | Token de autenticação da API do Controle de Gastos. |
