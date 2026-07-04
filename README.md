<p align="center">
  <img src="public/srm-logo.png" alt="SRM Concrete" width="140" />
</p>

<h1 align="center">SRM Tools</h1>

<p align="center">
  <strong>Fleet Management & Operations Platform for SRM Concrete</strong>
</p>

<p align="center">
  <img src="https://github.com/bradley-t-t/smyrnatools-com/actions/workflows/ci.yml/badge.svg?branch=production" alt="CI Status" />
  <img src="https://github.com/bradley-t-t/smyrnatools-com/actions/workflows/test.yml/badge.svg?branch=main" alt="Test Status" />
  <img src="https://img.shields.io/badge/v2026.27.0-release-c12033" alt="Version" />
  <img src="https://img.shields.io/badge/React-19.1-61DAFB?logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/AI-xAI%20Grok-000?logo=x&logoColor=white" alt="xAI Grok" />
</p>

---

SRM Tools is an internal operations platform built for a concrete ready-mix company. It manages fleet assets, operators,
plant performance, and weekly reporting across multiple regions and plants. It's used daily by the company's workforce.

---

## What It Does

The platform gives each level of the organization a view into what's happening and what needs attention. A plant manager
sees their fleet allocation, unverified mixers, trucks sitting in the shop too long, and an AI-generated analysis of
plant performance. A regional manager sees the same data aggregated across plants. An operator trainer sees who's in
training, who's pending, and where the gaps are.

---

## Dashboard

The dashboard adapts based on scope — plant-level or regional.

**Plant View** uses a split-pane layout showing actionable alerts: unverified mixers, overdue service, open
maintenance issues, long-term shop assets, and operator status groups.

**Regional View** activates when viewing all plants. Metrics shift to fleet-wide KPIs — total assets, allocation
percentage, shop count, overdue service, operator coverage, verification rates.

Both views skeleton-load while fetching data so the layout doesn't jump on plant switches, then reveal each section as
its data resolves.

Below the summary:

- **Region Overview** with animated stat counters
- **Fleet Overview** breaking down assets by status with allocation percentages and health indicators
- **Fleet Analytics** with Recharts visualizations and configurable date ranges
- **Maintenance & Quality** metrics — service compliance, issue resolution, cleanliness scores
- **People** — operator status breakdowns, training pipelines, light-duty tracking

---

## Fleet Management

Five fleet modules, each following the same pattern but tailored to the asset type:

### Mixers

The core revenue-generating assets. Each mixer tracks operator assignment and history, weekly verification status,
cleanliness ratings (1-5, tracked over time), service dates with overdue detection, VIN/make/model/year/plant
assignment, status lifecycle (Active, Spare, In Shop, Retired), comment threads, image gallery, and full change history
with AI-generated summaries.

### Tractors

Freight type categorization (Cement, Aggregate, Dump Truck, Other), operator assignments, same
verification/history/comment system.

### Trailers

Split by type (Cement, End Dump) with status tracking and maintenance records.

### Equipment

Heavy equipment (loaders, excavators, forklifts) using a flexible identifying number system instead of truck numbers.

### Pickup Trucks

Company vehicles with additional statuses: Stationary and Sold.

Every fleet module includes:

- **List View** with search, filtering, and bulk operations
- **Detail View** with sidebar navigation, structured sections, and footer actions
- **History Timeline** showing every change with timestamps, old/new values, and attribution
- **Comment System** for notes and maintenance logs
- **Embedded View** for browsing fleet data from within the dashboard

---

## Operators & Personnel

The operator module covers the full employment lifecycle:

- **Onboarding**: Pending start with hire dates and assigned trainers
- **Training**: Status tracking with trainer assignments, surfaced on dashboards and in reports
- **Active Duty**: Plant assignment, truck assignment, position tracking
- **Light Duty**: Separate status for injured/restricted operators
- **Separation**: Retirement tracking with history preserved

Operators are cross-referenced throughout — a mixer shows its assigned operator, an operator shows their assigned truck,
and the dashboard breaks down operator status by plant.

The Managers module provides manager profiles with detail views and card displays, giving visibility into management
assignments across the organization.

---

## Reporting

Weekly reporting is mandatory and feeds into plant efficiency scores. Eight weekly report types:

| Report                       | Submitted By           | Contains                                                          |
|------------------------------|------------------------|-------------------------------------------------------------------|
| **Plant Manager**            | Plant managers         | Yardage, hours, loads lost/resold, operator help exchanges        |
| **General Manager**          | Regional managers      | Per-plant metrics, runnable/down trucks, operator counts, yardage |
| **Efficiency**               | Efficiency reviewers   | Loads, hours, loads-per-hour by plant                             |
| **Safety Manager**           | Safety officers        | Incident tracking and reporting                                   |
| **Aggregate Production**     | Aggregate locations    | Material quantities (sand, concrete, limestone, etc.)             |
| **Ready Mix Instructor**     | Training managers      | Trainee counts, hiring pipeline, training progress                |
| **District Manager**         | District managers      | Daily recaps (Monday through Saturday)                            |
| **Quality Control Manager**  | QC managers            | Concrete quality metrics and corrective actions                   |

Three one-off report types supplement the weekly cadence: **Lost Load Reports** for documenting spilled or lost concrete
loads, **Quality Control Strength Reports** for concrete cylinder strength testing data, and **Third Party Lab Reports**
for flagging issues with external lab results including file upload support.

Reports have submission windows, role-based assignment, manager override capability, and compliance tracking. AI
validates metrics for mathematical consistency and flags anomalies before submission.

---

## AI Integration

The AI layer uses xAI's Grok API (`grok-4`, with `grok-3-mini-fast` for lightweight calls) routed exclusively through
the `ai-service` edge function — there are no direct client-to-API calls, so the API key never reaches the browser.
Prompt templates live in `src/app/ai/context.json` as a keyed registry and are referenced by key from `AIService.js`:

- **Asset History Summary** (`historySummary`) — turns an asset or operator's raw change log into a short, readable
  assessment (2-3 sentences) that highlights trends and ends with one practical recommendation

The registry is structured so additional prompt categories can be added as keyed entries without touching the calling
code.

---

## Productivity Tools

### Documents

A document management module for creating, organizing, and accessing internal documents.

### Lists & Tasks

Task tracking with list creation, detail views, and task addition. Users create lists, drill into individual list
details, and add tasks to track operational to-dos.

### Plan

Dispatch planning suite organised as a tab-switched workspace:

- **Dashboard** — role-aware "Your plant / district / region" view with clock-in board, activity feed, and at-a-glance
  pull-up suggestions
- **Schedule** — full daily order list (table or cards) with truck-coverage hover panels, big-pour warnings, closer-plant
  alerts, and AI-driven dispatch flags
- **Planner** — visual flow editor with route/leg editing and time scrubber
- **Demand** — per-plant production charts comparing booked vs available capacity
- **Statistics** — date-range KPIs (yardage, loads, hours, satisfaction) with charts and per-plant tables
- **Call List** — dispatcher roster with clock-in tracking
- **Find a Spot** — booking-assist that geocodes a job address, ranks plants by drive time, detects conflicts, and
  recommends a slot. Every recommendation is written to an audit log with the full decision context
- **Settings** *(permission-gated)* — travel-time matrix, plant-address editor, and the Find-a-Spot audit log with
  metrics: submission counts, system-shift rate, no-recommendation incidents, recommendation-kind breakdown, and a
  **Dispatcher leaderboard** showing top users by Find-a-Spot usage. Visible only to roles with the `plan.settings`
  permission

---

## Messaging

An in-app messaging system built around conversation-based messaging between users. Supports unread count tracking with
real-time state managed through a MessagesContext and MessagesProvider. The messaging system is integrated into the app
shell, accessible from the main navigation.

---

## Auth & Authorization

Custom-built authentication:

- Session-based with cryptographically secure 64-character hex session IDs
- Database-backed sessions with user-agent fingerprinting captured at sign-in
- Sessions stay valid for up to 7 days of inactivity; the short-lived JWT issued alongside each session refreshes every hour
- Credential management: email change, password change (server-side bcrypt), profile updates

Authorization uses a weighted role hierarchy:

- Roles have numeric weights defining seniority
- Users can hold multiple roles
- Granular permissions mapped to specific features. Examples in active use:
  - `reports.assigned.plant_manager` — gates report assignment
  - `plan.yourtab` — unlocks the Plan dashboard's role-scoped section
  - `plan.defaultplant` — defaults the realtime filter to the user's home plant
  - `plan.settings` — unlocks the Plan → Settings tab (travel times, plant addresses, Find-a-Spot audit log)
- Special roles: "Terminated" revokes all access, "Guest" provides read-only
- Region-based view filtering and plant-based data restrictions for non-admin roles

The Roles & Permissions view displays all permissions as a spreadsheet-style grid with inline editing.

---

## Architecture

### Frontend

React 19, React Router 7, Tailwind CSS 3.4, FontAwesome 7, Recharts, Leaflet. Built with Vite 6; tests run on Vitest 2.
Functional components with a custom hook library. Code splitting via React.lazy with a `lazyWithRetry` wrapper that
retries chunk fetches once before surfacing a load failure. State management through context (Auth, Preferences,
Tutorials, Messages) and ref-based caching in data hooks. Error tracking via Sentry; analytics via Vercel Analytics and
Speed Insights.

### Backend

Supabase provides PostgreSQL with real-time subscriptions. All database access goes through a sanitized service layer
with table and column allowlists — no raw SQL from the client. Edge functions handle auth, AI, and database operations.

### Asset module pattern

The five fleet asset types share a config-driven base class. Adding a sixth asset type is a ~30-line config + factory
exercise rather than a copy-paste of N service files.

- **`BaseAssetService`** — generic CRUD pipeline (fetch-all / by-id, create with VIN normalization, update with
  cross-plant operator clearing, delete, verify, search-by-VIN, get-by-operator, with-details), comments, issues,
  and history. Each concrete service (`MixerService`, `TractorService`, `TrailerService`, `EquipmentService`,
  `PickupTruckService`) composes the base with a config object — entity name, ID column, optional VIN normalization,
  optional history-field whitelist, row parser — and exposes typed method names (`getAllMixers`, `fetchTractorById`,
  etc.) as thin delegations.
- **`createAssetComment`** / **`createAssetHistory`** — model factories that produce the comment / history domain
  classes from a `{ foreignKey, foreignKeyColumn }` config. Replaces what used to be 5 hand-rolled 20-80 line classes
  per asset type.
- **`usePlantPicker`** / **`PlantPickerField`** — shared hook + component used by every asset Add view for plant
  selection with optional region-scoped filtering.

### Testing

`vitest` for unit tests. Current coverage targets the high-value utilities and a couple of view smoke tests:

- `src/utils/__tests__/` — DateUtility, FormatUtility, ValidationUtility, APIUtility
- `src/services/__tests__/` — DatabaseService
- `src/views/__tests__/` — LoginView, MixersView, ReportsSubmitView

Run `npm test` locally. CI runs vitest on every PR to `main` or `production`.

### CI

Three GitHub Actions workflows:

| Workflow | Runs | Purpose |
|---|---|---|
| `ci.yml` | push / PR to `production` | ESLint + production Vite build |
| `test.yml` | push / PR to `main`, `production` | `npm test` (vitest) |
| `lint.yml` | push / PR to `main`, `production` | ESLint |

### Data Flow

```
View (React Component)
  -> Custom Hook (data fetching, state)
    -> Service Layer (business logic, validation)
      -> API Utility (HTTP client with auth headers)
        -> Edge Function (server-side processing)
          -> Supabase / xAI Grok
```

### Real-Time

- **User Presence**: 30-second heartbeat with activity detection, 5-minute stale threshold
- **Data Subscriptions**: Supabase real-time channels for live fleet updates
- **Optimistic Updates**: Immediate UI response with rollback on failure

### Performance

- Request deduplication via TTL-based caching (5-10 minute buckets)
- Debounced filter recomputation (30ms batching)
- Memoized dashboard computations
- Skeleton loading to prevent layout shift
- Staggered reveal animations

---

## Styling & Theming

CSS custom properties for theming with Tailwind for layout:

```css
--bg-primary, --bg-secondary, --bg-tertiary
--text-primary, --text-secondary
--accent

(
user-customizable

)
--border-light, --border-medium
```

Two font families from Google Fonts:

- **Rajdhani** for headings
- **Exo 2** for body text

The accent color is user-customizable and persisted to the database. Theme classes apply before first paint via an
inline script to prevent FOUC. Three theme modes are supported — dark, light, and gray — toggled via a theme mode
switch, with every view built to work across all three.

---

## PWA Support

Installable as a Progressive Web App with a service worker, app manifest, and mobile-optimized viewport. Configured as a
standalone app on iOS with translucent status bar.

---

## Project Stats

| Metric                | Value                                              |
|-----------------------|----------------------------------------------------|
| **Current Version**   | 2026.27.0                                          |
| **Views**             | 82 view files across 23 page modules               |
| **Services**          | 18 service classes                                 |
| **Custom Hooks**      | 59 specialized hooks                               |
| **Domain Models**     | 21 model classes                                   |
| **Edge Functions**    | 28 Supabase edge functions                         |
| **AI Prompt Types**   | 1 registered prompt category                       |
| **Report Types**      | 8 weekly + 3 one-off report formats                |
| **Fleet Asset Types** | 5 (Mixers, Tractors, Trailers, Equipment, Pickups) |
| **Plan Tabs**         | 8 (Dashboard, Schedule, Planner, Demand, Statistics, Call List, Find a Spot, Settings) |

---

<p align="center">
  <sub>Built by <strong>Trenton Taylor</strong></sub>
</p>
