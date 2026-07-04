-- 20260521_plan_settings.sql
-- Per-region operational settings for the Plan / Operations view.
-- Replaces the hardcoded JS constants in src/app/constants/planConstants.ts
-- so dispatch can tune pre-trip / load / slump / pace / DOT / big-pour /
-- pull-up / slot-grid values without a redeploy. One row per region; the
-- application falls back to baked-in defaults when no row exists (the
-- defaults below mirror the current JS constants exactly, so behavior is
-- unchanged until a dispatcher actually saves an override).
--
-- Two layers of validation:
--   1. Per-column ranges (`between min and max`) — catch values that
--      are obviously out of bounds for a concrete fleet.
--   2. Cross-column sanity (`constraint … check (…)`) — catch
--      misconfigurations where each value looks plausible in isolation
--      but the combination would break scheduling math (zero spacing,
--      cycle longer than a shift, overlap between small/big-pour
--      classifications, etc.).
-- The frontend should mirror these as inline validation so the user
-- sees the problem before saving; the DB constraints are the last line
-- of defense.

create table if not exists plan_settings (
    region_code text primary key,

    -- ── Section 1 · Truck cycle times ────────────────────────────────
    pre_trip_minutes                 smallint not null default 15
        check (pre_trip_minutes between 0 and 240),
    plant_load_minutes               smallint not null default 10
        check (plant_load_minutes between 0 and 240),
    slump_test_minutes               smallint not null default 5
        check (slump_test_minutes between 0 and 240),
    early_arrival_minutes            smallint not null default 5
        check (early_arrival_minutes between 0 and 240),
    on_site_minutes_per_truck        smallint not null default 30
        check (on_site_minutes_per_truck between 1 and 480),
    default_truck_spacing_minutes    smallint not null default 5
        check (default_truck_spacing_minutes between 1 and 120),
    per_load_pour_minutes            smallint not null default 10
        check (per_load_pour_minutes between 0 and 240),

    -- ── Section 2 · DOT compliance ───────────────────────────────────
    dot_shift_cap_hours              smallint not null default 14
        check (dot_shift_cap_hours between 1 and 24),
    required_rest_hours              smallint not null default 10
        check (required_rest_hours between 0 and 24),
    overtime_warning_hours           smallint not null default 12
        check (overtime_warning_hours between 0 and 24),

    -- ── Section 3 · Service quality thresholds ───────────────────────
    late_threshold_minutes           smallint not null default 15
        check (late_threshold_minutes between 0 and 240),
    slow_pace_min_ratio              numeric(4,2) not null default 1.00
        check (slow_pace_min_ratio between 0 and 2),
    small_pour_max_trucks            smallint not null default 3
        check (small_pour_max_trucks between 0 and 50),
    small_pour_max_yardage           smallint not null default 30
        check (small_pour_max_yardage between 0 and 500),
    big_pour_min_yardage             smallint not null default 120
        check (big_pour_min_yardage between 1 and 5000),
    big_pour_max_spacing_minutes     smallint not null default 10
        check (big_pour_max_spacing_minutes between 1 and 120),
    big_pour_min_trucks              smallint not null default 12
        check (big_pour_min_trucks between 1 and 100),

    -- ── Section 4 · Schedule & recommendations ───────────────────────
    pull_up_min_savings_minutes      smallint not null default 60
        check (pull_up_min_savings_minutes between 0 and 480),
    pull_up_customer_notice_minutes  smallint not null default 120
        check (pull_up_customer_notice_minutes between 0 and 1440),
    day_start_minutes                smallint not null default 360
        check (day_start_minutes between 0 and 1439),
    day_end_minutes                  smallint not null default 1080
        check (day_end_minutes between 0 and 1439),
    slot_granularity_minutes         smallint not null default 30
        check (slot_granularity_minutes between 1 and 240),
    max_travel_minutes               smallint not null default 180
        check (max_travel_minutes between 1 and 1440),

    -- ── Cross-column sanity ──────────────────────────────────────────
    -- These prevent misconfigurations where each value is in range on
    -- its own but the combination would break scheduling math.

    -- Day window must have a positive span so the slot scanner has
    -- somewhere to scan.
    constraint plan_settings_day_window_check
        check (day_end_minutes > day_start_minutes),

    -- Slot granularity must fit inside the day window; otherwise the
    -- scanner produces zero slots and the planner shows nothing.
    constraint plan_settings_slot_granularity_fits_window_check
        check (slot_granularity_minutes <= day_end_minutes - day_start_minutes),

    -- Overtime warning has to fire BEFORE the DOT cap, otherwise the
    -- amber band collapses and dispatchers go straight from green to
    -- red with no warning.
    constraint plan_settings_overtime_before_cap_check
        check (overtime_warning_hours < dot_shift_cap_hours),

    -- Required rest can't equal or exceed a shift — a driver would
    -- never be able to start work again.
    constraint plan_settings_rest_below_cap_check
        check (required_rest_hours < dot_shift_cap_hours),

    -- Small-pour ceiling can't reach the big-pour floor in either
    -- yardage or truck count; otherwise a single job lands in both
    -- categories at once and the badge logic toggles arbitrarily.
    constraint plan_settings_small_below_big_yardage_check
        check (small_pour_max_yardage < big_pour_min_yardage),
    constraint plan_settings_small_below_big_trucks_check
        check (big_pour_min_trucks > small_pour_max_trucks),

    -- Per-load discharge time can't exceed the truck's total time on
    -- site. (On-site time = maneuver + unload + buffer; the per-load
    -- portion is a subset.)
    constraint plan_settings_pour_fits_on_site_check
        check (per_load_pour_minutes <= on_site_minutes_per_truck),

    -- A single round-trip's static portion (pre-trip + load + slump +
    -- on-site) must fit strictly inside the DOT shift cap, otherwise
    -- no driver can ever complete one cycle and every pour schedules
    -- to infeasible. Travel time fills the remainder.
    constraint plan_settings_cycle_fits_shift_check
        check (
            (pre_trip_minutes + plant_load_minutes + slump_test_minutes + on_site_minutes_per_truck)
            < (dot_shift_cap_hours * 60)
        ),

    -- "Late" can't be longer than a shift — otherwise a job could be
    -- 4h overdue and still flagged on-time inside a 1h shift cap.
    constraint plan_settings_late_within_shift_check
        check (late_threshold_minutes <= (dot_shift_cap_hours * 60)),

    -- A single one-way travel can't exceed a full shift; if it could,
    -- the round trip would always be infeasible.
    constraint plan_settings_travel_within_shift_check
        check (max_travel_minutes < (dot_shift_cap_hours * 60)),

    -- Customer-notice lead time has to fit inside a shift, otherwise
    -- the pull-up suggester would always reject every candidate.
    constraint plan_settings_pull_up_notice_within_shift_check
        check (pull_up_customer_notice_minutes <= (dot_shift_cap_hours * 60)),

    -- ── Provenance ───────────────────────────────────────────────────
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now(),
    updated_by  uuid null
);

-- Project convention: RLS on, policy `using (true)` because access control
-- is enforced at the edge-function layer (custom session table). Frontend
-- never writes this table directly; reads go through DatabaseService.
alter table plan_settings enable row level security;

drop policy if exists plan_settings_all on plan_settings;
create policy plan_settings_all on plan_settings
    using (true)
    with check (true);

-- Keep updated_at fresh without relying on every caller to set it.
create or replace function plan_settings_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

drop trigger if exists plan_settings_touch_updated_at on plan_settings;
create trigger plan_settings_touch_updated_at
    before update on plan_settings
    for each row
    execute function plan_settings_touch_updated_at();

-- Self-documenting column comments — show up in any SQL client + the
-- supabase studio inspector, so the meaning of each knob is one click away.
comment on table  plan_settings is
    'Per-region operational settings for the Plan / Operations view. Replaces the hardcoded constants in src/app/constants/planConstants.ts. One row per region_code; the app falls back to JS defaults when no row exists.';

comment on column plan_settings.region_code is
    'Region code (matches regions.region_code). PK because settings are scoped per region.';
comment on column plan_settings.pre_trip_minutes is
    'Pre-trip inspection time before a truck leaves the plant.';
comment on column plan_settings.plant_load_minutes is
    'Time a truck spends loading concrete at the silo.';
comment on column plan_settings.slump_test_minutes is
    'Slump / QC test time before the truck leaves the plant.';
comment on column plan_settings.early_arrival_minutes is
    'How many minutes before the scheduled pour start the first truck should arrive on site.';
comment on column plan_settings.on_site_minutes_per_truck is
    'Total minutes a truck spends on site (maneuver + unload + buffer). Feeds cycle time and pool-return math.';
comment on column plan_settings.default_truck_spacing_minutes is
    'Default cadence between consecutive truck dispatches when the order does not specify a rate. Must be >= 1 to keep pool dispatch math sane.';
comment on column plan_settings.per_load_pour_minutes is
    'Single-load discharge time at the job (distinct from total on-site time).';

comment on column plan_settings.dot_shift_cap_hours is
    'DOT driver-shift cap. Drives the LIMIT pill on schedule rows and slot feasibility.';
comment on column plan_settings.required_rest_hours is
    'Required rest between consecutive shifts for the same driver. Drives same-day bookability.';
comment on column plan_settings.overtime_warning_hours is
    'Warning band before the DOT cap. Operator fatigue indicators light up at this threshold.';

comment on column plan_settings.late_threshold_minutes is
    'Minutes past the scheduled job start before the first load is flagged late.';
comment on column plan_settings.slow_pace_min_ratio is
    'Achieved-yd-per-hour divided by requested-yd-per-hour. Pours below this ratio are flagged slow (1.00 = anything strictly below target).';
comment on column plan_settings.small_pour_max_trucks is
    'Truck count at or below which a pour skips the slow-pace check (customer-paced).';
comment on column plan_settings.small_pour_max_yardage is
    'Yardage at or below which a pour skips the slow-pace check (customer-paced).';
comment on column plan_settings.big_pour_min_yardage is
    'Yardage at or above which the big-pour rule starts evaluating.';
comment on column plan_settings.big_pour_max_spacing_minutes is
    'Truck spacing at or below which, combined with the yardage threshold, triggers the big-pour rule.';
comment on column plan_settings.big_pour_min_trucks is
    'Truck floor enforced once the big-pour rule fires.';

comment on column plan_settings.pull_up_min_savings_minutes is
    'Minimum time savings (versus the original slot) before a pull-up suggestion is shown.';
comment on column plan_settings.pull_up_customer_notice_minutes is
    'Customer-notice lead time required before a pull-up suggestion is offered.';
comment on column plan_settings.day_start_minutes is
    'Earliest slot the planner considers (minutes from midnight; 360 = 06:00).';
comment on column plan_settings.day_end_minutes is
    'Latest slot the planner considers (minutes from midnight; 1080 = 18:00).';
comment on column plan_settings.slot_granularity_minutes is
    'Rounding granularity for suggested slot start times (e.g. 30 = snap to :00 / :30).';
comment on column plan_settings.max_travel_minutes is
    'Sanity ceiling on a single travel-time entry. Concrete sets in ~90 min, so 180 catches data-entry errors.';
