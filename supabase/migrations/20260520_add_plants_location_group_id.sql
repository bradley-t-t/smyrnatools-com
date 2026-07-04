-- Adds a `location_group_id` column to public.plants for co-located plant
-- groups. Two plants sharing the same `location_group_id` are at the same
-- physical location — they exist as separate codes in dispatch because the
-- dispatcher tracks them as logically distinct, but operationally they
-- share trucks, drivers, and load-out infrastructure (e.g. Baytown 403/404,
-- Conroe 408/409).
--
-- Statistics views (cross-loading, deadhead-help) and any other place that
-- compares plant-vs-plant flow can read this column to collapse aliases to
-- a single primary code so the numbers reflect real movement instead of
-- bookkeeping ones.
--
-- NULL = standalone plant (no co-location). Symmetric — there's no
-- "primary"/"alias" distinction at the database level; the UI picks a
-- canonical code for display (typically the lowest plant_code in the
-- group, since plant codes are zero-padded numeric strings).

alter table public.plants
    add column if not exists location_group_id uuid;

-- Btree index for fast "find every plant in this group" lookups. Partial
-- so it only indexes plants that have a group, since the column is
-- NULL-heavy by design.
create index if not exists plants_location_group_id_idx
    on public.plants (location_group_id)
    where location_group_id is not null;

-- Seed the two known sibling groups so existing behavior is preserved
-- without a coordinated UI roll-out. Idempotent — running this migration
-- twice produces the same outcome (only groups plants that don't already
-- have a `location_group_id`).
do $$
declare
    baytown_group uuid;
    conroe_group uuid;
begin
    -- Baytown 403/404 — share location_group_id, generated once.
    select location_group_id into baytown_group
        from public.plants
        where plant_code in ('403', '404') and location_group_id is not null
        limit 1;
    if baytown_group is null then
        baytown_group := gen_random_uuid();
    end if;
    update public.plants
        set location_group_id = baytown_group, updated_at = now()
        where plant_code in ('403', '404') and (location_group_id is null or location_group_id <> baytown_group);

    -- Conroe 408/409 — same approach.
    select location_group_id into conroe_group
        from public.plants
        where plant_code in ('408', '409') and location_group_id is not null
        limit 1;
    if conroe_group is null then
        conroe_group := gen_random_uuid();
    end if;
    update public.plants
        set location_group_id = conroe_group, updated_at = now()
        where plant_code in ('408', '409') and (location_group_id is null or location_group_id <> conroe_group);
end $$;

-- Force PostgREST to refresh its schema cache so the new column is
-- queryable immediately without waiting for the next auto-reload cycle.
notify pgrst, 'reload schema';
