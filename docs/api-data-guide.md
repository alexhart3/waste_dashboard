# Dashboard data guide

All six charts, summary cards, and the records table read Supabase through
FastAPI's `GET /dashboard/`. The browser no longer generates costs or assigns
contaminant categories, and does not fall back to local mock records on failure.

## Shared administrator sign-in

The dashboard has one shared administrator account. Driver collection forms
will live in Smartsheet; no Smartsheet connection or driver accounts are included
in this change.

- Local username: `admin`; local password: `admin123`.
- Opening either dashboard route while signed out shows a full sign-in screen.
  Filters, charts, records, and their data requests only mount after sign-in or
  successful validation of a saved session.
- The browser remembers a signed session token in local storage for 30 days.
  It does not store the password. Reloading or reopening the browser validates
  the saved session with FastAPI before loading data.
- **Sign out** is in the header. It clears the saved token and unmounts the
  dashboard data immediately; other tabs on the same origin also return to
  sign-in. Expired/rejected sessions return to sign-in automatically.
- If browser storage is blocked, sign-in works for the current visit and a
  short message explains that it could not be remembered.
- When the backend cannot be reached (including an eight-second timeout or
  server error), `admin` / `admin123` can open the dashboard in offline mode.
  It shows **Server offline**, empty charts, and unavailable summary values.
  No mock records or database data are cached in the browser. CSV export is
  disabled because there are no records to export.
- Offline access is a frontend convenience, not API authorization. Its local
  marker lasts 30 days and is never sent as a Bearer token. Reloading or choosing
  **Try again** attempts a real backend login; a successful login loads database
  records. A server rejection never falls back to offline mode. If a saved online
  session cannot be checked, the user can sign in with the offline credentials.
  The offline credentials are public frontend code; backend data remains protected
  by the existing signed-token checks.
- Sessions are stateless: sign-out clears this browser's token, rather than
  revoking copies of a token on the server. Changing the admin credentials or
  signing secret invalidates all previously issued sessions.

Backend configuration lives in `backend/.env` (already configured locally):

```dotenv
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
AUTH_SECRET=<random secret of at least 32 characters>
```

Generate a signing secret for another environment with
`python -c "import secrets; print(secrets.token_urlsafe(48))"`.
Keep it stable across backend restarts and instances. Configure these three
variables on the backend host before deploying; they are not frontend
`NEXT_PUBLIC_` variables. Restart the backend after changing its environment.
Missing configuration refuses sign-in instead of allowing unauthenticated data.

Authentication endpoints:

| Endpoint | Purpose |
| --- | --- |
| `POST /auth/login` | JSON `{ "username": "...", "password": "..." }`; returns `token`, `username`, and `expiresAt` (epoch milliseconds) |
| `GET /auth/session` | Validates `Authorization: Bearer <token>` and returns the username and expiration |

Every `/dashboard`, `/get_entries`, and `/count_entries` endpoint requires that
Bearer token. Missing, invalid, and expired sessions receive HTTP 401 before
querying Supabase. Responses use `Cache-Control: no-store`. API docs support
the Bearer scheme through their **Authorize** control.

## Exporting pickup reports

Signed-in administrators can select **Export CSV** in the sticky filter bar on
either the dashboard or records page. It exports all matching pickup records,
newest first, using the selected dates, location, waste stream, driver, and
container size. The button is disabled when no pickups match.

The export checks the administrator session with FastAPI before creating the
download. Signing out during that check cancels it. Invalid/expired sessions
return to sign-in; connection failures show a retry message without exporting.

CSV columns: pickup ID, collection timestamp (explicitly UTC), driver, location,
bin ID, waste stream, container size, fullness percentage, contamination flag,
primary contaminant, overflow flag, service status, and photo URL. Missing
fullness stays blank and zero stays 0. Photo links are included rather than
embedding image files. Costs and unfulfilled schedule rows are not included
in this pickup report.

Files include the location and date range in their name. CSV quoting preserves
commas, quotes, and line breaks; UTF-8 with a BOM preserves Unicode in Excel.
Text that could be interpreted as a spreadsheet formula is prefixed with an
apostrophe. Downloads are created from the already-authorized filtered data;
no new database table or export storage is needed.

Regression checks: `node --test frontend/src/lib/__tests__/exportCsv.test.mjs`.
Browser verification confirmed a Library export contains exactly the 14
displayed pickups, with 13 columns and matching date/location filters.

## Chart sources

| Chart | Database source | Calculation |
| --- | --- | --- |
| Pickups by location | `fulfilled_pickups` joined to `dumpsters` | Counts by building and waste stream; average recorded fullness |
| Monthly collection costs | `collection_costs` | Sum `amount_cents` by month, selected year, and optional building; convert cents to USD for display |
| Pickup trend | `fulfilled_pickups` and `pickup_schedule_entries` | Completed collections by collection date; unfulfilled, unlinked services by scheduled date after they are due |
| Fullness by weekday | `fulfilled_pickups.percent_full` | Average non-null readings at collection, Monday–Sunday |
| Overflow by bin | `fulfilled_pickups.is_overflow` joined to `dumpsters` | Flagged collections per bin |
| Contamination breakdown | `fulfilled_pickups.is_contamination`, `contamination_category_id`, and `contamination_categories` | One stored primary category per flagged pickup, plus unflagged pickups; missing historical categories appear as Unknown |

The KPI cards and records table use the same filtered pickup/schedule arrays.
The under-50%-full percentage excludes missing fullness readings from its denominator.
Contamination percentages describe **pickups flagged**, not material weight or volume.

## Database changes and sample data

Applied to Supabase project `ucyqnemmakfyblfiyunq` on November 3, 2026:

- Added `collection_costs` with building, month, integer USD cents, description,
  and an `is_demo` marker. The schema allows multiple expenses per building/month.
- Added the `contamination_categories` lookup and nullable
  `fulfilled_pickups.contamination_category_id` foreign key.
- Added `service_status` when absent; added stable identity IDs and driver names
  to schedule rows. A schedule ID remains unique even without a linked pickup.
- Added read access and RLS policies to the two new reporting tables.
- Inserted **1,049 sample pickups**, **1,224 sample schedule entries**, and
  **1,734 sample monthly costs** using the existing 153 bins at 51 locations.
- Preserved all 60 previous pickups and 144 previous schedule entries.
  Totals after seeding: **1,109 pickups, 1,368 schedule entries, 1,734 costs**.

The new pickup/schedule samples cover September 7–November 1, 2026. Costs cover
all months of 2024 and 2025, and January–October 2026. They are school-project
examples, not actual invoices. Some historical contaminated pickups have no
category; these are kept as Unknown rather than assigned a made-up category.

Reproducible SQL is in:

1. [`backend/dashboard_schema.sql`](../backend/dashboard_schema.sql) — schema;
   applied remotely as migration `dashboard_chart_sources`.
2. [`backend/seed_chart_data.sql`](../backend/seed_chart_data.sql) — additive seed;
   run after the schema. Requires the existing campus `dumpsters` records.

Both scripts can be rerun. The seed uses `DEMO-CHART-`/`DEMO-COST-` IDs and skips
records already present, without deleting or overwriting existing records.
The older `seed_dashboard.sql` is a separate legacy seed and is not part of this setup.

## API contract

`backend/endpoints/dashboard.py` returns:

```ts
{
  pickups: Array<{
    id: string;
    photoUrl: string | null;
    collectedAt: string; // ISO UTC; database seconds/milliseconds are normalized
    driver: string;
    building: string;
    binId: string;
    stream: string; // Landfill, Recycling, Compost; Other if unrecognized
    containerSize: string;
    fullness: number | null;
    contaminated: boolean;
    contaminationCategory: string | null; // lookup label
    overflow: boolean;
    status: string;
  }>;
  schedule: Array<{
    id: string;
    scheduledAt: string;
    pickupId: string | null;
    fulfilled: boolean;
    driver: string;
    building: string;
    binId: string;
    stream: string;
    containerSize: string;
  }>;
  costs: Array<{
    id: string;
    building: string;
    month: string; // YYYY-MM-01
    amountCents: number;
    currency: "USD";
  }>;
}
```

FastAPI reads every page of all five tables in unique-key order, including when
Supabase's response cap is smaller than the requested page size. An upstream
failure returns HTTP 502 instead of a partial dataset. The frontend requires
all three arrays, shows a loading state, and offers retry on failure.
The backend uses a pooled HTTP/1.1 client after browser testing exposed persistent
HTTP/2 read errors in the local Python runtime.

Generic read/count endpoints also allow the new tables/fields:
`GET /get_entries/{table}` and `GET /count_entries/{table}`.
Their filters use `field=value` or `field__operator=value`, with operators
`eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `like`, and `ilike`. Chart clients should
use `/dashboard/` for complete pagination and joins.

## Filter and calculation rules

- All pickup and schedule charts use the global dates, location, stream,
  driver, and container-size filters. The contamination stream selector shares
  the global stream selection.
- Costs use only the global location and their own year selector. They ignore
  pickup dates, size, stream, and driver because expenses are recorded by
  building and month. Years come from stored cost records.
- Missing cost months stay blank; an explicitly stored zero displays $0.
  The subtitle is a recorded total, which may cover less than a full year.
- Date filters are inclusive calendar dates in UTC. Weekday grouping also uses
  UTC. Trends are daily through 45 days, weekly through 180 days, then monthly.
- Missed means due, unfulfilled, and not linked to a collection. Future services
  do not count as missed. This uses the browser's current clock and updates
  each minute. There is currently no cancellation or grace-period model.
- Fullness averages each recorded collection equally. Missing readings are
  excluded; zero is retained; weekdays without readings remain blank.
- Contamination slices use all filtered pickups as their denominator. Each
  flagged pickup has at most one primary contaminant, so slices add to 100%.

## Local setup and verification

Keep `SUPABASE_URL` and `SUPABASE_KEY` in `backend/.env`. The backend loads this
file relative to its own directory. The browser uses only
`NEXT_PUBLIC_API_BASE_URL=http://localhost:8000` in `frontend/.env.local`.

```sh
cd backend
.venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

In another terminal:

```sh
cd frontend
npm run dev
```

Checks from the repository root (Node 22.18+ for native TypeScript test imports):

```sh
backend/.venv/bin/python -m unittest discover -s backend/tests -v
node --test frontend/src/lib/__tests__/chartData.test.mjs
cd frontend
npx tsc --noEmit
npm run lint
npm run build -- --webpack
```

For deployment, publish the updated FastAPI backend before the frontend. The
new frontend requires the `costs` response field. Supabase schema and sample
data are already applied; application code must still be deployed separately.

Verified against the live database and local FastAPI/browser: 1,109 pickups,
235 missed services, 99 overflows, 213 contaminated pickups, and $589,438.56
in recorded 2026 costs. Library's 2025 cost filter returns $14,013.03.
All seven weekday fullness averages match SQL aggregation. Rerunning the seed
left row counts unchanged. Backend tests, chart tests, TypeScript, and the
production build pass; lint has one existing unused-variable warning in PhotoThumb.

## Replacing samples later

The dashboard read infrastructure is complete for these six charts. Real data
entry still needs a form/import process for monthly expenses and primary
contaminant selection. Buildings in cost records must match
`dumpsters.building_group` exactly. Continuous fullness would require separate
sensor readings, and measured contamination composition would require weight
or volume measurements. Neither is needed for the current charts.
