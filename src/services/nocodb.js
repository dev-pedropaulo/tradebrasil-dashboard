import { normalizeState } from '../utils/normalizeState';

/**
 * Loads private lead data through the server API. NocoDB credentials never
 * belong in this browser bundle.
 */
export async function fetchNocoDBLeads() {
  try {
    const response = await fetch('/api/leads');
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Base indisponível.');
    const data = Array.isArray(payload.list) ? payload.list : [];
    return {
      success: true,
      data,
      total: Number(payload.total ?? data.length),
      isLive: true,
      source: 'Base de Dados Integrada (Tempo Real)',
    };
  } catch (error) {
    console.warn('Lead API unavailable:', error.message);
    return {
      success: false,
      error: 'Conexão com a base indisponível no momento.',
      data: [],
      total: 0,
      isLive: false,
      source: 'Base indisponível',
    };
  }
}

/** Format raw lead values into human readable labels. */
export function formatLeadData(lead) {
  const atuacaoMap = {
    'pecuária': 'Pecuária',
    'produção_de_grãos': 'Produção de Grãos',
    graos: 'Produção de Grãos',
    pecuaria: 'Pecuária',
  };
  const momentoMap = {
    quero_avaliar_uma_estratégia_agora: 'Quero avaliar uma estratégia agora',
    ainda_estou_apenas_buscando_informações: 'Ainda estou apenas buscando informações',
  };
  const volumeSafraMap = {
    de_10_a_20_mil_sacas: '10k - 20k Sacas',
    de_20_a_50_mil_sacas: '20k - 50k Sacas',
    de_50_a_100_mil_sacas: '50k - 100k Sacas',
    acima_de_100_mil_sacas: '> 100k Sacas',
  };
  const volumeBoisMap = {
    'de_500_a_1.000_bois': '500 - 1.000 Cabeças',
    'de_1.000_a_2.000_bois': '1.000 - 2.000 Cabeças',
    'acima_de_2.000_bois': '> 2.000 Cabeças',
  };
  const normalizedUF = normalizeState(lead.estado);
  const isAgendado = Boolean(lead.aguardando_especialista || lead.horario_agendado);
  const isEmAtendimento = Boolean(lead.em_atendimento);
  const isRespondido = lead.followup_status === 'respondido';
  const hasFollowup = Boolean(lead.followup_status && lead.followup_status !== 'pendente' && lead.followup_status !== 'respondido') || Number(lead.followup_ciclo_atual || 0) > 0;

  let statusAtendimentoKey = 'novo';
  let statusAtendimentoLabel = 'Novo Lead';
  let statusAtendimentoBadgeClass = 'badge-neutral';

  if (isAgendado) {
    statusAtendimentoKey = 'agendado';
    statusAtendimentoLabel = 'Reunião Agendada';
    statusAtendimentoBadgeClass = 'badge-emerald';
  } else if (isEmAtendimento) {
    statusAtendimentoKey = 'atendimento';
    statusAtendimentoLabel = 'Em Atendimento (SDR)';
    statusAtendimentoBadgeClass = 'badge-blue';
  } else if (isRespondido) {
    statusAtendimentoKey = 'respondido';
    statusAtendimentoLabel = 'Respondeu Follow-up';
    statusAtendimentoBadgeClass = 'badge-purple';
  } else if (hasFollowup) {
    statusAtendimentoKey = 'followup';
    statusAtendimentoLabel = `Follow-up (Ciclo ${lead.followup_ciclo_atual || 1})`;
    statusAtendimentoBadgeClass = 'badge-amber';
  }

  return {
    ...lead,
    estado: normalizedUF,
    estadoRaw: lead.estado,
    atuacaoLabel: atuacaoMap[String(lead.atuacao || '').toLowerCase()] || lead.atuacao || 'Não Informado',
    momentoLabel: momentoMap[lead.momento_protecao] || lead.momento_protecao || 'Em Análise',
    culturaLabel: lead.cultura_principal ? String(lead.cultura_principal).toUpperCase() : (String(lead.atuacao || '').includes('pecu') ? 'Gado de Corte' : 'Geral'),
    volumeSafraLabel: volumeSafraMap[lead.volume_safra] || lead.volume_safra || '-',
    volumeBoisLabel: volumeBoisMap[lead.volume_bois] || lead.volume_bois || '-',
    isHot: lead.momento_protecao === 'quero_avaliar_uma_estratégia_agora',
    isAgendado,
    isEmAtendimento,
    isRespondido,
    hasFollowup,
    horarioAgendado: lead.horario_agendado || null,
    resumoConversa: lead.resumo_conversa || null,
    statusAtendimentoKey,
    statusAtendimentoLabel,
    statusAtendimentoBadgeClass,
  };
}
