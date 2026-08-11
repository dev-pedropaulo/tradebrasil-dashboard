import React from 'react';
import { normalizeState } from '../utils/normalizeState';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { PieChart as PieIcon, BarChart3, MapPin, Zap } from 'lucide-react';

const COLOR_EMERALD = '#10B981';
const COLOR_SLATE = '#475569';
const COLOR_AMBER = '#F59E0B';
const COLOR_CYAN = '#0EA5E9';

// Custom Tooltip
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: '#0f141f',
        border: '1px solid rgba(255,255,255,0.12)',
        padding: '0.5rem 0.75rem',
        borderRadius: '4px',
        fontSize: '0.75rem'
      }}>
        <p style={{ fontWeight: 700, color: '#ffffff' }}>{label || payload[0].name}</p>
        <p style={{ color: 'var(--accent-emerald)', marginTop: '0.15rem' }}>
          Quantidade: <strong>{payload[0].value} lead(s)</strong>
        </p>
      </div>
    );
  }
  return null;
};

/**
 * Analytics Charts component for "Setor de Atuação" and "Intenção de Proteção de Preço"
 * Rendered BEFORE the Brazil Map.
 */
export default function AnalyticsCharts({ leadsFormatted }) {
  // 1. Process Data for Atuação
  const atuacaoCounts = leadsFormatted.reduce((acc, curr) => {
    const key = curr.atuacaoLabel || 'Outros';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const dataAtuacao = Object.keys(atuacaoCounts).map(key => ({
    name: key,
    value: atuacaoCounts[key]
  }));

  const COLORS_ATUACAO = [COLOR_EMERALD, COLOR_AMBER, COLOR_CYAN, COLOR_SLATE];

  // 2. Process Data for Momento de Proteção
  const momentoCounts = leadsFormatted.reduce((acc, curr) => {
    const key = curr.momentoLabel || 'Outros';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const dataMomento = Object.keys(momentoCounts).map(key => ({
    name: key,
    value: momentoCounts[key]
  }));

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
      gap: '1.25rem',
      marginBottom: '1.5rem'
    }}>
      {/* Chart 1: Atuação Principal (Donut) */}
      <div className="clean-card" style={{ padding: '1.15rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem' }}>
          <PieIcon size={16} color="var(--text-secondary)" />
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.9rem', fontWeight: 700 }}>
            Setor de Atuação
          </h3>
        </div>

        <div style={{ width: '100%', height: 230 }}>
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie
                data={dataAtuacao}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
              >
                {dataAtuacao.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS_ATUACAO[index % COLORS_ATUACAO.length]} stroke="var(--bg-card)" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={30}
                formatter={(value) => <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Urgência do Lead (Intenção de Proteção de Preço) */}
      <div className="clean-card" style={{ padding: '1.15rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem' }}>
          <Zap size={16} color="var(--text-secondary)" />
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.9rem', fontWeight: 700 }}>
            Intenção de Proteção de Preço
          </h3>
        </div>

        <div style={{ width: '100%', height: 230 }}>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={dataMomento} margin={{ top: 10, right: 20, left: -15, bottom: 20 }}>
              <CartesianGrid strokeDasharray="2 2" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} interval={0} />
              <YAxis stroke="var(--text-muted)" fontSize={10} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {dataMomento.map((entry, index) => (
                  <Cell
                    key={`cell-m-${index}`}
                    fill={entry.name && entry.name.includes('Pronto') ? COLOR_EMERALD : COLOR_SLATE}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/**
 * State Distribution Bar Chart component (rendered after Brazil map)
 */
export function StateDistributionChart({ leadsFormatted }) {
  const estadoCounts = leadsFormatted.reduce((acc, curr) => {
    const uf = curr.estado ? normalizeState(curr.estado) : 'N/I';
    acc[uf] = (acc[uf] || 0) + 1;
    return acc;
  }, {});

  const dataEstados = Object.keys(estadoCounts).map(uf => ({
    uf,
    quantidade: estadoCounts[uf]
  })).sort((a, b) => b.quantidade - a.quantidade);

  return (
    <div className="clean-card" style={{ padding: '1.15rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem' }}>
        <MapPin size={16} color="var(--text-secondary)" />
        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.9rem', fontWeight: 700 }}>
          Concentração de Leads por Estado (UF)
        </h3>
      </div>

      <div style={{ width: '100%', height: 200 }}>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={dataEstados} margin={{ top: 5, right: 20, left: -15, bottom: 20 }}>
            <CartesianGrid strokeDasharray="2 2" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="uf" stroke="var(--text-muted)" fontSize={10} />
            <YAxis stroke="var(--text-muted)" fontSize={10} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="quantidade" fill={COLOR_EMERALD} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
