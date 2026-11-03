from fastapi import APIRouter, Depends, Response
from pydantic import BaseModel, Field

from utils.auth import create_session, require_admin

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=256)
    password: str = Field(min_length=1, max_length=256)


@router.post("/login")
def login(body: LoginRequest, response: Response):
    response.headers["Cache-Control"] = "no-store"
    return create_session(body.username, body.password)


@router.get("/session")
def session(response: Response, admin=Depends(require_admin)):
    response.headers["Cache-Control"] = "no-store"
    return admin
