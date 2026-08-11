const fs = require('fs');
const https = require('https');

const url = 'https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson';

https.get(url, (res) => {
  let body = '';
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    try {
      const geojson = JSON.parse(body);
      processGeoJSON(geojson);
    } catch (e) {
      console.error('JSON Parse Error:', e.message);
    }
  });
}).on('error', (err) => {
  console.error('HTTP Error:', err.message);
});

function processGeoJSON(geojson) {
  const minLon = -74.0;
  const maxLon = -34.5;
  const minLat = -33.8;
  const maxLat = 5.3;

  const width = 600;
  const height = 580;

  function project(lon, lat) {
    const x = ((lon - minLon) / (maxLon - minLon)) * width;
    const y = height - ((lat - minLat) / (maxLat - minLat)) * height;
    return [x, y];
  }

  function ringToD(ring) {
    return ring.map((pt, i) => {
      const [x, y] = project(pt[0], pt[1]);
      return (i === 0 ? 'M' : 'L') + ` ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ') + ' Z';
  }

  function geometryToD(geom) {
    if (geom.type === 'Polygon') {
      return geom.coordinates.map(ringToD).join(' ');
    } else if (geom.type === 'MultiPolygon') {
      return geom.coordinates.map(polygon => polygon.map(ringToD).join(' ')).join(' ');
    }
    return '';
  }

  // Proper polygon centroid using signed-area formula
  function polygonCentroid(ring) {
    let area = 0, cx = 0, cy = 0;
    const n = ring.length;
    for (let i = 0; i < n - 1; i++) {
      const [x0, y0] = project(ring[i][0], ring[i][1]);
      const [x1, y1] = project(ring[i + 1][0], ring[i + 1][1]);
      const cross = x0 * y1 - x1 * y0;
      area += cross;
      cx += (x0 + x1) * cross;
      cy += (y0 + y1) * cross;
    }
    area *= 0.5;
    if (Math.abs(area) < 1e-10) {
      // Fallback: average all points
      let sx = 0, sy = 0;
      ring.forEach(p => { const [x, y] = project(p[0], p[1]); sx += x; sy += y; });
      return { cx: sx / ring.length, cy: sy / ring.length, area: 0 };
    }
    cx /= (6 * area);
    cy /= (6 * area);
    return { cx, cy, area: Math.abs(area) };
  }

  function geometryCentroid(geom) {
    let rings = [];
    if (geom.type === 'Polygon') {
      rings = [geom.coordinates[0]]; // outer ring only
    } else if (geom.type === 'MultiPolygon') {
      rings = geom.coordinates.map(poly => poly[0]); // outer ring of each polygon
    }

    // Find centroid of the largest polygon (by area)
    let bestArea = 0, bestCx = 300, bestCy = 300;
    rings.forEach(ring => {
      const c = polygonCentroid(ring);
      if (c.area > bestArea) {
        bestArea = c.area;
        bestCx = c.cx;
        bestCy = c.cy;
      }
    });

    return { cx: parseFloat(bestCx.toFixed(1)), cy: parseFloat(bestCy.toFixed(1)) };
  }

  const ufMap = {
    "Acre": "AC", "Alagoas": "AL", "Amapá": "AP", "Amazonas": "AM",
    "Bahia": "BA", "Ceará": "CE", "Distrito Federal": "DF", "Espírito Santo": "ES",
    "Goiás": "GO", "Maranhão": "MA", "Mato Grosso": "MT", "Mato Grosso do Sul": "MS",
    "Minas Gerais": "MG", "Pará": "PA", "Paraíba": "PB", "Paraná": "PR",
    "Pernambuco": "PE", "Piauí": "PI", "Rio de Janeiro": "RJ", "Rio Grande do Norte": "RN",
    "Rio Grande do Sul": "RS", "Rondônia": "RO", "Roraima": "RR", "Santa Catarina": "SC",
    "São Paulo": "SP", "Sergipe": "SE", "Tocantins": "TO"
  };

  const states = [];

  geojson.features.forEach(feat => {
    const name = feat.properties.name || feat.properties.description || feat.properties.cartodb_id;
    const sigla = ufMap[name] || feat.properties.sigla || name;
    const d = geometryToD(feat.geometry);
    const { cx, cy } = geometryCentroid(feat.geometry);

    states.push({
      id: sigla,
      name: name,
      d: d,
      cx: cx,
      cy: cy
    });
  });

  // Print computed centroids for verification
  states.forEach(st => {
    console.log(`${st.id} (${st.name}): cx=${st.cx}, cy=${st.cy}`);
  });

  console.log(`\nParsed ${states.length} states with geometric centroids!`);

  const jsxCode = `import React, { useState } from 'react';
import { normalizeState } from '../utils/normalizeState';

/**
 * Official IBGE High-Precision SVG Vector Map of Brazil (26 States + DF)
 */
const BRAZIL_REAL_STATES = ${JSON.stringify(states, null, 2)};

export default function BrazilMap({ leadsFormatted }) {
  const [hoveredState, setHoveredState] = useState(null);

  const leadCountsByUF = leadsFormatted.reduce((acc, lead) => {
    const stateCode = normalizeState(lead.estado);
    if (stateCode && stateCode !== 'N/I') {
      acc[stateCode] = (acc[stateCode] || 0) + 1;
    }
    return acc;
  }, {});

  const totalLeads = leadsFormatted.length;

  return (
    <div className="clean-card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1rem',
        flexWrap: 'wrap',
        gap: '0.5rem'
      }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Mapa do Brasil - Concentração de Leads por Estado
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Passe o mouse sobre os estados para visualizar a quantidade de produtores cadastrados.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ width: '10px', height: '10px', background: '#1e293b', borderRadius: '2px', display: 'inline-block' }} />
            <span>0 leads</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ width: '10px', height: '10px', background: '#059669', borderRadius: '2px', display: 'inline-block' }} />
            <span>1 a 2 leads</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ width: '10px', height: '10px', background: '#10b981', borderRadius: '2px', display: 'inline-block' }} />
            <span>3+ leads</span>
          </div>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.5rem',
        alignItems: 'center'
      }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '540px', margin: '0 auto' }}>
          <svg
            viewBox="0 0 600 580"
            style={{ width: '100%', height: 'auto', display: 'block' }}
          >
            {BRAZIL_REAL_STATES.map((st) => {
              const count = leadCountsByUF[st.id] || 0;
              const isHovered = hoveredState?.id === st.id;

              let fillColor = '#1e293b';
              if (count >= 3) fillColor = '#10b981';
              else if (count >= 1) fillColor = '#059669';
              if (isHovered) fillColor = '#34d399';

              return (
                <g key={st.id}>
                  <path
                    d={st.d}
                    fill={fillColor}
                    stroke="#080b11"
                    strokeWidth="1.2"
                    strokeLinejoin="round"
                    style={{
                      cursor: 'pointer',
                      transition: 'fill 0.15s ease, filter 0.15s ease',
                      filter: isHovered ? 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.8))' : 'none'
                    }}
                    onMouseEnter={() => setHoveredState({ ...st, count })}
                    onMouseLeave={() => setHoveredState(null)}
                  />
                  <text
                    x={st.cx}
                    y={st.cy}
                    fill={count > 0 ? '#ffffff' : '#94a3b8'}
                    fontSize={st.id === 'DF' ? '6.5' : '9'}
                    fontWeight="700"
                    fontFamily="var(--font-heading)"
                    textAnchor="middle"
                    dominantBaseline="central"
                    pointerEvents="none"
                  >
                    {st.id}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div style={{
          background: 'var(--bg-surface)',
          padding: '1.25rem',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)',
          minHeight: '220px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          {hoveredState ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {hoveredState.name} ({hoveredState.id})
                </h4>
                <span className={\`badge-clean \${hoveredState.count > 0 ? 'badge-emerald' : 'badge-neutral'}\`}>
                  {hoveredState.count > 0 ? 'Com Produtores' : 'Sem Produtores'}
                </span>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Total de Produtores Cadastrados:
              </div>
              <div className="font-mono" style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-emerald)', marginBottom: '0.75rem' }}>
                {hoveredState.count} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>lead(s)</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Representa <strong>{totalLeads > 0 ? ((hoveredState.count / totalLeads) * 100).toFixed(1) : 0}%</strong> da base total do NocoDB.
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🗺️</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Passe o cursor sobre qualquer estado do mapa
              </div>
              <p style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                Para visualizar a quantidade e percentual de produtores cadastrados por UF.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
`;

  fs.writeFileSync('C:\\Users\\devpe\\tradebrasil-dashboard\\src\\components\\BrazilMap.jsx', jsxCode);
  console.log('BrazilMap.jsx written with true geometric centroids!');
}
