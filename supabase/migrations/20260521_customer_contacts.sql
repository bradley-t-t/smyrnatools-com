-- Manual / curated phone numbers per customer. Overlays the auto-populated
-- numbers parsed from the latest dispatch order. Dispatchers can label
-- numbers ("Office", "Owner Cell"), attach contact names, add numbers the
-- dispatch HTML doesn't capture, mark a primary, and hide auto-populated
-- numbers they don't want surfaced. One row per (customer_num, phone_digits)
-- — the normalized digits act as the join key against parsed dispatch
-- entries on the frontend.

create table if not exists customer_contacts (
    id uuid primary key default gen_random_uuid(),
    customer_num text not null,
    phone_digits text not null,
    phone_display text not null,
    label text,
    contact_name text,
    is_primary boolean not null default false,
    is_hidden boolean not null default false,
    source text not null default 'manual' check (source in ('manual', 'dispatch')),
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    created_by uuid,
    updated_by uuid
);

create unique index if not exists customer_contacts_customer_phone_idx
    on customer_contacts (customer_num, phone_digits);

create index if not exists customer_contacts_customer_idx
    on customer_contacts (customer_num);

-- At most one visible primary number per customer.
create unique index if not exists customer_contacts_one_primary_per_customer
    on customer_contacts (customer_num)
    where is_primary and not is_hidden;

create or replace function touch_customer_contacts_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

drop trigger if exists customer_contacts_touch_updated_at on customer_contacts;
create trigger customer_contacts_touch_updated_at
    before update on customer_contacts
    for each row execute function touch_customer_contacts_updated_at();

-- RLS: project enforces auth at the edge function layer (custom users_sessions
-- table), so policies allow all. Service role bypasses RLS anyway.
alter table customer_contacts enable row level security;
drop policy if exists customer_contacts_all on customer_contacts;
create policy customer_contacts_all on customer_contacts
    for all using (true) with check (true);

grant select, insert, update, delete on customer_contacts
    to authenticated, anon, service_role;

-- ---------------------------------------------------------------------
-- Extend the roster RPC: add an `include_active` parameter so the
-- Directory tab can see currently-pouring customers (not just dormant),
-- expose a `pouring_status` field for the UI, and prefer the manually
-- marked primary number when one is set. Existing call sites that pass
-- no parameter keep the old "dormant only" behavior.
-- ---------------------------------------------------------------------
create or replace function get_call_list_roster(include_active boolean default false)
returns table (
    customer_num text,
    customer_name text,
    contact_name text,
    phone text,
    last_pour_date date,
    days_since_last_pour integer,
    pour_days_last_year integer,
    pouring_status text,
    last_call_at timestamptz,
    last_call_outcome text,
    last_call_by_name text,
    last_call_comment text,
    call_count_last_30 integer
)
language sql stable as $$
    with latest_orders as (
        select distinct on (dd.customer_num)
            dd.customer_num,
            dd.customer as customer_name,
            dd.contact as contact_name,
            dd.phone,
            dd.order_date as last_pour_date
        from dispatch_data dd
        where dd.customer_num is not null
          and dd.customer_num <> ''
          and dd.order_date >= current_date - interval '365 days'
        order by dd.customer_num, dd.order_date desc
    ),
    pour_counts as (
        select customer_num, count(distinct order_date)::int as pour_days_last_year
        from dispatch_data
        where customer_num is not null
          and customer_num <> ''
          and order_date >= current_date - interval '365 days'
        group by customer_num
    ),
    last_calls as (
        select distinct on (customer_num)
            customer_num,
            created_at as last_call_at,
            outcome as last_call_outcome,
            created_by_name as last_call_by_name,
            comment as last_call_comment
        from customer_call_log
        order by customer_num, created_at desc
    ),
    call_counts as (
        select customer_num, count(*)::int as call_count_last_30
        from customer_call_log
        where created_at >= now() - interval '30 days'
        group by customer_num
    ),
    primary_contacts as (
        select customer_num, phone_display
        from customer_contacts
        where is_primary and not is_hidden
    )
    select
        lo.customer_num,
        lo.customer_name,
        lo.contact_name,
        coalesce(pc.phone_display, lo.phone) as phone,
        lo.last_pour_date,
        (current_date - lo.last_pour_date)::int as days_since_last_pour,
        coalesce(pcnt.pour_days_last_year, 0) as pour_days_last_year,
        case
            when (current_date - lo.last_pour_date) < 30 then 'active'
            else 'dormant'
        end as pouring_status,
        lc.last_call_at,
        lc.last_call_outcome,
        lc.last_call_by_name,
        lc.last_call_comment,
        coalesce(cc.call_count_last_30, 0) as call_count_last_30
    from latest_orders lo
    left join pour_counts pcnt on pcnt.customer_num = lo.customer_num
    left join last_calls lc on lc.customer_num = lo.customer_num
    left join call_counts cc on cc.customer_num = lo.customer_num
    left join primary_contacts pc on pc.customer_num = lo.customer_num
    where include_active
       or (current_date - lo.last_pour_date) >= 30;
$$;

grant execute on function get_call_list_roster(boolean)
    to authenticated, anon, service_role;
