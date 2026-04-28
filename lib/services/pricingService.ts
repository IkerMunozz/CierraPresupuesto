// lib/services/pricingService.ts

export interface PricingRecommendation {
  recommendedPrice: number;
  minPrice: number;
  maxPrice: number;
  acceptanceProbability: number;
  reasoning: string;
}

/**
 * Calcula recomendaciones de precios basadas en el contexto del presupuesto y el historial
 */
export function calculatePricingRecommendation(
  basePrice: number,
  score: number,
  clientType: string | null,
  acceptanceHistory: { status: string; price: number; score: number }[]
): PricingRecommendation {
  // 1. Ajuste por Score (Regla: score alto -> permite precios más altos)
  // Normalizamos score a un multiplicador (ej: 0.8 a 1.2)
  const scoreMultiplier = 0.8 + (score / 100) * 0.4;

  // 2. Ajuste por Tipo de Cliente
  let clientMultiplier = 1.0;
  const type = clientType?.toLowerCase() || '';
  if (type.includes('empresa') || type.includes('enterprise') || type.includes('corporativo')) {
    clientMultiplier = 1.25; // Clientes grandes suelen aceptar precios más altos
  } else if (type.includes('autónomo') || type.includes('freelance') || type.includes('particular')) {
    clientMultiplier = 0.9; // Clientes individuales suelen ser más sensibles al precio
  }

  // 3. Análisis de Historial (Si existe)
  let historyMultiplier = 1.0;
  if (acceptanceHistory.length > 0) {
    const accepted = acceptanceHistory.filter(h => h.status === 'accepted');
    const rejected = acceptanceHistory.filter(h => h.status === 'rejected');
    
    if (accepted.length > rejected.length) {
      historyMultiplier = 1.05; // El mercado acepta bien tus precios actuales
    } else if (rejected.length > accepted.length) {
      historyMultiplier = 0.9; // Posible resistencia al precio detectada
    }
  }

  // 4. Cálculo final del precio recomendado
  const recommendedPrice = basePrice * scoreMultiplier * clientMultiplier * historyMultiplier;
  
  // Rango dinámico (+/- 15% del recomendado)
  const minPrice = recommendedPrice * 0.85;
  const maxPrice = recommendedPrice * 1.15;

  // 5. Cálculo de Probabilidad de Aceptación
  // Base 50% + ajuste por score + penalización si superamos el recomendado
  let acceptanceProbability = 50;
  
  // Influencia del score (hasta +30%)
  acceptanceProbability += (score - 50) * 0.6;
  
  // Si el precio base es menor al mínimo sugerido, la probabilidad sube
  if (basePrice < minPrice) {
    acceptanceProbability += 15;
  } 
  // Si el precio base es mayor al máximo sugerido, la probabilidad baja drásticamente
  else if (basePrice > maxPrice) {
    acceptanceProbability -= 25;
  }

  // Capar probabilidad entre 5% y 95%
  acceptanceProbability = Math.max(5, Math.min(95, acceptanceProbability));

  // 6. Generar razonamiento
  let reasoning = "";
  if (score > 80) {
    reasoning = "Tu presupuesto tiene un score excelente, lo que te permite posicionarte en un rango de precio premium.";
  } else if (score < 50) {
    reasoning = "El score actual es bajo. Te recomendamos bajar el precio o mejorar la propuesta antes de enviar para evitar el rechazo.";
  } else {
    reasoning = "Tu precio está alineado con la calidad de la propuesta y el perfil del cliente.";
  }

  if (clientMultiplier > 1) reasoning += " El perfil corporativo del cliente admite una valoración superior.";

  return {
    recommendedPrice: Math.round(recommendedPrice * 100) / 100,
    minPrice: Math.round(minPrice * 100) / 100,
    maxPrice: Math.round(maxPrice * 100) / 100,
    acceptanceProbability: Math.round(acceptanceProbability),
    reasoning
  };
}
