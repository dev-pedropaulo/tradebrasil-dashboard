import React, { useState } from 'react';
import { simulateHedgeStrategy, COMMODITY_QUOTES } from '../services/marketData';
import { Calculator, ArrowRight, CheckCircle, AlertTriangle } from 'lucide-react';

export default function HedgeSimulator({ leadsFormatted }) {
  const [commodity, setCommodity] = useState('soja');
  const [volumeInput, setVolumeInput] = useState(25000);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [customTaxa, setCustomTaxa] = useState(1.5);

  const handleSelectLead = (e) => {
    const leadId = e.target.value;
    setSelectedLeadId(leadId);

    if (leadId) {
      const lead = leadsFormatted.find(l => l.Id.toString() === leadId);
      if (lead) {
        if (lead.atuacao?.includes('pecu')) {
          setCommodity('boi');
          setVolumeInput(1200);
        } else {
          setCommodity(lead.cultura_principal?.toLowerCase().includes('milh') ? 'milho' : 'soja');
          setVolumeInput(30000);
        }
      }
    }
  };

  const result = simulateHedgeStrategy({
    tipoCommodity: commodity,
    volume: Number(volumeInput) || 0,
    precoGarantido: COMMODITY_QUOTES[commodity.toUpperCase()]?.price || 100,
    taxaProtecaoPercent: Number(customTaxa) || 1.5
  });

  return (
    <div className="clean-card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <Calculator size={18} color="var(--text-secondary)" />
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', fontWeight: 800 }}>
          Simulador de Trava de Preço (Hedge Agrícola)
        </h2>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1.25rem'
      }}>
        {/* Controls */}
        <div style={{
          background: 'var(--bg-surface)',
          padding: '1.15rem',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)'
        }}>
          <div style={{ marginBottom: '0.85rem' }}>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
              SELECIONAR PRODUTOR DA BASE
            </label>
            <select className="clean-select" value={selectedLeadId} onChange={handleSelectLead}>
              <option value="">-- Personalizado / Entrada Livre --</option>
              {leadsFormatted.map(l => (
                <option key={l.Id} value={l.Id}>
                  #{l.Id} - {l.nome} ({l.atuacaoLabel} - {l.estado})
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '0.85rem' }}>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
              COMMODITY
            </label>
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              {[
                { id: 'soja', label: 'Soja (CBOT)' },
                { id: 'milho', label: 'Milho (B3)' },
                { id: 'boi', label: 'Boi Gordo (B3)' }
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setCommodity(item.id)}
                  className="btn-clean"
                  style={{
                    flex: 1,
                    padding: '0.4rem',
                    fontSize: '0.75rem',
                    background: commodity === item.id ? '#1e293b' : 'transparent',
                    borderColor: commodity === item.id ? 'var(--border-medium)' : 'var(--border-subtle)',
                    color: commodity === item.id ? '#ffffff' : 'var(--text-secondary)'
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '0.85rem' }}>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
              VOLUME ({result.unitName.toUpperCase()})
            </label>
            <input
              type="number"
              className="clean-input font-mono"
              value={volumeInput}
              onChange={(e) => setVolumeInput(e.target.value)}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
              CUSTO ESTIMADO DO SEGURO PUT (% DO VTV)
            </label>
            <input
              type="number"
              step="0.1"
              className="clean-input font-mono"
              value={customTaxa}
              onChange={(e) => setCustomTaxa(e.target.value)}
            />
          </div>
        </div>

        {/* Results */}
        <div style={{
          background: 'var(--bg-surface)',
          padding: '1.15rem',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.85rem', color: 'var(--text-primary)' }}>
              Resultado da Operação
            </h4>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Preço Atual no Mercado:</span>
              <strong className="font-mono" style={{ color: 'var(--text-primary)' }}>R$ {result.unitPrice.toFixed(2)}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Valor Total (Sem Hedge):</span>
              <strong className="font-mono" style={{ color: 'var(--text-primary)' }}>R$ {result.valorMercadoSemHedge.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Custo da Opção (Prêmio):</span>
              <strong className="font-mono" style={{ color: 'var(--accent-amber)' }}>R$ {result.custoPremio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
            </div>

            <div style={{
              background: 'rgba(244, 63, 94, 0.06)',
              border: '1px solid rgba(244, 63, 94, 0.2)',
              borderRadius: '4px',
              padding: '0.75rem',
              marginTop: '0.85rem'
            }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--accent-rose)', fontWeight: 700, marginBottom: '0.25rem' }}>
                Cenário de Estresse (-20% no Preço da Commodity)
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Prejuízo Evitado com Trava:</span>
                <strong className="font-mono" style={{ color: 'var(--accent-emerald)' }}>
                  + R$ {result.perdaEvitada20.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
