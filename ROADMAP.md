# Roadmap Evolutivo do JARVIS (`ROADMAP.md`)

## V1 — Fundação do Núcleo de Assistência Digital (Concluída)
- [x] Interface responsiva Mobile-First com suporte a modo claro e escuro
- [x] Chat com contexto conversacional e sugestões rápidas
- [x] Arquitetura de IA desacoplada com suporte multi-fornecedor
- [x] Adapters desacoplados para Posto ADM, RotaPlanner e Controle de Gastos em modo MOCK
- [x] Catálogo com 24 ferramentas tipadas com validação de input
- [x] Sistema de logs de auditoria e guarda de permissões
- [x] PWA offline-first com instalação e Web Speech API

---

## V1.1 — Estabilização, Segurança e Prontidão para Produção (Concluída)
- [x] **Data e Hora Dinâmica:** Módulo centralizado `getCurrentDateTime()` no fuso horário `America/Bahia`, com cálculo de períodos relativos (*hoje*, *amanhã*, *ontem*, *esta semana*, *mês passado*).
- [x] **Confirmação Criptográfica Segura:** Tokens de uso único (`PermissionGuard`) com hash de 24 bytes, validade estrita de 5 minutos, e vínculo obrigatório com usuário e conversa de origem.
- [x] **Camada de Autenticação (`src/auth/`):** Interface `AuthProvider`, modo `DEVELOPMENT` explícito e proteção das rotas mutáveis em produção.
- [x] **Proteção Sandbox (`TOOL_SANDBOX_ENABLED`):** Bloqueio de chamadas diretas arbitrárias de ferramentas em produção.
- [x] **Provedor de IA Resiliente:** Suporte verificado para Gemini (`@google/genai`), OpenRouter, OpenAI e fallback determinístico factual (`HeuristicProvider`) sem alucinações.
- [x] **Segurança de Uploads:** Validação estrita de MIME types (PNG, JPEG, WEBP, PDF), limites de 10 MB por arquivo e máximo de 4 anexos.
- [x] **Tratamento e Sanitização de Erros:** Erros categorizados sem vazamento de segredos, tokens ou caminhos internos.
- [x] **Health Check Auditável (`GET /api/health`):** Estados reais de cada ecossistema (`ONLINE`, `MOCK`, `OFFLINE`, `NOT_CONFIGURED`) e modo de memória.
- [x] **Suíte Vitest Expandida:** 30 testes unitários e de integração cobrindo todas as áreas críticas.

---

## V2 — Conexão com Sistemas Reais (Próxima Etapa)
- [ ] Conexão do adaptador Posto ADM com a API real do repositório `Projeto-posto1`
- [ ] Conexão do adaptador RotaPlanner com a API real do repositório `Rotaplanner`
- [ ] Implementação do sistema externo de Controle de Gastos e apontamento de URL

---

## V3 — Banco Persistente & Memória Semântica
- [ ] Conexão ativa com Supabase / PostgreSQL em produção
- [ ] Vetorização de histórico com embeddings para memória de longo prazo
- [ ] Sincronização multi-dispositivo em tempo real

---

## V4 — Voz Avançada & Live Streaming
- [ ] Integração com Gemini Live API para conversa contínua por áudio bidirecional
- [ ] Suporte a comandos de voz em segundo plano (background wake word)

---

## V5 — Automação Proativa & Notificações
- [ ] Alertas proativos de incongruências em escalas antes do início do turno
- [ ] Relatórios automatizados diários e semanais de rentabilidade
- [ ] Previsão de manutenção de veículos baseada em quilometragem diária média
