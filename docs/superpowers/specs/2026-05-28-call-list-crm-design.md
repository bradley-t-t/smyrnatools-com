# Call List → CRM — Design Spec

- **Date:** 2026-05-28
- **Status:** Draft for review
- **Owner:** Trenton Taylor
- **Scope:** Evolve the Operations → "Call List" tab into a collaborative CRM for sales, plant managers, and dispatch. Covers all phases in one spec; phasing is described in §13 for incremental delivery.

---

## 1. Objective

Turn the existing Call List tab into a lightweight CRM that lets **sales, plant managers, and dispatch** collaborate on customer relationships: maintain a directory of accounts and contacts, log every interaction (calls, site visits, meetings, emails, notes), coordinate follow-ups across roles, and **win new customers** through a light acquisition pipeline.

The existing layout is preserved: a top-level Operations tab whose content is a **left sub-menu + list/detail content pane**. We extend the sub-menu (mirroring the Statistics tab's grouped-accordion pattern) and the data layer; we do not change the shell.

## 2. Current state

The Call List tab is already a partial CRM.

- **Tab definition:** `PLAN_TABS` in `src/app/components/plan/PlanTabSwitcher.jsx:11` — entry `{ icon: 'fa-phone-volume', label: 'Call List', mode: 'call-list' }`. Rendered by `OperationsView.jsx:399` → `CallListView`.
- **Sub-menu:** `CALL_LIST_SECTIONS` in `src/app/components/plan/tabs/call-list/CallListSidebar.jsx:7` — flat list of four sections (Outreach Queue, Activity Feed, Directory, Team Monitor) with `minRoleWeight` gating. Mobile falls back to a horizontal tab strip.
- **Data hook:** `src/app/hooks/useCallList.js` — roster, per-customer history + contacts (lazy), recent activity, team leaderboard.
- **Service / edge fn:** `src/services/CallListService.js` → `supabase/functions/call-list-service/index.ts`. Endpoints: `roster`, `contacts`, `save-contact`, `delete-contact`, `history`, `leaderboard`, `recent-activity`, `log-call`, `delete-log`. Each calls `requireAuthenticated`.
- **Tables today:**
  - `customer_call_log` — call history. Columns: `id`, `customer_num`, `created_at`, `outcome` (`no_answer`|`booked`|`not_interested`|`will_book_again`|`note`), `comment`, `created_by`, `created_by_name`.
  - `customer_contacts` — curated phone numbers. Columns: `id`, `customer_num`, `phone_digits`, `phone_display`, `label`, `contact_name`, `is_primary`, `is_hidden`, `source` (`manual`|`dispatch`), `notes`, timestamps, `created_by`, `updated_by`.
  - `dispatch_data` — imported orders; source of the customer universe today.
- **Roster is *derived*, not stored:** `get_call_list_roster(include_active)` (migration `20260521_customer_contacts.sql:67`) computes the customer list on the fly from `dispatch_data` + `customer_call_log` + `customer_contacts`. Activity status (`active`/`dormant`) is derived from days since last pour.
- **Leaderboard:** `get_call_list_leaderboard(days_window)` (migration `20260521_call_list_leaderboard.sql`) aggregates `customer_call_log` per user.

**Implication:** the roster being *derived from dispatch* is the central limitation. The moment we add manual prospects, owners, lifecycle stages, and a pipeline, we need a first-class account record.

## 3. Goals & non-goals

**Goals**
- One shared account record that sales, plant managers, and dispatch all read and write.
- Log interactions of multiple types on a single per-account timeline.
- Manually add prospects who are not yet in dispatch.
- Coordinate work across roles: account ownership, assignable follow-ups, @mention handoffs, role-tagged notes.
- A light acquisition pipeline to convert prospects into customers.
- Preserve all existing call-log and contact data.

**Non-goals**
- Dollar-value forecasting, weighted pipeline, or revenue rollups (explicitly out — "light acquisition pipeline, not heavy forecasting").
- Replacing dispatch as the order system of record.
- Email/SMS *sending* from the app (we *log* that they happened; we do not send).
- A standalone mobile app or offline-first sync beyond what the PWA already provides.

## 4. Personas & their jobs

| Persona | Their worklist | Primary jobs in the CRM |
|---|---|---|
| **Sales** | The accounts **assigned to them** — each account has one attached sales rep (≈ owner). | Work their assigned book, log calls/meetings/site visits, advance opportunities, own the relationship. |
| **Plant managers** | An **auto-derived list of every customer who orders at their plant(s)** — existing rapport. | Reach out to their plant's customers to maintain/leverage rapport, log interactions, hand off to sales. |
| **Dispatch** | **No fixed list** — they pull from the shared outreach queue. | Opportunistically help make outreach calls whenever they have spare capacity. |

All three write to the same account timeline; a `role_lens` on each interaction keeps each perspective legible. **Ownership belongs to the assigned sales rep**; plant managers and dispatch are contributors, not owners.

### 4.1 Role model & access (resolved)

The app uses **named roles** (`roles` table), each carrying a granular **permission-string array** (e.g. `plan.view`, `plan.edit`, `plan.settings`, `reports.review.*`) and a numeric **`weight`**.

**Weight encodes org seniority/breadth, not job function** — Sales = 30, Dispatcher = 25, Plant Manager = 5, Dispatch Manager = 31, Ready Mix Instructor = 35. Persona therefore **cannot** be inferred from weight; map it by **role name**.

**CRM access reuses the existing Operations permission gates:**
- **View CRM** → `plan.view` (already gates the Operations tab). Holders include Sales, Dispatcher, Dispatch Manager, Plant Manager (+ Backup, + Equipment), District / General Manager, Division President, CEO, IT. Cement Dispatcher (no `plan.*`), Guest, and Terminated are excluded automatically.
- **Log / create / edit** (interactions, prospects, follow-ups, opportunities) → `plan.edit`.
- **Oversight** (Team Monitor, reassign account owners, team-wide follow-up reassignment) → **new `crm.manage` permission**, granted to dispatch/sales leadership + General / District Manager, Division President, CEO, IT. This replaces today's brittle `minRoleWeight: 31` gate on Team Monitor — weight 31 happens to exclude **Sales (30)**, which a sales CRM must not. Rollout = add `crm.manage` to the relevant rows in the `roles` table.

**Default `role_lens`** (always overridable in the composer), resolved by a `roleLensForRoleName()` helper:

| Role name(s) | Default lens |
|---|---|
| Sales | `sales` |
| Plant Manager · Backup Plant Manager · Plant Manager & Equipment Manager | `plant` |
| Dispatcher · Dispatch Manager · Cement Dispatch Manager · Cement Dispatcher · End Dump Manager | `dispatch` |
| All others (CEO, GM, District, RMI, Safety, QC, Fleet, Shop, Office Admin, IT) | `general` |

### 4.2 How each role's worklist is built

- **Sales (assigned book):** `crm_accounts.sales_rep_user_id` holds the one assigned rep per account. No such mapping exists in any current system, so it is captured two ways — **per-account assignment** in the UI (gated by `crm.manage`) and a **one-time bulk seed**: paste/CSV of `customer → rep`, matched by `customer_num` (fallback: name), to populate the existing book quickly.
- **Plant managers (rapport list):** auto-derived, nothing stored per manager. The caller's `users_profiles.plant_code` + `additional_assigned_plants[]` are matched against the plants a customer has ordered at (`dispatch_data.home_plant_code`). **No frequency filter** — every customer who has ordered at their plant(s) is included. A `plantScopeForUser()` helper resolves the caller's plant set server-side.
- **Dispatch (shared queue):** no per-user list; they work the general Outreach queue (dormant + unassigned / owed-a-call) opportunistically.

## 5. Architecture decision — first-class `crm_accounts` table

**Decision:** introduce `crm_accounts` as the spine of the CRM.

- Dispatch import upserts an account per `customer_num`.
- Manual prospects are rows with `customer_num = null` until linked.
- Account holds lifecycle stage, owner, tags, linked plants, address, and notes.
- All interactions, follow-ups, opportunities, and contacts foreign-key to `crm_accounts.id` (uuid).

**Alternatives rejected**
- *Keep deriving the roster + a separate `prospects` table* — forces two parallel customer identities; every join (interaction/follow-up/opportunity) must branch on dispatch-customer vs prospect. Painful and error-prone.
- *Minimal: add interaction types + follow-ups only, defer accounts/pipeline* — fastest, but does not deliver prospecting or "get more customers," which is a core goal.

The trade-off accepted: a one-time backfill migration and a rewrite of the roster RPC to be account-driven.

## 6. Information architecture — grouped side-menu

Keep the existing left sub-menu + list/detail pane. Extend `CALL_LIST_SECTIONS` into a **grouped** catalog mirroring `PLAN_STATS_GROUPS` / `PLAN_STATS_SECTIONS` in `src/app/components/plan/tabs/statistics/PlanStatisticsSidebar.jsx:13` (flat section catalog + a groups layer with collapsible accordions). Mobile keeps the horizontal tab strip.

**WORK**
- **My Desk** *(new)* — the per-user home: follow-ups due/overdue, my accounts, my open opportunities, my recent interactions.
- **Outreach** *(evolve "Outreach Queue")* — two worklists: dormant customers to re-activate **and** prospects/leads to contact.
- **Follow-ups** *(new)* — every scheduled next-action across the team: due / overdue / upcoming; reassign & snooze.

**CUSTOMERS**
- **Accounts** *(evolve "Directory")* — searchable list of accounts (customers + prospects). Detail pane: header (lifecycle, owner, plants, tags) + contacts + interaction timeline + follow-ups + opportunities + role-tagged notes. "Add prospect" lives here.
- **Pipeline** *(new, light)* — opportunities board: `new → contacted → quoted → won / lost`. No dollar value.

**INSIGHTS**
- **Activity** *(evolve "Activity Feed")* — team-wide timeline of all interaction types; filter by type / person / plant / role-lens.
- **Team Monitor** *(keep, `crm.manage`-gated)* — leaderboard extended to count all interaction types + opportunities won.

**Tab rename:** change the `PLAN_TABS` label from "Call List" to **"CRM"** (or "Customers"). **Keep the `mode` key `'call-list'`** to preserve any stored start-page preferences and permissions — mirrors the Plan→Operations rename pattern where the routing key stayed `'Plan'`.

*(Map view — accounts + logged site visits on the existing Leaflet map — is deferred to Phase 4.)*

## 7. Data model

New and changed tables. All access is through the `call-list-service` edge function using the service-role client, so the frontend `DatabaseService` table allowlist is **not** the access path for these tables.

### 7.1 `crm_accounts` (new — the spine)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | `gen_random_uuid()` — canonical FK target |
| `customer_num` | text unique null | dispatch linkage; null for pure prospects |
| `name` | text not null | account/company name |
| `lifecycle_stage` | text not null default `'prospect'` | check in (`prospect`, `customer`, `lost`) |
| `sales_rep_user_id` | uuid null | **assigned sales rep ≈ account owner** (FK `users.id`); null until assigned/seeded |
| `tags` | text[] default `'{}'` | free-form (`key`, `commercial`, etc.) |
| `plant_codes` | text[] default `'{}'` | plants the customer orders at — **derived/denormalized** from `dispatch_data.home_plant_code`; drives the plant-manager rapport list |
| `address`, `city`, `state`, `postal` | text null | site address |
| `lat`, `lng` | double precision null | for the future Map view |
| `phone` | text null | denormalized primary; canonical numbers live in `customer_contacts` |
| `source` | text not null default `'manual'` | check in (`dispatch`, `manual`) |
| `notes` | text null | top-level account notes |
| `created_at`, `updated_at` | timestamptz | `touch_updated_at` trigger |
| `created_by`, `updated_by` | uuid null | |

Activity status (`active`/`dormant`/`never`) is **derived** from dispatch recency at read time, not stored, preserving today's behavior.

### 7.2 `customer_interactions` (rename + extend of `customer_call_log`)

Rename `customer_call_log` → `customer_interactions` and add columns. Renaming touches both RPCs and the `CALL_LOG_TABLE` constant in the edge function — a contained change. (Lower-risk alternative: keep the table name, extend in place. Recommended: rename for clarity.)

| Column | Type | Notes |
|---|---|---|
| *(existing)* `id`, `customer_num`, `outcome`, `comment`, `created_by`, `created_by_name`, `created_at` | | preserved |
| `account_id` | uuid null → not null after backfill | FK `crm_accounts.id` |
| `interaction_type` | text not null default `'call'` | check in (`call`, `site_visit`, `meeting`, `email`, `text`, `note`); default preserves existing rows as calls |
| `role_lens` | text not null default `'general'` | check in (`sales`, `plant`, `dispatch`, `general`) |
| `occurred_at` | timestamptz not null default `now()` | when it happened (vs `created_at` = when logged) |
| `participant_user_ids` | uuid[] default `'{}'` | other internal participants |
| `attachments` | jsonb default `'[]'` | array of `{ path, name, type }` referencing storage |

`outcome` becomes optional and call-specific (kept for backward compatibility and the leaderboard). Other types may leave it null.

### 7.3 `customer_followups` (new)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `account_id` | uuid not null | FK `crm_accounts.id` |
| `title` | text not null | |
| `details` | text null | |
| `due_at` | timestamptz null | |
| `assigned_to` | uuid null | FK `users.id` |
| `status` | text not null default `'open'` | check in (`open`, `done`, `snoozed`, `cancelled`) |
| `snooze_until` | timestamptz null | |
| `source_interaction_id` | uuid null | FK `customer_interactions.id` |
| `created_at`, `updated_at`, `created_by`, `completed_at`, `completed_by` | | |

### 7.4 `customer_opportunities` (new — light pipeline)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `account_id` | uuid not null | FK `crm_accounts.id` |
| `title` | text not null | what the job/opportunity is |
| `stage` | text not null default `'new'` | check in (`new`, `contacted`, `quoted`, `won`, `lost`) |
| `owner_user_id` | uuid null | |
| `expected_close` | date null | optional target date (not a forecast) |
| `notes` | text null | |
| `lost_reason` | text null | set when stage = `lost` |
| `created_at`, `updated_at`, `created_by`, `closed_at` | | |

**No monetary value column** — honors "no dollar forecasting."

### 7.5 `customer_contacts` (extend)

Add `email text`, `title text` (job title), and `account_id uuid` (FK, backfilled from `customer_num`). Existing phone-overlay behavior unchanged.

### 7.6 `notifications` (reuse)

@mentions/handoffs and follow-up assignments write to the existing `notifications` table — no new table. The writer sets recipient = mentioned/assigned user, with a type + title + body + a target that deep-links to the account section. *(Confirm exact column names at implementation — §15.)*

### 7.7 RLS & grants

Follow the project pattern: `enable row level security` + `using (true) with check (true)`; grant CRUD to `authenticated, anon, service_role`. Auth is enforced at the edge function via `requireAuthenticated`.

## 8. Edge function API (`call-list-service`)

Keep the edge function name `call-list-service` (renaming changes the URL path and every `APIUtility` call site). Add endpoints; generalize existing ones. **Every endpoint calls `requireAuthenticated`; deploy with `--no-verify-jwt`.**

| Endpoint | Status | Purpose |
|---|---|---|
| `roster` | change | Account-driven (dispatch + prospects). Params: `search`, `stage`, `tag`, `scope` (`my-sales` = my assigned book \| `my-plants` = customers at my plant(s) \| `queue` = shared outreach \| `all`), `includeActive`. `my-plants` resolves the caller's plant set server-side from `users_profiles`. Returns accounts + derived activity metrics. |
| `account` | new | Detail bundle for one account: account row + contacts + interactions + follow-ups + opportunities. Reduces round-trips. |
| `save-account` | new | Create/update an account; create a prospect (`source='manual'`); set `sales_rep_user_id`. |
| `bulk-assign-sales-reps` | new | Seed/maintain ownership: accepts rows of `{ customerNum?, customerName?, repUserId }`, matches accounts (by `customer_num`, fallback name), sets `sales_rep_user_id`; returns matched + unmatched. `crm.manage` only. |
| `archive-account` | new | Soft-delete/archive (avoid hard delete of relationship history). |
| `log-interaction` | new | Generalizes `log-call`. Accepts `interactionType`, `roleLens`, `occurredAt`, `participantUserIds`, `attachments`, optional `outcome`. Parses `@mentions` → `notifications`. |
| `log-call` | keep | Thin alias delegating to `log-interaction` (back-compat). |
| `interactions` | change | Per-account timeline, all types (generalizes `history`). |
| `delete-log` | keep | Only creator can delete (existing rule). |
| `contacts` / `save-contact` / `delete-contact` | keep | Now also accept `email`, `title`; resolve `account_id`. |
| `followups-list` | new | By account, by assignee, or team-wide with `status`/`due` filters. |
| `save-followup` / `complete-followup` / `delete-followup` | new | Assignment writes a `notifications` row. |
| `opportunities-list` | new | By account or board-wide grouped by stage. |
| `save-opportunity` / `move-stage` / `delete-opportunity` | new | Stage moves logged to the account timeline. |
| `my-desk` | new | Bundle for current user: due/overdue follow-ups, my accounts, my open opportunities, recent activity. |
| `recent-activity` | change | Now all interaction types; filterable. |
| `leaderboard` | change | Count all interaction types + opportunities won; segment by type. |

Validation mirrors the existing pattern (`VALID_OUTCOMES`-style allowlists for `interaction_type`, `role_lens`, `stage`).

## 9. Section UX specs

Each page uses the shared `FilterStrip` + `ListOrDetailPane` (`pages/callListShared.jsx`) and the existing customer-card patterns where possible.

- **My Desk** — role-aware home. *Sales:* My assigned accounts + follow-ups due + my open opportunities. *Plant managers:* My plant's customers (auto-derived) + follow-ups. *Dispatch:* a shortcut into the shared Outreach queue + follow-ups. *All:* Recent activity (mine). Each item deep-links into the relevant section.
- **Outreach** — the **shared queue** dispatch (and anyone) works opportunistically: segmented control toggles *Dormant* (longest-dormant first) vs *Prospects* (manual leads not yet customers). Row → account detail; primary action "Log interaction."
- **Follow-ups** — grouped by Overdue / Today / Upcoming. Inline complete, snooze, reassign. Filter by assignee (managers) or self (default).
- **Accounts** — searchable list (customers + prospects), filter by stage / **sales rep** / tag / plant; each row shows its assigned rep. "Add prospect" opens a create form; an **Assign rep** control + a **bulk-assign** entry point (both `crm.manage`) populate ownership. Detail pane composes: `AccountHeader` (assigned rep + plants), `ContactsSection` (existing), `InteractionTimeline` (evolve `HistoryEntries`), `FollowupsSection`, `OpportunitiesSection`, `NotesSection` (role-lens chips).
- **Pipeline** — column-per-stage board (`new`→`won`/`lost`); cards link to the owning account; move advances `stage` and logs a timeline entry. Lightweight; no value math.
- **Activity** — team-wide timeline; filters: type, person, plant, role-lens.
- **Team Monitor** — existing leaderboard, gated by `crm.manage` (replacing today's `minRoleWeight: 31`), extended columns for interaction types + opportunities won.

**Log Interaction composer** — type picker (call / site visit / meeting / email / text / note), `role_lens` selector, `occurred_at`, optional outcome (calls), participants, @mention, optional attachment. Used from My Desk, Outreach, Accounts, and Activity.

## 10. Collaboration mechanics

- **Account ownership = assigned sales rep** — `crm_accounts.sales_rep_user_id` (one per account), set per-account or via the bulk seed; (re)assignment is logged as a `note` interaction. Plant managers and dispatch are contributors, not owners. Opportunities and follow-ups carry their own owner/assignee.
- **Follow-ups** — assignable with `due_at`; surface on My Desk + Follow-ups; assignment notifies the assignee.
- **@mentions / handoffs** — `@name` in any interaction/note resolves to a user and writes a `notifications` row deep-linking to the account; the mentioned user also lands in `participant_user_ids`.
- **Role-tagged notes** — `role_lens` on every interaction; rendered as colored chips and filterable in Activity and the timeline so sales/plant/dispatch context stays legible.

## 11. Frontend file plan (conventions)

Follow project conventions: hooks in `src/app/hooks/` (`useX`), services in `src/services/` (`XService.js`), shared components under `src/app/components/plan/tabs/call-list/`, Tailwind only, three-theme support, `simple-import-sort` on every touched file.

- **Sidebar:** extend `CallListSidebar.jsx` catalog to grouped sections (port the `PLAN_STATS_GROUPS` accordion).
- **Pages:** `pages/MyDeskPage.jsx`, `pages/FollowupsPage.jsx`, `pages/PipelinePage.jsx`, evolve `CallListDirectoryPage.jsx` → Accounts, `CallListOutreachPage.jsx` → Outreach, `CallListActivityPage.jsx` → Activity.
- **Account detail:** `customer-card/AccountHeader.jsx`, `InteractionTimeline.jsx` (evolve `HistoryEntries.jsx`), `FollowupsSection.jsx`, `OpportunitiesSection.jsx`, `NotesSection.jsx`; reuse `ContactsSection.jsx`.
- **Composer:** `LogInteractionComposer.jsx` (type picker + role-lens + @mention combobox + attachment).
- **Hooks:** evolve `useCallList.js` → `useCrm.js` (or split: `useCrmAccounts`, `useFollowups`, `useOpportunities`, `useMyDesk`).
- **Service:** `CrmService.js` superseding `CallListService.js` (or extend in place to limit churn — decide at planning).
- **Permissions & role mapping:** `src/utils/CrmRoleUtility.js` — `roleLensForRoleName(roleName)` (default lens), `canManageCrm(permissions)` (checks `crm.manage`), and `plantScopeForUser(profile)` (`plant_code` + `additional_assigned_plants` → plant set for the plant-manager list). View/edit checks reuse the existing `plan.view` / `plan.edit` permission helpers.
- **Bulk assign:** a `BulkAssignSalesRepsModal` (paste/CSV → preview matched/unmatched → confirm), behind `crm.manage`.
- **Dropdowns/pickers** (type picker, follow-up date picker, assignee/owner picker, stage select, @mention combobox) MUST be built via the `react-dropdownsandhovers-styles` skill at implementation for theme-consistent, surface-aware styling.

## 12. Theme & layout conventions

- Tailwind utilities + CSS custom properties (`var(--bg-primary)`, `var(--text-secondary)`, `var(--border-light)`, etc.); accent via the `accentColor` prop with the `${accentColor}15` active-state overlay pattern.
- All new UI works in **dark / light / gray**; no hardcoded single-theme colors.
- Grouped sidebar mirrors `PlanStatisticsSidebar`; content panes mirror `callListShared.jsx`.
- Visual work goes through `ui-ux-pro-max` + `emil-design-eng` at implementation per project rules.

## 13. Migration & data preservation

1. Create `crm_accounts`; **backfill** one row per distinct `dispatch_data.customer_num` (`source='dispatch'`, `lifecycle_stage` from current activity: pouring→`customer`), plus any `customer_num` present only in `customer_call_log`/`customer_contacts`. Backfill `plant_codes` from the distinct `home_plant_code`s each customer has ordered at. `sales_rep_user_id` stays null — populated later via per-account assignment + the bulk seed (a runtime import, not a migration).
2. Rename `customer_call_log` → `customer_interactions`; add new columns; backfill `account_id` from `customer_num`; existing rows default `interaction_type='call'`, `role_lens='general'`, `occurred_at=created_at`.
3. Add `account_id` (+ `email`, `title`) to `customer_contacts`; backfill `account_id`.
4. Create `customer_followups`, `customer_opportunities`.
5. **Rewrite `get_call_list_roster`** to be account-driven: start from `crm_accounts` LEFT JOIN dispatch-derived metrics (last pour, pour count, derived activity) + last-interaction summary, so prospects with no dispatch rows still appear and owner/stage/tags come from the account.
6. Update `get_call_list_leaderboard` for the renamed table and optional `interaction_type` segmentation.
7. Update edge function constants (`CALL_LOG_TABLE` → `customer_interactions`) and add endpoints.

All migrations are additive/backfilling — **no existing call or contact data is lost.**

## 14. Phasing (incremental delivery)

Specced together; build in order so each phase ships usable value.

1. **Phase 1 — Foundation + interaction logging:** `crm_accounts` + backfill, typed `customer_interactions`, roster rewrite, Accounts + Activity evolution, Log Interaction composer, manual prospect create, tab rename.
2. **Phase 2 — Collaboration:** account ownership, `customer_followups` + Follow-ups + My Desk, @mentions→notifications, role-lens notes.
3. **Phase 3 — Acquisition:** prospect worklist in Outreach, `customer_opportunities` + Pipeline board, extended Team Monitor.
4. **Phase 4 — (optional) Map:** accounts + site visits on the existing Leaflet map.

## 15. Testing strategy

- **Runner:** vitest. Mock at the service/hook boundary; never hit a real database.
- **Edge function:** auth-guard tests (missing session → 401 before work), `interaction_type`/`role_lens`/`stage` allowlist enforcement, @mention → notification write.
- **Hooks:** `useCrm`/split hooks with a mocked `CrmService` — optimistic update + rollback on failure.
- **Components (one flow per file):** log an interaction (each type), create a prospect, add + complete a follow-up, move an opportunity stage, reassign owner.
- No snapshot tests; focus on regressions and the migration's data-preservation invariants.

## 16. Risks & open questions

1. **Identity migration** (`customer_num` text ↔ `account_id` uuid) is the most delicate part — interactions/contacts must backfill cleanly and the rewritten roster must not drop or duplicate accounts. Highest-risk change.
2. **`notifications` schema** — confirm exact columns/shape before wiring @mentions and assignments.
3. **Attachments** — which storage bucket + size/type limits for site-visit photos; can defer to Phase 1.5.
4. **Prospect ↔ dispatch linking** — when a prospect later appears in `dispatch_data`, how do we merge (auto-match by name/phone vs manual link)? Define the reconciliation rule.
5. **Bulk-seed matching** — the sales-rep seed matches by `customer_num` then name; define handling for unmatched / ambiguous rows (report them and resolve manually).

**Resolved**
- *Role model & access* — named roles + granular permissions + weight; weight is not a function proxy. Access via `plan.view` / `plan.edit`; oversight via new `crm.manage`. `role_lens` defaults mapped by role name. See §4.1.
- *Persona worklists* — Sales work their **assigned book** (`sales_rep_user_id`, one rep/account, set via manual + one-time bulk seed); Plant managers get an **auto-derived list of ALL customers at their plant(s)**, no frequency filter (`plant_code` + `additional_assigned_plants` ↔ `dispatch_data.home_plant_code`); Dispatch works the **shared Outreach queue** opportunistically. See §4.2.
