import { describe, expect, it } from 'vitest';
import { parseInboundEvolutionMessage } from './evolutionInbound.js';

describe('Evolution inbound webhook parser', () => {
  it('extracts a valid inbound private message from an Evolution event', () => {
    expect(parseInboundEvolutionMessage({
      data: {
        key: { remoteJid: '5543999990000@s.whatsapp.net', fromMe: false, id: 'abc' },
        message: { conversation: 'Tenho interesse' },
      },
    })).toEqual({ phone: '5543999990000', providerMessageId: 'abc' });
  });

  it('ignores outbound, group, and non-message events', () => {
    expect(parseInboundEvolutionMessage({ data: { key: { remoteJid: '5543999990000@s.whatsapp.net', fromMe: true }, message: { conversation: 'Oi' } } })).toBeNull();
    expect(parseInboundEvolutionMessage({ data: { key: { remoteJid: '123@g.us', fromMe: false }, message: { conversation: 'Oi' } } })).toBeNull();
    expect(parseInboundEvolutionMessage({ data: { key: { remoteJid: '5543999990000@s.whatsapp.net', fromMe: false } } })).toBeNull();
  });
});
