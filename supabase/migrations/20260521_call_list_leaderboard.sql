-- Per-user productivity rollup for the Plan → Call List → Leaderboard
-- side menu. Lets ops + sales leadership see which dispatchers are
-- working the outreach queue hardest and which conversations are
-- actually moving the needle (bookings, will-book-again).

create or replace function get_call_list_leaderboard(days_window integer default 30)
returns table (
    created_by uuid,
    user_name text,
    total_calls integer,
    booked integer,
    will_book_again integer,
    no_answer integer,
    not_interested integer,
    note integer,
    unique_customers integer,
    last_call_at timestamptz,
    first_call_at timestamptz
)
language sql stable as $$
    with bounded_logs as (
        select *
        from customer_call_log
        where created_at >= now() - make_interval(days => greatest(days_window, 1))
    ),
    name_resolution as (
        select
            bl.created_by,
            -- Prefer the live profile display name (first + last → name),
            -- fall back to whatever the call entry stored at write-time
            -- (older entries may predate a profile update). Names live on
            -- `users_profiles` in this project, not the bare `users` table.
            coalesce(
                nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), ''),
                nullif(bl.created_by_name, ''),
                'Unknown user'
            ) as user_name
        from bounded_logs bl
        left join users_profiles p on p.id = bl.created_by
    )
    select
        bl.created_by,
        (array_agg(nr.user_name order by bl.created_at desc))[1] as user_name,
        count(*)::int as total_calls,
        count(*) filter (where bl.outcome = 'booked')::int as booked,
        count(*) filter (where bl.outcome = 'will_book_again')::int as will_book_again,
        count(*) filter (where bl.outcome = 'no_answer')::int as no_answer,
        count(*) filter (where bl.outcome = 'not_interested')::int as not_interested,
        count(*) filter (where bl.outcome = 'note')::int as note,
        count(distinct bl.customer_num)::int as unique_customers,
        max(bl.created_at) as last_call_at,
        min(bl.created_at) as first_call_at
    from bounded_logs bl
    join name_resolution nr on nr.created_by = bl.created_by
    where bl.created_by is not null
    group by bl.created_by
    order by count(*) desc, max(bl.created_at) desc;
$$;

grant execute on function get_call_list_leaderboard(integer)
    to authenticated, anon, service_role;
