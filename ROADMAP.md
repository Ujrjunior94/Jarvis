# Roadmap Evolutivo do JARVIS (`ROADMAP.md`)

## V1 — Fundação do Núcleo de Assistência Digital (Concluída)
- [x] Interface responsiva Mobile-First com suporte a modo claro e escuro
- [x] Chat com contexto conversacional e sugestões rápidas
- [x] Orquestrador de Agente com separação entre interpretação, execução e resposta final
- [x] Camada `AIProvider` desacoplada (Gemini, OpenRouter, Motor Estruturado Local)
- [x] 26 ferramentas registradas com contratos tipados e validação
- [x] Adapters MOCK desacoplados para Posto ADM e RotaPlanner + estrutura Controle de Gastos
- [x] Arquitetura de Memória (Curto prazo, Fatos de longo prazo, Preferências, Logs de ferramentas)
- [x] Sistema de Permissões em 3 níveis (`READ`, `CONFIRM`, `CRITICAL`) com fluxo de confirmação
- [x] PWA instalável com manifesto, ícones PNG/SVG e Service Worker

## V2 — Integrações em Produção & Voz Contínua
- [ ] Conexão HTTP real com a API de produção do **Posto ADM**
- [ ] Conexão HTTP real com a API de produção do **RotaPlanner**
- [ ] Persistência da memória em banco PostgreSQL / Supabase
- [ ] Conversação por voz contínua de baixa latência

## V3 — Controle de Gastos & Visão Multimodal Avançada
- [ ] Integração com o repositório oficial do **Controle de Gastos**
- [ ] Extração automática de tabelas de escala a partir de fotos e PDFs via modelo de visão
- [ ] Consulta de informações em tempo real na internet e geração de relatórios em PDF/CSV

## V4 — Automações & Canais Externos
- [ ] Integração com WhatsApp e Telegram para alertas proativos
- [ ] Tarefas agendadas (cron jobs para fechamento semanal do RotaPlanner e auditoria diária do Posto ADM)
- [ ] Notificações push no Android/iOS

## V5 — Agente Autônomo & Fluxos Multi-Sistema
- [ ] Execução de fluxos complexos cruzando múltiplos sistemas (ex: sincronizar automaticamente despesas de combustível do RotaPlanner no Controle de Gastos após aprovação)
- [ ] Controle avançado de automações de desktop e navegador
