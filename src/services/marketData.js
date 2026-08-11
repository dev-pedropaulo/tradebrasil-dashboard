/**
 * Market Data & Hedge Calculation Engine for Agribusiness Commodities
 */

export const COMMODITY_QUOTES = {
  SOJA: {
    symbol: 'SOJA3',
    name: 'Soja (Paranaguá / CBOT)',
    unit: 'R$ / saca 60kg',
    price: 138.50,
    change: +1.25,
    changePercent: '+0.91%',
    trend: 'up',
    benchmarkVol: 15000 // sacas médias por contrato
  },
  MILHO: {
    symbol: 'CCM',
    name: 'Milho (B3 Futures)',
    unit: 'R$ / saca 60kg',
    price: 64.80,
    change: -0.40,
    changePercent: '-0.61%',
    trend: 'down',
    benchmarkVol: 15000
  },
  BOI: {
    symbol: 'BGI',
    name: 'Boi Gordo (B3 Futures)',
    unit: 'R$ / arroba (@)',
    price: 245.90,
    change: +3.10,
    changePercent: '+1.28%',
    trend: 'up',
    benchmarkVol: 750 // arrobas por contrato (~50 bois)
  },
  DOLAR: {
    symbol: 'USDBRL',
    name: 'Dólar Comercial (PTAX)',
    unit: 'R$',
    price: 5.482,
    change: +0.015,
    changePercent: '+0.27%',
    trend: 'up'
  }
};

/**
 * Calculate Financial Exposure & Hedge Opportunity based on leads dataset
 */
export function calculatePortfolioValue(leadsFormatted) {
  let totalSacasMilho = 0;
  let totalSacasSoja = 0;
  let totalBois = 0;

  leadsFormatted.forEach(lead => {
    // Safra Volume Parsing
    if (lead.volume_safra) {
      if (lead.volume_safra.includes('10_a_20')) totalSacasMilho += 15000;
      else if (lead.volume_safra.includes('20_a_50')) totalSacasSoja += 35000;
      else if (lead.volume_safra.includes('50_a_100')) totalSacasSoja += 75000;
      else if (lead.volume_safra.includes('acima_de_100')) totalSacasSoja += 120000;
    }

    // Bois Volume Parsing
    if (lead.volume_bois) {
      if (lead.volume_bois.includes('500_a_1.000')) totalBois += 750;
      else if (lead.volume_bois.includes('1.000_a_2.000')) totalBois += 1500;
      else if (lead.volume_bois.includes('acima_de_2.000')) totalBois += 3000;
    }
  });

  const valorMilho = totalSacasMilho * COMMODITY_QUOTES.MILHO.price;
  const valorSoja = totalSacasSoja * COMMODITY_QUOTES.SOJA.price;
  // 1 boi ~ 18 arrobas em média
  const totalArrobas = totalBois * 18;
  const valorBoi = totalArrobas * COMMODITY_QUOTES.BOI.price;

  const totalExposicaoR$ = valorMilho + valorSoja + valorBoi;

  return {
    totalSacasMilho,
    totalSacasSoja,
    totalSacasGeral: totalSacasMilho + totalSacasSoja,
    totalBois,
    totalArrobas,
    valorMilho,
    valorSoja,
    valorBoi,
    totalExposicaoR$
  };
}

/**
 * Hedge Protection Simulator Engine
 */
export function simulateHedgeStrategy({ tipoCommodity, volume, precoGarantido, taxaProtecaoPercent = 1.5 }) {
  let unitPrice = 0;
  let unitName = 'sacas';

  if (tipoCommodity === 'milho') {
    unitPrice = COMMODITY_QUOTES.MILHO.price;
    unitName = 'sacas 60kg';
  } else if (tipoCommodity === 'soja') {
    unitPrice = COMMODITY_QUOTES.SOJA.price;
    unitName = 'sacas 60kg';
  } else if (tipoCommodity === 'boi') {
    unitPrice = COMMODITY_QUOTES.BOI.price; // R$ por arroba
    unitName = 'arrobas (@)';
  }

  const strike = precoGarantido || unitPrice;
  const valorMercadoSemHedge = volume * unitPrice;
  const valorMinimoGarantidoComHedge = volume * strike;

  // Custo de Opção PUT (Trava de Piso) ~ 1.5% do VTV
  const custoPremio = valorMinimoGarantidoComHedge * (taxaProtecaoPercent / 100);

  // Cenários de Queda de Mercado (-10% e -20%)
  const cenarioQueda10 = volume * (unitPrice * 0.9);
  const cenarioQueda20 = volume * (unitPrice * 0.8);

  const perdaEvitadaSemHedge10 = valorMercadoSemHedge - cenarioQueda10;
  const perdaEvitadaSemHedge20 = valorMercadoSemHedge - cenarioQueda20;

  return {
    unitPrice,
    unitName,
    valorMercadoSemHedge,
    valorMinimoGarantidoComHedge,
    custoPremio,
    cenarioQueda10,
    cenarioQueda20,
    perdaEvitada10: perdaEvitadaSemHedge10 - custoPremio,
    perdaEvitada20: perdaEvitadaSemHedge20 - custoPremio
  };
}
