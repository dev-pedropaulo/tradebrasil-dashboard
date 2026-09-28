# Runner n8n — Follow-ups TradeBrasil

Crie este workflow separado do `AGENTE SDR - TRADE BRASIL`; não altere o agente SDR nem o seu banco PostgreSQL. Nome sugerido: `FOLLOW-UP | TradeBrasil | Runner`.

Deixe-o **inativo** até que as quatro tabelas da [estrutura NocoDB](./nocodb-followup-schema.md) existam, os IDs estejam preenchidos e a instância correta da Evolution seja confirmada.

## Credenciais

- Reutilize a credencial NocoDB da base `TradeBrasil` já disponível no n8n.
- Selecione explicitamente a credencial/instância Evolution que pertence a este cliente. Não reutilize uma instância de outro cliente sem confirmar o nome dela.
- Configure o fuso do workflow como `America/Sao_Paulo`.

## Fluxo de disparo (a cada 1 minuto)

1. **Schedule Trigger** — intervalo de 1 minuto, timezone `America/Sao_Paulo`.
2. **NocoDB / Follow-up Events / Search** — retorne apenas `status = agendado` e `agendado_para <= agora`.
3. **Loop Over Items** — lote de 1; não force itens vazios.
4. **NocoDB / Leads / Search** — localize pelo `Id` do campo `lead_id` do evento. Valide que o telefone é brasileiro antes de enviar.
5. **Evolution API / Send Text** — `remoteJid` recebe `telefone`; `messageText` recebe a `mensagem` do evento. A mensagem é texto estático.
6. **NocoDB / Follow-up Events / Update** — em sucesso: `status = enviado`, `executado_em = agora`, e salve o id retornado pelo provedor em `provedor_mensagem_id` quando disponível.
7. Para evento `recorrente`, **NocoDB / Follow-up Schedule / Update**: mantenha `primeiro_envio_em`, calcule `proximo_envio_em = próximo ciclo` a partir da cadência, e crie um novo evento `recorrente` com status `agendado` para esse horário.
8. **NocoDB / Leads / Update** — atualize `followup_ultimo_envio_em` e `followup_proximo_envio_em`.

Use a saída de erro do nó Evolution: em falha, atualize o evento para `status = falhou`, grave `erro` e `executado_em`. Não cancele o schedule e não interrompa os ciclos seguintes.

## Regras que o runner não pode violar

- Uma mensagem `avulso` é enviada somente no seu horário e não altera `primeiro_envio_em`, `recorrencia_dias` ou `proximo_envio_em` do schedule.
- Se o schedule estiver com `status = cancelado`, o evento deve ser ignorado e marcado como concluído/cancelado, sem envio.
- Não crie uma nova agenda quando a falha for de entrega.
- O workflow deve ser idempotente: antes de enviar, recarregue o evento e só prossiga se ele ainda estiver `agendado`.
- A URL do webhook da Evolution deve apontar para `/api/evolution-webhook` do dashboard, enviando somente eventos de mensagem recebida. Envie no header `x-evolution-webhook-secret` o mesmo valor privado de `EVOLUTION_WEBHOOK_SECRET` da Vercel.

## Teste de aceite

1. Crie um template e um schedule para o telefone de teste.
2. Defina o primeiro envio para dois minutos à frente.
3. Confirme `enviado` em `Follow-up Events`, o próximo ciclo calculado e a projeção atualizada em `Leads`.
4. Programe um `avulso` próximo do ciclo e confira o alerta de 48h; o próximo ciclo recorrente deve permanecer igual.
5. Teste a resposta do lead com `cancelamento_por_resposta` marcado e desmarcado.
6. Teste uma falha de Evolution e confira que ela aparece no dashboard sem cancelar o schedule.
