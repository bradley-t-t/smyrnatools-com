<p align="center">
  <img src="public/srm-logo.png" alt="SRM Concrete" width="140" />
</p>

<h1 align="center">SRM Tools</h1>

<p align="center">
  <strong>Fleet Management & Operations Platform for SRM Concrete</strong>
</p>

<p align="center">
  <img src="https://github.com/bradley-t-t/smyrnatools-com/actions/workflows/ci.yml/badge.svg?branch=core" alt="CI Status" />
  <img src="https://img.shields.io/badge/v25.0-release-1e3a5f" alt="Version" />
  <img src="https://img.shields.io/badge/React-19.1-61DAFB?logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/AI-xAI%20Grok-000?logo=x&logoColor=white" alt="xAI Grok" />
</p>

---

SRM Tools is a production-grade internal operations platform I built from the ground up for a concrete ready-mix company. It manages the full lifecycle of fleet assets, operators, plant performance, and weekly reporting across multiple regions and plants. Everything from the authentication system to the AI integration was designed and written by me as a solo developer, and the platform is actively used daily by the company's workforce.

This isn't a template or a toy project. It's a real system managing real trucks, real people, and real business operations.

---

## What It Does

At its core, SRM Tools answers one question for every level of the organization: **"What's going on right now, and what needs my attention?"**

A plant manager opens the dashboard and immediately sees their fleet allocation, which mixers haven't been verified this week, which trucks have been sitting in the shop too long, and an AI-generated analysis of their plant's performance relative to the rest of the region. A regional manager sees the same data aggregated across all their plants with cross-plant trends surfaced automatically. An operator trainer sees who's in training, who's pending start, and where the staffing gaps are.

The platform doesn't just display data. It processes it, surfaces what matters, and stays out of the way for everything else.

---

## The Dashboard

The dashboard is the heart of the application. It's not a static page of charts. It's a living operations center that adapts to who's looking at it and what scope they're viewing.

**Plant-Level View** features a split-pane layout. The left side shows actionable alerts: unverified mixers, overdue service, open maintenance issues, long-term shop assets, and operator status groups. The right side is an AI analysis pane that generates a natural-language performance summary with a prioritized action plan. The AI considers the user's role, their assigned plant, leaderboard metrics, fleet cleanliness, and every alert on the page to produce something genuinely useful, not a generic summary.

**Regional View** activates when viewing all plants. The metrics row shifts to fleet-wide KPIs: total assets, allocation percentage, shop count, overdue service, operator coverage, and verification rates. The AI analysis shifts to regional insights, identifying cross-plant patterns and fleet-wide concerns.

Both views skeleton-load while data is being fetched, then animate in section by section. The AI summary types in character by character, and action plan items slide in one at a time. When you switch plants, the entire component resets to skeletons and rebuilds. No stale data flashes. No layout jumps.

Underneath the summary, the dashboard includes:

- **Region Overview Card** with animated stat counters
- **Fleet Overview** breaking down every asset type by status (active, spare, in shop, retired) with allocation percentages and color-coded health indicators
- **Fleet Analytics** with interactive Recharts visualizations showing status distribution trends over configurable date ranges
- **Maintenance & Quality** metrics including service compliance, issue resolution rates, and cleanliness scores
- **People Section** with operator status breakdowns, training pipelines, and light-duty tracking

---

## Fleet Management

Five distinct fleet modules, each following the same architectural pattern but tailored to the asset type:

### Mixers
Concrete mixer trucks are the core revenue-generating assets. Each mixer tracks:
- Operator assignment and assignment history
- Weekly verification status (who verified, when, whether it's current)
- Cleanliness rating (1-5 scale, tracked over time)
- Service dates with overdue detection (6+ month threshold)
- VIN, make, model, year, and plant assignment
- Status lifecycle: Active, Spare, In Shop, Retired
- Comment threads and image gallery
- Complete change history with AI-generated summaries

### Tractors
Tractor fleet management with freight type categorization (Cement, Aggregate, Dump Truck, Other), operator assignments, and the same verification/history/comment system as mixers.

### Trailers
Trailer inventory split by type (Cement, End Dump) with status tracking and maintenance records.

### Equipment
Heavy equipment (loaders, excavators, forklifts) with a flexible identifying number system instead of truck numbers.

### Pickup Trucks
Company vehicle fleet with statuses including Stationary and Sold in addition to the standard lifecycle.

Every fleet module features:
- **List View** with search, filtering, and bulk operations
- **Detail View** with a sidebar navigation pattern, structured sections, and footer actions
- **History Timeline** showing every change with timestamps, old/new values, and who made the change
- **Comment System** for notes and maintenance logs
- **Embedded View** integration so fleet data can be browsed from within the dashboard

---

## Operators & Personnel

The operator module manages the full employment lifecycle:

- **Onboarding**: Pending start operators tracked with hire dates and assigned trainers
- **Training**: Training status with trainer assignments, visible on dashboards and in reports
- **Active Duty**: Plant assignment, truck assignment, position tracking
- **Light Duty**: Separate status for injured/restricted operators
- **Separation**: Retirement tracking with history preserved

Operators are cross-referenced everywhere. When you look at a mixer, you see its assigned operator. When you look at an operator, you see their assigned truck. The dashboard knows which operators are unassigned, which are pending, and which are in training, broken down by plant.

---

## Reporting System

Weekly reporting is mandatory and directly impacts plant efficiency scores. The system supports seven report types:

| Report | Submitted By | Contains |
|--------|-------------|----------|
| **Plant Manager** | Plant managers | Yardage, hours, loads lost/resold, operator help exchanges |
| **General Manager** | Regional managers | Per-plant metrics, runnable/down trucks, operator counts, yardage |
| **Efficiency** | Efficiency reviewers | Loads, hours, loads-per-hour by plant |
| **Safety Manager** | Safety officers | Safety incident tracking and reporting |
| **Aggregate Production** | Aggregate locations | Material quantities (sand, concrete, limestone, etc.) |
| **Ready Mix Instructor** | Training managers | Trainee counts, hiring pipeline, training progress |
| **District Manager** | District managers | Daily recaps (Monday through Saturday) |

Reports have submission windows, role-based assignment, manager override capability (editing on behalf of others), and compliance tracking. Missing or incomplete reports result in point deductions on the leaderboard. The AI validates metrics for mathematical consistency and flags anomalies before submission.

---

## Leaderboards

Plant performance rankings drive accountability. The efficiency formula:

```
Efficiency = (adjustedYPH / 3.0 * 90%) + (loadsPerOperatorPerDay / 3.0 * 10%)
           - (missingReports * 10) - (incompleteReports * 10)
           capped at 0-100
```

**Adjusted YPH** (Yards Per Hour) accounts for help exchanges between plants. If Plant A sends operators to help Plant B, Plant A's YPH is adjusted upward and Plant B's downward. This prevents gaming the system by hoarding labor.

Cleanliness ratings and safety incidents are tracked and displayed but intentionally excluded from the efficiency score. They're operational awareness metrics, not competitive ones.

---

## AI Integration

The AI layer uses xAI's Grok API routed through edge functions (never direct client-to-API calls). It's not bolted on as a gimmick. Every AI feature solves a specific problem:

- **Plant Summaries**: Generates role-aware analysis. A plant manager sees actionable advice about their own plant. A regional manager sees comparative insights. The tone adjusts based on the plant being viewed.
- **Regional Summaries**: Cross-plant trend identification and fleet-wide concern surfacing when viewing aggregated data.
- **Asset History Summaries**: Converts raw change logs into readable narratives ("This mixer has been in and out of shop 4 times in the last 3 months, spending 47 total days down").
- **Report Validation**: Catches mathematical inconsistencies in submitted reports before they corrupt leaderboard data.
- **Efficiency Comment Validation**: When an operator's metrics are flagged (late start, early end, low loads), their explanation is validated by AI to ensure it actually addresses the flagged issues.
- **Task Suggestions**: Auto-completes partial maintenance task descriptions with contextually relevant suggestions.
- **Follow-up Q&A**: Multi-turn conversations with intelligent context selection. Ask about a specific truck number and it pulls that truck's data, operator history, and recent changes without sending the entire database.

The AI prompt system uses a JSON-based registry with role context injection. Each prompt is crafted with domain-specific instructions, and role context is dynamically built from the database (not hardcoded), so new roles automatically get appropriate AI behavior.

---

## Authentication & Authorization

No third-party auth provider. The entire system is custom-built:

- **Session-based authentication** using cryptographically secure 64-character hex session IDs
- **Database-backed sessions** with browser fingerprinting (OS, device type, user agent)
- **Configurable expiry** (2-7 days depending on context)
- **Credential management**: email change, password change (server-side bcrypt verification), profile updates

Authorization uses a weighted role hierarchy stored in the database:

- Roles have numeric weights that define seniority
- Users can hold multiple roles
- Permissions are granular and mapped to specific features (e.g., `reports.assigned.plant_manager`)
- Special roles: "Terminated" revokes all access, "Guest" provides read-only
- Region-based filtering controls which views are available (Office users see admin panels, field users don't)
- Plant-based access restricts data to assigned plants for non-admin roles

The permission matrix (Roles & Permissions view) displays all permissions as a spreadsheet-style grid with roles as columns and permission nodes as rows, grouped by namespace. Permissions can be toggled per-role with inline editing.

---

## Architecture

### Frontend
React 19 with React Router 7, Tailwind CSS 3.4, and FontAwesome 7. The codebase uses functional components exclusively with an extensive custom hook library. Code splitting is handled through React.lazy with a retry mechanism for chunk loading failures. State management is context-based (Auth, Preferences, Tutorials) with ref-based caching in data hooks for performance.

### Backend
Supabase provides PostgreSQL with real-time subscriptions, but all database access goes through a sanitized service layer with table and column allowlists. No raw SQL from the client. The API layer uses edge functions for auth, AI, and database operations, keeping secrets server-side and preventing CORS issues.

### Data Flow
```
View (React Component)
  -> Custom Hook (data fetching, state management)
    -> Service Layer (business logic, validation)
      -> API Utility (HTTP client with auth headers)
        -> Edge Function (server-side processing)
          -> Supabase / xAI Grok
```

Every layer has a clear responsibility. Views render. Hooks manage state and effects. Services contain business logic. Utilities handle formatting and computation. Models define data shapes.

### Real-Time Features
- **User Presence**: 30-second heartbeat with activity detection (click, keypress, mouse movement). 5-minute stale threshold for marking users offline.
- **Data Subscriptions**: Supabase real-time channels for live updates on fleet changes.
- **Optimistic Updates**: UI updates immediately on user actions, with rollback on failure.

### Performance
- Request deduplication via TTL-based caching (5-10 minute buckets)
- Debounced filter recomputation (30ms batching for rapid filter changes)
- Memoized expensive computations in dashboard hooks
- Skeleton loading states throughout to prevent layout shift
- Staggered reveal animations for perceived performance

---

## Styling & Theming

The styling system uses CSS custom properties for theming with Tailwind utilities for layout and spacing:

```css
--bg-primary, --bg-secondary, --bg-tertiary
--text-primary, --text-secondary
--accent (user-customizable)
--border-light, --border-medium
```

Typography uses two font families loaded from Google Fonts:
- **Rajdhani** for headings (industrial, technical feel)
- **Exo 2** for body text (clean, modern readability)

The accent color is user-customizable and persisted to the database. Theme classes are applied before first paint via an inline script in `index.html` to prevent flash of unstyled content. Multiple theme modes are supported (dark, old-dark, red-dark, blue-light, red-light).

---

## PWA Support

SRM Tools is installable as a Progressive Web App with a service worker, app manifest, and mobile-optimized viewport. The meta tags configure it as a standalone app on iOS with a translucent status bar. The favicon and touch icon use the company logo.

---

## Project Stats

| Metric | Value |
|--------|-------|
| **Current Version** | 25.0 |
| **Views** | 16+ distinct page modules |
| **Services** | 23 service classes |
| **Custom Hooks** | 50+ specialized hooks |
| **Domain Models** | 15+ data model classes |
| **AI Prompt Types** | 11 registered prompt categories |
| **Report Types** | 7 weekly report formats |
| **Fleet Asset Types** | 5 (Mixers, Tractors, Trailers, Equipment, Pickups) |

---

<p align="center">
  <sub>Designed, built, and maintained by <strong>Trenton Taylor</strong></sub>
</p>
