import os
from pathlib import Path

import httpx
from dotenv import load_dotenv
from supabase import Client, create_client
from supabase.lib.client_options import SyncClientOptions

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

url : str = os.getenv("SUPABASE_URL")
key : str = os.getenv("SUPABASE_KEY")

supabase : Client = create_client(
    url, key,
    # HTTP/2 connections produced persistent read errors on the local Python
    # runtime. Use a pooled HTTP/1.1 client for FastAPI's synchronous requests.
    options=SyncClientOptions(httpx_client=httpx.Client(http2=False, timeout=30.0)),
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
        "contamination_category_id": str,
    },

    "dumpsters": {
        "id": str,
        "waste_type": str,
        "building_group": str,
        "bin_size": str
    },

    "contamination_categories": {"id": str, "label": str},
    "collection_costs": {
        "id": str, "building_group": str, "cost_month": str,
        "amount_cents": int, "currency": str, "description": str, "is_demo": bool,
    },
    "pickup_schedule_entries": {
        "id": int,
        "driver_name": str,
        "dumpster_id": str,
        "scheduled_at": int,
        "is_fulfilled": bool,
        "form_id": str,
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
