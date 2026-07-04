-- Adds a `colocated_alias_codes` column to public.plants for phantom
-- co-location codes that don't exist as their own plant row.
--
-- Background:
--   `location_group_id` (added in 20260520) is the symmetric grouping
--   mechanism for plants that all exist as real rows. But some codes
--   (e.g. dispatch's "404" or "409") show up in tickets without ever
--   being created as plant records — and the dispatcher doesn't want
--   to maintain them as standalone rows. This column lets a real plant
--   list those phantom codes as part of its co-location group without
--   creating a row for each one.
--
-- Resolution rules (consumed by `buildColocationMap` on the client):
--   • Real-plant siblings: matched via shared `location_group_id`.
--   • Phantom alias codes: each plant's `colocated_alias_codes` entries
--     resolve to THAT plant as their primary.
--   • A real plant's full co-location group is therefore: itself +
--     other plants sharing its `location_group_id` + every code in its
--     own `colocated_alias_codes` + every code in any sibling plant's
--     `colocated_alias_codes`.
--
-- Defaults to an empty array so every existing row backfills cleanly
-- and client code can treat the column as guaranteed-non-null.

alter table public.plants
    add column if not exists colocated_alias_codes text[] not null default '{}'::text[];

-- GIN index for "which plants alias to code X?" lookups, used by the
-- statistics layer's runtime resolution. Cheap to maintain since the
-- arrays are tiny.
create index if not exists plants_colocated_alias_codes_gin_idx
    on public.plants using gin (colocated_alias_codes);

-- Force PostgREST to refresh its schema cache so the new column is
-- queryable immediately without waiting for the next auto-reload cycle.
notify pgrst, 'reload schema';
