---
name: audit
description: Audit and refactor files for code quality violations — CSS-to-Tailwind, dark mode, naming, dead code, architecture, and more. Pass a file path, glob pattern, or directory to audit.
argument-hint: [file-or-pattern]
allowed-tools: Read, Glob, Grep, Edit, Write, Bash, Agent
---

# Audit & Refactor

Audit the target `$ARGUMENTS` for violations of the project's code standards, then fix every issue found. If no argument is provided, ask what to audit.

## Audit Checklist

Run every check below against each file in scope. Use subagents to parallelize when auditing multiple files.

### 1. Styling — No Raw CSS (Critical)
- **Any** inline `style={{}}` attributes used for layout/design (not dynamic runtime values like `backgroundColor: accentColor`)
- `<style>` blocks or `@keyframes` in JSX
- `.css` file imports (except `index.css` / `App.css`)
- CSS modules, styled-components, or `sx` props
- **Fix:** Convert to Tailwind classes. For `@keyframes`, move to `index.css` or use Tailwind `animate-*` utilities if a standard animation. Dynamic values that *must* be inline (e.g., user-selected accent color) are acceptable — don't flag those.

### 2. Dark Mode Compatibility
- Hardcoded light-theme Tailwind classes without dark mode overrides in `src/app/index.css`:
  - `bg-white`, `bg-slate-50`, `bg-slate-100`, `bg-gray-50`, etc. — check if `html.dark .bg-white` etc. exists in index.css
  - `text-slate-800`, `text-gray-900`, etc. — check for dark overrides
  - `border-slate-100`, `divide-slate-100` — check for dark overrides (only `border-gray-*` and `divide-gray-*` have overrides)
- **Fix:** Swap to classes that have existing dark mode overrides in `index.css`. For borders/dividers, prefer `gray-*` variants over `slate-*`. If no override exists and one is needed, add it to `index.css`.

### 3. Naming Violations
- Single-letter variable names outside tight lambdas (`.map((x) => ...)`)
- Generic names: `data`, `info`, `temp`, `stuff`, `handler`, `result`, `obj` in non-trivial scope
- File names that don't match surrounding conventions (check casing, suffixes, separators)
- **Fix:** Rename to reveal intent. Follow existing project naming patterns.

### 4. Code Structure
- Functions doing more than one thing (over ~40 lines is a smell)
- Deep nesting (3+ levels) — should use early returns / guard clauses
- Imperative patterns where declarative would be clearer (manual `for` loops vs `.map`/`.filter`)
- Repeated logic that belongs in a shared Utility/Service
- **Fix:** Extract, flatten, or consolidate. Check `src/utils/` and `src/services/` for existing shared modules before creating new ones.

### 5. Dead Code & Hygiene
- Unused imports
- Commented-out code blocks
- Unused variables or functions
- Vague TODOs (`// TODO: fix this`)
- **Fix:** Remove dead code. Convert vague TODOs to specific actionable ones or delete them.

### 6. Comments
- Comments that explain "what" instead of "why"
- Comments referencing AI/chatbot context ("as discussed", "per request", "inspired by")
- Missing comments on non-obvious business logic or edge cases
- **Fix:** Remove bad comments, add concise "why" comments where logic isn't self-evident.

### 7. Modern JS/React Patterns
- Raw `.then()` chains instead of `async/await`
- Silent `catch(() => {})` swallowing errors
- Missing React hook dependency arrays or cleanup functions
- `var` usage (should be `const`/`let`)
- Magic numbers/strings that should be named constants
- **Fix:** Modernize. Extract constants. Fix hook deps.

### 8. Architecture — Existing Modules
- Date logic not using `DateUtility`
- Validation logic not using `ValidationUtility`
- Export logic not using `ExportUtility`
- API calls not going through services
- Asset stats not using `AssetStatsUtility`
- **Fix:** Move logic to the appropriate shared module. Check `src/utils/` and `src/services/` first.

### 9. Supabase Auth (Critical)
- Any reference to `auth.users`, `supabase.auth`, `auth.uid()`, or RLS policies referencing auth
- Foreign keys to `auth.users(id)`
- **Fix:** Remove. This project uses custom authentication.

## Output Format

After auditing, produce a summary:

```
## Audit Results: [file/pattern]

### Issues Found: N
| # | Category | Severity | Location | Issue |
|---|----------|----------|----------|-------|
| 1 | Styling  | Critical | line 42  | inline style for layout |
| ...

### Fixed: N
[Brief description of each fix applied]

### Skipped: N (if any)
[Issues that require user decision — e.g., ambiguous naming, architectural tradeoffs]
```

## Rules
- **Always fix issues** — this is not a report-only tool. Audit AND refactor.
- Preserve all edge case handling. Never break functionality.
- If a file is over 500 lines and has structural issues, suggest extraction but ask before doing a major refactor.
- Run the build after fixing to verify nothing broke: `npx react-app-rewired build 2>&1 | tail -5`
- If auditing a directory/glob, use subagents to process files in parallel.
