create table if not exists documents (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    file_path text not null,
    file_type text not null,
    file_size bigint not null default 0,
    uploaded_by uuid references auth.users(id),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

alter table documents enable row level security;

create policy "Authenticated users can view documents"
    on documents for select
    to authenticated
    using (true);

create policy "Users with upload permission can insert documents"
    on documents for insert
    to authenticated
    with check (true);

create policy "Users can delete their own documents"
    on documents for delete
    to authenticated
    using (uploaded_by = auth.uid());
