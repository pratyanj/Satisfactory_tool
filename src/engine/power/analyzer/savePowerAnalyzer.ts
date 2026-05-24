import type { ParsedSave } from '../../../types/save';
import type { SavePowerAnalysisResult, SavePowerRecommendation } from '../../../types/power';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function analyzeSavePowerGrid(save: ParsedSave): SavePowerAnalysisResult {
  const { totalProduction, totalConsumption, batteryCount, generatorCount } = save.powerData;

  const productionMW = totalProduction;
  const consumptionMW = totalConsumption;
  const reserveMW = productionMW - consumptionMW;
  const reservePercent = productionMW > 0 ? (reserveMW / productionMW) * 100 : -100;
  const gridStability = clamp(Math.round(50 + reservePercent), 0, 100);

  const recommendations: SavePowerRecommendation[] = [];
  let healthScore = 100;

  if (productionMW <= 0) {
    recommendations.push({
      id: 'dead-grid',
      priority: 'critical',
      message: 'Power production is 0 MW. Add bootstrap generation before restarting factories.',
    });
    healthScore = 0;
  } else {
    if (reserveMW < 0) {
      healthScore -= 55;
      recommendations.push({
        id: 'grid-overload',
        priority: 'critical',
        message: `Grid is overloaded by ${Math.abs(reserveMW).toFixed(1)} MW. Add generation or split heavy consumers.`,
      });
    } else if (reservePercent < 10) {
      healthScore -= 30;
      recommendations.push({
        id: 'low-reserve',
        priority: 'warning',
        message: `Reserve is only ${reservePercent.toFixed(1)}%. Target at least 20-30% reserve.`,
      });
    } else if (reservePercent < 20) {
      healthScore -= 15;
      recommendations.push({
        id: 'moderate-reserve',
        priority: 'info',
        message: `Reserve is ${reservePercent.toFixed(1)}%. Consider extra headroom for spikes.`,
      });
    }
  }

  if (batteryCount <= 0) {
    healthScore -= 10;
    recommendations.push({
      id: 'no-battery',
      priority: 'warning',
      message: 'No Power Storage detected. Add batteries to absorb startup and train spikes.',
    });
  }

  if (generatorCount > 0 && batteryCount > 0 && batteryCount < Math.ceil(generatorCount * 0.08)) {
    healthScore -= 8;
    recommendations.push({
      id: 'low-battery-ratio',
      priority: 'info',
      message: 'Battery count is low for this generator footprint. Add more backup capacity.',
    });
  }

  if (generatorCount > 150) {
    healthScore -= 5;
    recommendations.push({
      id: 'large-grid',
      priority: 'info',
      message: 'Large generator networks benefit from segmented regional grids and independent backups.',
    });
  }

  return {
    productionMW,
    consumptionMW,
    reserveMW,
    reservePercent,
    gridStability,
    healthScore: clamp(Math.round(healthScore), 0, 100),
    recommendations,
  };
}
