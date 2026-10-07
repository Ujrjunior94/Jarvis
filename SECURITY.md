# Política de Segurança e Permissões (`SECURITY.md`)

## 1. Níveis de Permissão de Ferramentas

Toda ferramenta no JARVIS possui obrigatoriamente um dos três níveis definidos em `ToolPermission`:

1. **`READ`**:
   - Operações puramente de consulta ou análise (ex: `consultarEscala`, `consultarGanhos`, `analisarEscala`).
   - Executadas imediatamente pelo orquestrador.

2. **`CONFIRM`**:
   - Operações que criam ou alteram registros (ex: `registrarGasto`, `editarGasto`, `validarEscala`).
   - O JARVIS interrompe a execução automática, gera um `confirmationToken` no `PermissionGuard` e solicita aprovação ao usuário.

3. **`CRITICAL`**:
   - Operações destrutivas ou irreversíveis (ex: `excluirGasto`).
   - O JARVIS **nunca** executa automaticamente. Primeiro localiza o registro afetado, apresenta os detalhes exatos (*"Encontrei a despesa de R$ 85,00 registrada em combustível. Deseja realmente excluir?"*) e aguarda confirmação explícita via botão ou comando.

## 2. Proteção de Segredos e Chaves de API

- **Backend-Only Secrets**: Chaves como `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, `SUPABASE_ANON_KEY`, `POSTO_ADM_API_TOKEN` e `ROTAPLANNER_API_TOKEN` são acessadas exclusivamente no servidor (`server.ts` / `src/api/routes.ts`).
- **Zero Exposição no Frontend**: A página de Configurações permite alternar provedores e preferências, mas jamais exibe ou trafega chaves secretas para o navegador.
- **Sanitização de Logs**: O módulo `src/lib/logger.ts` mascara automaticamente qualquer propriedade cujo nome contenha `key`, `token`, `secret` ou `password` com `[REDACTED]`.
