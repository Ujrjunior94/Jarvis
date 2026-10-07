# Catálogo de Ferramentas do JARVIS (`TOOLS.md`)

O JARVIS possui 24 ferramentas contratualizadas e tipadas sob a interface `Tool<TInput, TOutput>`, divididas em 4 domínios:

---

## 1. POSTO ADM (`posto-adm`) — 8 Ferramentas

| Ferramenta | Permissão | Descrição |
| :--- | :---: | :--- |
| `consultarEscala` | `READ` | Consulta funcionários escalados para uma data e turno no Posto ADM. |
| `consultarFuncionarios` | `READ` | Lista colaboradores do posto, cargos e status ativo. |
| `consultarTurnos` | `READ` | Consulta horários e regras dos turnos operacionais. |
| `consultarFerias` | `READ` | Consulta férias ativas e programadas da equipe. |
| `consultarFolgas` | `READ` | Retorna funcionários em folga e motivos para uma data. |
| `consultarInformacoesPosto` | `READ` | Retorna dados cadastrais, bombas ativas e ilhas. |
| `analisarEscala` | `READ` | Audita inconsistências, dobras e intervalos interjornada (score 0-100). |
| `validarEscala` | `CONFIRM` | Homologa alterações ou confirma conformidade operacional. |

---

## 2. ROTAPLANNER (`rotaplanner`) — 9 Ferramentas

| Ferramenta | Permissão | Descrição |
| :--- | :---: | :--- |
| `consultarGanhos` | `READ` | Consulta faturamento bruto, entregas concluídas e km rodados por período. |
| `consultarDespesas` | `READ` | Retorna detalhamento de despesas operacionais da rota. |
| `consultarCombustivel`| `READ` | Detalha gastos, consumo médio (km/L) e custo por km rodado. |
| `consultarRotas` | `READ` | Consulta paradas, tempos e status de rotas planejadas. |
| `consultarEntregas` | `READ` | Consulta pacotes entregues e taxa de pontualidade. |
| `consultarManutencao`| `READ` | Histórico e previsões de revisões do veículo. |
| `calcularLucro` | `READ` | Calcula lucro líquido e suporta o modo de desconto de combustível. |
| `analisarDesempenho` | `READ` | Diagnóstico de eficiência, melhor dia e recomendações financeiras. |
| `analisarRotas` | `READ` | Avalia tráfego, janelas de entrega e densidade por parada. |

---

## 3. CONTROLE DE GASTOS (`controle-gastos`) — 7 Ferramentas

| Ferramenta | Permissão | Descrição |
| :--- | :---: | :--- |
| `consultarGastos` | `READ` | Lista despesas pessoais e categorias. |
| `registrarGasto` | `CONFIRM` | Registra novo gasto no orçamento com confirmação. |
| `editarGasto` | `CONFIRM` | Atualiza valores ou categorias existentes com confirmação. |
| `excluirGasto` | `CRITICAL`| Operação destrutiva que exige token criptográfico único. |
| `consultarCategorias`| `READ` | Lista categorias de despesa e percentuais orçamentários. |
| `calcularSaldo` | `READ` | Compara receitas versus despesas e taxa de poupança. |
| `gerarResumoFinanceiro`| `READ`| Relatório financeiro consolidado do usuário. |

---

## 4. SISTEMA (`system`) — 1 Ferramenta

| Ferramenta | Permissão | Descrição |
| :--- | :---: | :--- |
| `consultarProjetosSistema` | `READ` | Lista todos os projetos conectados à camada de orquestração do JARVIS. |
