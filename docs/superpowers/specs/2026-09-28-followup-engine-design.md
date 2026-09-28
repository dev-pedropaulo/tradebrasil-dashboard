# Follow-ups para Leads da Brasil Trade Agro — Design

**Data:** 2026-09-28  
**Status:** aprovado para planejamento  
**Escopo:** módulo de follow-up no dashboard e execução automatizada pelo n8n/Evolution API.

## Objetivo

Permitir que um operador configure e acompanhe follow-ups automáticos por lead. O sistema envia mensagens recorrentes ou avulsas pela Evolution API, registra cada execução e interrompe o plano conforme a regra escolhida pelo operador.

O escopo não inclui agente conversacional, calendário, IA, simulador de hedge ou recomendação financeira.

## Decisões confirmadas

- A tabela `Leads` permanece como cadastro mestre.
- Cada lead pode ter somente um plano de follow-up ativo.
- A recorrência não tem limite de envios.
- Toda mensagem é texto estático. Não há variáveis de personalização nesta versão.
- O operador escolhe data e horário de cada plano ou mensagem avulsa.
- O fuso é `America/Sao_Paulo`.
- Uma mensagem avulsa não altera a âncora nem a próxima data da recorrência.
- Antes de agendar uma mensagem avulsa, o dashboard alerta se já existir envio recorrente próximo.
- O plano pode ser encerrado manualmente ou, quando selecionado, no primeiro recebimento de mensagem válida do lead.
- Não existe estado de pausa nesta versão.
- Marcar o lead como reunião agendada, ganho, perda ou outro status comercial não encerra automaticamente o plano.
- Falhas de envio devem aparecer no dashboard e ser registradas no histórico. Elas não encerram o plano nem bloqueiam as próximas ocorrências recorrentes.
- O fluxo será preparado para uma instância Evolution API cuja configuração será fornecida posteriormente.
- O dashboard não poderá expor credenciais do NocoDB no navegador.

## Opções consideradas

1. **Manter tudo em `Leads`.** É rápido, mas não suporta histórico, mensagens avulsas, auditoria ou falhas sem sobrecarregar o cadastro.
2. **Usar `Leads` como projeção e tabelas relacionadas para o módulo.** Mantém filtros rápidos no dashboard e registra a operação de forma rastreável. **Esta é a opção escolhida.**
3. **Criar uma base separada para follow-ups.** Aumentaria sincronização e risco de divergência, sem benefício nesta fase.

## Modelo de dados no NocoDB

### Leads (campos acrescentados)

| Campo | Tipo | Uso |
|---|---|---|
| `followup_ativo` | Checkbox | Indica se há plano ativo para filtros e listas |
| `followup_status` | Single select | `ativo`, `falha_de_envio`, `cancelado_manual`, `cancelado_por_resposta` |
| `followup_proximo_envio_em` | DateTime | Próximo envio recorrente previsto |
| `followup_ultimo_envio_em` | DateTime | Último envio bem-sucedido |

Esses campos são uma projeção operacional. A fonte auditável dos detalhes é formada pelas três tabelas abaixo.

### Follow-up Templates

| Campo | Tipo | Uso |
|---|---|---|
| `id` | ID | Identificador |
| `nome` | Texto | Nome interno do modelo |
| `conteudo` | Long text | Texto que será enviado |
| `ativo` | Checkbox | Disponibilidade para novos planos |
| `created_at`, `updated_at` | DateTime | Auditoria |

### Follow-up Schedule

Um registro por plano ativo. O vínculo com `Leads` é obrigatório.

| Campo | Tipo | Uso |
|---|---|---|
| `id` | ID | Identificador |
| `lead` | Link to Leads | Lead atendido |
| `template_padrao` | Link to Follow-up Templates | Texto da recorrência |
| `recorrencia_dias` | Number | Intervalo recorrente em dias |
| `ancora_recorrencia_em` | DateTime | Data/hora inicial que preserva a cadência |
| `proximo_envio_recorrente_em` | DateTime | Próxima recorrência calculada |
| `cancelamento_por_resposta` | Checkbox | Encerra o plano quando o lead responde |
| `status` | Single select | `ativo`, `cancelado_manual`, `cancelado_por_resposta` |
| `created_at`, `updated_at` | DateTime | Auditoria |

### Follow-up Events

Registro imutável de tentativas, mensagens avulsas, cancelamentos e respostas relevantes.

| Campo | Tipo | Uso |
|---|---|---|
| `id` | ID | Identificador |
| `schedule` | Link to Follow-up Schedule | Plano relacionado |
| `lead` | Link to Leads | Projeção para filtros |
| `tipo` | Single select | `recorrente`, `avulso`, `resposta_recebida`, `cancelamento` |
| `status` | Single select | `agendado`, `em_processamento`, `enviado`, `falhou`, `cancelado` |
| `template` | Link to Follow-up Templates | Modelo, quando aplicável |
| `mensagem_snapshot` | Long text | Conteúdo efetivamente programado/enviado |
| `agendado_para` | DateTime | Data/hora do evento |
| `executado_em` | DateTime | Data/hora de conclusão |
| `erro` | Long text | Erro normalizado de envio |
| `provider_message_id` | Texto | Id retornado pela Evolution, quando houver |
| `created_at` | DateTime | Auditoria |

## Fluxo do dashboard

1. A nova aba **Follow-ups** exibe planos ativos, próximos envios, eventos com falha e ações de criação/cancelamento.
2. O operador seleciona um lead com telefone válido e sem plano ativo.
3. Escolhe modelo, primeira data/hora, recorrência em dias e regra de cancelamento.
4. O dashboard cria o plano, atualiza a projeção em `Leads` e exibe a próxima recorrência.
5. O operador pode criar uma mensagem avulsa com data/hora e conteúdo ou modelo.
6. O dashboard compara essa data com a próxima recorrência e mostra alerta sem alterar qualquer data automaticamente.
7. Cancelamento manual encerra o plano, cancela eventos pendentes e atualiza a projeção em `Leads`.
8. Eventos enviados, cancelados e com falha aparecem no detalhe do lead.

## Fluxo do n8n

### Execução programada

Um workflow dedicado roda em intervalo curto e:

1. Busca eventos avulsos `agendado` vencidos.
2. Busca planos ativos com `proximo_envio_recorrente_em` vencido.
3. Reserva cada item como `em_processamento` para evitar duplicidade.
4. Revalida que o plano está ativo.
5. Envia o texto pela Evolution API.
6. Em sucesso, grava o evento como `enviado`, atualiza `followup_ultimo_envio_em` e avança a próxima recorrência a partir da âncora.
7. Em falha, grava `falhou` e a mensagem de erro; mantém o plano ativo e preserva a próxima recorrência subsequente.

### Recebimento de resposta

Um webhook da Evolution API:

1. Ignora mensagens enviadas pela própria empresa, atualizações de entrega/leitura, grupos e eventos técnicos.
2. Localiza o lead pelo telefone normalizado.
3. Registra um evento `resposta_recebida`.
4. Se `cancelamento_por_resposta` estiver marcado e o plano estiver ativo, muda o plano para `cancelado_por_resposta`, cancela eventos pendentes e atualiza `Leads`.

## Segurança e implantação

- A interface React chama somente rotas de servidor do projeto.
- As rotas de servidor usam token NocoDB privado, jamais uma variável `VITE_*`.
- O token exposto no repositório deve ser revogado antes da publicação.
- O painel deve permanecer protegido para operadores autorizados antes de expor qualquer rota que leia ou altere leads.
- A configuração da Evolution API fica em credencial do n8n, não no repositório.
- Variáveis requeridas no ambiente: URL e token privados do NocoDB, identificadores das quatro tabelas e URL/segredo do webhook quando a Evolution for conectada.

## Critérios de aceite

- O operador cria um plano recorrente para um lead com telefone válido.
- Não é possível manter dois planos ativos para o mesmo lead.
- A recorrência preserva sua âncora após uma mensagem avulsa.
- O dashboard alerta sobre proximidade entre envio avulso e recorrente.
- O n8n envia cada ocorrência uma única vez e cria evento de auditoria.
- Uma falha fica visível no dashboard e não cancela o plano.
- Cancelamento manual elimina ocorrências pendentes.
- Uma resposta de lead cancela o plano apenas quando a regra correspondente estiver habilitada.
- Nenhuma credencial NocoDB é enviada ao navegador.
