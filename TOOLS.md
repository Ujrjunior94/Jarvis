# Catálogo de Ferramentas do JARVIS (`TOOLS.md`)

Todas as ferramentas seguem o contrato estrito `Tool<TInput, TOutput>` definido em `src/types/jarvis.ts`, possuindo:
- `name`, `description`, `project`, `permission` (`READ` | `CONFIRM` | `CRITICAL`)
- `parameters` e função `validate(input)`
- `execute(input, context)` retornando `ToolResult<TOutput>` padronizado com flag `isMock`.

---

## 1. Ferramentas do POSTO ADM (`src/tools/posto/index.ts`)

| Ferramenta | Permissão | Descrição |
| :--- | :---: | :--- |
| `consultarEscala` | `READ` | Consulta os profissionais escalados por data (`YYYY-MM-DD`) e turno (`manha`, `tarde`, `noite`, `all`). |
| `consultarFuncionarios` | `READ` | Lista o quadro de funcionários, cargos (Frentista, Caixa, Chefe de Pista, Lubrificador) e status. |
| `consultarTurnos` | `READ` | Retorna os turnos configurados (06h-14h, 14h-22h, 22h-06h) e efetivo mínimo exigido. |
| `consultarFerias` | `READ` | Lista colaboradores em férias atualmente e próximas férias programadas. |
| `consultarFolgas` | `READ` | Consulta folgas (DSR) do dia e escala semanal de folgas. |
| `consultarInformacoesPosto` | `READ` | Retorna dados operacionais da unidade (bombas, bicos, combustíveis, repositório). |
| `analisarEscala` | `READ` | Audita a escala procurando conflitos trabalhistas (interjornada < 11h CLT) e furos de cobertura. |
| `validarEscala` | `CONFIRM` | Homologa ou registra alteração na escala após confirmação explícita do usuário. |

---

## 2. Ferramentas do ROTAPLANNER (`src/tools/rota/index.ts`)

| Ferramenta | Permissão | Descrição |
| :--- | :---: | :--- |
| `consultarGanhos` | `READ` | Retorna ganho bruto total, entregas e km rodados (`hoje`, `semana`, `mes_passado`). |
| `consultarDespesas` | `READ` | Lista despesas operacionais (combustível, manutenção, alimentação). |
| `consultarCombustivel` | `READ` | Detalha gasto com combustível, litros abastecidos, média km/L e custo por km. |
| `consultarRotas` | `READ` | Lista rotas planejadas e concluídas com paradas, distância e tempo. |
| `consultarEntregas` | `READ` | Estatísticas de entregas no prazo e últimos clientes atendidos. |
| `consultarManutencao` | `READ` | Odômetro atual, histórico de oficina e alertas de revisão preventiva. |
| `calcularLucro` | `READ` | Calcula o lucro líquido total ou o saldo descontando especificamente o combustível. |
| `analisarDesempenho` | `READ` | Avalia margem líquida, lucro por km, melhor dia da semana e recomendações. |
| `analisarRotas` | `READ` | Identifica gargalos de tráfego e sugere otimização de sequência de paradas. |

---

## 3. Ferramentas do CONTROLE DE GASTOS (`src/tools/gastos/index.ts`)

| Ferramenta | Permissão | Descrição |
| :--- | :---: | :--- |
| `consultarGastos` | `READ` | Consulta despesas pessoais registradas no módulo preparado. |
| `registrarGasto` | `CONFIRM` | Registra novo gasto após confirmação do usuário. |
| `editarGasto` | `CONFIRM` | Atualiza valor, descrição ou categoria de um gasto após confirmação. |
| `excluirGasto` | `CRITICAL` | Exclui permanentemente uma despesa. **Nunca executa sem confirmação explícita.** |
| `consultarCategorias` | `READ` | Lista categorias financeiras disponíveis. |
| `calcularSaldo` | `READ` | Calcula saldo disponível frente às despesas registradas. |
| `gerarResumoFinanceiro` | `READ` | Consolida indicadores financeiros e status da futura integração. |
