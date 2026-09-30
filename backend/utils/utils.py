from fastapi import HTTPException, Request

from .registry import ALLOWED_FIELDS, ALLOWED_OPERATORS


def convert_value(field_type, value: str):
    if field_type is int:
        try:
            return int(value)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid integer value: {value}",
            )

    if field_type is bool:
        value_lower = value.lower()

        if value_lower in {"true", "1"}:
            return True

        if value_lower in {"false", "0"}:
            return False

        raise HTTPException(
            status_code=400,
            detail=f"Invalid boolean value: {value}",
        )

    return value


def build_where_clause(table: str, request: Request):
    if table not in ALLOWED_FIELDS:
        raise HTTPException(
            status_code=400,
            detail="This table does not exist!",
        )

    filters = []

    for parameter_name, raw_value in request.query_params.multi_items():
        parts = parameter_name.split("__", maxsplit=1)

        field_name = parts[0]
        operator_name = parts[1] if len(parts) == 2 else "eq"

        if field_name not in ALLOWED_FIELDS[table]:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown field: {field_name}",
            )

        if operator_name not in ALLOWED_OPERATORS:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown operator: {operator_name}",
            )

        field_type = ALLOWED_FIELDS[table][field_name]
        value = convert_value(field_type, raw_value)

        filters.append(
            {
                "field": field_name,
                "operator": operator_name,
                "value": value,
            }
        )

    return filters
