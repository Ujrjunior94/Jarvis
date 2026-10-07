# Variáveis de Ambiente (`ENVIRONMENT.md`)

Crie um arquivo `.env.local` na raiz do projeto com base no `.env.example`. Nenhuma chave secreta deve ser comitada no Git.

| Variável | Obrigatória na V1? | Descrição |
| :--- | :---: | :--- |
| `AI_PROVIDER` | Não (Padrão: `gemini`) | Define o provedor de IA (`gemini`, `openrouter`, `openai`, `heuristic`). |
| `AI_MODEL` | Não (Padrão: `gemini-3.8-flash`) | Nome do modelo utilizado pelo provedor ativo. |
| `GEMINI_API_KEY` | Opcional (Possui fallback estruturado) | Chave da API Google Gemini (`@google/genai`) no servidor. |
| `OPENROUTER_API_KEY` | Não | Chave de API para uso com OpenRouter. |
| `AI_API_KEY` | Não | Chave genérica para provedores compatíveis com OpenAI. |
| `SUPABASE_URL` | Não | URL do projeto Supabase para persistência PostgreSQL. |
| `SUPABASE_ANON_KEY` | Não | Chave de serviço/anônima do Supabase. |
| `POSTO_ADM_API_URL` | Não (Usa Mock se vazio) | Endpoint base da API do sistema Posto ADM. |
| `ROTAPLANNER_API_URL` | Não (Usa Mock se vazio) | Endpoint base da API do sistema RotaPlanner. |
| `CONTROLE_GASTOS_API_URL` | Não (Preparado para V3) | Endpoint futuro do sistema Controle de Gastos. |
