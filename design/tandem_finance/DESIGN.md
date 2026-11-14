---
name: Tandem Finance
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#45464d'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#4b41e1'
  on-secondary: '#ffffff'
  secondary-container: '#645efb'
  on-secondary-container: '#fffbff'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#00201d'
  on-tertiary-container: '#0c9488'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#e2dfff'
  secondary-fixed-dim: '#c3c0ff'
  on-secondary-fixed: '#0f0069'
  on-secondary-fixed-variant: '#3323cc'
  tertiary-fixed: '#89f5e7'
  tertiary-fixed-dim: '#6bd8cb'
  on-tertiary-fixed: '#00201d'
  on-tertiary-fixed-variant: '#005049'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 40px
    fontWeight: '600'
    lineHeight: 48px
    letterSpacing: -0.03em
  display-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 30px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: -0.01em
  stat-lg:
    fontFamily: Hanken Grotesk
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.03em
  stat-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  stat-md:
    fontFamily: Hanken Grotesk
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.02em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.005em
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-md: 1.5rem
  gutter-lg: 2rem
  margin: 1rem
  margin-md: 2rem
  margin-lg: 3rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style
The brand voice is composed, transparent, and collaborative. Tailored for modern couples navigating joint financial lives, the interface bridges personal autonomy with shared goals. It rejects aggressive gamification and sensory clutter in favor of poise, absolute clarity, and mutual trust.

The visual style merges ultra-refined modern product minimalism (inspired by Linear) with the crisp utility of next-generation neobanks. It balances precision financial data with human warmth:
- Pure white functional cards floated over a luminous, cool-tinted paper backdrop.
- Razor-sharp structural discipline paired with soft, hyper-diffused ambient depth.
- Tactile, deliberate interactions: subtle state changes, hairline boundaries, and dedicated partner attribution accents that allow seamless visual parsing without visual friction.

## Colors
The palette balances institutional trust with modern digital product refinement.

### Structural Canvas & Surfaces
- **Canvas Base:** `#F8FAFC` provides a calm, cool-tinted foundation.
- **Card Surface:** Pure `#FFFFFF` ensures maximal contrast and separation for critical financial figures.
- **Surface Subdued / Input Background:** `#F1F5F9` for nested transaction groupings, metadata rows, and embedded modules.
- **Hairline Borders:** `rgba(226, 232, 240, 0.8)` for outer boundaries and `rgba(241, 245, 249, 0.9)` for internal dividers.

### Primary Accents & Neutral System
- **Primary Ink / Accent (`#0F172A`):** Deep Slate Navy. Used for authoritative headlines, primary metrics, high-emphasis CTAs, and structural navigational states.
- **Secondary Interactive (`#4F46E5`):** Refined Indigo. Governs active link states, focused balance projections, and joint action moments.
- **Text Tiers:**
  - High-emphasis (Headlines, Amounts): `#0F172A`
  - Medium-emphasis (Body, Subtitles): `#334155`
  - Low-emphasis (Timestamps, Secondary Labels): `#64748B`
  - Disabled / Hairline Guides: `#94A3B8`

### Financial State Semantics
- **Positive / Inflow / Growth:** Emerald `#10B981` (Surface tint: `#ECFDF5`, Border: `#A7F3D0`).
- **Expense / Outflow / Over-budget:** Rose `#F43F5E` (Surface tint: `#FFF1F2`, Border: `#FECDD3`).
- **Attention / Pending / Split Adjustments:** Amber `#F59E0B` (Surface tint: `#FFFBEB`, Border: `#FDE68A`).

### Dual Partner Attribution
- **Partner 1 (You):** Indigo/Violet `#6366F1` (Soft Tint: `#EEF2FF`, Border: `#C7D2FE`).
- **Partner 2 (Partner):** Teal/Emerald `#0D9488` (Soft Tint: `#F0FDFA`, Border: `#99F6E4`).
- **Joint / Shared:** Balanced Slate Navy `#0F172A` or unified gradient blend.

## Typography
The system employs **Hanken Grotesk** for display headlines, card titles, and high-impact numerical balance readouts, providing a contemporary, structured, architectural voice. **Inter** handles all running body text, metadata, form labels, and compact tabular grids.

### Numeric Formatting Rule
All financial amounts, split ratios, dates, and quantitative values must strictly activate tabular figures (`font-feature-settings: 'tnum' 1, 'cv05' 1, 'ss01' 1`). This eliminates horizontal jitter across updating balances, ledgers, and transaction feeds.

## Layout & Spacing
The layout adheres to an 8px grid foundation (with a precise 4px sub-rhythm for tight metric groupings, badge paddings, and alignment indicators).

### Viewport Breakpoints
- **Mobile (< 768px):** 4-column fluid grid. Outer canvas margin: `1rem` (16px), column gutter: `1rem`. Stacked card architecture, sticky bottom navigation or floating actionable pill.
- **Tablet (768px - 1023px):** 8-column fluid grid. Outer margin: `2rem` (32px), gutter: `1.5rem` (24px). Dual-column balance and budget visualizers.
- **Desktop (≥ 1024px):** 12-column fixed grid with max-width `1200px` centered. Outer margin: `3rem` (48px), gutter: `2rem` (32px). Primary split: 8-column main financial activity stream + 4-column sticky side rails (shared budget rings, partner settlement ledger).

## Elevation & Depth
Depth is produced through subtle contrast between the cool `#F8FAFC` ground and pure `#FFFFFF` cards, framed by razor-thin borders and multi-layer ambient box shadows. No harsh or dark drop shadows are permitted.

### Depth Hierarchy
- **Level 0 (Flat / Inset):** No shadow. `#F1F5F9` background or nested table rows. Border: `1px solid rgba(226, 232, 240, 0.6)`.
- **Level 1 (Standard Card / Base Surface):**
  - Border: `1px solid rgba(226, 232, 240, 0.8)`
  - Shadow: `0 1px 2px 0 rgba(15, 23, 42, 0.03), 0 2px 6px -1px rgba(15, 23, 42, 0.04)`
- **Level 2 (Hovered Card / Active Interactive Cell):**
  - Border: `1px solid rgba(203, 213, 225, 0.9)`
  - Shadow: `0 4px 12px -2px rgba(15, 23, 42, 0.05), 0 2px 4px -2px rgba(15, 23, 42, 0.03)`
- **Level 3 (Modals / Split Overlays / Quick-Add Sheets):**
  - Border: `1px solid rgba(226, 232, 240, 0.9)`
  - Shadow: `0 20px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)`
  - Backdrop: `rgba(15, 23, 42, 0.35)` with `backdrop-filter: blur(8px)`.

## Shapes
A balanced, modern geometric shape scale:
- **Base Components (Inputs, Buttons, Dropdowns, Inline Tags):** `rounded` (0.5rem / 8px). Creates crisp, architectural, reliable touch targets.
- **Surfaces & Cards (Ledgers, Budget Containers, Charts):** `rounded-lg` (1rem / 16px).
- **Major Dialogs, Sheets, & Bottom Panels:** `rounded-xl` (1.5rem / 24px).
- **Indicators & Partner Badges:** Fully circular (`9999px`) for avatars, attribution pill indicators, and transaction category icons.

## Components

### Buttons & Interactive Controls
- **Primary:** Background `#0F172A`, text `#FFFFFF`, radius 8px, padding `10px 16px`. Hover: `#1E293B`. Active: subtle transform `scale(0.99)`.
- **Secondary:** Background `#FFFFFF`, text `#0F172A`, border `1px solid rgba(226, 232, 240, 0.9)`, shadow Level 1. Hover: `#F8FAFC`.
- **Tertiary / Ghost:** Background transparent, text `#64748B`. Hover: `#F1F5F9`, text `#0F172A`.
- **Destructive:** Background `#FFF1F2`, text `#F43F5E`, border `1px solid #FECDD3`. Hover: `#FFE4E6`.

### Partner Attribution Chips & Badges
- **Pill Architecture:** Height `24px`, padding `0 8px`, border-radius `9999px`, font `label-sm`.
- **Partner 1 Chip:** Background `#EEF2FF`, border `1px solid #C7D2FE`, text `#4338CA`, accompanied by a 6px circular dot `#6366F1`.
- **Partner 2 Chip:** Background `#F0FDFA`, border `1px solid #99F6E4`, text `#0F766E`, accompanied by a 6px circular dot `#0D9488`.
- **Shared / Split Chip:** Background `#F1F5F9`, border `1px solid #E2E8F0`, text `#334155` with dual mini-avatars overlapping by 4px.

### Cards & Container Modules
- Always `#FFFFFF` background, Level 1 shadow, and `1px solid rgba(226, 232, 240, 0.8)`. Padding: `space-lg` (24px) for desktop, `space-md` (16px) for mobile.
- Section headers within cards feature clear label-sm captions in `#64748B` uppercase tracking (`0.04em`) above bold metric values.

### Transaction List Items
- Height `64px`, horizontal flex alignment, subtle divider line `1px solid rgba(241, 245, 249, 0.9)`.
- **Left:** Category icon inside a 40px rounded-lg container `#F8FAFC` with 1px border. Beside it: primary title (`body-md` in `#0F172A`, medium weight) and partner attribution micro-pill below.
- **Right:** Numerical amount formatted with tabular numbers. Outflows in `#0F172A`, inflows in `#10B981` prefixed with `+`. Split settlement status denoted by a tiny subscript label below the value.

### Inputs & Financial Keypads
- Height `44px`, background `#FFFFFF`, border `1px solid #CBD5E1`, text `#0F172A`.
- Focus state: outline none, border `#4F46E5`, box-shadow `0 0 0 3px rgba(79, 70, 229, 0.12)`.
- Large Currency Inputs: Zero-border transparent background with font `stat-lg`, displaying active partner split selector directly above.

### Checkboxes & Toggle Switches
- Checkboxes: 18x18px, 4px border radius, border `1.5px solid #CBD5E1`. Checked state: background `#0F172A`, white check mark.
- Toggle Switches (Equal vs Custom Split): Height `24px`, width `44px`, background `#E2E8F0`, active state `#4F46E5`. Thumb: 20px `#FFFFFF` with Level 1 shadow.

### Financial Progress Rings & Mini Charts
- Background tracks use `#F1F5F9`.
- Dynamic tracks use rounded end-caps with Partner 1 (`#6366F1`) and Partner 2 (`#0D9488`) stacked serially along the track to visually communicate respective contribution ratios.