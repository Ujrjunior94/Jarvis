# JARVIS — Núcleo de Assistência Digital (V1)

O **JARVIS** é um assistente pessoal de IA e uma **camada de orquestração modular** projetada para gerenciar e auditar múltiplos ecossistemas independentes por voz, texto e visão multimodal.

Diferente de um chatbot comum, o JARVIS atua como o **núcleo de comando digital**:
- **O Modelo de IA (`AIProvider`)** é o cérebro (desacoplado entre Gemini, OpenRouter, OpenAI ou motor determinístico).
- **As Ferramentas (`src/tools`)** são as mãos (26 ferramentas registradas com validação e retorno estruturado).
- **A Memória (`src/ai/memory`)** é a lembrança (separada em curto prazo, fatos de longo prazo, preferências e histórico).
- **As Integrações (`src/integrations`)** são os sistemas externos que ele acessa sem misturar os códigos-fontes.
- **As Permissões (`READ`, `CONFIRM`, `CRITICAL`)** são os limites de segurança que impedem execuções destrutivas automáticas.

---

## 1. Projetos Orquestrados pelo JARVIS

1. **POSTO ADM** (`https://github.com/Ujrjunior94/Projeto-posto1`)
   - Gerenciamento de posto de combustível: escalas, frentistas, caixas, turnos, férias, folgas e auditoria de inconsistências (ex: interjornada < 11h).
2. **ROTAPLANNER** (`https://github.com/Ujrjunior94/Rotaplanner`)
   - Planejamento e controle de entregas, rotas, ganhos brutos, despesas, consumo de combustível, manutenção preventiva e lucro líquido.
3. **CONTROLE DE GASTOS** *(Preparado para acoplamento futuro)*
   - Módulo financeiro pessoal com interfaces prontas (`consultarGastos`, `registrarGasto`, `editarGasto`, `excluirGasto`, `consultarCategorias`, `calcularSaldo`, `gerarResumoFinanceiro`).

---

## 2. Como Executar o Projeto

### Pré-requisitos
- Node.js 20+
- npm

### Passo a passo

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Configure as variáveis de ambiente copiando `.env.example` para `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

3. Inicie o servidor de desenvolvimento (Express + Vite + PWA na porta 3000):
   ```bash
   npm run dev
   ```

4. Execute a suíte de testes automatizados:
   ```bash
   npm test
   ```

5. Gere a versão de produção:
   ```bash
   npm run build
   npm start
   ```

---

## 3. Documentação Complementar

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — Visão detalhada da arquitetura de orquestração e separação de camadas.
- [`TOOLS.md`](./TOOLS.md) — Catálogo completo das 26 ferramentas, contratos de entrada/saída e níveis de permissão.
- [`INTEGRATIONS.md`](./INTEGRATIONS.md) — Como conectar as APIs reais do Posto ADM, RotaPlanner e Controle de Gastos.
- [`SECURITY.md`](./SECURITY.md) — Governança de permissões (`READ`, `CONFIRM`, `CRITICAL`) e proteção de chaves de API.
- [`ENVIRONMENT.md`](./ENVIRONMENT.md) — Guia de variáveis de ambiente.
- [`ROADMAP.md`](./ROADMAP.md) — Planejamento evolutivo da V1 até a V5.
