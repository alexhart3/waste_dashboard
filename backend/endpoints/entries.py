from fastapi import APIRouter, HTTPException
from postgrest import APIError
from starlette.requests import Request

from utils.registry import supabase
from utils.utils import build_where_clause

router = APIRouter(
    prefix = "/get_entries",
    tags = ["get_entries"]
)

@router.get("/")
async def nothing():
    return {"error" : "Please provide a table!"}

@router.get("/{table}")
async def get_entries(table: str, request: Request):
    filters = build_where_clause(table, request)

    query = supabase.table(table).select("*")

    for filter_data in filters:
        query = query.filter(
            filter_data["field"],
            filter_data["operator"],
            filter_data["value"],
        )

    try:
        response = query.execute()
        return response.data

    except APIError as ex:
        raise HTTPException(
            status_code=400,
            detail=str(ex),
        )
