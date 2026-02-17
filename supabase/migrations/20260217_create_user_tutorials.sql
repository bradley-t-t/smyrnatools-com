create table public.users_tutorials (
    id uuid not null default gen_random_uuid(),
    user_id uuid not null,
    tutorial_id text not null,
    dismissed_at timestamp with time zone not null default current_timestamp,
    constraint users_tutorials_pkey primary key (id),
    constraint users_tutorials_user_id_tutorial_id_key unique (user_id, tutorial_id),
    constraint users_tutorials_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade
) tablespace pg_default;

create index if not exists idx_users_tutorials_user_id on public.users_tutorials using btree (user_id) tablespace pg_default;
create index if not exists idx_users_tutorials_tutorial_id on public.users_tutorials using btree (tutorial_id) tablespace pg_default;
