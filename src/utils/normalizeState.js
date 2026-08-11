/**
 * Normalizes open text input for Brazilian state names/UF into a clean 2-letter uppercase UF code.
 * Handles accents, punctuation, common typos, full state names, and partial string matching.
 */
export function normalizeState(rawInput) {
  if (!rawInput || typeof rawInput !== 'string') return 'N/I';

  // Strip accents/diacritics, punctuation, numbers, and collapse whitespace
  const clean = rawInput
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents (Goiás -> Goias, São Paulo -> Sao Paulo)
    .replace(/[^a-zA-Z\s]/g, '')     // Remove non-letters (e.g. M.T. -> MT, S.P. -> SP)
    .trim()
    .toUpperCase();

  if (!clean) return 'N/I';

  // 1. Check if already a valid 2-letter UF code
  const validUFs = [
    'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ];

  if (validUFs.includes(clean)) return clean;

  // 2. Exact match dictionary for full names and common variations
  const dictionary = {
    // Acre
    'ACRE': 'AC',
    // Alagoas
    'ALAGOAS': 'AL',
    // Amapá
    'AMAPA': 'AP', 'AMAPA ': 'AP',
    // Amazonas
    'AMAZONAS': 'AM',
    // Bahia
    'BAHIA': 'BA',
    // Ceará
    'CEARA': 'CE',
    // Distrito Federal
    'DISTRITO FEDERAL': 'DF', 'BRASILIA': 'DF', 'DF': 'DF',
    // Espírito Santo
    'ESPIRITO SANTO': 'ES', 'SANTO ESPIRITO': 'ES',
    // Goiás
    'GOIAS': 'GO', 'GOIAIS': 'GO', 'GOIAIS ': 'GO',
    // Maranhão
    'MARANHAO': 'MA', 'MARANHAM': 'MA',
    // Mato Grosso
    'MATO GROSSO': 'MT', 'MATOGROSSO': 'MT', 'MT': 'MT',
    // Mato Grosso do Sul
    'MATO GROSSO DO SUL': 'MS', 'MATOGROSSO DO SUL': 'MS', 'MATO GROSSO SUL': 'MS', 'MS': 'MS',
    // Minas Gerais
    'MINAS GERAIS': 'MG', 'MINAS': 'MG', 'MG': 'MG',
    // Pará
    'PARA': 'PA',
    // Paraíba
    'PARAIBA': 'PB',
    // Paraná
    'PARANA': 'PR',
    // Pernambuco
    'PERNAMBUCO': 'PE',
    // Piauí
    'PIAUI': 'PI', 'PIAOI': 'PI',
    // Rio de Janeiro
    'RIO DE JANEIRO': 'RJ', 'RIO JANEIRO': 'RJ',
    // Rio Grande do Norte
    'RIO GRANDE DO NORTE': 'RN', 'RIO GRANDE NORTE': 'RN',
    // Rio Grande do Sul
    'RIO GRANDE DO SUL': 'RS', 'RIO GRANDE SUL': 'RS', 'GAUCHO': 'RS',
    // Rondônia
    'RONDONIA': 'RO',
    // Roraima
    'RORAIMA': 'RR',
    // Santa Catarina
    'SANTA CATARINA': 'SC', 'CATARINA': 'SC',
    // São Paulo
    'SAO PAULO': 'SP', 'SAOPAULO': 'SP',
    // Sergipe
    'SERGIPE': 'SE',
    // Tocantins
    'TOCANTINS': 'TO'
  };

  if (dictionary[clean]) return dictionary[clean];

  // 3. Robust substring pattern matching for open-ended user responses
  if (clean.includes('MATO GROSSO DO SUL') || clean.includes('GROSSO DO SUL') || clean.includes('MATO GROSSO SUL')) return 'MS';
  if (clean.includes('MATO GROSSO') || clean.includes('GROSSO')) return 'MT';
  if (clean.includes('MINAS') || clean.includes('GERAIS')) return 'MG';
  if (clean.includes('GOIAS') || clean.includes('GOI')) return 'GO';
  if (clean.includes('MARANH')) return 'MA';
  if (clean.includes('SAO PAULO') || clean.includes('PAULO')) return 'SP';
  if (clean.includes('PARAN')) return 'PR';
  if (clean.includes('RIO GRANDE DO SUL') || clean.includes('GRANDE DO SUL')) return 'RS';
  if (clean.includes('RIO GRANDE DO NORTE') || clean.includes('GRANDE DO NORTE')) return 'RN';
  if (clean.includes('RIO DE JANEIRO') || clean.includes('JANEIRO')) return 'RJ';
  if (clean.includes('SANTA CATARINA') || clean.includes('CATARINA')) return 'SC';
  if (clean.includes('BAHIA')) return 'BA';
  if (clean.includes('CEARA')) return 'CE';
  if (clean.includes('PIAUI')) return 'PI';
  if (clean.includes('PERNAMBUCO')) return 'PE';
  if (clean.includes('PARAIBA')) return 'PB';
  if (clean.includes('ALAGOAS')) return 'AL';
  if (clean.includes('SERGIPE')) return 'SE';
  if (clean.includes('ESPIRITO SANTO')) return 'ES';
  if (clean.includes('TOCANTINS')) return 'TO';
  if (clean.includes('AMAZONAS')) return 'AM';
  if (clean.includes('RONDONIA')) return 'RO';
  if (clean.includes('RORAIMA')) return 'RR';
  if (clean.includes('AMAPA')) return 'AP';
  if (clean.includes('ACRE')) return 'AC';
  if (clean.includes('BRASILIA') || clean.includes('DISTRITO FEDERAL')) return 'DF';

  return clean; // Fallback to clean uppercase string
}
