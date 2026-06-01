---
name: recipe-data-pipeline
description: How recipe data is sourced/used in the Satisfactory tool, and how to audit alternates against the game export
metadata:
  type: project
---

`data/recipes.json` is the LIVE recipe source — imported directly by [src/engine/data.ts](src/engine/data.ts) and consumed by the solver. It holds standard + alternate recipes (alternates flagged `isAlternate: true`), all rates per-minute.

`data/alternate_recipes.json` is the authoritative game export (raw `Recipe_Alternate_*_C` classNames, per-craft amounts + duration) — the source of truth for alternates. `data/alternate_recipes_formatted.json` is a stale intermediate; not imported anywhere.

`scripts/update_recipes_ts.py` is OBSOLETE — it rewrites an `export const recipes` block that no longer exists in data.ts (data.ts now imports JSON). Do not rely on it.

To audit alternates vs the game, run `python scripts/audit_alternates.py` (reports missing alternates + value mismatches; per-minute rate = amount * 60 / duration). It contains the className→itemId map.

Naming quirks in the game export: `Desc_ModularFrameLightweight_C` = Radio Control Unit (NOT a frame); `Desc_SteelPlate_C` = Steel Beam; `Desc_AluminumPlate_C` = Alclad Aluminum Sheet; `Desc_Gunpowder_C` = Black Powder; `Desc_GoldIngot_C` = Caterium Ingot. `BP_ItemDescriptorPortableMiner_C` (Automated Miner alt's product) has no factory item, so that one alternate is intentionally excluded.

Recipe selection (solver.ts): `recipes.filter(r => r.outputItemId === itemId)`; default = first match in file order. So the STANDARD recipe for an item must appear before its alternates, or the default becomes an alternate.
