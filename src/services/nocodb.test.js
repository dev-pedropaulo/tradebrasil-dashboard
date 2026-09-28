import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchNocoDBLeads } from './nocodb';

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
});
