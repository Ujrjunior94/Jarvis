# Guia de Integrações Externas (`INTEGRATIONS.md`)

O JARVIS foi construído como uma camada de orquestração. Nenhum código de regra de negócio interna dos outros sistemas reside dentro do núcleo do agente.

## 1. POSTO ADM
- **Repositório Oficial:** `https://github.com/Ujrjunior94/Projeto-posto1`
- **Adapter no JARVIS:** `src/integrations/posto-adm/adapter.ts`
- **Comportamento Atual (V1):** Caso `POSTO_ADM_API_URL` não esteja definida no ambiente, o adapter opera em **Modo MOCK Explícito** (`isMockData: true`), permitindo testar consultas de escala, férias e auditoria de erros na escala.
- **Como Conectar a API Real (V2):** Basta definir `POSTO_ADM_API_URL` e `POSTO_ADM_API_TOKEN` no `.env.local`.

## 2. ROTAPLANNER
- **Repositório Oficial:** `https://github.com/Ujrjunior94/Rotaplanner`
- **Adapter no JARVIS:** `src/integrations/rotaplanner/adapter.ts`
- **Comportamento Atual (V1):** Opera via **Adapter MOCK Explícito** enquanto `ROTAPLANNER_API_URL` estiver vazia, permitindo testar cálculos contextuais ("Quanto ganhei essa semana?", "E descontando combustível?", "E no mês passado?").

## 3. CONTROLE DE GASTOS
- **Status:** Projeto ainda será criado.
- **Adapter no JARVIS:** `src/integrations/gastos/adapter.ts`
- **Comportamento Atual (V1):** Reporta status `NOT_CONFIGURED` (`not_configured` em `/api/health`) e disponibiliza um Sandbox de Validação para testar as travas de permissão `CONFIRM` e `CRITICAL`.

## 4. Tratamento de Indisponibilidade (Sistemas Offline)
Quando qualquer integração estiver offline ou retornar erro de rede (`CONNECTION_ERROR`), o JARVIS:
1. Nunca inventa que "não há funcionários" ou "ganho zero".
2. Responde de forma transparente: *"Não consegui acessar o Posto ADM neste momento."*
3. Você pode testar esse comportamento diretamente no Dashboard clicando em **Simular Offline**.
