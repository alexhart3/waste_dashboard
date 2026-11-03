import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from postgrest import APIError

from utils.registry import supabase

router = APIRouter(prefix="/dashboard", tags=["dashboard"])
logger = logging.getLogger(__name__)


def timestamp_to_iso(value):
    if value is None:
        return None
    try:
        timestamp = float(value)
        if abs(timestamp) >= 100_000_000_000:
            timestamp /= 1000
        return datetime.fromtimestamp(timestamp, tz=timezone.utc).isoformat().replace("+00:00", "Z")
    except (TypeError, ValueError, OverflowError, OSError):
        raise HTTPException(status_code=422, detail=f"Invalid database timestamp: {value}")


def clean_text(value, fallback):
    return value.strip() if isinstance(value, str) and value.strip() else fallback


def normalize_stream(value, dumpster_id=None):
    normalized = " ".join(value.strip().lower().replace("_", " ").replace("-", " ").split()) \
        if isinstance(value, str) else ""

    if any(term in normalized for term in ("recycl", "commingl", "single stream", "blue bin")):
        return "Recycling"
    if any(term in normalized for term in ("compost", "organic", "food waste", "green waste", "yard waste")):
        return "Compost"
    if any(term in normalized for term in (
        "landfill", "general waste", "solid waste", "municipal waste", "trash", "garbage",
        "refuse", "rubbish", "residual", "non recyclable", "non-recyclable",
    )) or normalized == "waste":
        return "Landfill"

    if isinstance(dumpster_id, str):
        id_codes = {
            "L": "Landfill", "LF": "Landfill", "LANDFILL": "Landfill", "WASTE": "Landfill",
            "R": "Recycling", "REC": "Recycling", "RECYCLE": "Recycling", "RECYCLING": "Recycling",
            "C": "Compost", "CP": "Compost", "COMPOST": "Compost",
        }
        for segment in dumpster_id.upper().replace("_", "-").split("-"):
            if segment in id_codes:
                return id_codes[segment]
    return "Other"


def pickup_public_id(form_id):
    value = str(form_id)
    prefix, separator, suffix = value.rpartition("-")
    if separator and prefix == "DEMO-FORM" and suffix.isdigit():
        return f"PU-{suffix}"
    return value


def fetch_all_rows(table, order_column):
    """Read every page, including when the server caps pages below our limit."""
    rows = []
    while True:
        page = supabase.table(table).select("*").order(order_column).range(len(rows), len(rows) + 999).execute().data
        if not page:
            return rows
        rows.extend(page)


def get_dashboard_data():
    try:
        pickup_data = fetch_all_rows("fulfilled_pickups", "form_id")
        dumpster_data = fetch_all_rows("dumpsters", "id")
        schedule_data = fetch_all_rows("pickup_schedule_entries", "id")
        category_data = fetch_all_rows("contamination_categories", "id")
        cost_data = fetch_all_rows("collection_costs", "id")
    except APIError:
        logger.exception("Dashboard database query failed")
        raise HTTPException(status_code=502, detail="Dashboard database query failed")
    except Exception:
        logger.exception("Dashboard query could not connect to Supabase")
        raise HTTPException(status_code=502, detail="Dashboard database connection failed")

    dumpsters = {row.get("id"): row for row in dumpster_data if row.get("id")}
    categories = {row["id"]: row["label"] for row in category_data}
    pickup_rows = [row for row in pickup_data if row.get("form_id")]
    pickup_by_form_id = {str(row["form_id"]): row for row in pickup_rows}

    def dumpster_for(row):
        return dumpsters.get(row.get("dumpster_id"), {})

    pickups = []
    for row in pickup_rows:
        dumpster = dumpster_for(row)
        collected_at = timestamp_to_iso(row.get("fulfilled_at"))
        if collected_at is None:
            raise HTTPException(status_code=422, detail=f"Pickup {row['form_id']} has no fulfilled_at timestamp")
        fullness = row.get("percent_full")
        pickups.append({
            "id": pickup_public_id(row["form_id"]),
            "photoUrl": row.get("photo_url"),
            "collectedAt": collected_at,
            "driver": clean_text(row.get("driver_name"), clean_text(row.get("employee_id"), "Unknown driver")),
            "building": clean_text(dumpster.get("building_group"), "Unknown building"),
            "binId": clean_text(row.get("dumpster_id"), "Unknown bin"),
            "stream": normalize_stream(dumpster.get("waste_type"), row.get("dumpster_id")),
            "containerSize": clean_text(dumpster.get("bin_size"), "Unknown size"),
            "fullness": int(fullness) if fullness is not None else None,
            "contaminated": bool(row.get("is_contamination")),
            "contaminationCategory": categories.get(row.get("contamination_category_id")) if row.get("is_contamination") else None,
            "overflow": bool(row.get("is_overflow")),
            "status": row.get("service_status") if row.get("service_status") in {"Completed", "Delayed", "Incomplete", "Missed"} else "Completed",
        })

    schedule = []
    for index, row in enumerate(schedule_data):
        scheduled_at = timestamp_to_iso(row.get("scheduled_at"))
        if scheduled_at is None:
            raise HTTPException(status_code=422, detail=f"Schedule row {index + 1} has no scheduled_at timestamp")
        form_id = str(row["form_id"]) if row.get("form_id") is not None else None
        matched_pickup = pickup_by_form_id.get(form_id) if form_id else None
        dumpster = dumpster_for(row)
        is_fulfilled = row.get("is_fulfilled")
        schedule.append({
            "id": f"SC-{row['id']}",
            "scheduledAt": scheduled_at,
            "pickupId": pickup_public_id(form_id) if matched_pickup else None,
            "fulfilled": bool(is_fulfilled) if is_fulfilled is not None else matched_pickup is not None,
            "driver": clean_text(
                row.get("driver_name"),
                clean_text((matched_pickup or {}).get("driver_name"), clean_text((matched_pickup or {}).get("employee_id"), "Unknown driver")),
            ),
            "building": clean_text(dumpster.get("building_group"), "Unknown building"),
            "binId": clean_text(row.get("dumpster_id"), "Unknown bin"),
            "stream": normalize_stream(dumpster.get("waste_type"), row.get("dumpster_id")),
            "containerSize": clean_text(dumpster.get("bin_size"), "Unknown size"),
        })

    costs = [{
        "id": row["id"],
        "building": row["building_group"],
        "month": row["cost_month"],
        "amountCents": row["amount_cents"],
        "currency": row["currency"],
    } for row in cost_data]
    return {"pickups": pickups, "schedule": schedule, "costs": costs}


@router.get("")
@router.get("/")
def dashboard():
    return get_dashboard_data()
