/**
 * BuildingMarker.tsx
 * Custom Leaflet marker using a styled DivIcon with the building's
 * game icon image — replacing the plain CircleMarker from before.
 *
 * Visual style: hexagon-framed colored badge with icon, matching the
 * SC-InteractiveMap aesthetic.
 */
import React, { useCallback } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

import { classifyBuilding, BuildingInfo } from '../../engine/buildingClassifier';
import type { SaveBuilding } from '../../types/save';
import { gameToLatLng } from './mapUtils';
import { BuildingPopup } from './BuildingPopup';

// ─── Icon image URL resolver ──────────────────────────────────────────────────
// Maps building class path → a wiki/CDN image URL.
// Priority: Satisfactory wiki images (highest quality, no CORS issues)
const WIKI_BASE = 'https://satisfactory.wiki.gg/images/';

const ICON_MAP: Array<[string, string]> = [
  // Extractors
  ['MinerMk1',         `${WIKI_BASE}thumb/2/2b/Miner_Mk.1.png/40px-Miner_Mk.1.png`],
  ['MinerMk2',         `${WIKI_BASE}thumb/b/b9/Miner_Mk.2.png/40px-Miner_Mk.2.png`],
  ['MinerMk3',         `${WIKI_BASE}thumb/2/20/Miner_Mk.3.png/40px-Miner_Mk.3.png`],
  ['OilPump',          `${WIKI_BASE}thumb/7/7d/Oil_Extractor.png/40px-Oil_Extractor.png`],
  ['WaterPump',        `${WIKI_BASE}thumb/e/e1/Water_Extractor.png/40px-Water_Extractor.png`],
  // Smelting
  ['SmelterMk1',       `${WIKI_BASE}thumb/8/8b/Smelter.png/40px-Smelter.png`],
  ['FoundryMk1',       `${WIKI_BASE}thumb/b/b6/Foundry.png/40px-Foundry.png`],
  // Production
  ['ConstructorMk1',   `${WIKI_BASE}thumb/2/2a/Constructor.png/40px-Constructor.png`],
  ['AssemblerMk1',     `${WIKI_BASE}thumb/c/cb/Assembler.png/40px-Assembler.png`],
  ['ManufacturerMk1',  `${WIKI_BASE}thumb/7/73/Manufacturer.png/40px-Manufacturer.png`],
  ['Packager',         `${WIKI_BASE}thumb/6/60/Packager.png/40px-Packager.png`],
  ['Refinery',         `${WIKI_BASE}thumb/c/c6/Refinery.png/40px-Refinery.png`],
  ['Blender',          `${WIKI_BASE}thumb/d/db/Blender.png/40px-Blender.png`],
  ['HadronCollider',   `${WIKI_BASE}thumb/6/62/Particle_Accelerator.png/40px-Particle_Accelerator.png`],
  ['QuantumEncoder',   `${WIKI_BASE}thumb/7/76/Quantum_Encoder.png/40px-Quantum_Encoder.png`],
  // Power
  ['GeneratorCoal',    `${WIKI_BASE}thumb/5/5a/Coal_Generator.png/40px-Coal_Generator.png`],
  ['GeneratorFuel',    `${WIKI_BASE}thumb/d/d4/Fuel_Generator.png/40px-Fuel_Generator.png`],
  ['GeneratorNuclear', `${WIKI_BASE}thumb/5/5b/Nuclear_Power_Plant.png/40px-Nuclear_Power_Plant.png`],
  ['GeneratorBiomass', `${WIKI_BASE}thumb/1/18/Biomass_Burner.png/40px-Biomass_Burner.png`],
  ['GeneratorGeoThermal', `${WIKI_BASE}thumb/7/75/Geothermal_Generator.png/40px-Geothermal_Generator.png`],
  ['PowerStorageMk1',  `${WIKI_BASE}thumb/6/66/Power_Storage.png/40px-Power_Storage.png`],
  // Logistics
  ['Splitter',         `${WIKI_BASE}thumb/e/e9/Conveyor_Splitter.png/40px-Conveyor_Splitter.png`],
  ['SmartSplitter',    `${WIKI_BASE}thumb/a/a0/Smart_Splitter.png/40px-Smart_Splitter.png`],
  ['Merger',           `${WIKI_BASE}thumb/8/89/Conveyor_Merger.png/40px-Conveyor_Merger.png`],
  ['DroneStation',     `${WIKI_BASE}thumb/d/da/Drone_Port.png/40px-Drone_Port.png`],
  ['TrainStation',     `${WIKI_BASE}thumb/c/c2/Train_Station.png/40px-Train_Station.png`],
  // Storage
  ['StorageContainerMk1', `${WIKI_BASE}thumb/9/91/Storage_Container.png/40px-Storage_Container.png`],
  ['LiquidTank',       `${WIKI_BASE}thumb/a/a9/Fluid_Buffer.png/40px-Fluid_Buffer.png`],
  // Special
  ['SpaceElevator',    `${WIKI_BASE}thumb/f/f8/Space_Elevator.png/40px-Space_Elevator.png`],
  ['AwesomeSink',      `${WIKI_BASE}thumb/e/e4/AWESOME_Sink.png/40px-AWESOME_Sink.png`],
];

function getIconUrl(typePath: string): string | null {
  for (const [key, url] of ICON_MAP) {
    if (typePath.includes(key)) return url;
  }
  return null;
}

// ─── Create Leaflet DivIcon ───────────────────────────────────────────────────
function createBuildingIcon(info: BuildingInfo, typePath: string, zoom: number): L.DivIcon {
  const iconUrl = getIconUrl(typePath);
  const size = zoom >= 0 ? 36 : zoom >= -1 ? 28 : zoom >= -2 ? 22 : 16;

  const innerHtml = iconUrl
    ? `<img
        src="${iconUrl}"
        width="${size - 8}"
        height="${size - 8}"
        style="object-fit:contain;image-rendering:pixelated;"
        onerror="this.style.display='none';this.parentElement.querySelector('.bm-emoji').style.display='block';"
      />
      <span class="bm-emoji" style="display:none;font-size:${Math.round((size - 8) * 0.7)}px;">${info.emoji}</span>`
    : `<span class="bm-emoji" style="font-size:${Math.round((size - 8) * 0.7)}px;">${info.emoji}</span>`;

  return L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 4)],
    html: `
      <div class="bm-root" style="
        width:${size}px;height:${size}px;
        border-color:${info.color};
        box-shadow:0 0 6px ${info.color}88;
      ">
        ${innerHtml}
      </div>
    `,
  });
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface BuildingMarkerProps {
  building: SaveBuilding;
  zoom: number;
  onPlanProduction?: (itemId: string, rate: number) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────
export function BuildingMarker({ building, zoom, onPlanProduction }: BuildingMarkerProps) {
  const info = classifyBuilding(building.typePath);
  const latlng = gameToLatLng(building.position.x, building.position.y);
  const icon = createBuildingIcon(info, building.typePath, zoom);

  const eventHandlers = useCallback(() => ({}), []);

  return (
    <Marker
      key={building.instanceName}
      position={latlng}
      icon={icon}
      eventHandlers={eventHandlers()}
    >
      <Popup className="map-popup bpop-popup" maxWidth={280} minWidth={240}>
        <BuildingPopup
          building={building}
          onPlanProduction={onPlanProduction}
        />
      </Popup>
    </Marker>
  );
}
