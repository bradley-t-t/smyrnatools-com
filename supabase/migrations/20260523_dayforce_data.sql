-- Dayforce sync schema.
--
-- Populated by the `dayforce-bridge` Tampermonkey userscript (running on
-- wkdus261.dayforcehcm.com) -> POSTs JSON to the `dayforce-import` edge
-- function -> upserts here. Same pattern as the dispatch bridge, but
-- against Ceridian Dayforce instead of the on-prem dispatch server.
--
-- Four tables:
--   1. dayforce_org_units    — location id mapping (Dayforce internal id
--                              <-> display code like RMX_TX_14002 <->
--                              the smyrnatools plant code 401-468).
--   2. dayforce_employees    — employee profile + hourly rate (the cost
--                              driver for the Labor Cost statistics).
--   3. dayforce_shifts       — one row per (employee x day) shift.
--                              Scheduled vs actual times, exception
--                              codes, PTO. This is what the Hours and
--                              Labor Cost pages render.
--   4. dayforce_raw_punches  — every raw clock event (Clock In / Out)
--                              from GetManagerEmployeeRawPunches. Kept
--                              so we can audit the shift-level rollups
--                              against the source punches.
--
-- RLS: project enforces auth at the edge function layer via the custom
-- users_sessions table (not Supabase default auth), so all policies are
-- `using (true)`. Edge function uses the service role and bypasses RLS
-- anyway; the policies exist only so the anon/authenticated keys can
-- SELECT for the frontend stats pages.

-- ============================================================
-- 1. dayforce_org_units
-- ============================================================
create table if not exists dayforce_org_units (
    id uuid primary key default gen_random_uuid(),
    dayforce_org_id integer not null,
    display_code text not null,
    display_name text not null,
    org_type text,
    state_code text,
    location_number integer,
    parent_dayforce_org_id integer,
    parent_name text,
    plant_code text,
    is_active boolean not null default true,
    last_synced_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index if not exists dayforce_org_units_dayforce_id_idx
    on dayforce_org_units (dayforce_org_id);
create index if not exists dayforce_org_units_plant_code_idx
    on dayforce_org_units (plant_code) where plant_code is not null;
create index if not exists dayforce_org_units_org_type_idx
    on dayforce_org_units (org_type);

-- ============================================================
-- 2. dayforce_employees
-- ============================================================
create table if not exists dayforce_employees (
    id uuid primary key default gen_random_uuid(),
    dayforce_employee_id integer not null,
    employee_badge text not null,
    first_name text,
    last_name text,
    nickname text,
    display_name text,
    hire_date date,
    birth_date date,
    annual_salary numeric(10,2),
    hourly_rate numeric(8,4),
    hours_per_week numeric(5,2),
    hours_per_day numeric(5,2),
    home_dayforce_org_id integer,
    pay_group_id integer,
    employment_status_reason_id integer,
    is_active boolean not null default true,
    operator_id uuid,
    raw_employment_record jsonb,
    last_synced_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index if not exists dayforce_employees_dayforce_id_idx
    on dayforce_employees (dayforce_employee_id);
create unique index if not exists dayforce_employees_badge_idx
    on dayforce_employees (employee_badge);
create index if not exists dayforce_employees_home_org_idx
    on dayforce_employees (home_dayforce_org_id);
create index if not exists dayforce_employees_operator_idx
    on dayforce_employees (operator_id) where operator_id is not null;
create index if not exists dayforce_employees_active_idx
    on dayforce_employees (is_active) where is_active;

-- ============================================================
-- 3. dayforce_shifts
-- ============================================================
-- One row per (employee x shift_date). Carries both the scheduled and
-- actual side so the Hours page can render the same grid Dayforce shows:
-- scheduled in/out (top of the cell) vs actual in/out (middle) vs the
-- two hour totals (bottom).
--
-- Shift identity is (dayforce_employee_id, shift_date) — not the
-- dayforce_shift_id, because dispatchers can split or recreate shifts
-- and we want one canonical row per worked day. dayforce_shift_id is
-- kept for traceability but the upsert key is the (employee, date)
-- pair.
create table if not exists dayforce_shifts (
    id uuid primary key default gen_random_uuid(),
    dayforce_shift_id bigint,
    dayforce_employee_id integer not null,
    employee_badge text,
    dayforce_org_id integer,
    shift_date date not null,
    scheduled_in_at timestamp,
    scheduled_out_at timestamp,
    scheduled_hours numeric(6,2),
    actual_in_at timestamp,
    actual_out_at timestamp,
    actual_hours numeric(6,2),
    actual_in_punch_at timestamp,
    actual_out_punch_at timestamp,
    exception_code text,
    exception_text text,
    pay_code text,
    is_authorized boolean not null default false,
    is_holiday boolean not null default false,
    is_pto boolean not null default false,
    pto_hours numeric(6,2),
    -- Snapshot of the hourly rate that was in effect when this shift
    -- was synced. Persisted on the row so historical labor cost stays
    -- accurate after a rate change instead of silently recomputing
    -- against today's rate.
    hourly_rate_snapshot numeric(8,4),
    raw_shift jsonb,
    last_synced_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index if not exists dayforce_shifts_employee_date_idx
    on dayforce_shifts (dayforce_employee_id, shift_date);
create index if not exists dayforce_shifts_org_date_idx
    on dayforce_shifts (dayforce_org_id, shift_date);
create index if not exists dayforce_shifts_date_idx
    on dayforce_shifts (shift_date);
create index if not exists dayforce_shifts_dayforce_shift_id_idx
    on dayforce_shifts (dayforce_shift_id) where dayforce_shift_id is not null;

-- ============================================================
-- 4. dayforce_raw_punches
-- ============================================================
-- Every raw clock-in / clock-out event. Source of truth for the
-- shift-level aggregates above — keep them around for audit and so
-- we can rebuild dayforce_shifts deterministically if the obfuscated
-- timesheet schema ever drifts.
create table if not exists dayforce_raw_punches (
    id uuid primary key default gen_random_uuid(),
    raw_punch_id bigint not null,
    dayforce_employee_id integer not null,
    employee_badge text,
    punch_type text not null,
    punch_time timestamp not null,
    process_time timestamp,
    punch_device_name text,
    dayforce_org_id integer,
    punch_state text,
    punch_origin text,
    was_offline boolean not null default false,
    was_validated boolean not null default true,
    raw_payload jsonb,
    last_synced_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index if not exists dayforce_raw_punches_id_idx
    on dayforce_raw_punches (raw_punch_id);
create index if not exists dayforce_raw_punches_employee_time_idx
    on dayforce_raw_punches (dayforce_employee_id, punch_time);
create index if not exists dayforce_raw_punches_org_time_idx
    on dayforce_raw_punches (dayforce_org_id, punch_time);

-- ============================================================
-- updated_at triggers (one shared function for all four tables)
-- ============================================================
create or replace function touch_dayforce_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

drop trigger if exists dayforce_org_units_touch_updated_at on dayforce_org_units;
create trigger dayforce_org_units_touch_updated_at
    before update on dayforce_org_units
    for each row execute function touch_dayforce_updated_at();

drop trigger if exists dayforce_employees_touch_updated_at on dayforce_employees;
create trigger dayforce_employees_touch_updated_at
    before update on dayforce_employees
    for each row execute function touch_dayforce_updated_at();

drop trigger if exists dayforce_shifts_touch_updated_at on dayforce_shifts;
create trigger dayforce_shifts_touch_updated_at
    before update on dayforce_shifts
    for each row execute function touch_dayforce_updated_at();

drop trigger if exists dayforce_raw_punches_touch_updated_at on dayforce_raw_punches;
create trigger dayforce_raw_punches_touch_updated_at
    before update on dayforce_raw_punches
    for each row execute function touch_dayforce_updated_at();

-- ============================================================
-- RLS — allow-all per project convention (custom-auth at edge layer)
-- ============================================================
alter table dayforce_org_units enable row level security;
alter table dayforce_employees enable row level security;
alter table dayforce_shifts enable row level security;
alter table dayforce_raw_punches enable row level security;

drop policy if exists dayforce_org_units_all on dayforce_org_units;
create policy dayforce_org_units_all on dayforce_org_units
    for all using (true) with check (true);

drop policy if exists dayforce_employees_all on dayforce_employees;
create policy dayforce_employees_all on dayforce_employees
    for all using (true) with check (true);

drop policy if exists dayforce_shifts_all on dayforce_shifts;
create policy dayforce_shifts_all on dayforce_shifts
    for all using (true) with check (true);

drop policy if exists dayforce_raw_punches_all on dayforce_raw_punches;
create policy dayforce_raw_punches_all on dayforce_raw_punches
    for all using (true) with check (true);

grant select, insert, update, delete on dayforce_org_units to authenticated, anon, service_role;
grant select, insert, update, delete on dayforce_employees to authenticated, anon, service_role;
grant select, insert, update, delete on dayforce_shifts to authenticated, anon, service_role;
grant select, insert, update, delete on dayforce_raw_punches to authenticated, anon, service_role;

-- ============================================================
-- Seed: Houston RMX_TX_* org units captured from
-- GetUserOrg/ on 2026-05-23. The parent (Houston TX - Groves)
-- is included too so children can resolve their region name.
-- The userscript refreshes this table from GetUserOrg/ on every
-- cycle; this seed just makes the table immediately useful
-- before the first sync runs.
-- ============================================================
insert into dayforce_org_units (
    dayforce_org_id, display_code, display_name, org_type, state_code,
    location_number, parent_dayforce_org_id, parent_name
) values
    (3452, 'HOUSTON_TX_GROVES', 'Houston TX - Groves', 'REGION', 'TX', null, null, null),
    (3627, 'RMX_TX_14001', 'Houston Flintlock',     'RMX', 'TX', 14001, 3452, 'Houston TX - Groves'),
    (3628, 'RMX_TX_14002', 'Houston Lake Houston',  'RMX', 'TX', 14002, 3452, 'Houston TX - Groves'),
    (3624, 'RMX_TX_14003', 'Baytown',               'RMX', 'TX', 14003, 3452, 'Houston TX - Groves'),
    (3634, 'RMX_TX_14005', 'San Leon',              'RMX', 'TX', 14005, 3452, 'Houston TX - Groves'),
    (3629, 'RMX_TX_14006', 'Houston Winfield',      'RMX', 'TX', 14006, 3452, 'Houston TX - Groves'),
    (3632, 'RMX_TX_14007', 'New Waverly',           'RMX', 'TX', 14007, 3452, 'Houston TX - Groves'),
    (3625, 'RMX_TX_14008', 'Conroe',                'RMX', 'TX', 14008, 3452, 'Houston TX - Groves'),
    (3626, 'RMX_TX_14010', 'Freeport',              'RMX', 'TX', 14010, 3452, 'Houston TX - Groves'),
    (3633, 'RMX_TX_14053', 'Bryan',                 'RMX', 'TX', 14053, 3452, 'Houston TX - Groves'),
    (3630, 'RMX_TX_14055', 'Huntsville',            'RMX', 'TX', 14055, 3452, 'Houston TX - Groves'),
    (3631, 'RMX_TX_14061', 'Navasota',              'RMX', 'TX', 14061, 3452, 'Houston TX - Groves'),
    (6641, 'RMX_TX_14068', 'Madisonville',          'RMX', 'TX', 14068, 3452, 'Houston TX - Groves')
on conflict (dayforce_org_id) do update set
    display_code   = excluded.display_code,
    display_name   = excluded.display_name,
    org_type       = excluded.org_type,
    state_code     = excluded.state_code,
    location_number = excluded.location_number,
    parent_dayforce_org_id = excluded.parent_dayforce_org_id,
    parent_name    = excluded.parent_name;
