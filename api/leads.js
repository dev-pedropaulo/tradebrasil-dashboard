import { NocoDBConfigurationError, listRecords } from './_lib/nocodb.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido.' });
  try {
    const list = await listRecords('leads');
    return res.status(200).json({ list, total: list.length });
  } catch (error) {
    console.error('Lead API error', error);
    if (error instanceof NocoDBConfigurationError) {
      return res.status(503).json({ error: 'A integração privada do NocoDB ainda não foi configurada.' });
    }
    return res.status(502).json({ error: 'Não foi possível carregar a base de leads.' });
  }
}
