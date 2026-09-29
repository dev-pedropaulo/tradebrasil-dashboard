const BRAZIL_E164_LENGTHS = new Set([12, 13]);

export function normalizePhone(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  if (digits.length === 10 || digits.length === 11) {
    digits = `55${digits}`;
  }
  return digits;
}

export function isValidLeadPhone(value) {
  const phone = normalizePhone(value);
  return phone.startsWith('55') && BRAZIL_E164_LENGTHS.has(phone.length);
}

export function toScheduleRecord({
  leadId,
  templateId,
  recurrenceDays,
  firstSendAt,
  cancelOnLeadReply,
}) {
  return {
    lead_id: Number(leadId),
    template_id: Number(templateId),
    recorrencia_dias: Number(recurrenceDays),
    primeiro_envio_em: firstSendAt,
    proximo_envio_em: firstSendAt,
    cancelamento_por_resposta: Boolean(cancelOnLeadReply),
    status: 'ativo',
    criado_em: new Date().toISOString(),
  };
}

export function leadFollowupProjection(schedule, active) {
  return active
    ? {
      followup_ativo: true,
      followup_status: 'ativo',
      followup_proximo_envio_em: schedule.proximo_envio_em,
      followup_ultimo_envio_em: null,
    }
    : {
      followup_ativo: false,
      followup_status: 'cancelado',
      followup_proximo_envio_em: null,
    };
}

export function toEventRecord({ scheduleId, leadId, templateId, type, scheduledFor, message, source = 'dashboard' }) {
  return {
    schedule_id: Number(scheduleId),
    lead_id: Number(leadId),
    template_id: Number(templateId),
    tipo: type,
    status: 'agendado',
    agendado_para: scheduledFor,
    mensagem: message,
    origem: source,
    criado_em: new Date().toISOString(),
  };
}
