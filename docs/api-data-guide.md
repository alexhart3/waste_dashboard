# Dashboard data derivation guide

## Client sketch charts (October 2026)

The overview has three rows: pickups by location and monthly costs; pickup
trends and weekday fullness; overflow by bin and the contamination donut.
The current frontend consumes `GET /dashboard/`, implemented in
`backend/endpoints/dashboard.py`, returning joined `pickups` and `schedule`
arrays. The older endpoint mapping below is historical context; the current
dashboard endpoint already includes driver, overflow, and service-status fields.

| Chart | Current source | Remaining infrastructure |
| --- | --- | --- |
| Pickup trend | `pickups.collectedAt`; due schedule rows with neither `fulfilled` nor `pickupId` | No new fields needed for the current definition. An explicit missed/cancelled status and service grace period would support more precise operational reporting. |
| Weekday fullness | Average non-null `pickups.fullness`, grouped Monday–Sunday by `collectedAt` | No new fields needed for fullness **at collection**. Continuous daily bin fullness would require timestamped sensor readings or inspections. |
| Contamination total | Count of `pickups.contaminated` divided by pickup count | Existing boolean supports frequency, not contaminated material mass or volume. |
| Contaminant categories | **Frontend illustration**, deterministically allocated across flagged pickups | Capture a primary contaminant category per pickup, persist it, and return it in `/dashboard/`. |
| Monthly costs | **Frontend illustration**, deterministic monthly amounts per building for 2024–2026 | Persist actual expenses and expose monthly totals by building and year. |

### Filter and calculation rules

- The sticky filter bar is the only location selector and controls the global
  building filter. The contamination stream control shares the global stream
  filter. Pickup, fullness, and contamination charts use all global filters.
- Costs use only location and their own year selector. They deliberately ignore
  the global date range, size, driver, and stream; this is stated on the card.
  Campus costs sum the per-building sample amounts. The full year is illustrative,
  including future months; these are not actuals or a forecast.
- Dates and weekdays use UTC, consistent with current date filters and backend
  timestamps. Pickup trends use daily buckets up to 45 days, seven-day buckets
  anchored to the selected start date up to 180 days, then calendar months.
- Occurred pickups are counted on collection dates. Missed services are counted
  on scheduled dates only after they are due, using the browser's clock.
  Therefore these are activity trends, not matched scheduled-service cohorts.
- Fullness gives each recorded pickup equal weight. Null values are excluded,
  zero is retained, and weekdays without readings have gaps, not fabricated zeros.
- The contamination denominator is all filtered pickups. The donut's unflagged
  portion and total flagged count use the payload. Its four material categories
  are sample data and sum exactly to the flagged count.
- Failed API requests retain the existing local demo payload. Per the requested
  presentation, mock-data badges and API-source notices are omitted from the
  interface; these limitations are documented here and communicated in chat.

### Suggested contracts to replace the illustrations

**Costs:** add expense records with an ID, building ID, accounting date or service
month, amount in integer minor units, currency, expense category, and invoice or
source reference. Define how campus-wide fees, credits, and shared services are
allocated to buildings, and distinguish missing months from confirmed zero spend.
Expose e.g. `GET /dashboard/costs?year=2026&building_id=...` with twelve monthly
totals and data-completeness indicators. Replace `demoMonthlyCosts` in
`frontend/src/lib/chartData.ts` after the endpoint exists.

**Contaminants:** add a controlled category taxonomy and a primary category field
to collection forms, storage, and the joined pickup response. Keep historical
flagged pickups without a category in an explicit `Unknown` slice. If multiple
categories are allowed per pickup, use a separate incidence chart rather than
adding overlapping counts to this pie. Material-composition percentages would
instead need measured weight or volume per category and a defined denominator.
Replace `demoContaminants` only when those measurements or classifications exist.

Calculation regression checks (Node 22.18+ with native TypeScript stripping):
`node --test frontend/src/lib/__tests__/chartData.test.mjs`.

## Earlier endpoint mapping

This guide maps the labels in the dashboard mockup (`A` through `J`) to the
current API. The deployed base URL is:

```text
https://waste-dashboard.onrender.com
```

The API currently exposes these routes:

```text
GET /get_entries/{table}
GET /count_entries/{table}
```

Supported tables and fields:

```text
fulfilled_pickups:
  dumpster_id, form_id, employee_id, fulfilled_at, percent_full,
  is_contamination, additional_notes

dumpsters:
  id, waste_type, building_group, bin_size

pickup_schedule_entries:
  dumpster_id, scheduled_at, is_fulfilled, form_id
```

## Query syntax

Every query parameter is a filter. A parameter without a suffix means
equality (`eq`). Use `__` followed by an operator for comparisons:

```text
field=value                 # eq
field__neq=value
field__gt=value
field__gte=value
field__lt=value
field__lte=value
field__like=value
field__ilike=value
```

The allowed operators are `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `like`, and
`ilike`. Multiple parameters are combined with AND. Dates must be sent as the
integer type expected by the API: Unix timestamps in the same unit used by the
database (normally milliseconds if the stored values are JavaScript epoch
timestamps). Use an inclusive start and an exclusive end, for example
`fulfilled_at__gte=startMs&fulfilled_at__lt=endMs`.

For counts, the response is:

```json
{ "count": 123 }
```

For entry requests, the response is an array of row objects.

## Label mapping

Use these logical sets throughout the dashboard:

```text
P = fulfilled_pickups filtered by fulfilled_at in [startMs, endMs)
S = pickup_schedule_entries filtered by scheduled_at in [startMs, endMs)
```

### A — Total pickups

Meaning: fulfilled services in the selected date range.

Request:

```text
GET /count_entries/fulfilled_pickups?fulfilled_at__gte=startMs&fulfilled_at__lt=endMs
```

Value:

```text
A = count(P)
```

The subtitle “of N scheduled services” uses the scheduled-service count:

```text
GET /count_entries/pickup_schedule_entries?scheduled_at__gte=startMs&scheduled_at__lt=endMs
N = count(S)
```

### B — Total missed

Meaning: scheduled services that were not fulfilled.

Request:

```text
GET /count_entries/pickup_schedule_entries?scheduled_at__gte=startMs&scheduled_at__lt=endMs&is_fulfilled=false
```

Value and subtitle percentage:

```text
B = count(S where is_fulfilled = false)
B_percent = B / count(S) * 100
```

The API accepts the boolean as `false` (also `0`).

### C — Total excess

Meaning in the mockup: pickups collected while the container was under 50%
full. Despite the UI label “excess,” this is a low-fullness count.

Request:

```text
GET /count_entries/fulfilled_pickups?fulfilled_at__gte=startMs&fulfilled_at__lt=endMs&percent_full__lt=50
```

Value and subtitle percentage:

```text
C = count(P where percent_full < 50)
C_percent = C / count(P) * 100
```

Use `percent_full__lte=50` only if the product definition includes exactly
50% as excess.

### D — Average fullness

Meaning: average `percent_full` at collection time.

Request:

```text
GET /get_entries/fulfilled_pickups?fulfilled_at__gte=startMs&fulfilled_at__lt=endMs
```

Value:

```text
D = sum(row.percent_full for row in P) / count(rows in P with a non-null percent_full)
```

Round only for display, for example `Math.round(D)`. Do not include rows with a
missing `percent_full` in either the sum or denominator.

### E — Overall contamination rate

Meaning: share of fulfilled pickups where the driver marked contamination.

Requests:

```text
GET /count_entries/fulfilled_pickups?fulfilled_at__gte=startMs&fulfilled_at__lt=endMs&is_contamination=true
GET /count_entries/fulfilled_pickups?fulfilled_at__gte=startMs&fulfilled_at__lt=endMs
```

Values:

```text
E_contaminated = count(P where is_contamination = true)
E_percent = E_contaminated / count(P) * 100
```

Guard against division by zero and display `0%` when there are no fulfilled
pickups.

### F — Pickups by location

Meaning: pickup totals and average fullness grouped by building, with stacked
counts by waste stream.

Fetch both datasets:

```text
GET /get_entries/fulfilled_pickups?fulfilled_at__gte=startMs&fulfilled_at__lt=endMs
GET /get_entries/dumpsters
```

Join each pickup to its dumpster:

```text
pickup.dumpster_id = dumpster.id
```

For each `building_group`:

```text
landfill_count  = count(joined rows where dumpster.waste_type = "Landfill")
recycling_count = count(joined rows where dumpster.waste_type = "Recycling")
compost_count   = count(joined rows where dumpster.waste_type = "Compost")
pickups         = landfill_count + recycling_count + compost_count
avg_fullness    = average(percent_full for joined rows in the building)
```

The API does not currently provide server-side joins, grouping, or aggregate
functions, so these operations belong in the frontend (or in a future
aggregate endpoint). Sort the resulting rows locally for the sort control.

### G — Overflow by bin

This value cannot currently be derived from the API.

The dashboard needs an overflow event/count, but `fulfilled_pickups` exposes no
`overflow` field and the backend allowlist does not permit one. `additional_notes`
is free text and is not a reliable API contract for counting overflow events.

Recommended API change:

```text
fulfilled_pickups:
  is_overflow: bool
```

Then the derivation would be:

```text
GET /get_entries/fulfilled_pickups?fulfilled_at__gte=startMs&fulfilled_at__lt=endMs&is_overflow=true
```

Join to `dumpsters` by `dumpster_id`, group by `dumpster.building_group` and
`dumpster.id`, and calculate:

```text
overflows_for_bin = count(rows where is_overflow = true)
```

The backend would also need `is_overflow: bool` added to its allowed fields.

### H — Landfill contamination rate

Meaning: contaminated landfill pickups divided by all landfill pickups.

Fetch the date-filtered pickups and the dumpster lookup:

```text
GET /get_entries/fulfilled_pickups?fulfilled_at__gte=startMs&fulfilled_at__lt=endMs
GET /get_entries/dumpsters
```

Join on `pickup.dumpster_id = dumpster.id`, then:

```text
landfill_pickups = count(joined rows where dumpster.waste_type = "Landfill")
landfill_contaminated = count(joined rows where
  dumpster.waste_type = "Landfill" AND pickup.is_contamination = true)
H = landfill_contaminated / landfill_pickups * 100
```

The card subtitle is `landfill_contaminated of landfill_pickups pickups
contaminated`.

### I — Recycling contamination rate

Use the same two requests and join as in H:

```text
recycling_pickups = count(joined rows where dumpster.waste_type = "Recycling")
recycling_contaminated = count(joined rows where
  dumpster.waste_type = "Recycling" AND pickup.is_contamination = true)
I = recycling_contaminated / recycling_pickups * 100
```

### J — Compost contamination rate

Use the same two requests and join as in H:

```text
compost_pickups = count(joined rows where dumpster.waste_type = "Compost")
compost_contaminated = count(joined rows where
  dumpster.waste_type = "Compost" AND pickup.is_contamination = true)
J = compost_contaminated / compost_pickups * 100
```

For H, I, and J, return `0%` when that stream has no pickups. Apply the
percentage rounding policy consistently, such as `Math.round(rate)`.

## Filters

The date range changes the date-filtered sets `P` and `S`. The current backend
does not support filtering `fulfilled_pickups` by building, stream, driver, or
container size because those values live in `dumpsters` or are not exposed as
joined fields. To make the dashboard filter bar functional, fetch the rows and
apply the corresponding joined filters client-side, or add a server-side
aggregate/join endpoint.

The current allowed fields also do not include a driver name—only
`employee_id`—so the driver filter can only be implemented as an employee-ID
filter unless an employee lookup is added.
