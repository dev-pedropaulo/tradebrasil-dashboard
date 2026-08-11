import React from 'react';
import Logo from './Logo';
import { RefreshCw, Database } from 'lucide-react';

export default function Header({ isLive, onRefresh }) {
  return (
    <header style={{
      background: 'var(--bg-card)',
      borderBottom: '1px solid var(--border-subtle)',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      padding: '0.75rem 1.5rem'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        {/* Official Brand Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Logo height={42} showText={true} />
          <div style={{
            height: '24px',
            width: '1px',
            background: 'var(--border-subtle)',
            margin: '0 0.25rem'
          }} />
          <span style={{
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Dashboard de Preços & Leads
          </span>
        </div>

        {/* Action Controls & Connection Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Status Indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: 'var(--bg-surface)',
            padding: '0.35rem 0.75rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.75rem'
          }}>
            <Database size={13} color="var(--text-muted)" />
            <span style={{ color: 'var(--text-secondary)' }}>Base de Dados:</span>
            <strong style={{ color: isLive ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
              {isLive ? 'Conectada' : 'Modo Offline'}
            </strong>
          </div>

          {/* Sync Button */}
          <button
            onClick={() => onRefresh()}
            className="btn-clean"
            title="Sincronizar Base de Dados"
          >
            <RefreshCw size={13} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>
    </header>
  );
}
