export function assertPlanInput(input, now = new Date()) {
  if (!Number.isInteger(Number(input?.leadId)) || Number(input.leadId) <= 0) throw new Error('Lead obrigatório.');
  if (!Number.isInteger(Number(input?.templateId)) || Number(input.templateId) <= 0) throw new Error('Modelo obrigatório.');
  if (!Number.isInteger(Number(input?.recurrenceDays)) || Number(input.recurrenceDays) <= 0) throw new Error('Cadência inválida.');
  const firstSendAt = new Date(input?.firstSendAt);
  if (Number.isNaN(firstSendAt.getTime()) || firstSendAt <= now) throw new Error('Data inicial deve estar no futuro.');
}

export function computeNextRecurringAt(anchorIso, recurrenceDays, afterIso) {
  const anchor = new Date(anchorIso);
  const after = new Date(afterIso);
  if (Number.isNaN(anchor.getTime()) || Number.isNaN(after.getTime())) {
    throw new Error('Datas de recorrência inválidas.');
  }
  const interval = Number(recurrenceDays) * 86400000;
  if (!Number.isInteger(Number(recurrenceDays)) || interval <= 0) {
    throw new Error('Cadência inválida.');
  }
  let next = new Date(anchor);
  while (next <= after) next = new Date(next.getTime() + interval);
  return formatAtAnchorOffset(next, anchorIso);
}

function formatAtAnchorOffset(date, anchorIso) {
  const offsetMatch = anchorIso.match(/([+-])(\d{2}):(\d{2})$/);
  const isUtc = anchorIso.endsWith('Z');
  const offsetMinutes = offsetMatch
    ? (offsetMatch[1] === '-' ? -1 : 1) * (Number(offsetMatch[2]) * 60 + Number(offsetMatch[3]))
    : 0;
  const localDate = new Date(date.getTime() + offsetMinutes * 60000);
  const pad = (value) => String(value).padStart(2, '0');
  const datePart = [
    localDate.getUTCFullYear(),
    pad(localDate.getUTCMonth() + 1),
    pad(localDate.getUTCDate()),
  ].join('-');
  const timePart = [
    pad(localDate.getUTCHours()),
    pad(localDate.getUTCMinutes()),
    pad(localDate.getUTCSeconds()),
  ].join(':');
  return `${datePart}T${timePart}${isUtc ? 'Z' : anchorIso.slice(-6)}`;
}

export function hasScheduleCollision(oneOffIso, recurringIso, thresholdHours = 48) {
  return Math.abs(new Date(oneOffIso) - new Date(recurringIso)) <= thresholdHours * 3600000;
}

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
