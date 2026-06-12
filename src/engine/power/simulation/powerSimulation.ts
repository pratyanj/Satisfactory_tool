import type { PowerSimulationInput, PowerSimulationResult, SimulationSpikeEvent } from '../../../types/power';

// Overclock power exponent. Satisfactory changed this from 1.6 to log2(2.5)
// (≈1.321928) in Patch 0.7.0.0, so 250% clock costs exactly 2.5× power, not 4.33×.
const OVERCLOCK_EXPONENT = Math.log2(2.5);

export function calculateOverclockedPower(basePowerMW: number, clockSpeed: number): number {
  return basePowerMW * Math.pow(clockSpeed, OVERCLOCK_EXPONENT);
}

function getSpikeLoad(spikes: SimulationSpikeEvent[], minute: number): number {
  let extra = 0;
  for (const spike of spikes) {
    const active = minute >= spike.startMinute && minute < spike.startMinute + spike.durationMinutes;
    if (active) extra += spike.deltaMW;
  }
  return extra;
}

export function simulatePowerGrid(input: PowerSimulationInput): PowerSimulationResult {
  const timeline: PowerSimulationResult['timeline'] = [];
  let batteryStoredMWh = Math.max(0, input.batteryStoredMWh);
  let blackoutMinute: number | null = null;
  let minimumReserveMW = Number.POSITIVE_INFINITY;

  const totalBatteryOutputMW = Math.max(0, input.batteryCount * input.batteryMaxOutputMW);

  for (let minute = 0; minute <= input.durationMinutes; minute++) {
    const starvationActive = typeof input.fuelStarvationAtMinute === 'number' && minute >= input.fuelStarvationAtMinute;
    const productionMW = starvationActive ? input.plannedProductionMW * 0.2 : input.plannedProductionMW;
    const consumptionMW = input.baselineConsumptionMW + getSpikeLoad(input.spikes, minute);

    const reserveBeforeBattery = productionMW - consumptionMW;
    let batteryOutputMW = 0;
    let blackout = false;
    let reserveMW = reserveBeforeBattery;

    if (reserveBeforeBattery < 0) {
      const requiredBatteryMW = Math.abs(reserveBeforeBattery);
      const maxFromEnergy = batteryStoredMWh * 60;
      batteryOutputMW = Math.min(requiredBatteryMW, totalBatteryOutputMW, maxFromEnergy);
      batteryStoredMWh -= batteryOutputMW / 60;
      reserveMW = reserveBeforeBattery + batteryOutputMW;
      if (reserveMW < 0) {
        blackout = true;
        if (blackoutMinute === null) blackoutMinute = minute;
      }
    }

    minimumReserveMW = Math.min(minimumReserveMW, reserveMW);

    timeline.push({
      minute,
      productionMW,
      consumptionMW,
      reserveMW,
      batteryOutputMW,
      batteryStoredMWh,
      blackout,
    });
  }

  const survivedDurationMinutes = blackoutMinute === null ? input.durationMinutes : blackoutMinute;
  const summary = blackoutMinute === null
    ? `Grid remained stable for ${input.durationMinutes} minutes.`
    : `Grid blackout at minute ${blackoutMinute}.`;

  return {
    timeline,
    blackoutMinute,
    minimumReserveMW: Number.isFinite(minimumReserveMW) ? minimumReserveMW : 0,
    survivedDurationMinutes,
    summary,
  };
}
