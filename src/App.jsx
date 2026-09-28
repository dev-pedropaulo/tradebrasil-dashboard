import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import MarketTicker from './components/MarketTicker';
import KPICards from './components/KPICards';
import AnalyticsCharts, { StateDistributionChart } from './components/AnalyticsCharts';
import BrazilMap from './components/BrazilMap';
import HedgeSimulator from './components/HedgeSimulator';
import LeadTable from './components/LeadTable';
import LeadModal from './components/LeadModal';
import FollowupsPage from './components/FollowupsPage';

import { fetchNocoDBLeads, formatLeadData } from './services/nocodb';
import { calculatePortfolioValue } from './services/marketData';
import { LayoutDashboard, Calculator, Table, RefreshCw, CalendarClock } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [leadsRaw, setLeadsRaw] = useState([]);
  const [leadsFormatted, setLeadsFormatted] = useState([]);
  const [portfolioStats, setPortfolioStats] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [sourceInfo, setSourceInfo] = useState('');
  const [lastSync, setLastSync] = useState(null);
  
  const [selectedLead, setSelectedLead] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await fetchNocoDBLeads();

      if (result && result.data && Array.isArray(result.data)) {
        setLeadsRaw(result.data);
        const formatted = result.data.map(formatLeadData);
        setLeadsFormatted(formatted);

        const stats = calculatePortfolioValue(formatted);
        setPortfolioStats(stats);
      }

      setIsLive(result ? result.isLive : false);
      setSourceInfo(result ? result.source : 'Fallback');
      setLastSync(new Date().toLocaleTimeString('pt-BR'));
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSimulateLeadFromModal = (lead) => {
    setActiveTab('simulator');
  };

  return (
    <div className="app-container">
      {/* Clean Header */}
      <Header
        isLive={isLive}
        onRefresh={loadData}
      />

      <main className="main-content">
        {/* Real-time Commodity Market Ticker */}
        <MarketTicker />

        {/* Minimalist Segmented Tab Navigation */}
        <div className="tab-segmented">
          <button
            onClick={() => setActiveTab('overview')}
            className={`tab-item ${activeTab === 'overview' ? 'active' : ''}`}
          >
            <LayoutDashboard size={15} />
            <span>Visão Geral</span>
          </button>

          <button
            onClick={() => setActiveTab('simulator')}
            className={`tab-item ${activeTab === 'simulator' ? 'active' : ''}`}
          >
            <Calculator size={15} />
            <span>Simulador Hedge</span>
          </button>

          <button
            onClick={() => setActiveTab('leads')}
            className={`tab-item ${activeTab === 'leads' ? 'active' : ''}`}
          >
            <Table size={15} />
            <span>Produtores Rurais ({leadsFormatted.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('followups')}
            className={`tab-item ${activeTab === 'followups' ? 'active' : ''}`}
          >
            <CalendarClock size={15} />
            <span>Follow-ups</span>
          </button>
        </div>

        {/* Content */}
        {loading && activeTab !== 'followups' ? (
          <div className="clean-card" style={{ padding: '3rem', textAlign: 'center', margin: '2rem 0' }}>
            <RefreshCw size={28} color="var(--accent-emerald)" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 0.75rem auto' }} />
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 600 }}>Carregando dados...</h3>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <div>
                <KPICards leadsFormatted={leadsFormatted} portfolioStats={portfolioStats} />
                <AnalyticsCharts leadsFormatted={leadsFormatted} />
                <BrazilMap leadsFormatted={leadsFormatted} />
                <StateDistributionChart leadsFormatted={leadsFormatted} />
                <HedgeSimulator leadsFormatted={leadsFormatted} />
                <LeadTable leadsFormatted={leadsFormatted} onSelectLead={(lead) => setSelectedLead(lead)} />
              </div>
            )}

            {activeTab === 'simulator' && (
              <div>
                <HedgeSimulator leadsFormatted={leadsFormatted} />
              </div>
            )}

            {activeTab === 'leads' && (
              <div>
                <LeadTable leadsFormatted={leadsFormatted} onSelectLead={(lead) => setSelectedLead(lead)} />
              </div>
            )}

            {activeTab === 'followups' && <FollowupsPage />}
          </>
        )}
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-subtle)',
        padding: '1rem 1.5rem',
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
        marginTop: 'auto',
        background: 'var(--bg-card)'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong>Brasil Trade Agro</strong> &copy; 2026. Todos os direitos reservados.
          </div>
          <div>
            Status da Base: <span style={{ color: 'var(--text-secondary)' }}>{sourceInfo}</span>
          </div>
        </div>
      </footer>

      {/* Lead Detail Modal */}
      {selectedLead && (
        <LeadModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onSimulateHedge={handleSimulateLeadFromModal}
        />
      )}
    </div>
  );
}
