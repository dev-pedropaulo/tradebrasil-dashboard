import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, MessageSquarePlus, RefreshCw, Send, Settings2, XCircle } from 'lucide-react';
import {
  cancelFollowupSchedule,
  createFollowupSchedule,
  createFollowupTemplate,
  fetchFollowupWorkspace,
  scheduleOneOffMessage,
} from '../services/followups';

const fieldStyle = { display: 'grid', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--text-secondary)' };
const sectionStyle = { padding: '1.25rem', marginBottom: '1rem' };

function recordId(record) {
  return Number(record?.Id ?? record?.id);
}

function isActive(record) {
  return record?.ativo !== false && record?.ativo !== 0 && record?.ativo !== 'false';
}

function toSaoPauloIso(value) {
  if (!value) return '';
  return `${value}${value.length === 16 ? ':00' : ''}-03:00`;
}

function formatDate(value) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(parsed);
}

export default function FollowupsPage() {
  const [workspace, setWorkspace] = useState({ leads: [], templates: [], schedules: [], events: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [templateForm, setTemplateForm] = useState({ nome: '', mensagem: '' });
  const [scheduleForm, setScheduleForm] = useState({ leadId: '', templateId: '', recurrenceDays: 30, firstSendAt: '', cancelOnLeadReply: true });
  const [oneOffForm, setOneOffForm] = useState({ scheduleId: '', templateId: '', sendAt: '' });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchFollowupWorkspace();
      setWorkspace(data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const activeTemplates = useMemo(
    () => workspace.templates.filter(isActive),
    [workspace.templates],
  );
  const activeSchedules = useMemo(
    () => workspace.schedules.filter((schedule) => schedule.status === 'ativo'),
    [workspace.schedules],
  );
  const scheduledLeadIds = useMemo(
    () => new Set(activeSchedules.map((schedule) => Number(schedule.lead_id))),
    [activeSchedules],
  );
  const eligibleLeads = useMemo(
    () => workspace.leads.filter((lead) => !scheduledLeadIds.has(recordId(lead))),
    [workspace.leads, scheduledLeadIds],
  );
  const failedEvents = useMemo(
    () => workspace.events.filter((event) => event.status === 'falhou'),
    [workspace.events],
  );
  const leadName = (id) => workspace.leads.find((lead) => recordId(lead) === Number(id))?.nome || `Lead #${id}`;
  const templateName = (id) => workspace.templates.find((template) => recordId(template) === Number(id))?.nome || `Modelo #${id}`;

  const runMutation = async (operation, successMessage) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await operation();
      setNotice(successMessage(result));
      await load();
      return result;
    } catch (requestError) {
      setError(requestError.message);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const submitTemplate = async (event) => {
    event.preventDefault();
    const result = await runMutation(() => createFollowupTemplate(templateForm), () => 'Modelo salvo.');
    if (result) setTemplateForm({ nome: '', mensagem: '' });
  };

  const submitSchedule = async (event) => {
    event.preventDefault();
    const payload = { ...scheduleForm, firstSendAt: toSaoPauloIso(scheduleForm.firstSendAt) };
    const result = await runMutation(() => createFollowupSchedule(payload), () => 'Follow-up recorrente criado.');
    if (result) setScheduleForm({ leadId: '', templateId: '', recurrenceDays: 30, firstSendAt: '', cancelOnLeadReply: true });
  };

  const submitOneOff = async (event) => {
    event.preventDefault();
    const payload = { ...oneOffForm, sendAt: toSaoPauloIso(oneOffForm.sendAt) };
    const result = await runMutation(() => scheduleOneOffMessage(payload), (response) => (
      response.collisionWarning
        ? 'Mensagem avulsa agendada. Atenção: ela está a menos de 48h do próximo envio recorrente.'
        : 'Mensagem avulsa agendada sem alterar a recorrência.'
    ));
    if (result) setOneOffForm({ scheduleId: '', templateId: '', sendAt: '' });
  };

  const cancelSchedule = async (schedule) => {
    if (!window.confirm(`Cancelar o follow-up de ${leadName(schedule.lead_id)}?`)) return;
    await runMutation(() => cancelFollowupSchedule(recordId(schedule)), () => 'Follow-up cancelado manualmente.');
  };

  return (
    <section>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.35rem' }}>Follow-ups</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginTop: '0.3rem' }}>
            Cadência sem limite, no fuso America/Sao_Paulo. Mensagens avulsas não reiniciam a recorrência.
          </p>
        </div>
        <button className="btn-clean" onClick={load} disabled={loading || busy}><RefreshCw size={14} /> Atualizar</button>
      </div>

      {error && <div className="followup-alert followup-alert-error"><AlertTriangle size={17} />{error}</div>}
      {notice && <div className="followup-alert followup-alert-success">{notice}</div>}

      <div className="followup-grid">
        <form className="clean-card" style={sectionStyle} onSubmit={submitTemplate}>
          <div className="followup-section-title"><Settings2 size={16} /> Modelos de mensagem</div>
          <p className="followup-help">Texto estático; esta versão não utiliza variáveis.</p>
          <label style={fieldStyle}>Nome
            <input className="clean-input" required value={templateForm.nome} onChange={(event) => setTemplateForm({ ...templateForm, nome: event.target.value })} placeholder="Ex.: Retomada mensal" />
          </label>
          <label style={{ ...fieldStyle, marginTop: '0.7rem' }}>Mensagem
            <textarea className="clean-input followup-textarea" required value={templateForm.mensagem} onChange={(event) => setTemplateForm({ ...templateForm, mensagem: event.target.value })} placeholder="Olá, gostaria de retomar nossa conversa..." />
          </label>
          <button className="btn-clean btn-emerald" disabled={busy} style={{ marginTop: '0.85rem' }}><MessageSquarePlus size={14} /> Salvar modelo</button>
          <div className="followup-list">
            {activeTemplates.length === 0 ? <span className="followup-help">Nenhum modelo ativo.</span> : activeTemplates.map((template) => (
              <div className="followup-list-item" key={recordId(template)}><strong>{template.nome}</strong><span>{template.mensagem}</span></div>
            ))}
          </div>
        </form>

        <form className="clean-card" style={sectionStyle} onSubmit={submitSchedule}>
          <div className="followup-section-title"><CalendarClock size={16} /> Criar follow-up recorrente</div>
          <label style={fieldStyle}>Lead com telefone válido
            <select className="clean-select" required value={scheduleForm.leadId} onChange={(event) => setScheduleForm({ ...scheduleForm, leadId: event.target.value })}>
              <option value="">Selecione um lead</option>
              {eligibleLeads.map((lead) => <option key={recordId(lead)} value={recordId(lead)}>{lead.nome} — {lead.telefone}</option>)}
            </select>
          </label>
          <label style={{ ...fieldStyle, marginTop: '0.7rem' }}>Modelo
            <select className="clean-select" required value={scheduleForm.templateId} onChange={(event) => setScheduleForm({ ...scheduleForm, templateId: event.target.value })}>
              <option value="">Selecione um modelo</option>
              {activeTemplates.map((template) => <option key={recordId(template)} value={recordId(template)}>{template.nome}</option>)}
            </select>
          </label>
          <div className="followup-form-row">
            <label style={fieldStyle}>Primeiro envio
              <input className="clean-input" type="datetime-local" required value={scheduleForm.firstSendAt} onChange={(event) => setScheduleForm({ ...scheduleForm, firstSendAt: event.target.value })} />
            </label>
            <label style={fieldStyle}>A cada (dias)
              <input className="clean-input" type="number" min="1" required value={scheduleForm.recurrenceDays} onChange={(event) => setScheduleForm({ ...scheduleForm, recurrenceDays: Number(event.target.value) })} />
            </label>
          </div>
          <label className="followup-checkbox"><input type="checkbox" checked={scheduleForm.cancelOnLeadReply} onChange={(event) => setScheduleForm({ ...scheduleForm, cancelOnLeadReply: event.target.checked })} /> Cancelar automaticamente quando o lead responder</label>
          <p className="followup-help">Desmarcado: só o cancelamento manual pelo dashboard interrompe a cadência.</p>
          <button className="btn-clean btn-emerald" disabled={busy} style={{ marginTop: '0.85rem' }}><CalendarClock size={14} /> Ativar follow-up</button>
        </form>
      </div>

      <form className="clean-card" style={sectionStyle} onSubmit={submitOneOff}>
        <div className="followup-section-title"><Send size={16} /> Mensagem programada avulsa</div>
        <p className="followup-help">Pode ser enviada em 20 dias, por exemplo. A data do próximo follow-up recorrente é mantida.</p>
        <div className="followup-form-row followup-oneoff-row">
          <label style={fieldStyle}>Follow-up ativo
            <select className="clean-select" required value={oneOffForm.scheduleId} onChange={(event) => setOneOffForm({ ...oneOffForm, scheduleId: event.target.value })}>
              <option value="">Selecione</option>
              {activeSchedules.map((schedule) => <option key={recordId(schedule)} value={recordId(schedule)}>{leadName(schedule.lead_id)} — próximo: {formatDate(schedule.proximo_envio_em)}</option>)}
            </select>
          </label>
          <label style={fieldStyle}>Modelo (opcional)
            <select className="clean-select" value={oneOffForm.templateId} onChange={(event) => setOneOffForm({ ...oneOffForm, templateId: event.target.value })}>
              <option value="">Usar o modelo do follow-up</option>
              {activeTemplates.map((template) => <option key={recordId(template)} value={recordId(template)}>{template.nome}</option>)}
            </select>
          </label>
          <label style={fieldStyle}>Enviar em
            <input className="clean-input" type="datetime-local" required value={oneOffForm.sendAt} onChange={(event) => setOneOffForm({ ...oneOffForm, sendAt: event.target.value })} />
          </label>
        </div>
        <button className="btn-clean" disabled={busy} style={{ marginTop: '0.85rem' }}><Send size={14} /> Programar mensagem</button>
      </form>

      <div className="clean-card" style={sectionStyle}>
        <div className="followup-section-title"><CalendarClock size={16} /> Follow-ups ativos ({activeSchedules.length})</div>
        <div className="clean-table-container">
          <table className="clean-table"><thead><tr><th>Lead</th><th>Modelo</th><th>Cadência</th><th>Próximo envio</th><th>Cancelamento</th><th /></tr></thead>
            <tbody>{loading ? <tr><td colSpan="6" className="followup-empty">Carregando...</td></tr> : activeSchedules.length === 0 ? <tr><td colSpan="6" className="followup-empty">Nenhum follow-up ativo.</td></tr> : activeSchedules.map((schedule) => <tr key={recordId(schedule)}><td>{leadName(schedule.lead_id)}</td><td>{templateName(schedule.template_id)}</td><td>{schedule.recorrencia_dias} dias</td><td>{formatDate(schedule.proximo_envio_em)}</td><td>{schedule.cancelamento_por_resposta ? 'Ao responder' : 'Manual'}</td><td><button className="btn-clean followup-cancel" onClick={() => cancelSchedule(schedule)} disabled={busy}><XCircle size={14} /> Cancelar</button></td></tr>)}</tbody>
          </table>
        </div>
      </div>

      <div className="clean-card" style={sectionStyle}>
        <div className="followup-section-title"><AlertTriangle size={16} /> Falhas de envio ({failedEvents.length})</div>
        {failedEvents.length === 0 ? <p className="followup-help">Nenhuma falha registrada.</p> : <div className="clean-table-container"><table className="clean-table"><thead><tr><th>Lead</th><th>Agendado</th><th>Erro</th></tr></thead><tbody>{failedEvents.map((event) => <tr key={recordId(event)}><td>{leadName(event.lead_id)}</td><td>{formatDate(event.agendado_para)}</td><td>{event.erro || 'Falha sem detalhe informado.'}</td></tr>)}</tbody></table></div>}
      </div>
    </section>
  );
}
