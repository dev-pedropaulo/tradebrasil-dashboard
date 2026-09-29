const TABLE_ENV = {
  leads: 'NOCODB_LEADS_TABLE_ID',
  templates: 'NOCODB_FOLLOWUP_TEMPLATES_TABLE_ID',
  schedules: 'NOCODB_FOLLOWUP_SCHEDULES_TABLE_ID',
  events: 'NOCODB_FOLLOWUP_EVENTS_TABLE_ID',
};

export class NocoDBConfigurationError extends Error {}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new NocoDBConfigurationError(`Variável de servidor ausente: ${name}.`);
  return value;
}

export function tableId(name) {
  const variableName = TABLE_ENV[name];
  if (!variableName) throw new Error(`Tabela NocoDB desconhecida: ${name}.`);
  return requiredEnv(variableName);
}

async function request(path, options = {}) {
  const baseUrl = requiredEnv('NOCODB_BASE_URL').replace(/\/$/, '');
  const token = requiredEnv('NOCODB_API_TOKEN');
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'xc-token': token,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.msg || payload.message || 'Falha ao comunicar com o NocoDB.');
  }
  return payload;
}

export async function listRecords(name, params = {}) {
  const query = new URLSearchParams({ limit: '1000', ...params });
  const data = await request(`/api/v2/tables/${tableId(name)}/records?${query}`);
  return data.list || [];
}

export function createRecord(name, fields) {
  const payload = { ...fields };
  if (name !== 'leads' && !payload.id && !payload.Id) {
    payload.id = Date.now();
  }
  return request(`/api/v2/tables/${tableId(name)}/records`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateRecord(name, id, fields) {
  const pk = Number(id);
  return request(`/api/v2/tables/${tableId(name)}/records`, {
    method: 'PATCH',
    body: JSON.stringify({ id: pk, Id: pk, ...fields }),
  });
}

export function deleteRecord(name, id) {
  const pk = Number(id);
  return request(`/api/v2/tables/${tableId(name)}/records`, {
    method: 'DELETE',
    body: JSON.stringify({ id: pk, Id: pk }),
  });
}
