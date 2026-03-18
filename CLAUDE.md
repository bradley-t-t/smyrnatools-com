# smyrnatools.com — Project Rules

## Live Directives

- **NEVER use Supabase's default auth system (auth.users, supabase.auth, RLS referencing auth.uid(), etc.).** This project uses a custom authentication system. Never reference `auth.users`, never create foreign keys to `auth.users(id)`, never use `auth.uid()` in policies.
- **NEVER use the word "supabase" in application code.** The database client is exported as `Database` from `DatabaseService.js` — always import and reference it as `Database`. Helper functions follow the same pattern: `logDatabaseError`, `getDatabaseErrorDetails`, `DatabaseUtils`, etc. The only acceptable places for "supabase" are the `@supabase/supabase-js` package import and `REACT_APP_SUPABASE_*` env var reads inside `DatabaseService.js`. Comments must also use "database" instead of "Supabase".
- **Follow existing file structure and naming conventions exactly.** Never co-locate utilities, hooks, or shared components next to view files. Place them in their canonical directories and match the existing naming pattern:
  - Utilities → `src/utils/` — PascalCase with `Utility` suffix (e.g. `PlanUtility.js`, `ExportUtility.js`)
  - Hooks → `src/app/hooks/` — camelCase with `use` prefix (e.g. `usePlanData.js`, `useDashboardChat.js`)
  - Shared components → `src/app/components/common/` — PascalCase (e.g. `PlanComponents.jsx`, `Navigation.jsx`)
  - Services → `src/services/` — PascalCase with `Service` suffix (e.g. `PlanService.js`)
  - Views stay in their feature directory under `src/views/`
