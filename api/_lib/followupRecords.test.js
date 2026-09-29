import { describe, expect, it } from 'vitest';
import { isValidLeadPhone, toEventRecord, toScheduleRecord } from './followupRecords.js';

describe('follow-up records', () => {
  it('accepts Brazilian phones with or without 55 DDI prefix', () => {
    expect(isValidLeadPhone('+55 (43) 99999-0000')).toBe(true);
    expect(isValidLeadPhone('(43) 99999-0000')).toBe(true);
    expect(isValidLeadPhone('43999990000')).toBe(true);
    expect(isValidLeadPhone('999990000')).toBe(false);
    expect(isValidLeadPhone('')).toBe(false);
  });

  it('serializes a recurring schedule with the response cancellation choice', () => {
    expect(toScheduleRecord({
      leadId: 8,
      templateId: 4,
      recurrenceDays: 30,
      firstSendAt: '2026-10-05T09:00:00-03:00',
      cancelOnLeadReply: true,
    })).toMatchObject({
      lead_id: 8,
      template_id: 4,
      recorrencia_dias: 30,
      primeiro_envio_em: '2026-10-05T09:00:00-03:00',
      proximo_envio_em: '2026-10-05T09:00:00-03:00',
      cancelamento_por_resposta: true,
      status: 'ativo',
    });
  });

  it('creates one-off and recurring event records as scheduled work', () => {
    expect(toEventRecord({
      scheduleId: 5,
      leadId: 8,
      templateId: 4,
      type: 'avulso',
      scheduledFor: '2026-10-10T09:00:00-03:00',
      message: 'Olá',
    })).toMatchObject({ status: 'agendado', tipo: 'avulso' });
  });
});
