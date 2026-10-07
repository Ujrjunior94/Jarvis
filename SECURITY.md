# Política de Segurança e Permissões (`SECURITY.md`)

## 1. Níveis de Permissão de Ferramentas

Toda ferramenta no JARVIS possui obrigatoriamente um dos três níveis definidos em `ToolPermission`:

1. **`READ`**:
   - Operações puramente de leitura e análise sem impacto colateral no sistema (ex: `consultarEscala`, `consultarGanhos`, `consultarGastos`, `analisarEscala`).
   - Execução imediata autorizada.

2. **`CONFIRM`**:
   - Operações que alteram dados operacionais ou validam processos importantes (ex: `validarEscala`, `registrarGasto`, `editarGasto`).
   - Requer aprovação explícita do usuário via modal, botão na interface ou resposta verbal ("sim", "confirmo", "autorizo").

3. **`CRITICAL`**:
   - Ações destrutivas com perda irrecuperável de dados (ex: `excluirGasto`).
   - O orquestrador bloqueia a execução direta e emite uma solicitação de confirmação com resumo do impacto e token criptográfico temporário.

---

## 2. Tokens de Confirmação (`PermissionGuard`)

Cada solicitação de confirmação gerada possui:
- **Token seguro:** gerado com 24 bytes de entropia aleatória (`crypto.randomBytes(24)`).
- **Validade Temporal:** TTL estrito de 5 minutos (`expiresAt`). Tokens após esse período são rejeitados com código `EXPIRED`.
- **Uso Único:** o token é destruído no momento da confirmação. Qualquer tentativa subsequente é rejeitada como `REUSED`.
- **Vínculo de Conversa e Usuário:** o token só pode ser consumido pela mesma conversa (`conversationId`) e mesmo usuário (`userId`) onde foi solicitado.
- **Cancelamento:** suporte a cancelamento explícito antes do consumo.

---

## 3. Proteção do Endpoint `/api/tools` (`TOOL_SANDBOX_ENABLED`)

- A execução arbitrária direta de ferramentas através de `POST /api/tools` é restrita por `TOOL_SANDBOX_ENABLED`.
- Quando `TOOL_SANDBOX_ENABLED=false` (padrão em produção), o endpoint retorna HTTP 403 Forbidden.
- Todas as operações legítimas devem fluir pelo fluxo do Orquestrador:
  `Usuário -> Autenticação -> Intent Engine -> PermissionGuard -> ToolRegistry -> Tool`.

---

## 4. Segurança de Uploads e Arquivos

- **MIME Types Permitidos:** `image/png`, `image/jpeg`, `image/webp`, `application/pdf`.
- **Tamanho Máximo por Arquivo:** 10 MB (10.485.760 bytes).
- **Limite por Mensagem:** máximo de 4 arquivos simultâneos.
- Arquivos que violem essas diretrizes são rejeitados antes de qualquer processamento de IA.

---

## 5. Tratamento de Erros e Prevenção de Vazamento de Segredos

- Nenhuma stack trace ou caminho interno de arquivo é exposto ao cliente.
- O sanitizador de erros (`sanitizeErrorMessage`) mascara automaticamente:
  - Chaves de API (`AIza...`, `sk-...`) -> `[REDACTED_API_KEY]`
  - Tokens Bearer -> `Bearer [REDACTED_TOKEN]`
  - Caminhos de arquivos no servidor -> `[INTERNAL_PATH]`
- Todas as respostas de erro seguem o padrão estruturado:
  ```json
  {
    "success": false,
    "error": {
      "category": "AUTH_ERROR",
      "message": "Mensagem amigável e segura",
      "timestamp": "2026-10-07T07:00:00.000-03:00"
    }
  }
  ```
