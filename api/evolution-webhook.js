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
    const schedule = schedules.find((item) => (
      Number(item.lead_id) === recordId(lead)
      && item.status === 'ativo'
      && (item.cancelamento_por_resposta === true || item.cancelamento_por_resposta === 1 || item.cancelamento_por_resposta === 'true')
    ));
    if (!schedule) return res.status(200).json({ ignored: true, reason: 'manual_cancellation_only' });

    const now = new Date().toISOString();
    await updateRecord('schedules', recordId(schedule), {
      status: 'cancelado',
      cancelado_em: now,
      atualizado_em: now,
    });
    await updateRecord('leads', recordId(lead), leadFollowupProjection(schedule, false));
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
    return res.status(200).json({ cancelled: true, scheduleId: recordId(schedule) });
  } catch (error) {
    console.error('Evolution webhook error', error);
    if (error instanceof NocoDBConfigurationError) {
      return res.status(503).json({ error: 'A integração privada do NocoDB ainda não foi configurada.' });
    }
    return res.status(500).json({ error: 'Falha ao processar a resposta do lead.' });
  }
}
