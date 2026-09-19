---
name: Adaptive Synthesis
colors:
  surface: '#0f131c'
  surface-dim: '#0f131c'
  surface-bright: '#353943'
  surface-container-lowest: '#0a0e17'
  surface-container-low: '#181b25'
  surface-container: '#1c1f29'
  surface-container-high: '#262a34'
  surface-container-highest: '#31353f'
  on-surface: '#dfe2ef'
  on-surface-variant: '#cbc3d7'
  inverse-surface: '#dfe2ef'
  inverse-on-surface: '#2c303a'
  outline: '#958ea0'
  outline-variant: '#494454'
  surface-tint: '#d0bcff'
  primary: '#d0bcff'
  on-primary: '#3c0091'
  primary-container: '#a078ff'
  on-primary-container: '#340080'
  inverse-primary: '#6d3bd7'
  secondary: '#4edea3'
  on-secondary: '#003824'
  secondary-container: '#00a572'
  on-secondary-container: '#00311f'
  tertiary: '#7bd0ff'
  on-tertiary: '#00354a'
  tertiary-container: '#009bd1'
  on-tertiary-container: '#002d40'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e9ddff'
  primary-fixed-dim: '#d0bcff'
  on-primary-fixed: '#23005c'
  on-primary-fixed-variant: '#5516be'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#c4e7ff'
  tertiary-fixed-dim: '#7bd0ff'
  on-tertiary-fixed: '#001e2c'
  on-tertiary-fixed-variant: '#004c69'
  background: '#0f131c'
  on-background: '#dfe2ef'
  surface-variant: '#31353f'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 44px
    letterSpacing: -0.025em
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '500'
    lineHeight: 22px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  label-lg:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: -0.01em
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 14px
    letterSpacing: 0.02em
  code-inline:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-mobile: 0.75rem
  margin: 1.5rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style

This design system establishes an ultra-focused, high-velocity cognitive workspace tailored for advanced researchers, engineers, and self-directed academics. The design aesthetic balances the rigorous functional density of developer tools like Linear with the quiet clarity of an elite academic repository.

The design movement is **Technical Precision Minimalist with Focused Glassmorphism**. The interface recedes entirely, allowing dense technical synthesis, agentic reasoning traces, and contextual source material to take prominence. Every element communicates computational authority, intellectual clarity, and deep focus through razor-thin borders, deliberate status tints, and monospaced metadata anchoring.

## Colors

The palette operates in a default dark-mode paradigm anchored by deep cosmic obsidian and navy-tinted values, establishing deep optical hierarchy without pure black flattening.

### Palette Architecture
- **Surface Foundations:**
  - Base Canvas (`#090D16`): The ultimate retreat layer.
  - Surface Level 1 (`#0D121F`): Sidebars, tool shelves, and persistent frames.
  - Surface Level 2 (`#13192B`): Primary work surfaces, editor canvases, card containers.
  - Surface Level 3 (`#1A2238`): Popovers, contextual flyouts, elevated inspect panels.
- **Structural Lines:**
  - Default Border (`#1F2A44`): Crisp 1px division between surfaces.
  - Interactive / Highlight Border (`#2D3A5D`): Active tabs, card hovers, and focused panels.
- **Cognitive & Semantic Spectrum:**
  - **Intelligence & Agent Activity:** Violet (`#8B5CF6`) and Lavender (`#A78BFA`). Applied to AI thought streams, synthesis states, and prompt entry nodes.
  - **Mastery & Verification:** Emerald (`#10B981`) and Mint (`#34D399`). Denotes confirmed hypotheses, retained recall cards, and verified derivations.
  - **Evidence & Contextual Provenance:** Sky Blue (`#38BDF8`). Applied to source citations, cross-references, and graph connections.
  - **Hypothesis & Active Review:** Amber (`#F59E0B`). Signals unresolved questions, calibration items, and working assumptions.
  - **Divergence & Error:** Rose Red (`#EF4444`). Used strictly for refutations, failing tests, and memory lapses.

## Typography

Typography relies on a dual-engine hierarchy:
- **Inter** provides neutral, high-legibility structural body copy and executive headers, ensuring extended cognitive sessions remain fatigue-free.
- **JetBrains Mono** serves as the system's operational nervous system. It is strictly enforced for concept tokens, ontology IDs, telemetry timestamps, agent reasoning steps, keyboard shortcuts, and verified confidence metrics.

Numerical tabular data and metrics must use `font-variant-numeric: tabular-nums` to maintain vertical baseline alignment during dynamic live updates.

## Layout & Spacing

The layout is built on a responsive multi-pane fluid workspace, standardizing on an 8px sub-grid with a 4px micro-unit for compact technical modules.

- **Desktop (>= 1280px):** Three-column dock layout. Left persistent navigation/graph pane (260px fixed), primary synthesis viewport (fluid, min 640px), right contextual inspector/telemetry drawer (360px–480px adjustable). Gutters are locked to `1rem` with interior panel edge margins at `1.5rem`.
- **Tablet (768px – 1279px):** Split-view work canvas. Sidebar collapses to an icon shelf (48px); the right context panel transforms into an overlaid or bottom sheet drawer.
- **Mobile (< 768px):** Single-pane sequential canvas with a bottom bar for command switching. Margin scales down to `1rem`. Dense technical tables switch to horizontally scrollable swipe containers or stacked label-value blocks.

## Elevation & Depth

Visual hierarchy uses **tonal layer stepping paired with hairline glassmorphic barriers**. Heavy drop shadows are omitted in favor of surface luminescence and precise 1px borders.

- **Base Layer (Elevation 0):** Background `#090D16`. Zero shadow, pure flat foundation.
- **Structural Framing (Elevation 1):** `#0D121F` with 1px border `#1F2A44`. Zero blur.
- **Workspace Tiles & Cards (Elevation 2):** `#13192B` with 1px border `#1F2A44`. On hover, border shifts to `#2D3A5D` with an ultra-diffused ambient lift: `0 8px 24px -6px rgba(0, 0, 0, 0.45)`.
- **Floating Overlays & Modals (Elevation 3):** Background `#1A2238` with 88% alpha, supplemented by `backdrop-filter: blur(12px)`. Outlined with a top-weighted highlight border (`1px solid rgba(255, 255, 255, 0.08)`).
- **Intelligence Glow Effect:** When active agent reasoning or adaptive synthesis runs, elements gain an ambient, non-blinding perimeter aura: `0 0 20px -4px rgba(139, 92, 246, 0.15)`.

## Shapes

The design system employs **Soft (`1`)** roundedness to convey precision engineering and geometric rigor. Curvature is intentionally compact to maintain structural discipline across high-density layouts.

- Base inputs, buttons, chips, and table cells: `rounded` (`0.25rem` / 4px).
- Content cards, panels, and code blocks: `rounded-lg` (`0.5rem` / 8px).
- Floating dialogs, command palettes, and major overlay sheets: `rounded-xl` (`0.75rem` / 12px).
- Strictly avoid circular pills (`9999px`) except for live indicator status dots and avatar thumbnails.

## Components

### Buttons
- **Primary (Action/Synthesize):** `#8B5CF6` background, `#FFFFFF` text, 0.25rem border-radius. Hover: `#7C3AED` with a subtle ring highlight `0 0 0 1px rgba(167, 139, 250, 0.4)`.
- **Secondary (Neutral Work):** `#13192B` background, `#1F2A44` border, `#E2E8F0` text. Hover: `#1A2238` background, `#2D3A5D` border.
- **Ghost/Toolbar:** Transparent background, `#94A3B8` text. Hover: `#13192B` background, `#F1F5F9` text.
- **Typography:** `JetBrains Mono`, 12px (`label-md`), uppercase with `0.04em` tracking for actionable utility buttons.

### Chips & Badges
- Strict two-tier schema: Monospaced category prefix (`JetBrains Mono`, 11px) coupled with state styling.
- **Mastered/Verified:** `#10B981` at 10% opacity, text `#34D399`, border `1px solid rgba(16, 185, 129, 0.25)`.
- **Hypothesis/Pending:** `#F59E0B` at 10% opacity, text `#FBBF24`, border `1px solid rgba(245, 158, 11, 0.25)`.
- **Citation/Evidence:** `#38BDF8` at 10% opacity, text `#38BDF8`, border `1px solid rgba(56, 189, 248, 0.25)`.

### Cards & Content Containers
- Background `#13192B`, border 1px `#1F2A44`, corner radius `0.5rem`.
- Padding scaled tightly: `1rem` internal gutter. Headers use hairline divider borders (`border-b border-[#1F2A44]`) with metadata aligned to the right in `label-sm`.

### Input Fields & Command Palettes
- Surface `#0D121F`, border 1px `#1F2A44`, placeholder `#475569`, text `#F8FAFC`.
- Focus state: Border transitions to `#8B5CF6`, paired with `box-shadow: 0 0 0 1px #8B5CF6`. No heavy native outline rings.
- Command Palette (Quick Find): Floating `#1A2238` with backdrop blur (`16px`), 1px highlight border `rgba(255,255,255,0.08)`, JetBrains Mono shortcut tokens (`kbd` styled in `#0D121F` with 1px `#2D3A5D` borders).

### Checkboxes & Radio Buttons
- 14px square/circle boxes, background `#0D121F`, border 1px `#2D3A5D`.
- Selected state: `#8B5CF6` background with high-contrast white glyph.
- Indeterminate/Working state: `#F59E0B` filled dash indicator.

### Lists & Activity Feeds
- Zebra-free layout relying purely on 1px horizontal `#1F2A44` rules.
- Monospace timestamp (`label-sm`) fixed-width left column (60px), followed by primary statement (`body-md`), ending with semantic state badge.
- Interactive rows transition to `#1A2238` on hover via immediate `80ms ease-out`.

### Domain-Specific Components
- **Agentic Thought Stream:** Collapsible accordion with a vertical violet hairline (`#8B5CF6` at 40% opacity) running down the left boundary, rendering streamed markdown tokens in real time.
- **Concept Provenance Tag:** Interactive inline node linking raw claim text to mathematical proofs or literature extracts via an emerald or cyan 1px underline.