# Error Monitoring Dashboard — Implementation Plan

## Overview

Build a professional error monitoring dashboard as an admin view, comprising a Supabase migration, a Deno edge function (`error-reporting-service`), a client-side service + hook, and a multi-component React view at `src/views/admin/errors/`. The design follows every existing convention discovered in the codebase.

---

## Phase 1: Database Migration

**File:** `supabase/migrations/create-application-errors-table.sql`

Create the `application_errors` table. The schema uses an `error_hash` column for fingerprint-based grouping so the edge function can upsert (increment `occurrence_count` and update `last_seen_at`) instead of inserting duplicate rows.

```sql
CREATE TABLE IF NOT EXISTS application_errors (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project         TEXT NOT NULL DEFAULT 'smyrnatools.com',
    error_message   TEXT NOT NULL,
    source_file     TEXT,
    line_number     INT,
    column_number   INT,
    component_stack TEXT,
    stack_trace     TEXT,
    url             TEXT,
    user_agent      TEXT,
    browser         TEXT,
    os              TEXT,
    status          TEXT NOT NULL DEFAULT 'new'
                        CHECK (status IN ('new','acknowledged','resolved','ignored')),
    error_hash      TEXT NOT NULL,
    occurrence_count INT NOT NULL DEFAULT 1,
    first_seen_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_app_errors_hash ON application_errors (error_hash);
CREATE INDEX idx_app_errors_status ON application_errors (status);
CREATE INDEX idx_app_errors_last_seen ON application_errors (last_seen_at DESC);
CREATE INDEX idx_app_errors_project ON application_errors (project);
CREATE INDEX idx_app_errors_created ON application_errors (created_at DESC);
```

**Error hash generation:** The edge function generates the hash server-side from `project + error_message + source_file + line_number` using a simple deterministic string hash (same fields as the client dedup key in `ErrorReporterUtility.js`). The client stays lightweight -- it sends raw error payloads; the server decides how to group them.

**RLS:** Disable RLS on this table. All access goes through the edge function which uses the service role key for writes and requires authentication for reads.

---

## Phase 2: Edge Function -- `error-reporting-service`

**File:** `supabase/functions/error-reporting-service/index.ts`

Follow the exact pattern from `plant-service/index.ts`:
- Import `createClient` from `npm:@supabase/supabase-js@2.45.4`
- Import `getCorsHeaders`, `handleOptions`, `jsonResponse`, `errorResponse` from `../_shared/cors.ts`
- Use `Deno.serve(async (req) => { ... })` with URL path-based routing via `url.pathname.split("/").pop()`
- Copy the `parseBody`, `requireAuthenticated`, `getAdminClient`, `requireElevatedCaller` helpers (plant-service inlines its own, match that pattern)

### Endpoints

#### 1. `report-batch` (POST, **unauthenticated**)
This is the public endpoint called by `ErrorReporterUtility.js`. No auth required -- the client-side reporter fires via `sendBeacon` or `fetch` with only the anon key.

Logic:
1. Parse `{ errors: [...] }` from request body.
2. Validate array; reject if empty or >100 items.
3. For each error object:
   - Generate `error_hash` = simple deterministic hash of `project|error_message|source_file|line_number`.
   - Check if a row with that `error_hash` already exists (use admin client).
   - If exists: UPDATE -- increment `occurrence_count`, set `last_seen_at = now()`, update `user_agent`/`browser`/`os`/`url` to latest values, reset `status` to `'new'` if it was `'resolved'` (re-opened error).
   - If not: INSERT new row with all fields, `occurrence_count = 1`, `first_seen_at = now()`.
4. Return `{ success: true, processed: N }`.

Hash function (Deno-native, no crypto needed for a non-security fingerprint):
```ts
function hashError(project: string, message: string, file: string | null, line: number | null): string {
    const raw = `${project}|${message}|${file ?? ''}|${line ?? ''}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
        hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
    }
    return hash.toString(36);
}
```

#### 2. `list` (POST, **authenticated**)
Called by the dashboard to get paginated, filtered error groups.

Request body:
```ts
{
    page?: number,          // default 1
    pageSize?: number,      // default 25
    status?: string,        // filter by status
    browser?: string,       // filter by browser (prefix match)
    project?: string,       // filter by project
    search?: string,        // ILIKE search on error_message
    dateFrom?: string,      // ISO date
    dateTo?: string,        // ISO date
    sortBy?: string,        // 'last_seen_at' | 'occurrence_count' | 'first_seen_at'
    sortOrder?: string      // 'asc' | 'desc'
}
```

Logic:
1. Require authentication via `requireAuthenticated`.
2. Build a Supabase query on `application_errors` with dynamic `.eq()`, `.ilike()`, `.gte()`, `.lte()` filters.
3. Apply `.order()` and `.range()` for pagination.
4. Return `{ data: [...], total: N, page, pageSize }`.

Use `getAdminClient()` for the count query (need service role to bypass RLS).

#### 3. `stats` (POST, **authenticated**)
Returns aggregated metrics for the dashboard top metric strip and timeline chart.

Request body:
```ts
{
    timeRange?: string   // '1h' | '6h' | '24h' | '7d' | '30d' -- default '24h'
}
```

Logic (use admin client for all queries):
1. Compute time boundary from `timeRange`.
2. Run parallel queries:
   - Total errors in range: `SUM(occurrence_count) WHERE last_seen_at >= boundary`
   - Unique errors in range: `COUNT(*) WHERE last_seen_at >= boundary`
   - Affected pages: `COUNT(DISTINCT url) WHERE last_seen_at >= boundary`
   - Status breakdown: `status, COUNT(*) GROUP BY status`
   - Browser breakdown: `browser, COUNT(*) GROUP BY browser`
   - Timeline data: fetch errors in range, bucket by hour (<=24h) or day (7d/30d) in JS.
   - Previous period totals (for trend arrows): same queries with `boundary_prev..boundary`.
3. Return all metrics in a single response object.

#### 4. `update-status` (POST, **elevated auth**)
Bulk update error statuses.

Request body: `{ ids: string[], status: string }`

Logic:
1. `requireElevatedCaller` (matches `plant-service` pattern for write operations).
2. Validate `status` against allowed values.
3. `UPDATE application_errors SET status = $status WHERE id IN ($ids)`.
4. Return `{ success: true, updated: N }`.

#### 5. `delete` (POST, **elevated auth**)
Bulk delete errors.

Request body: `{ ids: string[] }`

Logic:
1. `requireElevatedCaller`.
2. `DELETE FROM application_errors WHERE id IN ($ids)`.
3. Return `{ success: true, deleted: N }`.

---

## Phase 3: Client Service -- `ErrorService.js`

**File:** `src/services/ErrorService.js`

Follow the singleton class pattern from `PlantService.js`:

```js
import APIUtility from '../utils/APIUtility'

const SERVICE_PREFIX = 'error-reporting-service'

class ErrorServiceImpl {
    async fetchErrors(filters = {}) {
        const { res, json } = await APIUtility.post(`/${SERVICE_PREFIX}/list`, filters)
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch errors')
        return json
    }

    async fetchStats(timeRange = '24h') {
        const { res, json } = await APIUtility.post(`/${SERVICE_PREFIX}/stats`, { timeRange })
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch error stats')
        return json
    }

    async updateStatus(ids, status) {
        if (!ids?.length) throw new Error('No errors selected')
        const { res, json } = await APIUtility.post(`/${SERVICE_PREFIX}/update-status`, { ids, status })
        if (!res.ok) throw new Error(json?.error || 'Failed to update status')
        return json
    }

    async deleteErrors(ids) {
        if (!ids?.length) throw new Error('No errors selected')
        const { res, json } = await APIUtility.post(`/${SERVICE_PREFIX}/delete`, { ids })
        if (!res.ok) throw new Error(json?.error || 'Failed to delete errors')
        return json
    }
}

export const ErrorService = new ErrorServiceImpl()
```

---

## Phase 4: Data Hook -- `useErrorsData.js`

**File:** `src/app/hooks/useErrorsData.js`

Follow the `useRolesData.js` pattern: `useState`/`useCallback` with `loading`/`error`/`message` states, a `messageTimerRef` for auto-dismissing success messages.

### State shape:
```
errors: []              -- paginated error list from /list
stats: {}               -- metrics from /stats
total: 0                -- total error count for pagination
isLoading: true
error: ''
message: ''
filters: { page, pageSize, status, browser, project, search, dateFrom, dateTo, sortBy, sortOrder }
timeRange: '24h'
selectedIds: new Set()
```

### Exposed functions:
- `loadData()` -- calls both `fetchErrors` and `fetchStats` in parallel.
- `updateFilters(partialFilters)` -- merges into filter state, resets page to 1, triggers reload.
- `setTimeRange(range)` -- updates time range, triggers stats reload.
- `updateStatus(ids, status)` -- calls service, shows success message, reloads.
- `deleteErrors(ids)` -- calls service, shows message, reloads.
- `toggleSelect(id)` / `selectAll()` / `clearSelection()` -- manage selectedIds.
- `setPage(n)` -- pagination.

---

## Phase 5: View Components

### 5a. Main View -- `ErrorsView.jsx`

**File:** `src/views/admin/errors/ErrorsView.jsx`

Orchestrator component (~120 lines). Imports all sub-components, calls `useErrorsData`, renders the full layout:
- TopSection with title "Error Monitoring"
- Success/error banners
- ErrorMetricsStrip
- ErrorTimelineChart
- ErrorFilters
- ErrorGroupTable
- ErrorDetailModal (conditional)

### 5b. `ErrorMetricsStrip.jsx`

**File:** `src/views/admin/errors/ErrorMetricsStrip.jsx`

4 MetricCards in a horizontal flex strip, matching `KeyMetricsStrip.jsx` pattern using `MetricPill` from `DashboardSharedComponents.jsx`.

| Metric | Icon | Color Logic |
|--------|------|-------------|
| Total Errors (in range) | `fa-exclamation-circle` | Red >100, yellow >25, green <=25 |
| Unique Errors | `fa-fingerprint` | Red >50, yellow >10, green |
| Error Rate (/hr) | `fa-chart-line` | Red >10/hr, yellow >2/hr, green |
| Affected Pages | `fa-globe` | Static accent color |

Each card shows a trend indicator (up/down arrow + percentage) comparing current to previous period.

Style: `animation: 'fadeSlideIn 0.3s ease both'` matching existing dashboard cards.

### 5c. `ErrorTimelineChart.jsx`

**File:** `src/views/admin/errors/ErrorTimelineChart.jsx`

Uses Recharts (already installed at `recharts@^3.7.0`). Follow the import pattern from `DashboardCharts.jsx`:

```jsx
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
```

Features:
- Area chart showing error count over time buckets.
- Time range selector pill buttons (1h, 6h, 24h, 7d, 30d) in the card header.
- Custom tooltip using CSS vars (`--bg-primary`, `--border-light`) matching existing `ChartTooltip` pattern.
- Gradient fill under the area (red-tinted `#ef4444` at 40% opacity fading to transparent).
- Wrapped in `DashboardCard` from `DashboardCards.jsx`.
- X-axis labels: hours (HH:mm) for <=24h ranges, dates (MMM DD) for 7d/30d.

### 5d. `ErrorFilters.jsx`

**File:** `src/views/admin/errors/ErrorFilters.jsx`

Horizontal filter bar in a card container:
- Search input: reuse the `SearchInput` pattern from `TopSection.jsx` (fa-search icon + input + clear button).
- Status filter: dropdown/pill toggle for New/Acknowledged/Resolved/Ignored/All.
- Browser filter: dropdown populated from `stats.browserBreakdown`.
- Date range: two date inputs (from/to).

Use the existing select styling from `PlantsView.jsx` -- the `CUSTOM_SELECT_CLS` pattern with custom SVG chevron.

Responsive: `flex flex-col md:flex-row gap-3` to stack on mobile.

### 5e. `ErrorGroupTable.jsx`

**File:** `src/views/admin/errors/ErrorGroupTable.jsx`

Main data table (~250 lines). Structure:
- **Bulk actions bar** (visible when selectedIds.size > 0): Acknowledge, Resolve, Ignore, Delete buttons.
- **Table header** with sortable columns: checkbox, Status, Error Message, Source, Count, First Seen, Last Seen, Browser.
- **Table rows** with:
  - Checkbox for bulk selection.
  - `ErrorStatusBadge` for status.
  - Truncated error message (~80 chars, monospace styling).
  - Source file:line (filename only, e.g., `App.js:42`).
  - Occurrence count as a badge.
  - Relative time for dates (e.g., "2h ago").
  - Browser icon (Chrome/Firefox/Safari/Edge -> FontAwesome icons).
  - Click row to open detail modal.
- **Expandable rows** (toggle chevron): full stack trace in `<pre>` block. Follow `CollapsibleTable.jsx` expand/collapse pattern.
- **Pagination** at bottom: Previous/Next with page indicator.
- Responsive: hide Browser and First Seen columns on mobile via `hidden md:table-cell`.

### 5f. `ErrorDetailModal.jsx`

**File:** `src/views/admin/errors/ErrorDetailModal.jsx`

Follow the `RoleModal.jsx` portal pattern:
- `ReactDOM.createPortal` to `document.body`.
- Backdrop: `bg-black/50 backdrop-blur-sm`.
- Modal card with accent-colored header, `max-w-2xl` width.

Sections:
1. **Header:** Error message (truncated) + status badge + status change dropdown.
2. **Error Info:** Full error message, source file:line:column.
3. **Stack Trace:** `<pre>` block, monospace, dark bg (`bg-slate-900 text-green-400` terminal aesthetic), `overflow-x-auto`.
4. **Component Stack** (if present): similar pre-formatted block.
5. **Environment:** Browser + OS with icons, URL, User Agent.
6. **Timeline:** occurrence count, first seen, last seen.
7. **Footer:** Close + status action buttons.

### 5g. `ErrorStatusBadge.jsx`

**File:** `src/views/admin/errors/ErrorStatusBadge.jsx`

Small reusable component (~30 lines):

```
STATUS_CONFIG = {
    new:          { bg: 'bg-red-100',    text: 'text-red-700',    icon: 'fa-circle',       label: 'New' },
    acknowledged: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: 'fa-eye',          label: 'Ack' },
    resolved:     { bg: 'bg-green-100',  text: 'text-green-700',  icon: 'fa-check-circle', label: 'Resolved' },
    ignored:      { bg: 'bg-gray-100',   text: 'text-gray-500',   icon: 'fa-eye-slash',    label: 'Ignored' }
}
```

---

## Phase 6: App Registration

### 6a. Navigation -- `src/app/components/common/Navigation.jsx`

1. Add to `MENU_ITEMS` array (around line 52-69):
   ```js
   { id: 'Errors', permission: 'errors.view', text: 'Errors' }
   ```

2. Add to `ADMIN_ITEMS` array (line 82):
   ```js
   const ADMIN_ITEMS = ['Plants', 'Regions', 'Roles', 'Errors']
   ```

3. Add to `ICONS` map (line 22-47):
   ```js
   Errors: 'fa-bug',
   ```

### 6b. App Router -- `src/app/App.js`

1. Add lazy import (around line 54):
   ```js
   const ErrorsView = lazyWithRetry(() => import('../views/admin/errors/ErrorsView'))
   ```

2. Add case to `renderCurrentView` switch (after Roles case, around line 302):
   ```js
   case 'Errors':
       return <ErrorsView />
   ```

3. Add 'Errors' to `OFFICE_VISIBLE_VIEWS` set (line 62):
   ```js
   const OFFICE_VISIBLE_VIEWS = new Set(['Reports', 'Dashboard', 'Managers', 'Plants', 'Regions', 'Roles', 'Errors'])
   ```

### 6c. Permission Setup

Add `errors.view` permission to the IT Access role via the Roles admin view. This is a data operation, not a code change.

---

## Phase 7: Dark Mode and Responsive

### Dark Mode
- Use CSS variable colors (`text-text-primary`, `bg-bg-primary`, `border-border-light`) from Tailwind config where possible.
- Stack trace viewer: `bg-slate-900` works in both modes.
- Chart tooltip uses CSS vars (per `DashboardCharts.jsx` pattern).
- MetricPill uses `bg-white` -- keep this, matches existing dashboard pattern.

### Responsive
- Metrics strip: `flex flex-wrap gap-2.5` (already responsive from KeyMetricsStrip pattern).
- Chart: `ResponsiveContainer width="100%" height={250}` handles resize.
- Filters: `flex flex-col md:flex-row gap-3` to stack on mobile.
- Table: `overflow-x-auto` wrapper; hide Browser/First Seen on mobile via `hidden md:table-cell`.
- Detail modal: `max-w-2xl w-full` -- full-width on mobile.

---

## File Creation Checklist

| # | File | Type | ~Lines |
|---|------|------|--------|
| 1 | `supabase/migrations/create-application-errors-table.sql` | Migration | 25 |
| 2 | `supabase/functions/error-reporting-service/index.ts` | Edge Function | 250 |
| 3 | `src/services/ErrorService.js` | Service | 40 |
| 4 | `src/app/hooks/useErrorsData.js` | Hook | 150 |
| 5 | `src/views/admin/errors/ErrorsView.jsx` | View | 120 |
| 6 | `src/views/admin/errors/ErrorMetricsStrip.jsx` | Component | 80 |
| 7 | `src/views/admin/errors/ErrorTimelineChart.jsx` | Component | 120 |
| 8 | `src/views/admin/errors/ErrorFilters.jsx` | Component | 100 |
| 9 | `src/views/admin/errors/ErrorGroupTable.jsx` | Component | 250 |
| 10 | `src/views/admin/errors/ErrorDetailModal.jsx` | Component | 200 |
| 11 | `src/views/admin/errors/ErrorStatusBadge.jsx` | Component | 30 |

**Files to modify:**

| # | File | Change |
|---|------|--------|
| 12 | `src/app/components/common/Navigation.jsx` | Add Errors to MENU_ITEMS, ADMIN_ITEMS, ICONS |
| 13 | `src/app/App.js` | Add lazy import, switch case, OFFICE_VISIBLE_VIEWS |

---

## Implementation Order

1. Migration -- create the table first.
2. Edge function -- `report-batch` first (real errors start flowing), then read endpoints.
3. `ErrorService.js` -- thin client wrapper.
4. `useErrorsData.js` -- state management hook.
5. `ErrorStatusBadge.jsx` -- tiny, no dependencies, used by multiple components.
6. `ErrorMetricsStrip.jsx` -- standalone display component.
7. `ErrorTimelineChart.jsx` -- standalone chart component.
8. `ErrorFilters.jsx` -- standalone filter bar.
9. `ErrorGroupTable.jsx` -- main table, depends on ErrorStatusBadge.
10. `ErrorDetailModal.jsx` -- detail view, depends on ErrorStatusBadge.
11. `ErrorsView.jsx` -- orchestrator, wires everything together.
12. `Navigation.jsx` + `App.js` -- register the view last.

---

## Key Design Decisions

1. **Server-side grouping via error_hash** rather than client-side: keeps the database compact and makes pagination/sorting simple. The edge function upserts on hash match.

2. **No stack trace syntax highlighting library**: styled `<pre>` block with monospace font. Avoids a new dependency. Dark background (`bg-slate-900 text-green-400`) gives terminal aesthetic.

3. **Stats computed server-side**: the /stats endpoint does all aggregation so the client receives pre-computed metrics. Dashboard stays fast with thousands of error rows.

4. **Timeline bucketing in JS** (edge function): avoids a second migration for a Postgres function. All logic stays in one place.

5. **Reuse MetricPill** from `DashboardSharedComponents.jsx` for the metrics strip rather than creating a new card component.

6. **Portal modal pattern** from `RoleModal.jsx` for the detail view, ensuring consistent overlay behavior and z-index management.

7. **report-batch is unauthenticated** because `ErrorReporterUtility.js` fires errors before/without user login. It only sends the anon key header. Dashboard read/write endpoints require full session authentication.
