# SRM Tools (smyrnatools-com)

Internal operations platform for a concrete ready-mix company. Manages fleet,
operators, plant performance, and weekly reporting across regions and plants.

## Stack

- React 19 + Vite (entry: `src/index.jsx`, build output: `build/`)
- Tailwind CSS 3 + custom theme tokens (dark / light / gray + accent palette)
- Supabase (Postgres, Auth, Storage, Edge Functions in `supabase/functions/`)
- Vitest + Testing Library (`__tests__/` colocated with the unit under test)
- Sentry for error tracking, Vercel for analytics + hosting

## Run

| Command | Purpose |
| --- | --- |
| `npm start` | Vite dev server on :3000 |
| `npm run build` | Production build into `build/` |
| `npm run preview` | Preview the production build |
| `npm test` | Vitest run (CI mode) |
| `npm run test:watch` | Vitest watch mode |
| `npm run lint` | ESLint on `src/` |
| `npm run format` | Prettier write across `src/` |
| `npm run supabase:functions:deploy` | Deploy edge functions (wraps `scripts/supabase.js`) |

## Layout

- `src/index.jsx` — entry; wires Sentry, providers, and the root `<App />`.
- `src/app/` — application shell: components, hooks, context, models, constants.
- `src/views/` — top-level feature views, grouped by domain
  (`admin/`, `assets/`, `common/`, `people/`, `tools/`).
- `src/services/` — domain services (PascalCase classes; `Database` is the only
  approved `@supabase/supabase-js` consumer).
- `src/utils/` — pure helpers and utilities (mix of `.js` and `.ts`).
- `src/lib/` — internal libraries (e.g. `sunday-analyzer/`, `sunday-files/`).
- `supabase/functions/` — Deno edge functions; deploy individually via
  `npm run supabase:functions:deploy`.
- `supabase/migrations/` — SQL migrations, append-only, apply via Supabase CLI.
- `scripts/` — dev/ops scripts (Supabase wrapper, calver, email previews).

## Conventions

- React components in PascalCase `.jsx`; hooks/utilities/constants in
  `camelCase.js` (established project convention).
- Service classes in PascalCase `.js` exporting a singleton/class.
- One `__tests__/` per directory holding unit tests; never split between
  centralized and adjacent.
- Tailwind only — no plain CSS, no inline `style` (linter forbids `style`
  prop on DOM nodes).
- Imports are auto-sorted by `eslint-plugin-simple-import-sort`. Run
  `npm run lint -- --fix` after touching imports.
- All UI must work in dark, light, and gray themes (see `src/app/styles/`).

## Do not

- Mutate the database from the client. Use an edge function with `Database`
  on the server side (see `src/services/DatabaseService.js` for the only
  approved `@supabase/supabase-js` consumer).
- Import `@supabase/supabase-js` directly outside `DatabaseService.js`
  (ESLint enforces this).
- Add new top-level directories outside the existing vocabulary
  (`src/`, `docs/`, `scripts/`, `supabase/`, `public/`).
- Commit `.env` (only `.env.example` is tracked).
- Add inline CSS or plain `.css` files. Tailwind only.
