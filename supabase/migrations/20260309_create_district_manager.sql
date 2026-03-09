-- Tracks which roles are eligible for the District Manager plant-responsibility feature.
-- Start with "District Manager" role, but any role can be added here in the future.
create table if not exists district_manager_eligible_roles (
    id uuid default gen_random_uuid() primary key,
    role_id uuid not null references users_roles(id) on delete cascade,
    created_at timestamptz default now(),
    unique (role_id)
);

alter table district_manager_eligible_roles enable row level security;

create policy "Allow all access to district_manager_eligible_roles"
    on district_manager_eligible_roles
    for all
    using (true)
    with check (true);

-- Stores which plants a user is personally responsible for within their assigned region.
-- Only users whose role appears in district_manager_eligible_roles should have rows here.
create table if not exists district_manager_plants (
    id uuid default gen_random_uuid() primary key,
    user_id uuid noyt null references users(id) on delete cascade,
    plant_code text not null,
    created_at timestamptz default now(),
    unique (user_id, plant_code)
);

create index if not exists idx_district_manager_plants_user_id
    on district_manager_plants (user_id);

create index if not exists idx_district_manager_plants_plant_code
    on district_manager_plants (plant_code);

alter table district_manager_plants enable row level security;

create policy "Allow all access to district_manager_plants"
    on district_manager_plants
    for all
    using (true)
    with check (true);
