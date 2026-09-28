import { normalizePhone } from './followupRecords.js';

export function parseInboundEvolutionMessage(payload) {
  const data = payload?.data || payload;
  const key = data?.key || data?.message?.key;
  const content = data?.message || data?.message?.message;
  const remoteJid = key?.remoteJid;
  if (!key || !content || key.fromMe || !remoteJid || remoteJid.endsWith('@g.us')) return null;
  const phone = normalizePhone(remoteJid.split('@')[0]);
  if (!phone) return null;
  return { phone, providerMessageId: key.id || null };
}
