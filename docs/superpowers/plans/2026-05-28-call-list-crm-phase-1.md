# Call List → CRM, Phase 1 (Data Foundation & Interaction Logging) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the CRM data foundation (`crm_accounts` spine + typed interactions) and ship multi-type interaction logging in the renamed CRM tab, without breaking the existing Call List behavior.

**Architecture:** Introduce a first-class `crm_accounts` table that dispatch upserts into and prospects add to manually; generalize `customer_call_log` → `customer_interactions` (typed + role-lens); rewrite the roster RPC to be account-driven with a `scope` param; surface it through the existing `call-list-service` edge function and a new `CrmService` + `useCrm` hook; evolve the Directory → Accounts UI with a per-account interaction timeline and a Log Interaction composer.

**Tech Stack:** Postgres (Supabase, project `hzudmeptzciqukwlroos`), Deno edge functions, React 19, Tailwind v3, vitest + @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-05-28-call-list-crm-design.md`

---

## Project-specific adaptations (read before starting)

- **Testing reality:** this repo's vitest suite tests client-side **services, hooks, utils, and view integration**, mocking `APIUtility`/`DatabaseService` — it does **not** unit-test edge functions or migrations (they never hit a real DB). So backend tasks (migrations, edge) are "implement → apply/deploy → smoke-verify"; frontend tasks are TDD with vitest.
- **Commits:** never run raw `git`. Each **Checkpoint** commits via the `/release` skill (commit pipeline). Suggested messages are given; the skill handles staging/format/push.
- **Edge deploys:** always `--no-verify-jwt` (custom session auth). Deploy command in Task 7.
- **No "supabase" in app code:** the DB client is `Database`; comments say "database". (Edge functions may import `@supabase/supabase-js` and use `requireSession` — that's allowed server-side.)
- **Imports:** sort per `simple-import-sort` on every `.js`/`.jsx` you touch (external group, blank line, relative group; case-insensitive by path).
- **SQL is shown inline** in each migration task. Save each as `supabase/migrations/20260528_*.sql` (repo convention) and apply via the project's Supabase tooling (`npm run supabase:*` / `scripts/supabase.js`).
- **Execution ordering (live-DB coordination):** Tasks 2 renames a table the *currently deployed* edge function + roster/leaderboard RPCs reference. The live CRM tab will error between applying the rename and redeploying the edge function. Therefore apply **backend Tasks 1→4 and deploy the edge (Task 7) in one coordinated window**, off-hours if possible, before doing the frontend tasks. The migrations are additive except the rename; there is no destructive data loss, but the brief functional gap is real — minimize it.

---

## File Structure

**Create**
- `supabase/migrations/20260528_crm_accounts.sql` — accounts spine + backfill
- `supabase/migrations/20260528_customer_interactions.sql` — rename + extend call log
- `supabase/migrations/20260528_customer_contacts_crm.sql` — contacts email/title/account_id
- `supabase/migrations/20260528_crm_roster_rewrite.sql` — account-driven roster + leaderboard table rename
- `src/utils/CrmRoleUtility.js` — `roleLensForRoleName`, `canManageCrm`
- `src/services/CrmService.js` — client wrapper for CRM endpoints
- `src/app/hooks/useCrm.js` — roster (scoped) + account detail bundle + logInteraction
- `src/app/components/plan/tabs/call-list/customer-card/LogInteractionComposer.jsx`
- `src/app/components/plan/tabs/call-list/customer-card/InteractionTimeline.jsx`
- Test files under `__tests__/` co-located per repo convention (paths in each task)

**Modify**
- `supabase/functions/call-list-service/index.ts` — constants, `roster`, `account`, `save-account`, `log-interaction`, `interactions`, contacts fields
- `src/app/components/plan/PlanTabSwitcher.jsx:11` — tab label `Call List` → `CRM`
- `src/app/components/plan/tabs/call-list/CallListSidebar.jsx:7` — section labels (`Directory`→`Accounts`, `Activity Feed`→`Activity`)
- `src/views/tools/plan/CallListView.jsx` — pass scope, wire account detail + composer
- `src/app/components/plan/tabs/call-list/pages/CallListDirectoryPage.jsx` — account header + detail compose + Add prospect
- `src/app/components/plan/tabs/call-list/pages/CallListActivityPage.jsx` — all interaction types + type filter

---

## Task 1: Migration — `crm_accounts` spine + backfill

**Files:** Create `supabase/migrations/20260528_crm_accounts.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- CRM account spine. Dispatch customers upsert in by customer_num; manual
-- prospects are rows with null customer_num. Interactions/follow-ups/
-- opportunities/contacts foreign-key to crm_accounts.id going forward.
create table if not exists crm_accounts (
    id uuid primary key default gen_random_uuid(),
    customer_num text unique,
    name text not null,
    lifecycle_stage text not null default 'prospect'
        check (lifecycle_stage in ('prospect', 'customer', 'lost')),
    sales_rep_user_id uuid,
    tags text[] not null default '{}',
    plant_codes text[] not null default '{}',
    address text, city text, state text, postal text,
    lat double precision, lng double precision,
    phone text,
    source text not null default 'manual' check (source in ('dispatch', 'manual')),
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    created_by uuid, updated_by uuid
);

create index if not exists crm_accounts_stage_idx on crm_accounts (lifecycle_stage);
create index if not exists crm_accounts_sales_rep_idx on crm_accounts (sales_rep_user_id);

create or replace function touch_crm_accounts_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;
drop trigger if exists crm_accounts_touch_updated_at on crm_accounts;
create trigger crm_accounts_touch_updated_at
    before update on crm_accounts for each row
    execute function touch_crm_accounts_updated_at();

-- Backfill: one account per dispatch customer, source='dispatch',
-- lifecycle='customer' (they've ordered), plant_codes = plants they pour at.
insert into crm_accounts (customer_num, name, lifecycle_stage, source, plant_codes, phone)
select dd.customer_num,
       coalesce(max(dd.customer), dd.customer_num) as name,
       'customer', 'dispatch',
       array_agg(distinct dd.home_plant_code) filter (where dd.home_plant_code is not null),
       (array_agg(dd.phone order by dd.order_date desc) filter (where dd.phone is not null))[1]
from dispatch_data dd
where dd.customer_num is not null and dd.customer_num <> ''
group by dd.customer_num
on conflict (customer_num) do nothing;

-- Backfill any customer that exists only in the call log / contacts.
insert into crm_accounts (customer_num, name, lifecycle_stage, source)
select c.customer_num, c.customer_num, 'customer', 'dispatch'
from (
    select distinct customer_num from customer_call_log where customer_num is not null
    union
    select distinct customer_num from customer_contacts where customer_num is not null
) c
on conflict (customer_num) do nothing;

-- RLS: access enforced at the edge layer; policies allow all.
alter table crm_accounts enable row level security;
drop policy if exists crm_accounts_all on crm_accounts;
create policy crm_accounts_all on crm_accounts for all using (true) with check (true);
grant select, insert, update, delete on crm_accounts to authenticated, anon, service_role;
```

- [ ] **Step 2: Apply the migration**

Apply against project `hzudmeptzciqukwlroos` via the project's Supabase migration tooling (`npm run supabase:*` / `scripts/supabase.js`).

- [ ] **Step 3: Verify the backfill**

Run this query (in chat / SQL console): `select count(*) total, count(*) filter (where source='dispatch') dispatch, count(*) filter (where array_length(plant_codes,1) > 0) with_plants from crm_accounts;`
Expected: `total` ≈ distinct `dispatch_data.customer_num` count; `with_plants` > 0.

- [ ] **Step 4: Checkpoint** — commit via `/release` (commit pipeline). Suggested: `feat(crm): add crm_accounts spine + dispatch/contacts backfill`

---

## Task 2: Migration — rename `customer_call_log` → `customer_interactions` + typed columns

**Files:** Create `supabase/migrations/20260528_customer_interactions.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- Generalize the calls-only log into a typed interaction timeline.
alter table customer_call_log rename to customer_interactions;

alter table customer_interactions
    add column if not exists account_id uuid references crm_accounts(id),
    add column if not exists interaction_type text not null default 'call'
        check (interaction_type in ('call','site_visit','meeting','email','text','note')),
    add column if not exists role_lens text not null default 'general'
        check (role_lens in ('sales','plant','dispatch','general')),
    add column if not exists occurred_at timestamptz,
    add column if not exists participant_user_ids uuid[] not null default '{}',
    add column if not exists attachments jsonb not null default '[]';

-- occurred_at defaults to when the row was logged for existing data.
update customer_interactions set occurred_at = created_at where occurred_at is null;
alter table customer_interactions alter column occurred_at set default now();
alter table customer_interactions alter column occurred_at set not null;

-- Backfill account_id from customer_num.
update customer_interactions ci set account_id = a.id
from crm_accounts a where a.customer_num = ci.customer_num and ci.account_id is null;

-- outcome stays for calls; allow null for non-call types.
alter table customer_interactions alter column outcome drop not null;

create index if not exists customer_interactions_account_idx on customer_interactions (account_id);
create index if not exists customer_interactions_type_idx on customer_interactions (interaction_type);
create index if not exists customer_interactions_occurred_idx on customer_interactions (occurred_at desc);

grant select, insert, update, delete on customer_interactions to authenticated, anon, service_role;
```

- [ ] **Step 2: Apply the migration** (same tooling as Task 1).

- [ ] **Step 3: Verify**

Run: `select count(*) total, count(*) filter (where account_id is not null) linked, count(distinct interaction_type) types from customer_interactions;`
Expected: `linked` = `total` (every historical call mapped to an account), `types` ≥ 1 (all `call`).

- [ ] **Step 4: Checkpoint** — `/release`. Suggested: `feat(crm): generalize call log into typed customer_interactions`

---

## Task 3: Migration — extend `customer_contacts`

**Files:** Create `supabase/migrations/20260528_customer_contacts_crm.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
alter table customer_contacts
    add column if not exists email text,
    add column if not exists title text,
    add column if not exists account_id uuid references crm_accounts(id);

update customer_contacts cc set account_id = a.id
from crm_accounts a where a.customer_num = cc.customer_num and cc.account_id is null;

create index if not exists customer_contacts_account_idx on customer_contacts (account_id);
```

- [ ] **Step 2: Apply** (same tooling).

- [ ] **Step 3: Verify**

Run: `select count(*) total, count(*) filter (where account_id is not null) linked from customer_contacts;`
Expected: `linked` = `total`.

- [ ] **Step 4: Checkpoint** — `/release`. Suggested: `feat(crm): add email/title/account_id to customer_contacts`

---

## Task 4: Migration — rewrite roster RPC (account-driven + scope) and repoint leaderboard

**Files:** Create `supabase/migrations/20260528_crm_roster_rewrite.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- Account-driven roster. Starts from crm_accounts so prospects (no dispatch
-- rows) appear, and lifecycle/owner/plants come from the account. Dispatch
-- recency metrics are left-joined. `scope` filters the result set:
--   'all' (default) | 'queue' (dormant or never-poured) |
--   'my-sales' (sales_rep = p_user_id) | 'my-plants' (any plant in p_plant_codes)
create or replace function get_call_list_roster(
    include_active boolean default false,
    scope text default 'all',
    p_user_id uuid default null,
    p_plant_codes text[] default '{}'
)
returns table (
    account_id uuid, customer_num text, customer_name text,
    lifecycle_stage text, sales_rep_user_id uuid, plant_codes text[],
    contact_name text, phone text,
    last_pour_date date, days_since_last_pour integer, pour_days_last_year integer,
    pouring_status text,
    last_call_at timestamptz, last_call_outcome text, last_call_by_name text,
    last_call_comment text, call_count_last_30 integer
)
language sql stable as $$
    with latest_orders as (
        select distinct on (dd.customer_num)
            dd.customer_num, dd.contact as contact_name, dd.phone, dd.order_date as last_pour_date
        from dispatch_data dd
        where dd.customer_num is not null and dd.customer_num <> ''
          and dd.order_date >= current_date - interval '365 days'
        order by dd.customer_num, dd.order_date desc
    ),
    pour_counts as (
        select customer_num, count(distinct order_date)::int as pour_days_last_year
        from dispatch_data
        where customer_num is not null and customer_num <> ''
          and order_date >= current_date - interval '365 days'
        group by customer_num
    ),
    last_calls as (
        select distinct on (account_id)
            account_id, created_at as last_call_at, outcome as last_call_outcome,
            created_by_name as last_call_by_name, comment as last_call_comment
        from customer_interactions where account_id is not null
        order by account_id, occurred_at desc
    ),
    call_counts as (
        select account_id, count(*)::int as call_count_last_30
        from customer_interactions
        where account_id is not null and occurred_at >= now() - interval '30 days'
        group by account_id
    ),
    primary_contacts as (
        select account_id, phone_display from customer_contacts
        where is_primary and not is_hidden and account_id is not null
    )
    select
        a.id, a.customer_num, a.name, a.lifecycle_stage, a.sales_rep_user_id, a.plant_codes,
        lo.contact_name,
        coalesce(pc.phone_display, lo.phone, a.phone) as phone,
        lo.last_pour_date,
        case when lo.last_pour_date is not null
             then (current_date - lo.last_pour_date)::int end as days_since_last_pour,
        coalesce(pcnt.pour_days_last_year, 0),
        case when lo.last_pour_date is null then 'never'
             when (current_date - lo.last_pour_date) < 30 then 'active'
             else 'dormant' end as pouring_status,
        lc.last_call_at, lc.last_call_outcome, lc.last_call_by_name, lc.last_call_comment,
        coalesce(cc.call_count_last_30, 0)
    from crm_accounts a
    left join latest_orders lo on lo.customer_num = a.customer_num
    left join pour_counts pcnt on pcnt.customer_num = a.customer_num
    left join last_calls lc on lc.account_id = a.id
    left join call_counts cc on cc.account_id = a.id
    left join primary_contacts pc on pc.account_id = a.id
    where
        case scope
            when 'my-sales' then a.sales_rep_user_id = p_user_id
            when 'my-plants' then a.plant_codes && p_plant_codes
            when 'queue' then lo.last_pour_date is null or (current_date - lo.last_pour_date) >= 30
            else true
        end
        and (include_active or scope <> 'all'
             or lo.last_pour_date is null or (current_date - lo.last_pour_date) >= 30);
$$;

grant execute on function get_call_list_roster(boolean, text, uuid, text[])
    to authenticated, anon, service_role;

-- Drop the obsolete 1-arg overload: its body references the now-renamed
-- customer_call_log and the new edge always passes scope. Leaving it would
-- error at runtime after Task 2's rename.
drop function if exists get_call_list_roster(boolean);
```

- [ ] **Step 2: Confirm the leaderboard RPC still resolves**

`get_call_list_leaderboard` (migration `20260521_call_list_leaderboard.sql`) selects `from customer_call_log`. The Task 2 rename breaks it. Add to this migration file:

```sql
-- Repoint the leaderboard to the renamed table (body identical otherwise).
create or replace function get_call_list_leaderboard(days_window integer default 30)
returns table (
    created_by uuid, user_name text, total_calls integer, booked integer,
    will_book_again integer, no_answer integer, not_interested integer, note integer,
    unique_customers integer, last_call_at timestamptz, first_call_at timestamptz
)
language sql stable as $$
    with bounded_logs as (
        select * from customer_interactions
        where created_at >= now() - make_interval(days => greatest(days_window, 1))
    ),
    name_resolution as (
        select bl.created_by,
            coalesce(nullif(trim(coalesce(p.first_name,'')||' '||coalesce(p.last_name,'')),''),
                     nullif(bl.created_by_name,''),'Unknown user') as user_name
        from bounded_logs bl left join users_profiles p on p.id = bl.created_by
    )
    select bl.created_by,
        (array_agg(nr.user_name order by bl.created_at desc))[1],
        count(*)::int,
        count(*) filter (where bl.outcome='booked')::int,
        count(*) filter (where bl.outcome='will_book_again')::int,
        count(*) filter (where bl.outcome='no_answer')::int,
        count(*) filter (where bl.outcome='not_interested')::int,
        count(*) filter (where bl.outcome='note')::int,
        count(distinct bl.customer_num)::int,
        max(bl.created_at), min(bl.created_at)
    from bounded_logs bl join name_resolution nr on nr.created_by = bl.created_by
    where bl.created_by is not null group by bl.created_by
    order by count(*) desc, max(bl.created_at) desc;
$$;
grant execute on function get_call_list_leaderboard(integer) to authenticated, anon, service_role;
```

- [ ] **Step 3: Apply** (same tooling).

- [ ] **Step 4: Verify roster shapes**

Run: `select count(*) from get_call_list_roster(true,'all',null,'{}');` → expect ≈ `crm_accounts` count.
Run: `select count(*) from get_call_list_roster(false,'queue',null,'{}');` → expect ≤ all (dormant/never only).

- [ ] **Step 5: Checkpoint** — `/release`. Suggested: `feat(crm): account-driven roster with scope + repoint leaderboard`

---

## Task 5: Edge — constants, `roster` (scope), `account` bundle, `save-account`

**Files:** Modify `supabase/functions/call-list-service/index.ts`

- [ ] **Step 1: Update constants + add valid sets** (top of file, near line 7-10)

```ts
const INTERACTIONS_TABLE = 'customer_interactions'
const CONTACTS_TABLE = 'customer_contacts'
const ACCOUNTS_TABLE = 'crm_accounts'
const PROFILES_TABLE = 'users_profiles'
const VALID_OUTCOMES = new Set(['no_answer', 'booked', 'not_interested', 'will_book_again', 'note'])
const VALID_TYPES = new Set(['call', 'site_visit', 'meeting', 'email', 'text', 'note'])
const VALID_LENSES = new Set(['sales', 'plant', 'dispatch', 'general'])
const VALID_STAGES = new Set(['prospect', 'customer', 'lost'])
```

(Remove the old `CALL_LOG_TABLE` constant; replace its uses with `INTERACTIONS_TABLE`.)

- [ ] **Step 2: Replace the `roster` case** to pass scope through to the RPC

```ts
case 'roster': {
    const body = await parseBody(req)
    const auth = await requireAuthenticated(null, req, headers, body)
    if (auth instanceof Response) return auth
    const admin = getAdminClient()
    const scope = typeof body?.scope === 'string' ? body.scope : 'all'
    let plantCodes: string[] = []
    if (scope === 'my-plants') {
        const { data: prof } = await admin.from(PROFILES_TABLE)
            .select('plant_code, additional_assigned_plants').eq('id', auth).maybeSingle()
        const extra = Array.isArray(prof?.additional_assigned_plants) ? prof.additional_assigned_plants : []
        plantCodes = [prof?.plant_code, ...extra].filter((c: unknown): c is string => !!c)
    }
    const { data, error } = await admin.rpc('get_call_list_roster', {
        include_active: body?.includeActive === true,
        scope, p_user_id: auth, p_plant_codes: plantCodes
    })
    if (error) return errorResponse('Failed to load call list', headers, 400, { detail: error.message })
    return jsonResponse({ data: data ?? [] }, headers)
}
```

(`requireAuthenticated` returns the **userId string directly** on success — `_shared/requireSession.ts:91` does `return userId` — or a `Response` on failure. So `auth` IS the userId; use it as `created_by`/`updated_by` and in profile lookups. Do **not** write `auth.userId`.)

- [ ] **Step 3: Add the `account` bundle case**

```ts
case 'account': {
    const body = await parseBody(req)
    const auth = await requireAuthenticated(null, req, headers, body)
    if (auth instanceof Response) return auth
    const accountId = typeof body?.accountId === 'string' ? body.accountId : ''
    if (!accountId) return errorResponse('accountId is required', headers, 400)
    const admin = getAdminClient()
    const [acct, contacts, interactions] = await Promise.all([
        admin.from(ACCOUNTS_TABLE).select('*').eq('id', accountId).maybeSingle(),
        admin.from(CONTACTS_TABLE).select('*').eq('account_id', accountId)
            .order('is_primary', { ascending: false }).order('updated_at', { ascending: false }),
        admin.from(INTERACTIONS_TABLE).select('*').eq('account_id', accountId)
            .order('occurred_at', { ascending: false }).limit(100)
    ])
    if (acct.error || !acct.data) return errorResponse('Account not found', headers, 404)
    return jsonResponse({ data: {
        account: acct.data, contacts: contacts.data ?? [], interactions: interactions.data ?? []
    } }, headers)
}
```

- [ ] **Step 4: Add the `save-account` case** (create/update; create prospect)

```ts
case 'save-account': {
    const body = await parseBody(req)
    const auth = await requireAuthenticated(null, req, headers, body)
    if (auth instanceof Response) return auth
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    if (!name) return errorResponse('name is required', headers, 400)
    const stage = VALID_STAGES.has(body?.lifecycleStage) ? body.lifecycleStage : 'prospect'
    const admin = getAdminClient()
    const row: Record<string, unknown> = {
        name, lifecycle_stage: stage, updated_by: auth,
        tags: Array.isArray(body?.tags) ? body.tags : undefined,
        phone: typeof body?.phone === 'string' ? body.phone : undefined,
        notes: typeof body?.notes === 'string' ? body.notes : undefined
    }
    Object.keys(row).forEach((k) => row[k] === undefined && delete row[k])
    let result
    if (typeof body?.id === 'string' && body.id) {
        result = await admin.from(ACCOUNTS_TABLE).update(row).eq('id', body.id).select().maybeSingle()
    } else {
        result = await admin.from(ACCOUNTS_TABLE)
            .insert({ ...row, source: 'manual', created_by: auth }).select().maybeSingle()
    }
    if (result.error) return errorResponse('Failed to save account', headers, 400, { detail: result.error.message })
    return jsonResponse({ data: result.data }, headers)
}
```

- [ ] **Step 5: Checkpoint** — `/release`. Suggested: `feat(crm): roster scope + account bundle + save-account endpoints`

(Deploy happens once in Task 7.)

---

## Task 6: Edge — `log-interaction` (+ `log-call` alias), `interactions`, contacts email/title

**Files:** Modify `supabase/functions/call-list-service/index.ts`

- [ ] **Step 1: Add `log-interaction`** (generalizes `log-call`)

```ts
case 'log-interaction': {
    const body = await parseBody(req)
    const auth = await requireAuthenticated(null, req, headers, body)
    if (auth instanceof Response) return auth
    const accountId = typeof body?.accountId === 'string' ? body.accountId : ''
    if (!accountId) return errorResponse('accountId is required', headers, 400)
    const type = VALID_TYPES.has(body?.interactionType) ? body.interactionType : 'note'
    const lens = VALID_LENSES.has(body?.roleLens) ? body.roleLens : 'general'
    const outcome = type === 'call' && VALID_OUTCOMES.has(body?.outcome) ? body.outcome : null
    const admin = getAdminClient()
    const name = await lookupUserDisplayName(admin, auth)
    const { data: acct } = await admin.from(ACCOUNTS_TABLE).select('customer_num').eq('id', accountId).maybeSingle()
    const { data, error } = await admin.from(INTERACTIONS_TABLE).insert({
        account_id: accountId, customer_num: acct?.customer_num ?? null,
        interaction_type: type, role_lens: lens, outcome,
        comment: typeof body?.comment === 'string' ? body.comment : null,
        occurred_at: typeof body?.occurredAt === 'string' ? body.occurredAt : new Date().toISOString(),
        created_by: auth, created_by_name: name
    }).select().maybeSingle()
    if (error) return errorResponse('Failed to log interaction', headers, 400, { detail: error.message })
    return jsonResponse({ data }, headers)
}
```

- [ ] **Step 2: Make `log-call` delegate** — replace the body of the existing `log-call` case so it maps to an interaction:

```ts
case 'log-call': {
    const body = await parseBody(req)
    const auth = await requireAuthenticated(null, req, headers, body)
    if (auth instanceof Response) return auth
    if (!VALID_OUTCOMES.has(body?.outcome)) return errorResponse('valid outcome is required', headers, 400)
    const admin = getAdminClient()
    // Resolve account by customer_num for legacy callers that pass customerNum.
    const customerNum = typeof body?.customerNum === 'string' ? body.customerNum : ''
    const { data: acct } = await admin.from(ACCOUNTS_TABLE).select('id').eq('customer_num', customerNum).maybeSingle()
    if (!acct) return errorResponse('Unknown customer', headers, 404)
    const name = await lookupUserDisplayName(admin, auth)
    const { data, error } = await admin.from(INTERACTIONS_TABLE).insert({
        account_id: acct.id, customer_num: customerNum, interaction_type: 'call', role_lens: 'general',
        outcome: body.outcome, comment: typeof body?.comment === 'string' ? body.comment : null,
        occurred_at: new Date().toISOString(), created_by: auth, created_by_name: name
    }).select().maybeSingle()
    if (error) return errorResponse('Failed to save call', headers, 400, { detail: error.message })
    return jsonResponse({ data }, headers)
}
```

- [ ] **Step 3: Add `interactions`** (generalizes `history`; keep `history` as an alias that falls through to the same logic)

```ts
case 'history':
case 'interactions': {
    const body = await parseBody(req)
    const auth = await requireAuthenticated(null, req, headers, body)
    if (auth instanceof Response) return auth
    const admin = getAdminClient()
    const limit = Number.isInteger(body?.limit) ? body.limit : 100
    let q = admin.from(INTERACTIONS_TABLE).select('*').order('occurred_at', { ascending: false }).limit(limit)
    if (typeof body?.accountId === 'string' && body.accountId) q = q.eq('account_id', body.accountId)
    else if (typeof body?.customerNum === 'string' && body.customerNum) q = q.eq('customer_num', body.customerNum)
    else return errorResponse('accountId or customerNum is required', headers, 400)
    const { data, error } = await q
    if (error) return errorResponse('Failed to load interactions', headers, 400, { detail: error.message })
    return jsonResponse({ data: data ?? [] }, headers)
}
```

- [ ] **Step 4: Accept `email`/`title` in `save-contact`** — in the existing `save-contact` case, add to the insert/update payload: `email: typeof body?.email === 'string' ? body.email : null, title: typeof body?.title === 'string' ? body.title : null`, and resolve+set `account_id` from `customer_num` if not present.

- [ ] **Step 5: Checkpoint** — `/release`. Suggested: `feat(crm): typed log-interaction + interactions endpoints; contacts email/title`

---

## Task 7: Deploy the edge function and smoke-verify

**Files:** none (deploy)

- [ ] **Step 1: Deploy**

```bash
PATH="/Users/trentontaylor/.nvm/versions/node/v22.21.1/bin:$PATH" npx supabase functions deploy call-list-service --no-verify-jwt --project-ref hzudmeptzciqukwlroos
```
Expected: `Deployed Functions on project hzudmeptzciqukwlroos: call-list-service`.

- [ ] **Step 2: Smoke-verify in the browser console (authenticated session)**

Open the app, then in DevTools console call `APIUtility.post('/call-list-service/roster', { scope: 'all', includeActive: true })` and confirm `json.data` is a non-empty array whose rows include `account_id`, `lifecycle_stage`, `sales_rep_user_id`, `plant_codes`.
Also verify `roster` with `{ scope: 'my-plants' }` returns only the caller's plant customers.

- [ ] **Step 3: Confirm the existing Call List tab still renders** (the roster shape is a superset; the current UI reads `customer_num`, `phone`, `last_call_*`, `call_count_last_30`, `pouring_status` — all preserved). If anything reads a removed field, note it and fix in Task 8+.

(No commit — deploy only.)

---

## Task 8: `CrmRoleUtility.js`

**Files:** Create `src/utils/CrmRoleUtility.js`; Test `src/utils/__tests__/CrmRoleUtility.test.js`

- [ ] **Step 1: Write the failing test**

```js
import { canManageCrm, roleLensForRoleName } from '../CrmRoleUtility'

describe('CrmRoleUtility', () => {
    it('maps role names to a default lens', () => {
        expect(roleLensForRoleName('Sales')).toBe('sales')
        expect(roleLensForRoleName('Backup Plant Manager')).toBe('plant')
        expect(roleLensForRoleName('Dispatch Manager')).toBe('dispatch')
        expect(roleLensForRoleName('CEO')).toBe('general')
        expect(roleLensForRoleName(undefined)).toBe('general')
    })
    it('detects crm.manage', () => {
        expect(canManageCrm(['plan.view', 'crm.manage'])).toBe(true)
        expect(canManageCrm(['plan.view'])).toBe(false)
        expect(canManageCrm(null)).toBe(false)
    })
})
```

- [ ] **Step 2: Run it** — `npm test -- --watchAll=false src/utils/__tests__/CrmRoleUtility.test.js`. Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

```js
const PLANT_ROLES = new Set(['Plant Manager', 'Backup Plant Manager', 'Plant Manager & Equipment Manager'])
const DISPATCH_ROLES = new Set([
    'Dispatcher', 'Dispatch Manager', 'Cement Dispatch Manager', 'Cement Dispatcher', 'End Dump Manager'
])

/** Default interaction role-lens for a role name. Weight is org seniority,
 *  not job function, so we map by name; always user-overridable in the UI. */
export function roleLensForRoleName(roleName) {
    if (roleName === 'Sales') return 'sales'
    if (PLANT_ROLES.has(roleName)) return 'plant'
    if (DISPATCH_ROLES.has(roleName)) return 'dispatch'
    return 'general'
}

/** Oversight gate (Team Monitor, reassign owners, bulk assign). */
export function canManageCrm(permissions) {
    return Array.isArray(permissions) && permissions.includes('crm.manage')
}
```

- [ ] **Step 4: Run it** — same command. Expected: PASS.

- [ ] **Step 5: Checkpoint** — `/release`. Suggested: `feat(crm): add CrmRoleUtility (role-lens + crm.manage)`

---

## Task 9: `CrmService.js`

**Files:** Create `src/services/CrmService.js`; Test `src/services/__tests__/CrmService.test.js`

- [ ] **Step 1: Write the failing test**

```js
import APIUtility from '../../utils/APIUtility'
import CrmService from '../CrmService'

jest.mock('../../utils/APIUtility')

describe('CrmService', () => {
    beforeEach(() => jest.clearAllMocks())

    it('fetchRoster posts scope and returns data array', async () => {
        APIUtility.post.mockResolvedValue({ res: { ok: true }, json: { data: [{ account_id: 'a1' }] } })
        const rows = await CrmService.fetchRoster({ scope: 'my-sales' })
        expect(APIUtility.post).toHaveBeenCalledWith('/call-list-service/roster',
            expect.objectContaining({ scope: 'my-sales' }))
        expect(rows).toEqual([{ account_id: 'a1' }])
    })

    it('logInteraction validates accountId + type', async () => {
        await expect(CrmService.logInteraction({ interactionType: 'call' })).rejects.toThrow('accountId')
        APIUtility.post.mockResolvedValue({ res: { ok: true }, json: { data: { id: 'i1' } } })
        const row = await CrmService.logInteraction({ accountId: 'a1', interactionType: 'meeting', comment: 'hi' })
        expect(APIUtility.post).toHaveBeenCalledWith('/call-list-service/log-interaction',
            expect.objectContaining({ accountId: 'a1', interactionType: 'meeting' }))
        expect(row).toEqual({ id: 'i1' })
    })
})
```

- [ ] **Step 2: Run it** — `npm test -- --watchAll=false src/services/__tests__/CrmService.test.js`. Expected: FAIL.

- [ ] **Step 3: Implement**

```js
import APIUtility from '../utils/APIUtility'

const SERVICE_PREFIX = 'call-list-service'

/** Client wrapper for the CRM endpoints on the call-list-service edge function. */
class CrmServiceImpl {
    async fetchRoster({ scope = 'all', includeActive = false } = {}) {
        const { res, json } = await APIUtility.post(`/${SERVICE_PREFIX}/roster`, { scope, includeActive })
        if (!res.ok) throw new Error(json?.error || 'Failed to load accounts')
        return Array.isArray(json?.data) ? json.data : []
    }

    async fetchAccount(accountId) {
        if (!accountId) throw new Error('accountId is required')
        const { res, json } = await APIUtility.post(`/${SERVICE_PREFIX}/account`, { accountId })
        if (!res.ok) throw new Error(json?.error || 'Failed to load account')
        return json?.data ?? null
    }

    async saveAccount({ id, name, lifecycleStage, tags, phone, notes }) {
        if (!name) throw new Error('name is required')
        const { res, json } = await APIUtility.post(`/${SERVICE_PREFIX}/save-account`,
            { id, name, lifecycleStage, tags, phone, notes })
        if (!res.ok) throw new Error(json?.error || 'Failed to save account')
        return json?.data ?? null
    }

    async logInteraction({ accountId, interactionType, roleLens, outcome, comment, occurredAt }) {
        if (!accountId) throw new Error('accountId is required')
        if (!interactionType) throw new Error('interactionType is required')
        const { res, json } = await APIUtility.post(`/${SERVICE_PREFIX}/log-interaction`,
            { accountId, interactionType, roleLens, outcome, comment, occurredAt })
        if (!res.ok) throw new Error(json?.error || 'Failed to log interaction')
        return json?.data ?? null
    }

    async fetchInteractions({ accountId, limit = 100 }) {
        if (!accountId) throw new Error('accountId is required')
        const { res, json } = await APIUtility.post(`/${SERVICE_PREFIX}/interactions`, { accountId, limit })
        if (!res.ok) throw new Error(json?.error || 'Failed to load interactions')
        return Array.isArray(json?.data) ? json.data : []
    }
}

const CrmService = new CrmServiceImpl()
export default CrmService
```

- [ ] **Step 4: Run it** — Expected: PASS.

- [ ] **Step 5: Checkpoint** — `/release`. Suggested: `feat(crm): add CrmService client wrapper`

---

## Task 10: `useCrm` hook (scoped roster + account bundle + optimistic logInteraction)

**Files:** Create `src/app/hooks/useCrm.js`; Test `src/app/hooks/__tests__/useCrm.test.js`

- [ ] **Step 1: Write the failing test**

```js
import { act, renderHook, waitFor } from '@testing-library/react'

import CrmService from '../../../services/CrmService'
import { useCrm } from '../useCrm'

jest.mock('../../../services/CrmService')

describe('useCrm', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        CrmService.fetchRoster.mockResolvedValue([{ account_id: 'a1', customer_name: 'Acme' }])
        CrmService.fetchInteractions.mockResolvedValue([])
        CrmService.logInteraction.mockResolvedValue({ id: 'i1', interaction_type: 'meeting', occurred_at: 'now' })
    })

    it('loads the scoped roster on mount', async () => {
        const { result } = renderHook(() => useCrm({ scope: 'all' }))
        await waitFor(() => expect(result.current.roster).toHaveLength(1))
        expect(CrmService.fetchRoster).toHaveBeenCalledWith({ scope: 'all', includeActive: true })
    })

    it('optimistically prepends a logged interaction', async () => {
        const { result } = renderHook(() => useCrm({ scope: 'all' }))
        await waitFor(() => expect(result.current.roster).toHaveLength(1))
        await act(async () => { await result.current.logInteraction({ accountId: 'a1', interactionType: 'meeting' }) })
        expect(result.current.interactionsByAccount['a1'][0]).toMatchObject({ id: 'i1' })
    })
})
```

- [ ] **Step 2: Run it** — `npm test -- --watchAll=false src/app/hooks/__tests__/useCrm.test.js`. Expected: FAIL.

- [ ] **Step 3: Implement**

```js
import { useCallback, useEffect, useRef, useState } from 'react'

import CrmService from '../../services/CrmService'

/** Backs the CRM tab: a scoped account roster plus a lazily-loaded,
 *  per-account interaction cache with optimistic interaction logging. */
export function useCrm({ scope = 'all' } = {}) {
    const [roster, setRoster] = useState([])
    const [isLoadingRoster, setIsLoadingRoster] = useState(true)
    const [rosterError, setRosterError] = useState(null)
    const [interactionsByAccount, setInteractionsByAccount] = useState({})
    const mounted = useRef(true)

    useEffect(() => {
        mounted.current = true
        return () => { mounted.current = false }
    }, [])

    const loadRoster = useCallback(async () => {
        setIsLoadingRoster(true)
        setRosterError(null)
        try {
            const data = await CrmService.fetchRoster({ scope, includeActive: true })
            if (mounted.current) setRoster(data)
        } catch (err) {
            if (mounted.current) setRosterError(err?.message || 'Failed to load accounts')
        } finally {
            if (mounted.current) setIsLoadingRoster(false)
        }
    }, [scope])

    useEffect(() => { loadRoster() }, [loadRoster])

    const loadInteractions = useCallback(async (accountId, { force = false } = {}) => {
        if (!accountId || (!force && interactionsByAccount[accountId])) return
        try {
            const data = await CrmService.fetchInteractions({ accountId })
            if (mounted.current) setInteractionsByAccount((p) => ({ ...p, [accountId]: data }))
        } catch {
            if (mounted.current) setInteractionsByAccount((p) => ({ ...p, [accountId]: [] }))
        }
    }, [interactionsByAccount])

    const logInteraction = useCallback(async (payload) => {
        const saved = await CrmService.logInteraction(payload)
        if (saved && mounted.current) {
            setInteractionsByAccount((p) => ({
                ...p, [payload.accountId]: [saved, ...(p[payload.accountId] ?? [])]
            }))
        }
        return saved
    }, [])

    return {
        roster, isLoadingRoster, rosterError, reloadRoster: loadRoster,
        interactionsByAccount, loadInteractions, logInteraction
    }
}
```

- [ ] **Step 4: Run it** — Expected: PASS.

- [ ] **Step 5: Checkpoint** — `/release`. Suggested: `feat(crm): add useCrm hook with optimistic interaction logging`

---

## Task 11: `LogInteractionComposer.jsx`

**Files:** Create `src/app/components/plan/tabs/call-list/customer-card/LogInteractionComposer.jsx`; Test `src/app/components/plan/tabs/call-list/customer-card/__tests__/LogInteractionComposer.test.jsx`

> **Design (ui-ux-pro-max + emil-design-eng):** the **type picker, role-lens select, and any date/time field MUST be built via the `react-dropdownsandhovers-styles` skill** (surface-aware, theme-consistent across dark/light/gray). Submit button shows a spinner + disables while saving (`loading-buttons`); `:active` press uses `scale(0.97)` with `transition: transform 160ms ease-out`; outcome only shows when type is `call`; comment textarea is the single primary input. Tailwind only; use the app's CSS-var tokens (`bg-bg-secondary`, `text-text-primary`, `border-border-light`) + `accentColor` for the primary action.

- [ ] **Step 1: Write the failing test**

```jsx
import { fireEvent, render, screen } from '@testing-library/react'

import { LogInteractionComposer } from '../LogInteractionComposer'

describe('LogInteractionComposer', () => {
    it('submits the chosen type + comment', () => {
        const onSubmit = jest.fn()
        render(<LogInteractionComposer defaultLens="sales" accentColor="#2563eb" onSubmit={onSubmit} />)
        fireEvent.change(screen.getByLabelText(/note|comment/i), { target: { value: 'Met on site' } })
        fireEvent.click(screen.getByRole('button', { name: /log/i }))
        expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
            interactionType: 'call', roleLens: 'sales', comment: 'Met on site'
        }))
    })
})
```

- [ ] **Step 2: Run it** — `npm test -- --watchAll=false .../LogInteractionComposer.test.jsx`. Expected: FAIL.

- [ ] **Step 3: Implement** (skeleton; refine the picker via the dropdown skill)

```jsx
import { useState } from 'react'

const TYPES = [
    { id: 'call', label: 'Call', icon: 'fa-phone' },
    { id: 'site_visit', label: 'Site visit', icon: 'fa-location-dot' },
    { id: 'meeting', label: 'Meeting', icon: 'fa-handshake' },
    { id: 'email', label: 'Email', icon: 'fa-envelope' },
    { id: 'note', label: 'Note', icon: 'fa-note-sticky' }
]

/** Compact composer for logging one interaction against an account. */
export function LogInteractionComposer({ defaultLens = 'general', accentColor, onSubmit, isSaving = false }) {
    const [type, setType] = useState('call')
    const [lens, setLens] = useState(defaultLens)
    const [comment, setComment] = useState('')

    const submit = (e) => {
        e.preventDefault()
        onSubmit({ interactionType: type, roleLens: lens, comment: comment.trim() || null })
        setComment('')
    }

    return (
        <form onSubmit={submit} className="flex flex-col gap-2 rounded-md border border-border-light bg-bg-secondary p-3">
            <div className="flex flex-wrap gap-1.5">
                {TYPES.map((t) => (
                    <button key={t.id} type="button" onClick={() => setType(t.id)} aria-pressed={type === t.id}
                        className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-semibold border transition-[colors,transform] duration-150 ease-out active:scale-[0.97]"
                        style={type === t.id ? { background: `${accentColor}15`, borderColor: accentColor } : undefined}>
                        <i className={`fas ${t.icon}`} aria-hidden="true" /> {t.label}
                    </button>
                ))}
            </div>
            <label htmlFor="crm-note" className="text-[11px] font-semibold text-text-secondary">Note</label>
            <textarea id="crm-note" value={comment} onChange={(e) => setComment(e.target.value)} rows={3}
                className="rounded-md border border-border-light bg-bg-primary p-2 text-[13px] text-text-primary" />
            <div className="flex justify-end">
                <button type="submit" disabled={isSaving}
                    className="rounded-md px-3 py-1.5 text-[12px] font-semibold text-white transition-transform duration-150 ease-out active:scale-[0.97] disabled:opacity-60"
                    style={{ background: accentColor }}>
                    {isSaving ? 'Logging…' : 'Log interaction'}
                </button>
            </div>
        </form>
    )
}
```

(The `lens` select is omitted from the skeleton; add it via the dropdown skill as a styled select bound to `setLens`, defaulting to `defaultLens`.)

- [ ] **Step 4: Run it** — Expected: PASS.

- [ ] **Step 5: Style the type picker + lens select via `react-dropdownsandhovers-styles`** and verify in all three themes (dark/light/gray) in the WebStorm localhost dev server (the user tests there; do not start a preview server).

- [ ] **Step 6: Checkpoint** — `/release`. Suggested: `feat(crm): add LogInteractionComposer`

---

## Task 12: `InteractionTimeline.jsx`

**Files:** Create `src/app/components/plan/tabs/call-list/customer-card/InteractionTimeline.jsx`; Test co-located `__tests__/InteractionTimeline.test.jsx`

> **Design:** one row per interaction, newest first; leading type icon, a small **role-lens chip** (color per lens, with text label — never color alone, per `color-not-only`), author + relative `occurred_at`, comment below. Tabular spacing matches the locked list-row contract (`py-1.5 px-2.5`, `text-[12px]`). Empty state: "No interactions logged yet." Entrance stagger ≤ 50ms/item; respect `prefers-reduced-motion`.

- [ ] **Step 1: Write the failing test**

```jsx
import { render, screen } from '@testing-library/react'

import { InteractionTimeline } from '../InteractionTimeline'

describe('InteractionTimeline', () => {
    it('renders type, lens label and comment', () => {
        render(<InteractionTimeline interactions={[
            { id: 'i1', interaction_type: 'site_visit', role_lens: 'plant', comment: 'Checked the pour',
              created_by_name: 'Jane', occurred_at: '2026-05-20T12:00:00Z' }
        ]} />)
        expect(screen.getByText(/Checked the pour/)).toBeInTheDocument()
        expect(screen.getByText(/plant/i)).toBeInTheDocument()
        expect(screen.getByText(/Jane/)).toBeInTheDocument()
    })
    it('shows an empty state', () => {
        render(<InteractionTimeline interactions={[]} />)
        expect(screen.getByText(/no interactions logged/i)).toBeInTheDocument()
    })
})
```

- [ ] **Step 2: Run it** — Expected: FAIL.

- [ ] **Step 3: Implement**

```jsx
const TYPE_ICON = { call: 'fa-phone', site_visit: 'fa-location-dot', meeting: 'fa-handshake', email: 'fa-envelope', text: 'fa-message', note: 'fa-note-sticky' }
const LENS_CLASS = {
    sales: 'bg-blue-500/15 text-blue-600 dark:text-blue-300',
    plant: 'bg-amber-500/15 text-amber-600 dark:text-amber-300',
    dispatch: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
    general: 'bg-slate-500/15 text-text-secondary'
}

/** Per-account interaction timeline, newest first. */
export function InteractionTimeline({ interactions = [] }) {
    if (!interactions.length) {
        return <p className="px-2.5 py-3 text-[12px] text-text-tertiary">No interactions logged yet.</p>
    }
    return (
        <ul className="flex flex-col">
            {interactions.map((it) => (
                <li key={it.id} className="flex gap-2.5 px-2.5 py-1.5 border-b border-border-light/60">
                    <i className={`fas ${TYPE_ICON[it.interaction_type] || 'fa-note-sticky'} mt-0.5 text-text-tertiary`} aria-hidden="true" />
                    <div className="min-w-0 flex flex-col gap-0.5">
                        <div className="flex items-center gap-2 text-[12px]">
                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${LENS_CLASS[it.role_lens] || LENS_CLASS.general}`}>{it.role_lens}</span>
                            <span className="font-semibold text-text-primary">{it.created_by_name || 'Unknown'}</span>
                            <time className="text-text-tertiary">{new Date(it.occurred_at).toLocaleDateString()}</time>
                        </div>
                        {it.comment && <p className="text-[12px] text-text-secondary break-words">{it.comment}</p>}
                    </div>
                </li>
            ))}
        </ul>
    )
}
```

- [ ] **Step 4: Run it** — Expected: PASS.

- [ ] **Step 5: Checkpoint** — `/release`. Suggested: `feat(crm): add InteractionTimeline`

---

## Task 13: Accounts page (evolve Directory) + Add prospect

**Files:** Modify `src/app/components/plan/tabs/call-list/pages/CallListDirectoryPage.jsx`; Modify `src/views/tools/plan/CallListView.jsx`; Test `.../pages/__tests__/CallListDirectoryPage.test.jsx`

> **Design:** the list keeps the locked row contract. Detail pane = `AccountHeader` (name, lifecycle chip, plant codes, assigned-rep placeholder) + `ContactsSection` (existing) + `InteractionTimeline` + `LogInteractionComposer`. "Add prospect" is a single primary CTA opening a small form (name required); on save, call `CrmService.saveAccount` and refresh the roster. Loading uses skeleton rows, not a blocking spinner (`progressive-loading`).

- [ ] **Step 1: Write the failing integration test** (mock `useCrm` + `CrmService`)

```jsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import CrmService from '../../../../../../services/CrmService'
import { CallListDirectoryPage } from '../CallListDirectoryPage'

jest.mock('../../../../../../services/CrmService')

describe('CallListDirectoryPage', () => {
    const roster = [{ account_id: 'a1', customer_name: 'Acme', lifecycle_stage: 'customer', plant_codes: ['401'] }]
    beforeEach(() => {
        jest.clearAllMocks()
        CrmService.fetchAccount.mockResolvedValue({ account: roster[0], contacts: [], interactions: [] })
        CrmService.saveAccount.mockResolvedValue({ id: 'a2', name: 'New Co', lifecycle_stage: 'prospect' })
    })

    it('opens an account and shows its timeline', async () => {
        render(<CallListDirectoryPage roster={roster} interactionsByAccount={{}} loadInteractions={jest.fn()}
            logInteraction={jest.fn()} reloadRoster={jest.fn()} accentColor="#2563eb" />)
        fireEvent.click(screen.getByText('Acme'))
        await waitFor(() => expect(screen.getByText(/no interactions logged/i)).toBeInTheDocument())
    })

    it('creates a prospect', async () => {
        const reload = jest.fn()
        render(<CallListDirectoryPage roster={roster} interactionsByAccount={{}} loadInteractions={jest.fn()}
            logInteraction={jest.fn()} reloadRoster={reload} accentColor="#2563eb" />)
        fireEvent.click(screen.getByRole('button', { name: /add prospect/i }))
        fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'New Co' } })
        fireEvent.click(screen.getByRole('button', { name: /save/i }))
        await waitFor(() => expect(CrmService.saveAccount).toHaveBeenCalledWith(expect.objectContaining({ name: 'New Co' })))
        await waitFor(() => expect(reload).toHaveBeenCalled())
    })
})
```

- [ ] **Step 2: Run it** — Expected: FAIL.

- [ ] **Step 3: Implement** — evolve `CallListDirectoryPage` to:
  1. Accept `{ roster, interactionsByAccount, loadInteractions, logInteraction, reloadRoster, accentColor }` from `useCrm` (wired in `CallListView`).
  2. Render the list (keep existing row markup; show lifecycle chip + plant codes).
  3. On select, call `CrmService.fetchAccount(accountId)` for the bundle, call `loadInteractions(accountId)`, and render `AccountHeader` + `ContactsSection` + `<InteractionTimeline interactions={interactionsByAccount[accountId] ?? bundle.interactions} />` + `<LogInteractionComposer defaultLens={roleLensForRoleName(userRoleName)} accentColor={accentColor} onSubmit={(p) => logInteraction({ ...p, accountId })} />`.
  4. Add an "Add prospect" CTA → small form (name required) → `CrmService.saveAccount({ name, lifecycleStage: 'prospect' })` → `reloadRoster()`.

  `AccountHeader` can be an inline component in this file (≤ 40 lines) showing `name`, a lifecycle chip, and `plant_codes`.

- [ ] **Step 4: Run it** — Expected: PASS.

- [ ] **Step 5: Verify in WebStorm localhost** across dark/light/gray; confirm timeline + composer + Add prospect work end-to-end against the deployed edge function.

- [ ] **Step 6: Checkpoint** — `/release`. Suggested: `feat(crm): Accounts detail with timeline, composer, and Add prospect`

---

## Task 14: Activity page — all interaction types + type filter

**Files:** Modify `src/app/components/plan/tabs/call-list/pages/CallListActivityPage.jsx`; Test co-located `__tests__/CallListActivityPage.test.jsx`

> **Design:** reuse `InteractionTimeline` row styling; add a type filter (`FilterStrip` from `callListShared.jsx`) with an "All" default. Empty state per type. Virtualize if the feed can exceed ~100 rows (`virtualize-lists`).

- [ ] **Step 1: Write the failing test**

```jsx
import { fireEvent, render, screen } from '@testing-library/react'

import { CallListActivityPage } from '../CallListActivityPage'

const items = [
    { id: 'i1', interaction_type: 'call', role_lens: 'sales', created_by_name: 'A', occurred_at: '2026-05-20T00:00:00Z', comment: 'rang' },
    { id: 'i2', interaction_type: 'site_visit', role_lens: 'plant', created_by_name: 'B', occurred_at: '2026-05-21T00:00:00Z', comment: 'visited' }
]

describe('CallListActivityPage', () => {
    it('filters by interaction type', () => {
        render(<CallListActivityPage activity={items} />)
        expect(screen.getByText('rang')).toBeInTheDocument()
        fireEvent.click(screen.getByRole('button', { name: /site visit/i }))
        expect(screen.queryByText('rang')).not.toBeInTheDocument()
        expect(screen.getByText('visited')).toBeInTheDocument()
    })
})
```

- [ ] **Step 2: Run it** — Expected: FAIL.

- [ ] **Step 3: Implement** — add a `type` filter state (default `'all'`), a `FilterStrip` of type chips (All, Call, Site visit, Meeting, Email, Note), filter `activity` by `interaction_type`, and render the rows with the same markup as `InteractionTimeline` (extract a shared `InteractionRow` if convenient, or import `InteractionTimeline` and pass the filtered array). Wire `activity` from a new `recent-activity`/`interactions` fetch that returns all types (the edge `recent-activity` already returns from `customer_interactions` post-rename — confirm it selects the new columns).

- [ ] **Step 4: Run it** — Expected: PASS.

- [ ] **Step 5: Checkpoint** — `/release`. Suggested: `feat(crm): Activity feed across all interaction types with type filter`

---

## Task 15: Rename the tab + sidebar labels + final wiring

**Files:** Modify `src/app/components/plan/PlanTabSwitcher.jsx:11`; Modify `src/app/components/plan/tabs/call-list/CallListSidebar.jsx:7`; verify `src/views/tools/plan/CallListView.jsx`

- [ ] **Step 1: Rename the tab label** — in `PLAN_TABS`, change the call-list entry to `{ icon: 'fa-address-book', label: 'CRM', mode: 'call-list' }`. **Keep `mode: 'call-list'`** (stored start-page prefs + `plan.view` permission depend on it).

- [ ] **Step 2: Rename sidebar sections** — in `CALL_LIST_SECTIONS`: `Directory` → `Accounts` (icon `fa-address-book`), `Activity Feed` → `Activity`. Leave `Outreach Queue` and `Team Monitor` as-is (grouping accordion + My Desk/Follow-ups/Pipeline arrive in later phases).

- [ ] **Step 3: Confirm `CallListView` wires `useCrm`** into the Accounts + Activity pages (scope `'all'` for Accounts; `'queue'` for the Outreach page which keeps using the existing roster fields). Ensure imports are `simple-import-sort`-clean.

- [ ] **Step 4: Full manual pass in WebStorm localhost** (dark/light/gray): open CRM tab → Accounts → open an account → log a call, a site visit, a meeting → see them in the timeline and in Activity → add a prospect → confirm it appears. Confirm Outreach Queue + Team Monitor still work.

- [ ] **Step 5: Run the full test suite** — `npm test -- --watchAll=false`. Expected: PASS (no regressions).

- [ ] **Step 6: Checkpoint** — `/release`. Suggested: `feat(crm): rename Call List tab to CRM; finalize Phase 1 wiring`

---

## Out of scope for Phase 1 (own plans later)

- **Phase 2 — Collaboration:** `sales_rep` assignment UI + `bulk-assign-sales-reps`, `customer_followups` + Follow-ups + My Desk, @mentions → `notifications`, role-lens notes, the grouped sidebar accordion, `crm.manage` permission seeding.
- **Phase 3 — Acquisition:** prospect/lead worklist in Outreach, `customer_opportunities` + Pipeline board, extended Team Monitor.
- **Phase 4 — Map:** accounts + site visits on the existing Leaflet map.

---

## Self-Review

- **Spec coverage (Phase 1 slice of the spec):** crm_accounts spine ✓ (T1); typed interactions ✓ (T2); contacts extend ✓ (T3); account-driven roster + scope ✓ (T4); edge roster/account/save-account/log-interaction/interactions ✓ (T5–T6); deploy ✓ (T7); role-lens util ✓ (T8); service/hook ✓ (T9–T10); composer/timeline ✓ (T11–T12); Accounts + Add prospect ✓ (T13); Activity all-types ✓ (T14); tab rename ✓ (T15). Deferred items explicitly listed.
- **Placeholder scan:** no "TBD/handle errors/etc." — each code/test step has concrete content. The one intentional follow-up (lens select styling via the dropdown skill) is a named, actionable step, not a vague placeholder.
- **Type consistency:** `account_id` (uuid) is the FK throughout; `interactionType`/`roleLens`/`occurredAt` camelCase at the client boundary map to `interaction_type`/`role_lens`/`occurred_at` columns; `CrmService.logInteraction` ↔ `useCrm.logInteraction` ↔ composer `onSubmit` payload all use `{ accountId, interactionType, roleLens, outcome, comment, occurredAt }`. `roleLensForRoleName`/`canManageCrm` names match across util + tests.
- **Verified:** `requireAuthenticated` returns the userId **string** on success (`_shared/requireSession.ts:91`), so `auth` is used directly as `created_by`/`updated_by` and in profile lookups across T5–T6 (not `auth.userId`).
