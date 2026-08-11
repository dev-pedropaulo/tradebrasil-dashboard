import React from 'react';
import { X, User, Phone, ShieldCheck, MessageSquare, Calculator } from 'lucide-react';
import { COMMODITY_QUOTES } from '../services/marketData';

export default function LeadModal({ lead, onClose, onSimulateHedge }) {
  if (!lead) return null;

  const isPecuaria = lead.atuacaoLabel === 'Pecuária';

  let estimatedExposureR$ = 0;
  if (isPecuaria) {
    let heads = 750;
    if (lead.volume_bois?.includes('1.000')) heads = 1500;
    if (lead.volume_bois?.includes('acima')) heads = 3000;
    estimatedExposureR$ = heads * 18 * COMMODITY_QUOTES.BOI.price;
  } else {
    let sacas = 15000;
    if (lead.volume_safra?.includes('20_a_50')) sacas = 35000;
    if (lead.volume_safra?.includes('50_a_100')) sacas = 75000;
    if (lead.volume_safra?.includes('acima')) sacas = 120000;
    const price = lead.cultura_principal?.toLowerCase().includes('milh')
      ? COMMODITY_QUOTES.MILHO.price
      : COMMODITY_QUOTES.SOJA.price;
    estimatedExposureR$ = sacas * price;
  }

  const phoneClean = lead.telefone ? lead.telefone.replace(/\D/g, '') : '';
  const waUrl = phoneClean ? `https://wa.me/${phoneClean}?text=Olá%20${encodeURIComponent(lead.nome || '')},%20sou%20da%20Brasil%20Trade%20Agro!` : '#';

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(4px)',
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }}>
      <div className="clean-card" style={{
        maxWidth: '540px',
        width: '100%',
        padding: '1.5rem',
        background: 'var(--bg-card)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 800 }}>
              {lead.nome || 'Produtor Sem Nome'}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.2rem' }}>
              <span className="badge-clean badge-neutral">ID #{lead.Id}</span>
              <span className="badge-clean badge-neutral">{lead.estado || 'UF N/I'}</span>
              {lead.isHot ? (
                <span className="badge-clean badge-emerald">Pronto</span>
              ) : (
                <span className="badge-clean badge-amber">Educacional</span>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Info Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '0.85rem',
          marginBottom: '1rem',
          background: 'var(--bg-surface)',
          padding: '0.85rem',
          borderRadius: 'var(--radius-sm)'
        }}>
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>TELEFONE</span>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: '0.1rem' }} className="font-mono">
              {lead.telefone || 'Não informado'}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>SETOR</span>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: '0.1rem', color: 'var(--accent-emerald)' }}>
              {lead.atuacaoLabel}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>CULTURA</span>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: '0.1rem' }}>
              {lead.culturaLabel}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>VOLUME</span>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: '0.1rem' }} className="font-mono">
              {isPecuaria ? lead.volumeBoisLabel : lead.volumeSafraLabel}
            </div>
          </div>
        </div>

        {/* Financial Exposure Card */}
        <div style={{
          background: 'var(--bg-surface)',
          padding: '0.85rem',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '1.25rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Valor Estimado da Produção:</span>
            <strong className="font-mono" style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>
              R$ {estimatedExposureR$.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </strong>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {phoneClean && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-clean btn-emerald"
              style={{ flex: 1, textDecoration: 'none' }}
            >
              <MessageSquare size={14} />
              <span>WhatsApp</span>
            </a>
          )}

          <button
            onClick={() => {
              onClose();
              if (onSimulateHedge) onSimulateHedge(lead);
            }}
            className="btn-clean"
            style={{ flex: 1 }}
          >
            <Calculator size={14} />
            <span>Simular Hedge</span>
          </button>
        </div>
      </div>
    </div>
  );
}
