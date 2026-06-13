/**
 * add_missing_recipes.mjs
 *
 * Some items (ammo/nobelisk crafted at the Craft Bench, packaged fluids, etc.)
 * had NO producing recipe in data/recipes.json, so the codex showed "no recipe"
 * — false data. This pulls their real recipes from scripts/satisfactory_docs.json
 * (the game export) and appends them, mapping rate = amount * 60 / time.
 *
 *   node scripts/add_missing_recipes.mjs          # dry run (prints, no write)
 *   node scripts/add_missing_recipes.mjs --write   # write data/recipes.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const docs = JSON.parse(readFileSync(join(ROOT, 'scripts', 'satisfactory_docs.json'), 'utf-8'));
const items = JSON.parse(readFileSync(join(ROOT, 'data', 'items.json'), 'utf-8'));
const recipes = JSON.parse(readFileSync(join(ROOT, 'data', 'recipes.json'), 'utf-8'));

const BUILDING_TO_MACHINE = {
  Desc_Packager_C: 'packager',
  Desc_OilRefinery_C: 'refinery',
  Desc_AssemblerMk1_C: 'assembler',
  Desc_ManufacturerMk1_C: 'manufacturer',
  Desc_ConstructorMk1_C: 'constructor',
  Desc_Blender_C: 'blender',
  Desc_SmelterMk1_C: 'smelter',
  Desc_FoundryMk1_C: 'foundry',
  Desc_HadronCollider_C: 'particle_accelerator',
  Desc_Converter_C: 'converter',
  Desc_QuantumEncoder_C: 'quantum_encoder',
};

const cnToName = {};
for (const k in docs.items) cnToName[docs.items[k].className] = docs.items[k].name;
const nameToId = {};
for (const id in items) nameToId[items[id].name.toLowerCase()] = id;
const toId = (cn) => { const n = cnToName[cn]; return n ? nameToId[n.toLowerCase()] : undefined; };

const produced = new Set(recipes.map(r => r.outputItemId));
const existingIds = new Set(recipes.map(r => r.id));
const round = (n) => Math.round(n * 1000) / 1000;

// Items with no producing recipe that DO have a (non-unpackage) docs recipe.
const targets = Object.keys(items).filter(id => !produced.has(id));

const additions = [];
const warnings = [];

for (const itemId of targets) {
  const itemRecipes = Object.values(docs.recipes).filter(r =>
    !/Unpackage/i.test(r.className) &&
    r.products.some(p => toId(p.item) === itemId)
  );
  if (itemRecipes.length === 0) continue;

  // Primary first (non-alternate), then the rest.
  itemRecipes.sort((a, b) => Number(a.alternate) - Number(b.alternate));

  itemRecipes.forEach((r, idx) => {
    const machineId = BUILDING_TO_MACHINE[r.producedIn[0]];
    if (!machineId) { warnings.push(`${r.name}: unknown building ${r.producedIn[0]}`); return; }
    const cycles = 60 / r.time;

    const mainProduct = r.products.find(p => toId(p.item) === itemId);
    const byproducts = r.products
      .filter(p => p !== mainProduct)
      .map(p => ({ itemId: toId(p.item), rate: round(p.amount * cycles), name: cnToName[p.item] }));

    const inputs = [];
    let bad = false;
    for (const ing of r.ingredients) {
      const iid = toId(ing.item);
      if (!iid) { warnings.push(`${r.name}: unmapped ingredient ${cnToName[ing.item] || ing.item}`); bad = true; continue; }
      inputs.push({ itemId: iid, rate: round(ing.amount * cycles) });
    }
    if (bad) return;
    for (const bp of byproducts) if (!bp.itemId) { warnings.push(`${r.name}: unmapped byproduct`); return; }

    const isPrimary = idx === 0 && !r.alternate;
    const id = isPrimary ? `recipe_${itemId}` : r.className.toLowerCase();
    if (existingIds.has(id)) { warnings.push(`${r.name}: id ${id} already exists, skipping`); return; }
    existingIds.add(id);

    const recipe = {
      id,
      outputItemId: itemId,
      outputRate: round(mainProduct.amount * cycles),
      inputs,
      machineId,
    };
    if (byproducts.length) recipe.byproducts = byproducts.map(({ itemId, rate }) => ({ itemId, rate }));
    if (!isPrimary) { recipe.name = r.name; recipe.isAlternate = r.alternate; }

    additions.push({ recipe, label: `${items[itemId].name} [${machineId}] ${isPrimary ? 'PRIMARY' : '+' + r.name}` });
  });
}

console.log(`\n${additions.length} recipes to add:\n`);
for (const a of additions) {
  console.log(`  ${a.label}`);
  console.log(`     out ${a.recipe.outputRate}/m  <-  ${a.recipe.inputs.map(i => `${items[i.itemId].name} ${i.rate}`).join(', ')}`);
}
if (warnings.length) console.log('\nWARNINGS:\n  ' + warnings.join('\n  '));

if (process.argv.includes('--write')) {
  const out = [...recipes, ...additions.map(a => a.recipe)];
  writeFileSync(join(ROOT, 'data', 'recipes.json'), JSON.stringify(out, null, 2) + '\n');
  console.log(`\n✓ Wrote ${out.length} recipes to data/recipes.json (+${additions.length})`);
} else {
  console.log('\n(dry run — pass --write to apply)');
}
