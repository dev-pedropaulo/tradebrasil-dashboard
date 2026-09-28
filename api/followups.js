import { assertPlanInput, hasScheduleCollision } from '../src/lib/followupDomain.js';
import {
  isValidLeadPhone,
  leadFollowupProjection,
  toEventRecord,
  toScheduleRecord,
} from './_lib/followupRecords.js';
import {
  NocoDBConfigurationError,
  createRecord,
  listRecords,
  updateRecord,
} from './_lib/nocodb.js';

function recordId(record) {
  return Number(record?.Id ?? record?.id);
}

async function readBody(req) {
  if (!req.body) return {};
  return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
}

function sendError(res, statusCode, error) {
  return res.status(statusCode).json({ error });
}

function requirePositiveId(value, label) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new Error(`${label} obrigatório.`);
  return id;
}

function findById(records, id) {
  return records.find((record) => recordId(record) === Number(id));
}

async function getWorkspace() {
  const [leads, templates, schedules, events] = await Promise.all([
    listRecords('leads'),
    listRecords('templates'),
    listRecords('schedules'),
    listRecords('events'),
  ]);
  return {
    leads: leads.filter((lead) => isValidLeadPhone(lead.telefone)),
    templates,
    schedules,
    events,
  };
}

async function createTemplate(input) {
  const name = String(input.nome || '').trim();
  const message = String(input.mensagem || '').trim();
  if (!name) throw new Error('Nome do modelo obrigatório.');
  if (!message) throw new Error('Mensagem do modelo obrigatória.');
  if (message.includes('{{') || message.includes('}}')) {
    throw new Error('Modelos não aceitam variáveis nesta primeira versão.');
  }
  const template = await createRecord('templates', {
    nome: name,
    mensagem: message,
    ativo: input.ativo !== false,
    criado_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
  });
  return { template };
}

async function editTemplate(id, input) {
  requirePositiveId(id, 'Modelo');
  const fields = { atualizado_em: new Date().toISOString() };
  if (input.nome !== undefined) {
    const name = String(input.nome).trim();
    if (!name) throw new Error('Nome do modelo obrigatório.');
    fields.nome = name;
  }
  if (input.mensagem !== undefined) {
    const message = String(input.mensagem).trim();
    if (!message) throw new Error('Mensagem do modelo obrigatória.');
    if (message.includes('{{') || message.includes('}}')) throw new Error('Modelos não aceitam variáveis nesta primeira versão.');
    fields.mensagem = message;
  }
  if (input.ativo !== undefined) fields.ativo = Boolean(input.ativo);
  const template = await updateRecord('templates', id, fields);
  return { template };
}

async function createSchedule(input) {
  assertPlanInput(input);
  const leadId = requirePositiveId(input.leadId, 'Lead');
  const templateId = requirePositiveId(input.templateId, 'Modelo');
  const [leads, templates, schedules] = await Promise.all([
    listRecords('leads'),
    listRecords('templates'),
    listRecords('schedules'),
  ]);
  const lead = findById(leads, leadId);
  const template = findById(templates, templateId);
  if (!lead || !isValidLeadPhone(lead.telefone)) throw new Error('Lead sem telefone brasileiro válido.');
  if (!template || template.ativo === false) throw new Error('Modelo ativo não encontrado.');
  if (schedules.some((schedule) => Number(schedule.lead_id) === leadId && schedule.status === 'ativo')) {
    throw new Error('Este lead já possui um follow-up ativo.');
  }

  const fields = toScheduleRecord(input);
  const schedule = await createRecord('schedules', fields);
  await updateRecord('leads', leadId, leadFollowupProjection(fields, true));
  await createRecord('events', toEventRecord({
    scheduleId: recordId(schedule),
    leadId,
    templateId,
    type: 'recorrente',
    scheduledFor: fields.primeiro_envio_em,
    message: template.mensagem,
  }));
  return { schedule };
}

async function cancelSchedule(id) {
  const scheduleId = requirePositiveId(id, 'Follow-up');
  const schedules = await listRecords('schedules');
  const schedule = findById(schedules, scheduleId);
  if (!schedule) throw new Error('Follow-up não encontrado.');
  if (schedule.status !== 'ativo') throw new Error('Este follow-up já não está ativo.');
  const cancelledAt = new Date().toISOString();
  const updatedSchedule = await updateRecord('schedules', scheduleId, {
    status: 'cancelado',
    cancelado_em: cancelledAt,
    atualizado_em: cancelledAt,
  });
  await updateRecord('leads', Number(schedule.lead_id), leadFollowupProjection(schedule, false));
  await createRecord('events', {
    schedule_id: scheduleId,
    lead_id: Number(schedule.lead_id),
    template_id: Number(schedule.template_id),
    tipo: 'cancelamento_manual',
    status: 'concluido',
    executado_em: cancelledAt,
    origem: 'dashboard',
    criado_em: cancelledAt,
  });
  return { schedule: updatedSchedule };
}

async function createOneOff(input) {
  const scheduleId = requirePositiveId(input.scheduleId, 'Follow-up');
  const sendAt = new Date(input.sendAt);
  if (Number.isNaN(sendAt.getTime()) || sendAt <= new Date()) throw new Error('Data do envio avulso deve estar no futuro.');
  const [schedules, templates] = await Promise.all([listRecords('schedules'), listRecords('templates')]);
  const schedule = findById(schedules, scheduleId);
  if (!schedule || schedule.status !== 'ativo') throw new Error('Follow-up ativo não encontrado.');
  const template = findById(templates, input.templateId || schedule.template_id);
  if (!template || template.ativo === false) throw new Error('Modelo ativo não encontrado.');
  const scheduledFor = input.sendAt;
  const event = await createRecord('events', toEventRecord({
    scheduleId,
    leadId: Number(schedule.lead_id),
    templateId: recordId(template),
    type: 'avulso',
    scheduledFor,
    message: template.mensagem,
  }));
  return {
    event,
    collisionWarning: hasScheduleCollision(scheduledFor, schedule.proximo_envio_em),
    nextRecurringAt: schedule.proximo_envio_em,
  };
}

export default async function handler(req, res) {
  const action = req.query?.action;
  try {
    if (req.method === 'GET' && action === 'workspace') return res.status(200).json(await getWorkspace());
    const body = await readBody(req);
    if (req.method === 'POST' && action === 'template') return res.status(201).json(await createTemplate(body));
    if (req.method === 'PATCH' && action === 'template') return res.status(200).json(await editTemplate(req.query?.id, body));
    if (req.method === 'POST' && action === 'schedule') return res.status(201).json(await createSchedule(body));
    if (req.method === 'DELETE' && action === 'schedule') return res.status(200).json(await cancelSchedule(req.query?.id));
    if (req.method === 'POST' && action === 'one-off') return res.status(201).json(await createOneOff(body));
    return sendError(res, 404, 'Operação não encontrada.');
  } catch (error) {
    console.error('Follow-up API error', error);
    if (error instanceof NocoDBConfigurationError) {
      return sendError(res, 503, 'A integração privada do NocoDB ainda não foi configurada.');
    }
    return sendError(res, 400, error.message || 'Não foi possível concluir a operação.');
  }
}
