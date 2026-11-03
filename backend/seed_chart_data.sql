-- School-project demonstration data, persisted in Supabase rather than generated in the UI.
-- Run dashboard_schema.sql first. Safe to rerun: inserts only missing DEMO-CHART/DEMO-COST IDs.
-- Uses the existing campus bins; does not modify or delete existing records.
begin;
select pg_advisory_xact_lock(hashtext('waste_dashboard_chart_seed'));

insert into public.contamination_categories (id, label) values
    ('food_liquids', 'Food / liquids'),
    ('plastic_film', 'Plastic film'),
    ('wrong_stream_items', 'Wrong-stream items'),
    ('other_materials', 'Other materials')
on conflict (id) do nothing;

create temporary table chart_seed_services on commit drop as
with bins as (
    select *, row_number() over (order by id)::integer as bin_number
    from public.dumpsters
), services as (
    select bins.*, n,
        'DEMO-CHART-' || id || '-' || n as demo_form_id,
        extract(epoch from (timestamptz '2026-09-07 08:00:00+00'
            + ((n - 1) * 7 + (bin_number - 1) % 7) * interval '1 day'
            + (bin_number % 5) * interval '1 hour'))::bigint as scheduled_time,
        (bin_number + n) % 7 <> 0 as completed,
        (bin_number * 3 + n) % 5 = 0 as contaminated,
        case when (bin_number + n) % 17 = 0 then null
             else 15 + (bin_number * 13 + n * 17) % 86 end as fullness,
        (array['S. Patel', 'J. Nguyen', 'D. Okafor', 'R. Castillo', 'M. Alvarez'])
            [1 + (bin_number + n) % 5] as demo_driver
    from bins cross join generate_series(1, 8) as n
)
select *, case
    when not contaminated then null
    when waste_type in ('COMPOST', 'Compost') then
        case when n % 2 = 0 then 'plastic_film' else 'wrong_stream_items' end
    when waste_type in ('WASTE', 'Landfill') then 'wrong_stream_items'
    else (array['food_liquids', 'plastic_film', 'wrong_stream_items', 'other_materials'])
        [1 + (bin_number + n) % 4]
    end as category_id
from services;

insert into public.fulfilled_pickups (
    form_id, dumpster_id, employee_id, fulfilled_at, percent_full,
    is_contamination, contamination_category_id, is_overflow,
    driver_name, service_status, additional_notes
)
select demo_form_id, id, 'DEMO-EMP-' || (1 + (bin_number + n) % 5),
    scheduled_time + 1800, fullness, contaminated, category_id,
    (bin_number + n) % 11 = 0, demo_driver,
    case when (bin_number + n) % 13 = 0 then 'Delayed' else 'Completed' end,
    'School project chart demo'
from chart_seed_services where completed
on conflict (form_id) do nothing;

insert into public.pickup_schedule_entries (
    dumpster_id, scheduled_at, is_fulfilled, form_id, driver_name
)
select id, scheduled_time, completed, demo_form_id, demo_driver
from chart_seed_services s
where not exists (
    select 1 from public.pickup_schedule_entries p where p.form_id = s.demo_form_id
);

-- Full years 2024/2025 and recorded months Jan-Oct 2026. No future-month actuals.
with buildings as (
    select building_group, row_number() over (order by building_group)::integer as building_number
    from (select distinct building_group from public.dumpsters
          where nullif(trim(building_group), '') is not null) b
), months as (
    select month::date as cost_month from generate_series(
        date '2024-01-01', date '2026-10-01', interval '1 month') as month
)
insert into public.collection_costs (id, building_group, cost_month, amount_cents, description, is_demo)
select 'DEMO-COST-' || md5(building_group) || '-' || to_char(cost_month, 'YYYYMM'),
    building_group, cost_month,
    round((65000 + building_number * 1700)
        * (array[1.02, .94, 1.08, 1.06, .98, .74, .69, .92, 1.16, 1.12, 1.03, .82])
            [extract(month from cost_month)::integer]
        * (1 + (extract(year from cost_month)::integer - 2024) * .045))::integer,
    'School project monthly collection cost', true
from buildings cross join months
on conflict (id) do nothing;

commit;
