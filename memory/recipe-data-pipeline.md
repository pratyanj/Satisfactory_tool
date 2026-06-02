---
name: recipe-data-pipeline
description: How recipe data is sourced/used in the Satisfactory tool, and how to audit alternates against the game export
metadata:
  type: project
---

`data/recipes.json` is the LIVE recipe source — imported directly by [src/engine/data.ts](src/engine/data.ts) and consumed by the solver. It holds standard + alternate recipes (alternates flagged `isAlternate: true`), all rates per-minute.

`data/alternate_recipes.json` is the authoritative game export (raw `Recipe_Alternate_*_C` classNames, per-craft amounts + duration) — the source of truth for alternates. `data/alternate_recipes_formatted.json` is a stale intermediate; not imported anywhere.

`scripts/update_recipes_ts.py` is OBSOLETE — it rewrites an `export const recipes` block that no longer exists in data.ts (data.ts now imports JSON). Do not rely on it.

To audit ALL recipes (standard + alternate, inputs/outputs/byproducts/machine) vs the game, run `python scripts/audit_recipes.py` — it auto-downloads the authoritative SatisfactoryTools dataset to `scripts/satisfactory_docs.json` (gitignored) and reports every discrepancy. `scripts/fix_recipes.py` applied the corrections (Jun 2026: 39 matched recipes + 14 late-game SAM/quantum recipes rebuilt; 11 missing byproducts added — e.g. Plastic→Heavy Oil Residue, Fuel→Polymer Resin, Alumina Solution→Silica, Aluminum Scrap→Water). `scripts/audit_alternates.py` is the older alternate-only check.

As of that pass `audit_recipes.py` is clean except `recipe_dissolved_silica` (no authoritative primary recipe — it's only a Quartz Purification byproduct in-game, kept as a targetable house recipe) and `recipe_alien_protein` (made from creature remains we don't model, so it's a no-input raw source to avoid an alien_protein↔alien_dna_capsule cycle).

Naming quirks in the game export: `Desc_ModularFrameLightweight_C` = Radio Control Unit (NOT a frame); `Desc_SteelPlate_C` = Steel Beam; `Desc_AluminumPlate_C` = Alclad Aluminum Sheet; `Desc_Gunpowder_C` = Black Powder; `Desc_GoldIngot_C` = Caterium Ingot; `Desc_IronScrew_C` is named "Screws" (our item is "Screw"). `BP_ItemDescriptorPortableMiner_C` (Automated Miner alt's product) has no factory item, so that one alternate is intentionally excluded.

Byproducts display: `graphMapper.ts` surfaces unconsumed byproducts as terminal `byproduct_output` "Byproduct: X" bubbles (purple accent in MachineNode) in BOTH aggregated and expanded modes. Expanded mode treats solver `byproduct_reuse` nodes (machines:0) as single source chunks — without that guard it divides by zero machines and crashes. ItemDetail (codex) and the Sandbox MachineInspector already render `recipe.byproducts`.

Recipe selection (solver.ts): `recipes.filter(r => r.outputItemId === itemId)`; default = first match in file order. So the STANDARD recipe for an item must appear before its alternates, or the default becomes an alternate.
