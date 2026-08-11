import React, { useState } from 'react';
import { Search, Download, Eye, Phone } from 'lucide-react';

export default function LeadTable({ leadsFormatted, onSelectLead }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAtuacao, setFilterAtuacao] = useState('all');
  const [filterMomento, setFilterMomento] = useState('all');
  const [filterEstado, setFilterEstado] = useState('all');

  const states = Array.from(new Set(leadsFormatted.map(l => l.estado).filter(Boolean))).sort();

  const filteredLeads = leadsFormatted.filter(lead => {
    const matchesSearch =
      (lead.nome && String(lead.nome).toLowerCase().includes(searchTerm.toLowerCase())) ||
      (lead.telefone && String(lead.telefone).includes(searchTerm)) ||
      (lead.id_meta && String(lead.id_meta).includes(searchTerm)) ||
      (lead.estado && String(lead.estado).toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesAtuacao =
      filterAtuacao === 'all' ||
      (filterAtuacao === 'pecuaria' && lead.atuacaoLabel === 'Pecuária') ||
      (filterAtuacao === 'graos' && lead.atuacaoLabel === 'Produção de Grãos');

    const matchesMomento =
      filterMomento === 'all' ||
      (filterMomento === 'hot' && lead.isHot) ||
      (filterMomento === 'warm' && !lead.isHot);

    const matchesEstado =
      filterEstado === 'all' || lead.estado === filterEstado;

    return matchesSearch && matchesAtuacao && matchesMomento && matchesEstado;
  });

  const handleExportCSV = () => {
    const headers = ['Id', 'Nome', 'Telefone', 'Estado', 'Atuacao', 'Cultura', 'Volume Safra', 'Volume Bois', 'Momento Protecao', 'ID Meta', 'Data Criacao'];
    const rows = filteredLeads.map(l => [
      l.Id,
      `"${l.nome || ''}"`,
      `"${l.telefone || ''}"`,
      `"${l.estado || ''}"`,
      `"${l.atuacaoLabel || ''}"`,
      `"${l.culturaLabel || ''}"`,
      `"${l.volumeSafraLabel || ''}"`,
      `"${l.volumeBoisLabel || ''}"`,
      `"${l.momentoLabel || ''}"`,
      `"${l.id_meta || ''}"`,
      `"${l.CreatedAt || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BrasilTradeAgro_Leads_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="clean-card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        marginBottom: '1rem'
      }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', fontWeight: 800 }}>
            Base Geral de Produtores Rurais
          </h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Exibindo <strong>{filteredLeads.length}</strong> de {leadsFormatted.length} registros
          </span>
        </div>

        <button
          onClick={handleExportCSV}
          className="btn-clean"
        >
          <Download size={13} />
          <span>Exportar CSV</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '0.65rem',
        marginBottom: '1rem'
      }}>
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            className="clean-input"
            style={{ paddingLeft: '2rem' }}
            placeholder="Buscar produtor ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)' }} />
        </div>

        {/* Filter Atuação */}
        <select className="clean-select" value={filterAtuacao} onChange={(e) => setFilterAtuacao(e.target.value)}>
          <option value="all">Todas as Atuações</option>
          <option value="graos">Produção de Grãos</option>
          <option value="pecuaria">Pecuária</option>
        </select>

        {/* Filter Momento */}
        <select className="clean-select" value={filterMomento} onChange={(e) => setFilterMomento(e.target.value)}>
          <option value="all">Todos os Momentos</option>
          <option value="hot">Quentes (Prontos)</option>
          <option value="warm">Mornos (Buscando)</option>
        </select>

        {/* Filter Estado */}
        <select className="clean-select" value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)}>
          <option value="all">Todos os Estados</option>
          {states.map(uf => (
            <option key={uf} value={uf}>{uf}</option>
          ))}
        </select>
      </div>

      {/* Table Data */}
      <div className="clean-table-container">
        <table className="clean-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Produtor</th>
              <th>Telefone</th>
              <th>UF</th>
              <th>Setor / Cultura</th>
              <th>Volume</th>
              <th>Intenção de Proteção</th>
              <th style={{ textAlign: 'right' }}>Ação</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  Nenhum registro encontrado.
                </td>
              </tr>
            ) : (
              filteredLeads.map((lead) => (
                <tr key={lead.Id} style={{ cursor: 'pointer' }} onClick={() => onSelectLead(lead)}>
                  <td className="font-mono" style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>
                    #{lead.Id}
                  </td>

                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{lead.nome || 'Não informado'}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ID Meta: {lead.id_meta || 'N/A'}</div>
                  </td>

                  <td>
                    <span className="font-mono" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      {lead.telefone || '-'}
                    </span>
                  </td>

                  <td>
                    <span className="badge-clean badge-neutral">{lead.estado || 'N/I'}</span>
                  </td>

                  <td>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{lead.atuacaoLabel}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{lead.culturaLabel}</div>
                  </td>

                  <td>
                    <span className="font-mono" style={{ fontSize: '0.78rem' }}>
                      {lead.atuacaoLabel === 'Pecuária' ? lead.volumeBoisLabel : lead.volumeSafraLabel}
                    </span>
                  </td>

                  <td>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      {lead.momentoLabel}
                    </span>
                  </td>

                  <td style={{ textAlign: 'right' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectLead(lead);
                      }}
                      className="btn-clean"
                      style={{ padding: '0.25rem 0.55rem', fontSize: '0.72rem' }}
                    >
                      <Eye size={12} />
                      <span>Detalhes</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
