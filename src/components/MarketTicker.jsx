import React, { useState, useEffect } from 'react';
import { fetchLiveMarketQuotes, INITIAL_QUOTES } from '../services/marketData';
import { TrendingUp, TrendingDown, Radio } from 'lucide-react';

export default function MarketTicker() {
  const [quotes, setQuotes] = useState(INITIAL_QUOTES);
  const [isLive, setIsLive] = useState(false);

  const updateQuotes = async () => {
    try {
      const res = await fetchLiveMarketQuotes();
      if (res && res.quotes) {
        setQuotes(res.quotes);
        setIsLive(!!res.isLive);
      }
    } catch (err) {
      console.warn('MarketTicker update failed gracefully:', err);
    }
  };

  useEffect(() => {
    updateQuotes();
    const interval = setInterval(updateQuotes, 30000);
    return () => clearInterval(interval);
  }, []);

  const safeQuotes = quotes || INITIAL_QUOTES;
  const items = Object.values(safeQuotes);

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
        {/* Title & Live Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em'
          }}>
            Cotações Agrícolas (B3 / CBOT)
          </span>

          <span className={`badge-clean ${isLive ? 'badge-emerald' : 'badge-neutral'}`} style={{ fontSize: '0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <Radio size={10} style={{ animation: isLive ? 'pulse 2s infinite' : 'none' }} />
            {isLive ? 'AO VIVO' : 'MERCADO'}
          </span>
        </div>

        {/* Ticker Items */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem',
          flexWrap: 'wrap'
        }}>
          {items.map((item, idx) => {
            if (!item) return null;
            const isUp = item.trend === 'up';
            const nameLabel = item.name ? String(item.name).split(' ')[0] : (item.symbol || 'Cotação');
            const priceVal = typeof item.price === 'number' ? item.price.toFixed(2) : (item.price || '0.00');

            return (
              <div key={item.symbol || idx} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.8rem'
              }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{nameLabel}:</span>
                <span className="font-mono" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  R$ {priceVal}
                </span>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  color: isUp ? 'var(--accent-emerald)' : 'var(--accent-rose)'
                }}>
                  {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  <span style={{ marginLeft: '2px' }}>{item.changePercent || '0.00%'}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
