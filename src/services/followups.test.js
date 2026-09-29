import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cancelFollowupSchedule,
  createFollowupSchedule,
  deleteFollowupTemplate,
  fetchFollowupWorkspace,
  updateFollowupTemplate,
} from './followups';

describe('follow-up API client', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('loads the workspace through the private application API', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ leads: [], templates: [], schedules: [], events: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await fetchFollowupWorkspace();

    expect(fetchMock).toHaveBeenCalledWith('/api/followups?action=workspace', expect.objectContaining({
      headers: { 'Content-Type': 'application/json' },
    }));
  });

  it('sends new schedules as JSON without exposing NocoDB credentials', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ schedule: { id: 1 } }) });
    vi.stubGlobal('fetch', fetchMock);

    await createFollowupSchedule({ leadId: 12, recurrenceDays: 30 });

    expect(fetchMock).toHaveBeenCalledWith('/api/followups?action=schedule', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ leadId: 12, recurrenceDays: 30 }),
    }));
  });

  it('surfaces API errors with their safe message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Lead sem telefone válido.' }),
    }));

    await expect(createFollowupSchedule({})).rejects.toThrow('Lead sem telefone válido.');
  });

  it('updates a template sending id as a proper query param', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ template: { id: 2 } }) });
    vi.stubGlobal('fetch', fetchMock);

    await updateFollowupTemplate(2, { nome: 'Atualizado' });

    expect(fetchMock).toHaveBeenCalledWith('/api/followups?action=template&id=2', expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ nome: 'Atualizado' }),
    }));
  });

  it('cancels a schedule sending id as a proper query param', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ schedule: { id: 5, status: 'cancelado' } }) });
    vi.stubGlobal('fetch', fetchMock);

    await cancelFollowupSchedule(5);

    expect(fetchMock).toHaveBeenCalledWith('/api/followups?action=schedule&id=5', expect.objectContaining({
      method: 'DELETE',
    }));
  });

  it('deletes a template sending id as a proper query param', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, id: 3 }) });
    vi.stubGlobal('fetch', fetchMock);

    await deleteFollowupTemplate(3);

    expect(fetchMock).toHaveBeenCalledWith('/api/followups?action=template&id=3', expect.objectContaining({
      method: 'DELETE',
    }));
  });
});
