create table if not exists documents (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    file_path text not null,
    file_type text not null,
    file_size bigint not null default 0,
    uploaded_by uuid references users(id),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);
