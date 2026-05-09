# Header Style Options

> Current header: plain flex row — logo left, nav center, share button right.
> Pick one option below and tell me the number. I'll apply it directly to App.tsx + index.css.

---

## Option 1 — "Industrial Dark Bar"

**Vibe:** Full-width dark steel bar, orange left accent line, compact single row. Feels like a game HUD.

```
┌─────────────────────────────────────────────────────────────────────────────┐
▌ ▣ Factory Visual Planner │  Production Planner  Save Game Map  World Map    │ Share ▌
└─────────────────────────────────────────────────────────────────────────────┘
  ↑ orange left border                ↑ pill tabs with orange underline active
```

**Key traits:**
- Full-width header, fixed height `56px`
- Thick `3px` left orange border on the entire header bar
- Logo + title on the left, no subtitle
- Nav tabs are underline-style (no background pill), active tab gets orange `border-bottom`
- Share button is a small ghost button on the far right
- Background: `#0d0e11` with `1px` bottom border `#1e2025`
- Separator `|` dividers between nav items

---

## Option 2 — "Frosted Glass Command Center"

**Vibe:** Semi-transparent blurred header that floats above content. Modern, premium feel.

```
╔═════════════════════════════════════════════════════════════════════════════╗
║  ⬡ FACTORY VISUAL PLANNER          [Planner] [Save Map] [World Map]   [↗]  ║
║  ─────────────────── blur/glass bg ──────────────────────────────────────  ║
╚═════════════════════════════════════════════════════════════════════════════╝
```

**Key traits:**
- `backdrop-filter: blur(20px)` with `background: rgba(13,14,17,0.75)`
- Title in ALL CAPS with wide letter-spacing, small hex icon prefix
- Nav tabs are rounded pill buttons with `bg-white/5` inactive, `bg-orange-500/15 border border-orange-500/40` active
- Subtle `box-shadow: 0 1px 0 rgba(255,255,255,0.04)` bottom edge
- Share button is an orange-tinted icon-only circle button
- Sticky positioned — stays at top when scrolling

---

## Option 3 — "Split Two-Row Header"

**Vibe:** Two distinct rows — branding row on top, navigation row below. Clean separation, like VS Code or Linear.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ▣ Factory Visual Planner    Plan and optimize your production lines.   [↗] │
├─────────────────────────────────────────────────────────────────────────────┤
│  ◈ Production Planner    ◈ Save Game Map    ◈ World Map                     │
└─────────────────────────────────────────────────────────────────────────────┘
  ↑ row 1: brand + subtitle + share          ↑ row 2: full-width tab bar
```

**Key traits:**
- Row 1: `48px` — logo, title, subtitle (muted), share button right-aligned
- Row 2: `40px` — full-width tab bar with left-aligned tabs, no background container
- Active tab: orange bottom border `2px` + white text
- Inactive tab: muted gray, hover lifts to white
- Row 2 has a `border-bottom: 1px solid #1e2025` that acts as the tab underline track
- Clean, spacious, very readable

---

## Option 4 — "Sidebar-Style Vertical Header" *(Left Rail)*

**Vibe:** Vertical left sidebar for navigation instead of a top bar. Maximizes vertical space for the graph. Like Figma or Notion.

```
┌──────┬──────────────────────────────────────────────────────────────────────┐
│  ▣   │                                                                      │
│ ─── │                        Main Content Area                             │
│  ◈  │                                                                      │
│  ◈  │                                                                      │
│  ◈  │                                                                      │
│     │                                                                      │
│ [↗] │                                                                      │
└──────┴──────────────────────────────────────────────────────────────────────┘
  ↑ 56px wide vertical rail
```

**Key traits:**
- `56px` wide left rail, full viewport height
- Logo icon at top (no text label — icon only)
- Nav items are icon-only with tooltip on hover
- Active item: orange left border `3px` + orange icon tint
- Share button pinned to bottom of rail
- Main content shifts right with `padding-left: 56px`
- Saves ~60px of vertical space for the graph

---

## Option 5 — "Neon Accent Gradient Header"

**Vibe:** Dark header with a subtle orange-to-transparent gradient sweep. Feels like a sci-fi dashboard or game title screen.

```
┌▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓┐
│ ░░ FACTORY VISUAL PLANNER ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│    ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔                                                  │
│  [■ Production Planner]  [■ Save Game Map]  [■ World Map]          [↗ Share]│
└────────────────────────────────────────────────────────────────────────────┘
  ↑ left-side orange radial glow fades right
```

**Key traits:**
- Background: `linear-gradient(90deg, rgba(249,115,22,0.08) 0%, transparent 40%)`
- Title is large `text-xl` with a thin orange underline decoration below it
- Nav tabs are square-cornered "segment" buttons with `border-right: 1px solid #2a2d33` dividers
- Active tab: `background: rgba(249,115,22,0.12)` + white text
- Bottom border of header: `1px solid rgba(249,115,22,0.2)` (orange tint)
- Share button is right-aligned with orange text color

---

## Option 6 — "Minimal Monochrome Strip"

**Vibe:** Ultra-minimal, no decoration. Just text and function. Like a terminal or developer tool.

```
 ▣ Factory Visual Planner          Planner · Save Map · World Map          Share
 ─────────────────────────────────────────────────────────────────────────────
```

**Key traits:**
- No background box, no border-radius — header blends into page background
- Single `1px` bottom divider line only
- Title: `font-mono`, small `text-sm`, muted gray
- Nav: plain text links separated by `·` dot, active is white + underline
- Share: plain text button `[Share ↗]` no border
- Extremely compact — only `40px` tall
- Lets the graph/content feel like the real focus

---

## Option 7 — "Game HUD with Status Chips"

**Vibe:** Looks like an in-game overlay. Header includes live stats (power, buildings count) inline with the nav. Very Satisfactory-themed.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ⚙ FACTORY PLANNER  │ ⚡ 0 MW  │ 🏭 0 bldgs │ ──────────────────── │ [↗]  │
├──────────────────────────────────────────────────────────────────────────────┤
│  [◈ Planner ▼]   [◈ Save Map]   [◈ World Map]                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Key traits:**
- Row 1: Logo + title, then `|` separator, then live stat chips (power MW, building count) pulled from `summary`
- Stat chips: small pill badges `bg-[#1c1e22] border border-[#2a2d33]` with icon + value
- Row 2: Tab navigation, same underline style as Option 3
- When no plan is calculated, chips show `—`
- Share button far right of row 1
- Gives the header real utility, not just decoration

---

## Comparison Table

| # | Style | Height | Nav Style | Unique Feature |
|---|-------|--------|-----------|----------------|
| 1 | Industrial Dark Bar | 56px | Underline tabs | Orange left accent border |
| 2 | Frosted Glass | 56px | Pill tabs | Blur/glass background |
| 3 | Split Two-Row | 88px | Full-width underline | Separate brand + nav rows |
| 4 | Vertical Sidebar | Full height | Icon rail | Left sidebar, max content space |
| 5 | Neon Gradient | 72px | Segment buttons | Orange radial glow sweep |
| 6 | Minimal Strip | 40px | Text links | No decoration, terminal feel |
| 7 | Game HUD + Stats | 88px | Underline tabs | Live power/building chips |

---

> **Reply with the option number** (e.g. "Option 3") and I'll implement it directly in App.tsx and index.css.
