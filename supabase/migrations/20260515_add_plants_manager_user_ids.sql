-- Adds a `manager_user_ids` array column to public.plants. Holds the list
-- of user ids (from public.users) that act as managers for a plant.
-- Foundation for future features that need a per-plant manager list
-- without bolting on a separate join table.
--
-- Defaults to an empty array so every existing row backfills cleanly and
-- downstream code can treat the column as guaranteed-non-null.

alter table public.plants
    add column if not exists manager_user_ids uuid[] not null default '{}'::uuid[];

-- Hash index speeds up "which plants does this manager belong to?" lookups
-- via `manager_user_ids @> ARRAY[?::uuid]` without forcing a full table scan.
create index if not exists plants_manager_user_ids_gin_idx
    on public.plants using gin (manager_user_ids);

-- Force PostgREST to refresh its schema cache so the new column is
-- queryable immediately without waiting for the next auto-reload cycle.
notify pgrst, 'reload schema';
