import type { PowerFuelType } from '../../types/power';

const githubRawBase = 'https://raw.githubusercontent.com/pratyanj/Satisfactory_tool/main';

function githubGenerator(path: string): string {
  return `${githubRawBase}/public/assets/generators/${path}`;
}

export const GENERATOR_IMAGE_BY_FUEL: Record<PowerFuelType, string> = {
  biomass: githubGenerator('biomass-burner.png'),
  coal: githubGenerator('coal-generator.png'),
  fuel: githubGenerator('fuel-generator.png'),
  turbofuel: githubGenerator('fuel-generator.png'),
  rocket_fuel: githubGenerator('fuel-generator.png'),
  ionized_fuel: githubGenerator('fuel-generator.png'),
  nuclear: githubGenerator('nuclear-power-plant.png'),
  geothermal: githubGenerator('geothermal-generator.png'),
};

export const GENERATOR_IMAGE_BY_MACHINE_ID: Record<string, string> = {
  biomass_burner: githubGenerator('biomass-burner.png'),
  coal_generator: githubGenerator('coal-generator.png'),
  fuel_generator: githubGenerator('fuel-generator.png'),
  nuclear_power_plant: githubGenerator('nuclear-power-plant.png'),
  geothermal_generator: githubGenerator('geothermal-generator.png'),
  alien_power_augmenter: githubGenerator('alien-power-augmenter.png'),
};

export const LOCAL_GENERATOR_IMAGE_BY_FUEL: Record<PowerFuelType, string> = {
  biomass: '/assets/generators/biomass-burner.png',
  coal: '/assets/generators/coal-generator.png',
  fuel: '/assets/generators/fuel-generator.png',
  turbofuel: '/assets/generators/fuel-generator.png',
  rocket_fuel: '/assets/generators/fuel-generator.png',
  ionized_fuel: '/assets/generators/fuel-generator.png',
  nuclear: '/assets/generators/nuclear-power-plant.png',
  geothermal: '/assets/generators/geothermal-generator.png',
};
