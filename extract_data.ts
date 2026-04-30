import * as fs from 'fs';
import * as path from 'path';
import { items, machines, recipes, belts } from './src/engine/data.ts';

const DATA_DIR = path.join(process.cwd(), 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Write separate JSON files
fs.writeFileSync(path.join(DATA_DIR, 'items.json'), JSON.stringify(items, null, 2));
fs.writeFileSync(path.join(DATA_DIR, 'machines.json'), JSON.stringify(machines, null, 2));
fs.writeFileSync(path.join(DATA_DIR, 'recipes.json'), JSON.stringify(recipes, null, 2));
fs.writeFileSync(path.join(DATA_DIR, 'belts.json'), JSON.stringify(belts, null, 2));

// Write combined JSON file
const allData = {
  items,
  machines,
  recipes,
  belts
};
fs.writeFileSync(path.join(DATA_DIR, 'all_data.json'), JSON.stringify(allData, null, 2));

console.log('Successfully extracted data to data/ folder.');
