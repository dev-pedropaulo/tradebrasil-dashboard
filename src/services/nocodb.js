import { normalizeState } from '../utils/normalizeState';

/**
 * TradeBrasil NocoDB API Integration Service
 * Configured for Base: TradeBrasil (pqidm66rx0b1wjb), Table: Leads (m6zmneu2vrp2vz5)
 */

const NOCODB_BASE_URL = import.meta.env.VITE_NOCODB_BASE_URL || 'https://agentesn8n-nocodb.cqc86v.easypanel.host';
const TABLE_ID = import.meta.env.VITE_NOCODB_TABLE_ID || 'm6zmneu2vrp2vz5';
const DEFAULT_TOKEN = import.meta.env.VITE_NOCODB_TOKEN || 'MAzqioK1wEs1N3cqgaE9yJIQ0RDloKhrZx7oW3fG';

// Sample fallback records for demonstration/offline resilience
const MOCK_LEADS = [
  {
    Id: 1,
    nome: "Guilherme Carvalho de Castro",
    CreatedAt: "2026-08-10 23:32:11+00:00",
    telefone: "5564992283003",
    estado: "Goiás",
    atuacao: "pecuária",
    cultura_principal: "",
    volume_safra: "",
    volume_bois: "de_500_a_1.000_bois",
    momento_protecao: "ainda_estou_apenas_buscando_informações",
    id_meta: "2262107307941704"
  },
  {
    Id: 2,
    nome: "Maria Feitosa Diniz",
    CreatedAt: "2026-08-11 00:44:15+00:00",
    telefone: "5563992238881",
    estado: "MA",
    atuacao: "produção_de_grãos",
    cultura_principal: "milho",
    volume_safra: "de_10_a_20_mil_sacas",
    volume_bois: "",
    momento_protecao: "quero_avaliar_uma_estratégia_agora",
    id_meta: "1780775286435478"
  },
  {
    Id: 3,
    nome: "Ricardo Silveira Aguiar",
    CreatedAt: "2026-08-11 01:15:00+00:00",
    telefone: "5565999881122",
    estado: "MT",
    atuacao: "produção_de_grãos",
    cultura_principal: "soja",
    volume_safra: "de_50_a_100_mil_sacas",
    volume_bois: "",
    momento_protecao: "quero_avaliar_uma_estratégia_agora",
    id_meta: "8823194012938102"
  },
  {
    Id: 4,
    nome: "Fazenda Santa Helena (Otávio Mendes)",
    CreatedAt: "2026-08-11 02:00:30+00:00",
    telefone: "5567998112233",
    estado: "MS",
    atuacao: "pecuária",
    cultura_principal: "",
    volume_safra: "",
    volume_bois: "acima_de_2.000_bois",
    momento_protecao: "quero_avaliar_uma_estratégia_agora",
    id_meta: "9912039481239481"
  },
  {
    Id: 5,
    nome: "Juliana Camargo e Silva",
    CreatedAt: "2026-08-11 02:22:10+00:00",
    telefone: "5516997665544",
    estado: "SP",
    atuacao: "produção_de_grãos",
    cultura_principal: "milho",
    volume_safra: "de_20_a_50_mil_sacas",
    volume_bois: "",
    momento_protecao: "ainda_estou_apenas_buscando_informações",
    id_meta: "3310492817263541"
  }
];

export async function fetchNocoDBLeads(customToken = null) {
  const token = customToken || DEFAULT_TOKEN;
  // Use proxy in dev environment to bypass browser CORS constraints, or fallback to direct URL
  const proxyUrl = `/api/nocodb/api/v2/tables/${TABLE_ID}/records?limit=250`;
  const directUrl = `${NOCODB_BASE_URL}/api/v2/tables/${TABLE_ID}/records?limit=250`;

  const urlsToTry = [proxyUrl, directUrl];

  for (const url of urlsToTry) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 sec timeout

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'xc-token': token,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        continue; // Try next URL if 4xx/5xx
      }

      const data = await response.json();
      if (data && data.list && Array.isArray(data.list) && data.list.length > 0) {
        return {
          success: true,
          data: data.list,
          total: data.pageInfo ? data.pageInfo.totalRows : data.list.length,
          isLive: true,
          source: 'Base de Dados Integrada (Tempo Real)'
        };
      }
    } catch (err) {
      console.warn(`Fetch attempt failed for ${url}:`, err.message);
    }
  }

  // Graceful Fallback if network or CORS prevents direct connection
  return {
    success: false,
    error: 'Conexão com o servidor indisponível no momento. Exibindo dados locais.',
    data: MOCK_LEADS,
    total: MOCK_LEADS.length,
    isLive: false,
    source: 'Base Local (Modo Offline)'
  };
}
/**
 * Format raw lead values into human readable labels
 */
export function formatLeadData(lead) {
  const atuacaoMap = {
    'pecuária': 'Pecuária',
    'produção_de_grãos': 'Produção de Grãos',
    'graos': 'Produção de Grãos',
    'pecuaria': 'Pecuária'
  };

  const momentoMap = {
    'quero_avaliar_uma_estratégia_agora': 'Quero avaliar uma estratégia agora',
    'ainda_estou_apenas_buscando_informações': 'Ainda estou apenas buscando informações'
  };

  const volumeSafraMap = {
    'de_10_a_20_mil_sacas': '10k - 20k Sacas',
    'de_20_a_50_mil_sacas': '20k - 50k Sacas',
    'de_50_a_100_mil_sacas': '50k - 100k Sacas',
    'acima_de_100_mil_sacas': '> 100k Sacas'
  };

  const volumeBoisMap = {
    'de_500_a_1.000_bois': '500 - 1.000 Cabeças',
    'de_1.000_a_2.000_bois': '1.000 - 2.000 Cabeças',
    'acima_de_2.000_bois': '> 2.000 Cabeças'
  };

  const normalizedUF = normalizeState(lead.estado);

  return {
    ...lead,
    estado: normalizedUF,
    estadoRaw: lead.estado, // preserve original text if needed for reference
    atuacaoLabel: atuacaoMap[lead.atuacao?.toLowerCase()] || lead.atuacao || 'Não Informado',
    momentoLabel: momentoMap[lead.momento_protecao] || lead.momento_protecao || 'Em Análise',
    culturaLabel: lead.cultura_principal ? lead.cultura_principal.toUpperCase() : (lead.atuacao?.includes('pecu') ? 'Gado de Corte' : 'Geral'),
    volumeSafraLabel: volumeSafraMap[lead.volume_safra] || lead.volume_safra || '-',
    volumeBoisLabel: volumeBoisMap[lead.volume_bois] || lead.volume_bois || '-',
    isHot: lead.momento_protecao === 'quero_avaliar_uma_estratégia_agora'
  };
}
