import os

from dotenv import load_dotenv
from supabase import Client, create_client

load_dotenv()

url : str = os.getenv("SUPABASE_URL")
key : str = os.getenv("SUPABASE_KEY")

supabase : Client = create_client(
    url, key
)

ALLOWED_FIELDS = {
    "fulfilled_pickups": {
        "dumpster_id": str,
        "form_id": str,
        "employee_id": str,
        "fulfilled_at": int,
        "percent_full": int,
        "is_contamination": bool,
        "additional_notes": str,
        "is_overflow": bool,
        "driver_name": str,
        "photo_url": str,
        "service_status": str,
        "container_size": str,
    },

    "dumpsters": {
        "id": str,
        "waste_type": str,
        "building_group": str,
        "bin_size": str
    },

    "pickup_schedule_entries": {
        "dumpster_id": str,
        "scheduled_at": int,
        "is_fulfilled": bool,
        "form_id": str,
        "driver_name": str,
        "container_size": str,
    }
}

ALLOWED_OPERATORS = {
    "eq",
    "neq",
    "gt",
    "gte",
    "lt",
    "lte",
    "like",
    "ilike",
}
