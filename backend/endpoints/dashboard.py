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

    if normalized in {"recycle", "recycling"} or "recycl" in normalized or "commingled" in normalized:
        return "Recycling"
    if normalized in {"compost", "compostable", "organics", "organic"} or any(
        term in normalized for term in ("food waste", "green waste")
    ):
        return "Compost"
    if normalized in {"waste", "general waste", "landfill"} or any(
        term in normalized for term in ("trash", "garbage", "refuse", "rubbish", "residual")
    ):
        return "Landfill"

    if isinstance(dumpster_id, str):
        id_codes = {"L": "Landfill", "LF": "Landfill", "R": "Recycling", "REC": "Recycling", "C": "Compost", "CP": "Compost"}
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


def schedule_public_id(form_id, index):
    value = str(form_id) if form_id is not None else ""
    prefix, separator, suffix = value.rpartition("-")
    if separator and suffix.isdigit():
        number = int(suffix)
        if prefix == "DEMO-FORM":
            return f"SC-{number + 4000}"
        if prefix == "DEMO-MISSED":
            return f"SC-{number + 5000}"
    return value or f"SC-{5001 + index}"


def get_dashboard_data():
    try:
        pickups_result = supabase.table("fulfilled_pickups").select("*").order("form_id").execute()
        dumpsters_result = supabase.table("dumpsters").select("*").order("id").execute()
        schedule_result = supabase.table("pickup_schedule_entries").select("*").order("form_id").execute()
    except APIError as ex:
        raise HTTPException(status_code=502, detail=f"Database query failed: {ex}")
    except Exception as ex:
        logger.exception("Dashboard query could not connect to Supabase")
        raise HTTPException(status_code=502, detail=f"Database connection failed: {ex}")

    dumpsters = {row.get("id"): row for row in dumpsters_result.data if row.get("id")}
    pickup_rows = [row for row in pickups_result.data if row.get("form_id")]
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
            "containerSize": clean_text(row.get("container_size"), clean_text(dumpster.get("bin_size"), "Unknown size")),
            "fullness": int(fullness) if fullness is not None else None,
            "contaminated": bool(row.get("is_contamination")),
            "overflow": bool(row.get("is_overflow")),
            "status": row.get("service_status") if row.get("service_status") in {"Completed", "Delayed", "Incomplete", "Missed"} else "Completed",
        })

    schedule = []
    for index, row in enumerate(schedule_result.data):
        scheduled_at = timestamp_to_iso(row.get("scheduled_at"))
        if scheduled_at is None:
            raise HTTPException(status_code=422, detail=f"Schedule row {index + 1} has no scheduled_at timestamp")
        form_id = str(row["form_id"]) if row.get("form_id") is not None else None
        matched_pickup = pickup_by_form_id.get(form_id) if form_id else None
        dumpster = dumpster_for(row)
        is_fulfilled = row.get("is_fulfilled")
        schedule.append({
            "id": schedule_public_id(form_id, index),
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
            "containerSize": clean_text(row.get("container_size"), clean_text(dumpster.get("bin_size"), "Unknown size")),
        })

    return {"pickups": pickups, "schedule": schedule}


@router.get("")
@router.get("/")
def dashboard():
    return get_dashboard_data()
