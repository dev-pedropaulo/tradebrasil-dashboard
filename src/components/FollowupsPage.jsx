import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock,
  Edit2,
  Layers,
  MessageSquarePlus,
  Plus,
  RefreshCw,
  Send,
  Settings2,
  Sparkles,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import {
  cancelFollowupSchedule,
  createFollowupSchedule,
  createFollowupTemplate,
  deleteFollowupTemplate,
  fetchFollowupWorkspace,
  scheduleOneOffMessage,
  updateFollowupTemplate,
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

  // Formulário de modelos (criação e edição)
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [templateForm, setTemplateForm] = useState({ nome: '', mensagem: '', ativo: true });

  // Formulário de follow-up recorrente
  const [scheduleMode, setScheduleMode] = useState('sequence'); // 'sequence' | 'single'
  const [scheduleForm, setScheduleForm] = useState({
    leadId: '',
    templateId: '',
    recurrenceDays: 30,
    firstSendAt: '',
    cancelOnLeadReply: true,
  });

  // Formulário de mensagem avulsa
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

  useEffect(() => {
    load();
  }, []);

  const allTemplates = useMemo(
    () => [...workspace.templates].sort((a, b) => recordId(a) - recordId(b)),
    [workspace.templates],
  );

  const activeTemplates = useMemo(
    () => allTemplates.filter(isActive),
    [allTemplates],
  );

  // Modelos ordenados que compõem a sequência comercial de 4 passos
  const sequenceSteps = useMemo(() => {
    const sequenceItems = allTemplates.filter((t) => t.nome && t.nome.toLowerCase().includes('sequência'));
    if (sequenceItems.length > 0) return sequenceItems;
    return allTemplates.slice(0, 4);
  }, [allTemplates]);

  // Pré-selecionar o primeiro modelo da sequência quando o modo for sequência
  useEffect(() => {
    if (scheduleMode === 'sequence' && sequenceSteps.length > 0 && !scheduleForm.templateId) {
      setScheduleForm((prev) => ({ ...prev, templateId: String(recordId(sequenceSteps[0])) }));
    }
  }, [scheduleMode, sequenceSteps, scheduleForm.templateId]);

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

  const startEditingTemplate = (template) => {
    setEditingTemplateId(recordId(template));
    setTemplateForm({
      nome: template.nome || '',
      mensagem: template.mensagem || '',
      ativo: isActive(template),
    });
    // Rola suavemente até o formulário de modelo
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditingTemplate = () => {
    setEditingTemplateId(null);
    setTemplateForm({ nome: '', mensagem: '', ativo: true });
  };

  const submitTemplate = async (event) => {
    event.preventDefault();
    if (editingTemplateId) {
      const result = await runMutation(
        () => updateFollowupTemplate(editingTemplateId, templateForm),
        () => `Modelo #${editingTemplateId} atualizado com sucesso.`,
      );
      if (result) cancelEditingTemplate();
    } else {
      const result = await runMutation(
        () => createFollowupTemplate(templateForm),
        () => 'Novo modelo cadastrado com sucesso.',
      );
      if (result) setTemplateForm({ nome: '', mensagem: '', ativo: true });
    }
  };

  const handleDeleteTemplate = async (template) => {
    const id = recordId(template);
    if (!window.confirm(`Tem certeza que deseja excluir o modelo #${id} "${template.nome}"?`)) return;
    const result = await runMutation(
      () => deleteFollowupTemplate(id),
      () => `Modelo #${id} excluído com sucesso.`,
    );
    if (result && editingTemplateId === id) {
      cancelEditingTemplate();
    }
  };

  const submitSchedule = async (event) => {
    event.preventDefault();
    const payload = {
      ...scheduleForm,
      templateId: Number(scheduleForm.templateId),
      firstSendAt: toSaoPauloIso(scheduleForm.firstSendAt),
    };
    const result = await runMutation(
      () => createFollowupSchedule(payload),
      () => 'Follow-up recorrente ativado com sucesso.',
    );
    if (result) {
      setScheduleForm({
        leadId: '',
        templateId: sequenceSteps[0] ? String(recordId(sequenceSteps[0])) : '',
        recurrenceDays: 30,
        firstSendAt: '',
        cancelOnLeadReply: true,
      });
    }
  };

  const submitOneOff = async (event) => {
    event.preventDefault();
    const payload = {
      ...oneOffForm,
      scheduleId: Number(oneOffForm.scheduleId),
      templateId: oneOffForm.templateId ? Number(oneOffForm.templateId) : undefined,
      sendAt: toSaoPauloIso(oneOffForm.sendAt),
    };
    const result = await runMutation(
      () => scheduleOneOffMessage(payload),
      (response) => (
        response.collisionWarning
          ? 'Mensagem avulsa agendada. Atenção: ela está a menos de 48h do próximo envio recorrente.'
          : 'Mensagem avulsa agendada sem alterar a recorrência.'
      ),
    );
    if (result) setOneOffForm({ scheduleId: '', templateId: '', sendAt: '' });
  };

  const cancelSchedule = async (schedule) => {
    if (!window.confirm(`Cancelar o follow-up de ${leadName(schedule.lead_id)}?`)) return;
    await runMutation(
      () => cancelFollowupSchedule(recordId(schedule)),
      () => 'Follow-up cancelado manualmente.',
    );
  };

  return (
    <section>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.35rem' }}>Motor de Follow-up</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginTop: '0.3rem' }}>
            Cadência sem limite com sequência de 4 variações de mensagens e modelos customizáveis (America/Sao_Paulo).
          </p>
        </div>
        <button className="btn-clean" onClick={load} disabled={loading || busy}>
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      {error && <div className="followup-alert followup-alert-error"><AlertTriangle size={17} />{error}</div>}
      {notice && <div className="followup-alert followup-alert-success">{notice}</div>}

      <div className="followup-grid">
        {/* Bloco 1: Modelos de Mensagem (Criar & Editar) */}
        <form className="clean-card" style={sectionStyle} onSubmit={submitTemplate}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
            <div className="followup-section-title" style={{ margin: 0 }}>
              {editingTemplateId ? <Edit2 size={16} color="var(--accent-emerald)" /> : <Settings2 size={16} />}
              {editingTemplateId ? `Editar Modelo #${editingTemplateId}` : 'Modelos de mensagem'}
            </div>
            {editingTemplateId && (
              <button
                type="button"
                className="btn-clean"
                onClick={cancelEditingTemplate}
                style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              >
                <X size={12} /> Cancelar edição
              </button>
            )}
          </div>

          <p className="followup-help">
            {editingTemplateId
              ? 'Edite o conteúdo ou ative/desative este modelo para futuras campanhas.'
              : 'Texto estático sem variáveis. Adicione novas variações ou clique em Editar abaixo.'}
          </p>

          <label style={fieldStyle}>
            Nome do Modelo
            <input
              className="clean-input"
              required
              value={templateForm.nome}
              onChange={(e) => setTemplateForm({ ...templateForm, nome: e.target.value })}
              placeholder="Ex.: Sequência #1 — Apresentação & Momento Safra"
            />
          </label>

          <label style={{ ...fieldStyle, marginTop: '0.7rem' }}>
            Mensagem WhatsApp
            <textarea
              className="clean-input followup-textarea"
              required
              rows={4}
              value={templateForm.mensagem}
              onChange={(e) => setTemplateForm({ ...templateForm, mensagem: e.target.value })}
              placeholder="Olá! Sou Pedro da TradeBrasil. Gostaria de entender seu momento de comercialização de grãos nesta safra..."
            />
          </label>

          {editingTemplateId && (
            <label className="followup-checkbox" style={{ marginTop: '0.6rem' }}>
              <input
                type="checkbox"
                checked={templateForm.ativo}
                onChange={(e) => setTemplateForm({ ...templateForm, ativo: e.target.checked })}
              />
              Modelo ativo (disponível para envios)
            </label>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.85rem' }}>
            <button className="btn-clean btn-emerald" disabled={busy} type="submit" style={{ flex: 1 }}>
              {editingTemplateId ? <CheckCircle2 size={14} /> : <MessageSquarePlus size={14} />}
              {editingTemplateId ? 'Salvar alterações' : 'Salvar novo modelo'}
            </button>
            {editingTemplateId && (
              <button className="btn-clean" type="button" onClick={cancelEditingTemplate} disabled={busy}>
                Descartar
              </button>
            )}
          </div>

          {/* Lista com todos os modelos e botão de edição */}
          <div style={{ marginTop: '1.25rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
              Modelos Cadastrados ({allTemplates.length})
            </div>
            <div className="followup-list">
              {allTemplates.length === 0 ? (
                <span className="followup-help">Nenhum modelo cadastrado.</span>
              ) : (
                allTemplates.map((template) => {
                  const id = recordId(template);
                  const isCurrentEditing = id === editingTemplateId;
                  const active = isActive(template);
                  return (
                    <div
                      className={`followup-list-item ${isCurrentEditing ? 'is-editing' : ''}`}
                      key={id}
                      style={{ transition: 'all 0.2s ease' }}
                    >
                      <div className="followup-list-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                            #{id} {template.nome}
                          </span>
                          <span className={`followup-badge ${active ? 'followup-badge-active' : 'followup-badge-inactive'}`}>
                            {active ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <button
                            type="button"
                            className="btn-clean followup-btn-icon"
                            onClick={() => startEditingTemplate(template)}
                            title="Editar modelo"
                          >
                            <Edit2 size={13} />
                            <span>Editar</span>
                          </button>
                          <button
                            type="button"
                            className="btn-clean followup-btn-icon followup-cancel"
                            onClick={() => handleDeleteTemplate(template)}
                            title="Excluir modelo"
                            disabled={busy}
                          >
                            <Trash2 size={13} />
                            <span>Excluir</span>
                          </button>
                        </div>
                      </div>
                      <div className="followup-list-msg" title={template.mensagem}>
                        {template.mensagem}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </form>

        {/* Bloco 2: Criar Follow-up Recorrente com Suporte a Sequência */}
        <form className="clean-card" style={sectionStyle} onSubmit={submitSchedule}>
          <div className="followup-section-title">
            <CalendarClock size={16} /> Criar follow-up recorrente
          </div>

          {/* Alternador de Modo: Sequência Estruturada vs Modelo Único */}
          <div className="followup-cadence-toggle">
            <button
              type="button"
              className={`followup-cadence-btn ${scheduleMode === 'sequence' ? 'active' : ''}`}
              onClick={() => {
                setScheduleMode('sequence');
                if (sequenceSteps.length > 0) {
                  setScheduleForm((prev) => ({
                    ...prev,
                    templateId: String(recordId(sequenceSteps[0])),
                    recurrenceDays: 30,
                  }));
                }
              }}
            >
              <Sparkles size={13} /> Sequência 4 Etapas (Recomendado)
            </button>
            <button
              type="button"
              className={`followup-cadence-btn ${scheduleMode === 'single' ? 'active' : ''}`}
              onClick={() => setScheduleMode('single')}
            >
              <Layers size={13} /> Modelo Fixo
            </button>
          </div>

          {scheduleMode === 'sequence' && (
            <div className="followup-sequence-stepper">
              <div style={{ fontSize: '0.73rem', fontWeight: 600, color: 'var(--accent-emerald)', marginBottom: '0.2rem' }}>
                Cadência Comercial Contínua a cada 30 dias:
              </div>
              <div className="followup-sequence-step">
                <span className="followup-sequence-step-num">1</span>
                <div><strong>Início (Dia 0):</strong> Apresentação & Momento Safra</div>
              </div>
              <div className="followup-sequence-step">
                <span className="followup-sequence-step-num">2</span>
                <div><strong>+30 dias:</strong> Monitoramento & Oportunidades de Mercado</div>
              </div>
              <div className="followup-sequence-step">
                <span className="followup-sequence-step-num">3</span>
                <div><strong>+60 dias:</strong> Simulação de Hedge Gratuita / Trava de Preços</div>
              </div>
              <div className="followup-sequence-step">
                <span className="followup-sequence-step-num">4</span>
                <div><strong>+90 dias:</strong> Manutenção de Contato & Relacionamento</div>
              </div>
            </div>
          )}

          <label style={fieldStyle}>
            Lead com telefone válido
            <select
              className="clean-select"
              required
              value={scheduleForm.leadId}
              onChange={(e) => setScheduleForm({ ...scheduleForm, leadId: e.target.value })}
            >
              <option value="">Selecione um lead ({eligibleLeads.length} disponíveis)</option>
              {eligibleLeads.map((lead) => (
                <option key={recordId(lead)} value={recordId(lead)}>
                  {lead.nome} — {lead.telefone}
                </option>
              ))}
            </select>
          </label>

          <label style={{ ...fieldStyle, marginTop: '0.7rem' }}>
            {scheduleMode === 'sequence' ? 'Modelo Inicial da Sequência' : 'Modelo de Mensagem'}
            <select
              className="clean-select"
              required
              value={scheduleForm.templateId}
              onChange={(e) => setScheduleForm({ ...scheduleForm, templateId: e.target.value })}
            >
              <option value="">Selecione um modelo</option>
              {activeTemplates.map((template) => (
                <option key={recordId(template)} value={recordId(template)}>
                  #{recordId(template)} — {template.nome}
                </option>
              ))}
            </select>
          </label>

          <div className="followup-form-row">
            <label style={fieldStyle}>
              Primeiro envio
              <input
                className="clean-input"
                type="datetime-local"
                required
                value={scheduleForm.firstSendAt}
                onChange={(e) => setScheduleForm({ ...scheduleForm, firstSendAt: e.target.value })}
              />
            </label>
            <label style={fieldStyle}>
              A cada (dias)
              <input
                className="clean-input"
                type="number"
                min="1"
                required
                value={scheduleForm.recurrenceDays}
                onChange={(e) => setScheduleForm({ ...scheduleForm, recurrenceDays: Number(e.target.value) })}
              />
            </label>
          </div>

          <label className="followup-checkbox">
            <input
              type="checkbox"
              checked={scheduleForm.cancelOnLeadReply}
              onChange={(e) => setScheduleForm({ ...scheduleForm, cancelOnLeadReply: e.target.checked })}
            />
            Cancelar automaticamente quando o lead responder
          </label>
          <p className="followup-help">
            Se desmarcado: só o cancelamento manual pelo dashboard interrompe a cadência.
          </p>

          <button className="btn-clean btn-emerald" disabled={busy} type="submit" style={{ marginTop: '0.85rem' }}>
            <CalendarClock size={14} /> Ativar follow-up
          </button>
        </form>
      </div>

      {/* Bloco 3: Mensagem Programada Avulsa */}
      <form className="clean-card" style={sectionStyle} onSubmit={submitOneOff}>
        <div className="followup-section-title"><Send size={16} /> Mensagem programada avulsa</div>
        <p className="followup-help">Pode ser enviada a qualquer momento sem reiniciar ou alterar a data do próximo follow-up recorrente.</p>
        <div className="followup-form-row followup-oneoff-row">
          <label style={fieldStyle}>Follow-up ativo
            <select className="clean-select" required value={oneOffForm.scheduleId} onChange={(event) => setOneOffForm({ ...oneOffForm, scheduleId: event.target.value })}>
              <option value="">Selecione</option>
              {activeSchedules.map((schedule) => <option key={recordId(schedule)} value={recordId(schedule)}>{leadName(schedule.lead_id)} — próximo: {formatDate(schedule.proximo_envio_em)}</option>)}
            </select>
          </label>
          <label style={fieldStyle}>Modelo (opcional)
            <select className="clean-select" value={oneOffForm.templateId} onChange={(event) => setOneOffForm({ ...oneOffForm, templateId: event.target.value })}>
              <option value="">Usar o modelo atual do follow-up</option>
              {activeTemplates.map((template) => <option key={recordId(template)} value={recordId(template)}>#{recordId(template)} — {template.nome}</option>)}
            </select>
          </label>
          <label style={fieldStyle}>Enviar em
            <input className="clean-input" type="datetime-local" required value={oneOffForm.sendAt} onChange={(event) => setOneOffForm({ ...oneOffForm, sendAt: event.target.value })} />
          </label>
        </div>
        <button className="btn-clean" disabled={busy} type="submit" style={{ marginTop: '0.85rem' }}><Send size={14} /> Programar mensagem</button>
      </form>

      {/* Bloco 4: Tabela de Follow-ups Ativos */}
      <div className="clean-card" style={sectionStyle}>
        <div className="followup-section-title"><CalendarClock size={16} /> Follow-ups ativos ({activeSchedules.length})</div>
        <div className="clean-table-container">
          <table className="clean-table">
            <thead>
              <tr>
                <th>Lead</th>
                <th>Modelo</th>
                <th>Cadência</th>
                <th>Próximo envio</th>
                <th>Cancelamento</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="followup-empty">Carregando...</td></tr>
              ) : activeSchedules.length === 0 ? (
                <tr><td colSpan="6" className="followup-empty">Nenhum follow-up ativo.</td></tr>
              ) : (
                activeSchedules.map((schedule) => (
                  <tr key={recordId(schedule)}>
                    <td><strong>{leadName(schedule.lead_id)}</strong></td>
                    <td><span className="followup-badge followup-badge-active">{templateName(schedule.template_id)}</span></td>
                    <td>{schedule.recorrencia_dias} dias</td>
                    <td>{formatDate(schedule.proximo_envio_em)}</td>
                    <td>{schedule.cancelamento_por_resposta ? 'Ao responder' : 'Manual'}</td>
                    <td>
                      <button className="btn-clean followup-cancel" onClick={() => cancelSchedule(schedule)} disabled={busy}>
                        <XCircle size={14} /> Cancelar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bloco 5: Falhas de Envio */}
      <div className="clean-card" style={sectionStyle}>
        <div className="followup-section-title"><AlertTriangle size={16} /> Falhas de envio ({failedEvents.length})</div>
        {failedEvents.length === 0 ? (
          <p className="followup-help">Nenhuma falha registrada.</p>
        ) : (
          <div className="clean-table-container">
            <table className="clean-table">
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>Agendado</th>
                  <th>Erro</th>
                </tr>
              </thead>
              <tbody>
                {failedEvents.map((event) => (
                  <tr key={recordId(event)}>
                    <td>{leadName(event.lead_id)}</td>
                    <td>{formatDate(event.agendado_para)}</td>
                    <td>{event.erro || 'Falha sem detalhe informado.'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
