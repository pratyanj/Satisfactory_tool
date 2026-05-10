# Commit Messages Plan

Current status: there are no staged files right now (`git diff --staged --name-only` is empty).

Use the commits below to keep changes clean and logical.

## 1) AI documentation and project context

Message:
`docs(ai): add project context and coding guidance files`

Files:
- `AGENTS.md`
- `PROJECT_CONTEXT.md`
- `.ai/architecture.md`
- `.ai/changelog.md`
- `.ai/coding_rules.md`
- `.ai/current_tasks.md`
- `.ai/decisions.md`
- `.ai/summaries/graph_engine.md`

Commands:
`git add AGENTS.md PROJECT_CONTEXT.md .ai`
`git commit -m "docs(ai): add project context and coding guidance files"`

## 2) Branding assets and favicon wiring

Message:
`feat(branding): add app logo assets and favicon links`

Files:
- `public/logo/favicon.ico`
- `public/logo/satisfactory_tool_logo.png`
- `public/logo/web_icon.png`
- `public/logo/favicons/android-chrome-192x192.png`
- `public/logo/favicons/android-chrome-512x512.png`
- `public/logo/favicons/apple-touch-icon-180x180.png`
- `public/logo/favicons/apple-touch-icon.png`
- `public/logo/favicons/favicon-16x16.png`
- `public/logo/favicons/favicon-32x32.png`
- `public/logo/favicons/favicon-48x48.png`
- `public/logo/favicons/favicon.ico`
- `public/logo/favicons/manifest.webmanifest`
- `index.html`

Commands:
`git add public/logo index.html`
`git commit -m "feat(branding): add app logo assets and favicon links"`

## 3) Alternate recipes data integration

Message:
`feat(data): add alternate recipes and recipe metadata support`

Files:
- `data/alternate_recipes.json`
- `data/alternate_recipes_formatted.json`
- `data/recipes.json`
- `src/engine/data.ts`

Commands:
`git add data/alternate_recipes.json data/alternate_recipes_formatted.json data/recipes.json src/engine/data.ts`
`git commit -m "feat(data): add alternate recipes and recipe metadata support"`

## 4) Item Codex UI (browser + details tab)

Message:
`feat(codex): add item browser/detail experience and app tab integration`

Files:
- `src/components/ItemBrowser.tsx`
- `src/components/ItemDetail.tsx`
- `src/index.css`
- `src/App.tsx`

Commands:
`git add src/components/ItemBrowser.tsx src/components/ItemDetail.tsx src/index.css src/App.tsx`
`git commit -m "feat(codex): add item browser/detail experience and app tab integration"`

## 5) Graph node visual enhancement

Message:
`feat(graph): improve machine node visuals with larger machine panel and item preview`

Files:
- `src/components/Graph/MachineNode.tsx`

Commands:
`git add src/components/Graph/MachineNode.tsx`
`git commit -m "feat(graph): improve machine node visuals with larger machine panel and item preview"`

