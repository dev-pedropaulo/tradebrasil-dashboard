import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchNocoDBLeads, formatLeadData } from './nocodb';

describe('lead API client', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('loads leads only through the dashboard server endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ list: [{ Id: 1 }], total: 1 }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchNocoDBLeads();

    expect(fetchMock).toHaveBeenCalledWith('/api/leads');
    expect(result.data).toEqual([{ Id: 1 }]);
    expect(result.isLive).toBe(true);
  });

  it('does not replace a private-data outage with fake lead records', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }));

    const result = await fetchNocoDBLeads();

    expect(result.data).toEqual([]);
    expect(result.isLive).toBe(false);
  });

  it('formats lead data with SDR agent fields and scheduling status', () => {
    const leadScheduled = formatLeadData({
      Id: 101,
      nome: 'Pedro Paulo',
      aguardando_especialista: true,
      horario_agendado: 'Quarta-feira às 14h',
      resumo_conversa: 'Produtor de soja em MG interessado em travar safra',
    });

    expect(leadScheduled.isAgendado).toBe(true);
    expect(leadScheduled.statusAtendimentoKey).toBe('agendado');
    expect(leadScheduled.statusAtendimentoLabel).toBe('Reunião Agendada');
    expect(leadScheduled.horarioAgendado).toBe('Quarta-feira às 14h');
    expect(leadScheduled.resumoConversa).toContain('Produtor de soja');

    const leadInCare = formatLeadData({
      Id: 102,
      nome: 'Carlos Fazenda',
      em_atendimento: true,
    });

    expect(leadInCare.isEmAtendimento).toBe(true);
    expect(leadInCare.statusAtendimentoKey).toBe('atendimento');
    expect(leadInCare.statusAtendimentoLabel).toBe('Em Atendimento (SDR)');
  });
});
