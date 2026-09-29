import { parseInboundEvolutionMessage } from './_lib/evolutionInbound.js';
import { leadFollowupProjection, normalizePhone } from './_lib/followupRecords.js';
import { NocoDBConfigurationError, createRecord, listRecords, updateRecord } from './_lib/nocodb.js';

function recordId(record) {
  return Number(record?.Id ?? record?.id);
}

function unauthorized(res) {
  return res.status(401).json({ error: 'Webhook não autorizado.' });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
  const secret = process.env.EVOLUTION_WEBHOOK_SECRET;
  if (!secret) return res.status(503).json({ error: 'Webhook da Evolution ainda não foi configurado.' });
  if (req.headers['x-evolution-webhook-secret'] !== secret) return unauthorized(res);

  try {
    const inbound = parseInboundEvolutionMessage(req.body);
    if (!inbound) return res.status(200).json({ ignored: true });

    const [leads, schedules, events] = await Promise.all([
      listRecords('leads'),
      listRecords('schedules'),
      listRecords('events'),
    ]);
    if (inbound.providerMessageId && events.some((event) => event.provedor_mensagem_id === inbound.providerMessageId)) {
      return res.status(200).json({ duplicate: true });
    }
    const lead = leads.find((item) => normalizePhone(item.telefone) === inbound.phone);
    if (!lead) return res.status(200).json({ ignored: true, reason: 'lead_not_found' });
    const now = new Date().toISOString();

    // 1. Sempre atualiza a data da última resposta no cadastro do Lead
    await updateRecord('leads', recordId(lead), { followup_ultima_resposta_em: now });

    const schedule = schedules.find((item) => (
      Number(item.lead_id) === recordId(lead)
      && item.status === 'ativo'
      && (item.cancelamento_por_resposta === true || item.cancelamento_por_resposta === 1 || item.cancelamento_por_resposta === 'true')
    ));
    if (!schedule) {
      return res.status(200).json({ acknowledged: true, updatedLead: true, reason: 'manual_cancellation_only' });
    }

    // 2. Cancela o schedule recorrente
    await updateRecord('schedules', recordId(schedule), {
      status: 'cancelado',
      cancelado_em: now,
      atualizado_em: now,
    });

    // 3. Atualiza projeção do lead como respondido
    await updateRecord('leads', recordId(lead), {
      ...leadFollowupProjection(schedule, false),
      followup_status: 'respondido',
      followup_ultima_resposta_em: now,
    });

    // 4. Cancela eventos agendados futuros deste lead para não disparar após a resposta
    const pendingEvents = events.filter((e) => Number(e.lead_id) === recordId(lead) && e.status === 'agendado');
    for (const pending of pendingEvents) {
      await updateRecord('events', recordId(pending), {
        status: 'cancelado',
        erro: 'Cancelado automaticamente por resposta recebida do lead.',
        executado_em: now,
      });
    }

    // 5. Registra o evento de auditoria
    await createRecord('events', {
      schedule_id: recordId(schedule),
      lead_id: recordId(lead),
      template_id: Number(schedule.template_id),
      tipo: 'cancelamento_resposta',
      status: 'concluido',
      executado_em: now,
      origem: 'evolution-webhook',
      provedor_mensagem_id: inbound.providerMessageId,
      criado_em: now,
    });

    return res.status(200).json({ cancelled: true, scheduleId: recordId(schedule), leadId: recordId(lead) });
  } catch (error) {
    console.error('Evolution webhook error', error);
    if (error instanceof NocoDBConfigurationError) {
      return res.status(503).json({ error: 'A integração privada do NocoDB ainda não foi configurada.' });
    }
    return res.status(500).json({ error: 'Falha ao processar a resposta do lead.' });
  }
}
