# Smyrna Tools — Shared Design Vocabulary

This file is the single source of truth for the motion, elevation, focus,
hover, and interaction patterns used across the app. Every visual change
should read from this file and align with the patterns below so the
product feels coherent across views.

The substrate is **Tailwind v3 + CSS custom properties** with three themes
(light, dark, gray). Tokens like `bg-bg-primary`, `text-text-primary`,
`border-border-light`, `bg-accent` are defined in `tailwind.config.js` and
backed by CSS variables in `src/app/index.css`. Never hardcode hex colors.
Never write raw CSS. Tailwind-only.

---

## 1. Motion

Three speeds. Pick by the size of what moves.

| Token        | Duration | Tailwind utility   | Use for                                              |
|--------------|----------|--------------------|------------------------------------------------------|
| fast         | 150 ms   | `duration-150`     | Tiny state changes — hovers, focus rings, color flips |
| base         | 200 ms   | `duration-200`     | Small UI elements — buttons, badges, pills, dropdowns |
| slow         | 300 ms   | `duration-300`     | Panels, modals, page-level fades, list reveal         |

Easing — match the kind of motion, not the speed.

| Curve          | Tailwind            | Use for                                                  |
|----------------|---------------------|----------------------------------------------------------|
| `ease-out`     | `ease-out`          | Entries (something appearing — overshoots into place)    |
| `ease-in`      | `ease-in`           | Exits (something leaving — accelerates away)             |
| `ease-in-out` | `ease-in-out`       | Loops and reversible state (theme toggles, tab switches) |
| spring         | `cubic-bezier(0.34, 1.56, 0.64, 1)` (via `animate-pop-in`) | Discrete reveals — toasts, popovers, picker chips |

The Tailwind config already exposes named animations: `animate-fade-in`,
`animate-fade-in-fast`, `animate-fade-slide-in`, `animate-slide-up`,
`animate-pop-in`, `animate-msg-in`. Prefer these named animations over
ad-hoc `transition` declarations. Never write `@keyframes` in CSS files —
they live in `tailwind.config.js`.

**Reduced motion**: never auto-animate decorative loops without a way to
disable. If you add a continuous loop (`animate-pulse-slow`,
`animate-fuse-shimmer`), pair it with `motion-reduce:animate-none`.

---

## 2. Elevation

Four levels. Pick the lowest that still reads.

| Level    | Tailwind utility       | Use for                                                |
|----------|------------------------|--------------------------------------------------------|
| flat     | (no shadow)            | Section backgrounds, embedded panels, table rows       |
| resting  | `shadow-sm`            | Cards at rest, default elevation                       |
| raised   | `shadow-card`          | Hovered cards, important panels, key dashboard tiles   |
| floating | `shadow-modal`         | Modals, popovers, dropdown menus, toast notifications  |

Hover lift on cards: bump one level (resting → raised) and translate by
`-translate-y-px` to `-translate-y-0.5` — never more, or the layout
shifts. Always pair the lift with `transition-shadow duration-200`.

Borders read better than heavy shadows in dark/gray themes. When in
doubt, use `border border-border-light` (or `border-border-medium` for
emphasis) over a deeper shadow.

---

## 3. Radius

| Token       | Tailwind           | Use for                                                |
|-------------|--------------------|--------------------------------------------------------|
| pill        | `rounded-full`     | Avatars, status dots, count badges, single-line chips  |
| input       | `rounded-md` (6 px) | Form inputs, buttons, small interactive controls       |
| card        | `rounded-card` (12 px) | Cards, list rows, dropdown menus, popovers          |
| modal       | `rounded-modal` (16 px) | Modals, dialogs, sheets                            |

Match radius across stacked elements (e.g., a button inside a card uses
`rounded-md`; the card uses `rounded-card`). Don't mix `rounded-lg` and
`rounded-card` on sibling elements.

---

## 4. Focus, hover, active

Every interactive element must read in all three themes. The pattern:

```jsx
className="
  transition-colors duration-150
  hover:bg-bg-hover
  active:scale-[0.98]
  focus-visible:outline-none
  focus-visible:ring-2
  focus-visible:ring-accent
  focus-visible:ring-offset-2
  focus-visible:ring-offset-bg-primary
"
```

Rules:

- **Hover** flips background to `bg-bg-hover` (or shifts text to `text-text-primary` if the element is link-like). Never use raw colors like `hover:bg-gray-100`.
- **Active** is a 2 % scale press: `active:scale-[0.98]`. Skip for inputs and large surfaces.
- **Focus-visible** is always a 2 px `ring-accent` with `ring-offset-2 ring-offset-bg-primary`. Never remove the ring without replacing it with an equivalent visible affordance.
- **Disabled** is `disabled:opacity-50 disabled:cursor-not-allowed` plus removal of hover/active classes (use `disabled:pointer-events-none` if simpler).

Icon-only buttons: `aria-label` required. Hit target ≥ 36 × 36 px (use `p-2` on a 20 px icon, `p-1.5` on a 24 px icon).

---

## 5. Spacing rhythm

Stick to Tailwind's 4-px scale. Common rhythms in this codebase:

| Context          | Inner padding | Gap between children       |
|------------------|---------------|----------------------------|
| Card body        | `p-4` / `p-5` | `gap-3` / `gap-4`          |
| Form row         | `py-2` / `py-3` | `gap-2`                  |
| List row (dense) | `py-2 px-3`   | `gap-2`                    |
| Modal body       | `p-6`         | `gap-4` / `gap-6`          |
| Dashboard tile   | `p-5` / `p-6` | `gap-4`                    |

Never `gap-1.5`, never `gap-3.5` — multiples of 2/4/6/8 only.

---

## 6. Typography

| Use                      | Class                                                    |
|--------------------------|----------------------------------------------------------|
| Page heading             | `font-heading text-2xl md:text-3xl font-semibold tracking-tight text-text-primary` |
| Section heading          | `font-heading text-lg font-semibold text-text-primary`   |
| Card title               | `font-heading text-base font-semibold text-text-primary` |
| Body                     | `text-sm text-text-primary`                              |
| Secondary / helper       | `text-sm text-text-secondary`                            |
| Tertiary / placeholder   | `text-xs text-text-tertiary`                             |
| Metric (large number)    | `font-heading text-3xl md:text-4xl font-bold tabular-nums` |
| Caption / label          | `text-xs font-medium uppercase tracking-wider text-text-tertiary` |

Use `tabular-nums` on every numeric column so values align vertically.

---

## 7. Inputs (delegated to the dropdowns/hovers skill)

For dropdowns, selects, comboboxes, autocomplete, search bars, tooltips,
hover messages, date pickers, and time inputs — use the patterns from
`/react-dropdownsandhovers-styles`. The high-level contract is:

- Surface-aware: a select inside a card uses `bg-bg-primary`; inside a
  modal it uses `bg-bg-secondary`. The control inverts cleanly in all
  three themes.
- Calendar popovers use `bg-bg-secondary border-border-light shadow-modal rounded-card`.
- Time inputs are forgiving — accept "8", "8a", "830", "8:30 PM" — and
  detect 12 vs 24 h from the user's preference, not the locale.
- Tooltips: `bg-text-primary text-bg-primary text-xs px-2 py-1 rounded-md shadow-sm`
  with `animate-fade-in-fast` and an 80 ms delay.

---

## 8. Skill invocation order on any visual change

1. `/using-superpowers` — orient on the work and check for relevant skills.
2. `/ui-ux-pro-max` — set direction: style family, palette, layout, UX guideline.
3. `/emil-design-eng` — apply polish: micro-interactions, animation choices, the invisible details.
4. `/react-dropdownsandhovers-styles` — if any input control is in scope.
5. Implementation skills (`/frontend-design`, `/mockup`, `/ui-styling`) as the work demands.

Never skip steps 2 + 3 on a visual change, even a tiny one. Small tweaks
are exactly where polish gets lost.

---

## 9. Three-theme test

Before declaring any visual change done, mentally verify:

- ✓ Light theme: text contrast ≥ 4.5:1 against the background.
- ✓ Dark theme: shadows still read; borders not invisible.
- ✓ Gray theme: surfaces clearly distinct from light AND dark (they are
  intentionally medium gray, not "dark with grey accents").

If a change uses raw palette tokens (`bg-white`, `bg-gray-100`,
`text-gray-500`), it fails the test. Use semantic tokens
(`bg-bg-primary`, `text-text-secondary`).
