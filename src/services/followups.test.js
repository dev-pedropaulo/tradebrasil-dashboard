import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFollowupSchedule, fetchFollowupWorkspace } from './followups';

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
});
