import React from 'react';
import { COMMODITY_QUOTES } from '../services/marketData';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function MarketTicker() {
  const items = Object.values(COMMODITY_QUOTES);

  return (
    <div className="clean-card" style={{
      padding: '0.65rem 1rem',
      marginBottom: '1.5rem',
      background: 'var(--bg-card)'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        {/* Title */}
        <span style={{
          fontSize: '0.72rem',
          fontWeight: 700,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em'
        }}>
          Cotações Agrícolas (B3 / CBOT)
        </span>

        {/* Ticker Items */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem',
          flexWrap: 'wrap'
        }}>
          {items.map((item) => {
            const isUp = item.trend === 'up';
            return (
              <div key={item.symbol} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.8rem'
              }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{item.name.split(' ')[0]}:</span>
                <span className="font-mono" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  R$ {item.price.toFixed(2)}
                </span>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  color: isUp ? 'var(--accent-emerald)' : 'var(--accent-rose)'
                }}>
                  {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  <span style={{ marginLeft: '2px' }}>{item.changePercent}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
