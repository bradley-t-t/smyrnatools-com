<p align="center">
  <img src="public/srm-logo.png" alt="SRM Concrete" width="140" />
</p>

<h1 align="center">SRM Tools</h1>

<p align="center">
  <strong>Fleet Management & Operations Platform for SRM Concrete</strong>
</p>

<p align="center">
  <img src="https://github.com/bradley-t-t/smyrnatools-com/actions/workflows/ci.yml/badge.svg?branch=core" alt="CI Status" />
  <img src="https://img.shields.io/badge/v38.4-release-1e3a5f" alt="Version" />
  <img src="https://img.shields.io/badge/React-19.1-61DAFB?logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/AI-xAI%20Grok-000?logo=x&logoColor=white" alt="xAI Grok" />
</p>

---

SRM Tools is an internal operations platform built for a concrete ready-mix company. It manages fleet assets, operators, plant performance, and weekly reporting across multiple regions and plants. It's used daily by the company's workforce.

---

## What It Does

The platform gives each level of the organization a view into what's happening and what needs attention. A plant manager sees their fleet allocation, unverified mixers, trucks sitting in the shop too long, and an AI-generated analysis of plant performance. A regional manager sees the same data aggregated across plants. An operator trainer sees who's in training, who's pending, and where the gaps are.

---

## Dashboard

The dashboard adapts based on scope — plant-level or regional.

**Plant View** uses a split-pane layout. The left side shows actionable alerts: unverified mixers, overdue service, open maintenance issues, long-term shop assets, and operator status groups. The right side is an AI analysis pane that generates a natural-language summary with a prioritized action plan, informed by the user's role, their plant, leaderboard metrics, fleet cleanliness, and current alerts.

**Regional View** activates when viewing all plants. Metrics shift to fleet-wide KPIs — total assets, allocation percentage, shop count, overdue service, operator coverage, verification rates. The AI analysis identifies cross-plant patterns and fleet-wide concerns.

Both views skeleton-load while fetching data, then animate in section by section. The AI summary types in character by character, action plan items slide in individually. Switching plants resets everything to skeletons — no stale data, no layout jumps.

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
The core revenue-generating assets. Each mixer tracks operator assignment and history, weekly verification status, cleanliness ratings (1-5, tracked over time), service dates with overdue detection, VIN/make/model/year/plant assignment, status lifecycle (Active, Spare, In Shop, Retired), comment threads, image gallery, and full change history with AI-generated summaries.

### Tractors
Freight type categorization (Cement, Aggregate, Dump Truck, Other), operator assignments, same verification/history/comment system.

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

Operators are cross-referenced throughout — a mixer shows its assigned operator, an operator shows their assigned truck, and the dashboard breaks down operator status by plant.

The Managers module provides manager profiles with detail views and card displays, giving visibility into management assignments across the organization.

---

## Reporting

Weekly reporting is mandatory and feeds into plant efficiency scores. Eight weekly report types:

| Report | Submitted By | Contains |
|--------|-------------|----------|
| **Plant Manager** | Plant managers | Yardage, hours, loads lost/resold, operator help exchanges |
| **General Manager** | Regional managers | Per-plant metrics, runnable/down trucks, operator counts, yardage |
| **Efficiency** | Efficiency reviewers | Loads, hours, loads-per-hour by plant |
| **Safety Manager** | Safety officers | Incident tracking and reporting |
| **Aggregate Production** | Aggregate locations | Material quantities (sand, concrete, limestone, etc.) |
| **Ready Mix Instructor** | Training managers | Trainee counts, hiring pipeline, training progress |
| **District Manager** | District managers | Daily recaps (Monday through Saturday) |
| **Safety / Environmental Representative** | Safety/environmental representatives | Environmental compliance and safety incident tracking |

Three one-off report types supplement the weekly cadence: **Lost Load Reports** for documenting spilled or lost concrete loads, **Quality Control Strength Reports** for concrete cylinder strength testing data, and **Third Party Lab Reports** for flagging issues with external lab results including file upload support.

Reports have submission windows, role-based assignment, manager override capability, and compliance tracking. Missing or incomplete reports deduct points on the leaderboard. AI validates metrics for mathematical consistency and flags anomalies before submission.

---

## Leaderboards

Plant performance rankings based on an efficiency formula:

```
Efficiency = (adjustedYPH / 3.0 * 90%) + (loadsPerOperatorPerDay / 3.0 * 10%)
           - (missingReports * 10) - (incompleteReports * 10)
           capped at 0-100
```

**Adjusted YPH** (Yards Per Hour) accounts for help exchanges between plants — if Plant A sends operators to help Plant B, Plant A's YPH adjusts upward and Plant B's downward to prevent gaming through labor hoarding.

Cleanliness and safety metrics are displayed but excluded from the efficiency score. They're awareness metrics, not competitive ones.

---

## AI Integration

The AI layer uses xAI's Grok API routed through edge functions (no direct client-to-API calls). Each feature addresses a specific workflow need:

- **Plant Summaries**: Role-aware analysis — a plant manager gets actionable advice about their plant, a regional manager gets comparative insights
- **Regional Summaries**: Cross-plant trend identification when viewing aggregated data
- **Asset History Summaries**: Converts raw change logs into readable narratives
- **Report Validation**: Catches mathematical inconsistencies before they affect leaderboard data
- **Efficiency Comment Validation**: When operators are flagged for anomalous metrics, their explanations are checked against the specific issues flagged
- **Task Suggestions**: Auto-completes partial maintenance task descriptions with contextual suggestions
- **Follow-up Q&A**: Multi-turn conversations with targeted context selection — asking about a specific truck pulls that truck's data, operator history, and recent changes without sending the full database
- **GM Report Analysis**: Executive summary generation for General Manager weekly reviews
- **GM Report Export Summary**: AI-generated narrative for GM report exports
- **Task Improvement**: Rewrites maintenance task descriptions to be clearer and more actionable
- **District Summary**: District-level analysis comparing districts and drilling into per-plant performance

Prompts use a JSON-based registry with dynamic role context injection built from the database, so new roles automatically get appropriate AI behavior.

---

## Productivity Tools

### Documents

A document management module for creating, organizing, and accessing internal documents.

### Lists & Tasks

Task tracking with list creation, detail views, and task addition. Users create lists, drill into individual list details, and add tasks to track operational to-dos.

### Plan & Timeline

A planning module with timeline visualization, templates, and settings. Supports structured planning workflows with configurable templates and visual timeline displays.

---

## Calculators

Five concrete industry-specific calculation tools:

- **Proportions Calculator** — calculates mix component proportions
- **Set Time Calculator** — estimates concrete set times based on input parameters
- **Slump Adjustment Calculator** — determines adjustments needed to reach target slump values
- **Water Cement Ratio Calculator** — computes water-to-cement ratios for mix design
- **Yardage Per Hour Calculator** — calculates production rate in cubic yards per hour

---

## Messaging

An in-app messaging system built around conversation-based messaging between users. Supports unread count tracking with real-time state managed through a MessagesContext and MessagesProvider. The messaging system is integrated into the app shell, accessible from the main navigation.

---

## Auth & Authorization

Custom-built authentication:

- Session-based with cryptographically secure 64-character hex session IDs
- Database-backed sessions with browser fingerprinting (OS, device type, user agent)
- Configurable expiry (2-7 days)
- Credential management: email change, password change (server-side bcrypt), profile updates

Authorization uses a weighted role hierarchy:

- Roles have numeric weights defining seniority
- Users can hold multiple roles
- Granular permissions mapped to specific features (e.g., `reports.assigned.plant_manager`)
- Special roles: "Terminated" revokes all access, "Guest" provides read-only
- Region-based view filtering and plant-based data restrictions for non-admin roles

The Roles & Permissions view displays all permissions as a spreadsheet-style grid with inline editing.

---

## Architecture

### Frontend
React 19, React Router 7, Tailwind CSS 3.4, FontAwesome 7. Functional components with a custom hook library. Code splitting via React.lazy with a retry mechanism for chunk failures. State management through context (Auth, Preferences, Tutorials, Messages) and ref-based caching in data hooks.

### Backend
Supabase provides PostgreSQL with real-time subscriptions. All database access goes through a sanitized service layer with table and column allowlists — no raw SQL from the client. Edge functions handle auth, AI, and database operations.

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
--accent (user-customizable)
--border-light, --border-medium
```

Two font families from Google Fonts:
- **Rajdhani** for headings
- **Exo 2** for body text

The accent color is user-customizable and persisted to the database. Theme classes apply before first paint via an inline script to prevent FOUC. Two primary themes supported — dark and light — toggled via a theme mode switch.

---

## PWA Support

Installable as a Progressive Web App with a service worker, app manifest, and mobile-optimized viewport. Configured as a standalone app on iOS with translucent status bar.

---

## Project Stats

| Metric | Value |
|--------|-------|
| **Current Version** | 38.4 |
| **Views** | 23 distinct page modules |
| **Services** | 22 service classes |
| **Custom Hooks** | 38 specialized hooks |
| **Domain Models** | 15+ data model classes |
| **AI Prompt Types** | 11 registered prompt categories |
| **Report Types** | 8 weekly + 3 one-off report formats |
| **Fleet Asset Types** | 5 (Mixers, Tractors, Trailers, Equipment, Pickups) |

---

<p align="center">
  <sub>Built by <strong>Trenton Taylor</strong></sub>
</p>
