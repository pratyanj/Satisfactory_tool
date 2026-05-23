import { SolverNode, SummaryData } from '../solver';
import { ParsedSave } from '../../types/save';
import { DiagnosticIssue } from './types';

export function analyzePowerFlowA(summary: SummaryData): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = [];
  const theoreticalPowerLimit = 1000; // MW baseline grid limit for a standard tier

  if (summary.totalPower > theoreticalPowerLimit) {
    issues.push({
      id: `power-overload-plan`,
      severity: 'warning',
      category: 'power',
      title: `Planned Production Exceeds Baseline Grid Capacity`,
      description: `Your planned factory requires ${summary.totalPower.toFixed(1)} MW of power, which exceeds a standard baseline FICSIT sub-grid capacity of ${theoreticalPowerLimit} MW.`,
      suggestedFix: `Deploy additional Coal Generators (75 MW each) or Fuel Generators (150 MW each) to support this production line.`,
      relatedEntityIds: [],
    });
  }

  return issues;
}

export function analyzePowerFlowB(save: ParsedSave): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = [];
  const { totalProduction, totalConsumption, batteryCount, generatorCount } = save.powerData;

  if (totalProduction === 0) {
    issues.push({
      id: `save-power-dead-grid`,
      severity: 'critical',
      category: 'power',
      title: `Inactive / Offline Power Grid`,
      description: `Your power grid has 0 MW production. All factory machinery is offline.`,
      suggestedFix: `Connect biomass burners, coal generators, or water extractors to kickstart your power grid grid.`,
      relatedEntityIds: [],
    });
    return issues;
  }

  // 1. Grid Overloaded (Consumption > Production)
  if (totalConsumption > totalProduction) {
    const deficiency = totalConsumption - totalProduction;
    issues.push({
      id: `save-power-grid-tripped`,
      severity: 'critical',
      category: 'power',
      title: `Power Grid Overloaded (Fuse Trip Risk)`,
      description: `Power consumption is ${totalConsumption} MW while production is only ${totalProduction} MW. Grid is currently deficient by ${deficiency} MW and at high risk of a total fuse blowout.`,
      suggestedFix: `Connect immediate Power Storage batteries, isolate production networks with a Power Switch, or build ${Math.ceil(deficiency / 150)}x Fuel Generators.`,
      relatedEntityIds: [],
    });
  } else {
    // 2. Low Reserve (Consumption is close to Production)
    const reservePower = totalProduction - totalConsumption;
    const reservePct = Math.round((reservePower / totalProduction) * 100);

    if (reservePct < 15) {
      issues.push({
        id: `save-power-low-reserve`,
        severity: reservePct < 5 ? 'critical' : 'warning',
        category: 'power',
        title: `Low Grid Power Reserve`,
        description: `Power reserve capacity is extremely low at only ${reservePct}% (${reservePower} MW remaining). Any sudden machine startup or train docking spike will trip the main fuse.`,
        suggestedFix: `Add 2x Coal Generators or build a cluster of Power Storage batteries to cushion consumption spikes.`,
        relatedEntityIds: [],
      });
    }
  }

  // 3. No Power Storage
  if (batteryCount === 0 && totalProduction > 0) {
    issues.push({
      id: `save-power-no-batteries`,
      severity: 'info',
      category: 'power',
      title: `No Power Storage Backups Connected`,
      description: `There are no Power Storage batteries detected in this grid. Power outages will trigger instant shut-downs without emergency backup cushioning.`,
      suggestedFix: `Build a Power Storage bank (Mk.1) to absorb excess energy and provide up to 100 MW output during power fluctuations.`,
      relatedEntityIds: [],
    });
  }

  // 4. Fuel Shortage Simulation (for complex power plants)
  if (generatorCount > 8) {
    issues.push({
      id: `save-power-fuel-instability`,
      severity: 'warning',
      category: 'power',
      title: `Fuel Supply Instability Risk`,
      description: `Power grid relies on ${generatorCount} generators. Fluid supply pipelines show localized flow rate drops, risking fuel starvation in downstream generators.`,
      suggestedFix: `Add a Fluid Buffer tank before the generator manifold inlet line to stabilize fuel levels.`,
      relatedEntityIds: [],
    });
  }

  return issues;
}
