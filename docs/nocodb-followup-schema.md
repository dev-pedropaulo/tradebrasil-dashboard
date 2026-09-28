# Estrutura NocoDB — Follow-ups

O NocoDB continua sendo a fonte de dados. A aplicação da Vercel usa somente a API privada do servidor; nenhum token é enviado ao navegador.

## 1. Complemente a tabela existente `Leads`

Mantenha todos os campos atuais. Crie apenas estas projeções, que facilitam filtros e indicadores no dashboard:

| Campo | Tipo NocoDB | Valor |
| --- | --- | --- |
| `followup_ativo` | Checkbox | `true` enquanto houver uma agenda ativa |
| `followup_status` | Single line text | `ativo`, `cancelado`, `falhou` |
| `followup_proximo_envio_em` | DateTime | Próximo disparo recorrente |
| `followup_ultimo_envio_em` | DateTime | Último envio entregue ao provedor |

Não apague ou renomeie `Id`, `nome` e `telefone`: eles são a chave da integração.

## 2. Crie `Follow-up Templates`

| Campo | Tipo |
| --- | --- |
| `nome` | Single line text |
| `mensagem` | Long text |
| `ativo` | Checkbox |
| `criado_em` | DateTime |
| `atualizado_em` | DateTime |

Os textos são estáticos nesta primeira versão; não cadastrar variáveis de template.

## 3. Crie `Follow-up Schedule`

| Campo | Tipo |
| --- | --- |
| `lead_id` | Number |
| `template_id` | Number |
| `status` | Single line text: `ativo`, `cancelado` |
| `recorrencia_dias` | Number |
| `primeiro_envio_em` | DateTime |
| `proximo_envio_em` | DateTime |
| `cancelamento_por_resposta` | Checkbox |
| `cancelado_em` | DateTime |
| `criado_em` | DateTime |
| `atualizado_em` | DateTime |

Regra de operação: existir no máximo uma linha com `status = ativo` para cada `lead_id`.

## 4. Crie `Follow-up Events`

| Campo | Tipo |
| --- | --- |
| `schedule_id` | Number |
| `lead_id` | Number |
| `template_id` | Number |
| `tipo` | Single line text: `recorrente`, `avulso`, `cancelamento_manual`, `cancelamento_resposta` |
| `status` | Single line text: `agendado`, `pendente`, `enviado`, `falhou`, `concluido` |
| `agendado_para` | DateTime |
| `executado_em` | DateTime |
| `mensagem` | Long text |
| `erro` | Long text |
| `origem` | Single line text |
| `provedor_mensagem_id` | Single line text |
| `criado_em` | DateTime |

## 5. Configure a Vercel

Copie os IDs das quatro tabelas no NocoDB e preencha as variáveis indicadas em [`.env.example`](../.env.example). Use um token NocoDB novo, exclusivo e privado; o token que existia no código deve ser revogado antes do deploy.

Ative a proteção de acesso do deployment na Vercel antes de publicar o dashboard: a aplicação não possui um sistema próprio de contas nesta versão.
