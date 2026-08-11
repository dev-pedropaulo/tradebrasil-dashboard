import React from 'react';
import { Users, DollarSign, Flame, Wheat } from 'lucide-react';

export default function KPICards({ leadsFormatted, portfolioStats }) {
  const safeLeads = Array.isArray(leadsFormatted) ? leadsFormatted : [];
  const totalLeads = safeLeads.length;
  const hotLeadsCount = safeLeads.filter(l => l && l.isHot).length;
  const hotLeadsPercent = totalLeads > 0 ? Math.round((hotLeadsCount / totalLeads) * 100) : 0;

  const totalValorR$ = portfolioStats ? portfolioStats.totalExposicaoR$ : 0;
  const totalSacas = portfolioStats ? portfolioStats.totalSacasGeral : 0;
  const totalBois = portfolioStats ? portfolioStats.totalBois : 0;

  const cards = [
    {
      title: "Total de Produtores",
      value: totalLeads.toString(),
      subtitle: `${hotLeadsCount} prontos para operar`,
      icon: Users,
      badge: `${hotLeadsPercent}% Quentes`,
      badgeClass: "badge-emerald"
    },
    {
      title: "Prontidão (Hot Leads)",
      value: `${hotLeadsPercent}%`,
      subtitle: `${hotLeadsCount} de ${totalLeads} produtores`,
      icon: Flame,
      badge: "Alta Urgência",
      badgeClass: "badge-amber"
    }
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
      gap: '1rem',
      marginBottom: '1.5rem'
    }}>
      {cards.map((c, i) => {
        const IconComponent = c.icon;
        return (
          <div key={i} className="clean-card clean-card-hover" style={{ padding: '1.15rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.65rem'
            }}>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                {c.title}
              </span>
              <span className={`badge-clean ${c.badgeClass}`}>{c.badge}</span>
            </div>

            <div className="font-mono" style={{
              fontSize: '1.6rem',
              fontWeight: 700,
              fontFamily: 'var(--font-heading)',
              color: 'var(--text-primary)',
              lineHeight: 1.1,
              marginBottom: '0.35rem'
            }}>
              {c.value}
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {c.subtitle}
            </div>
          </div>
        );
      })}
    </div>
  );
}
