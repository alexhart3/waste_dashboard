"""One shared administrator account, with signed, expiring browser sessions."""
import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

import jwt
from dotenv import load_dotenv
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

load_dotenv(Path(__file__).resolve().parents[1] / ".env")
bearer = HTTPBearer(auto_error=False)
SESSION_DAYS = 30


def settings():
    username = os.getenv("ADMIN_USERNAME", "")
    password = os.getenv("ADMIN_PASSWORD", "")
    secret = os.getenv("AUTH_SECRET", "")
    if not username or not password or len(secret) < 32:
        raise HTTPException(503, "Dashboard sign-in is not configured on the server.")
    # Changing the shared credentials also invalidates previously saved sessions.
    signing_key = hmac.new(secret.encode(), f"{username}\0{password}".encode(), hashlib.sha256).digest()
    return username, password, signing_key


def unauthorized():
    return HTTPException(401, "Please sign in to view the dashboard.", headers={"WWW-Authenticate": "Bearer"})


def create_session(username: str, password: str):
    expected_user, expected_password, key = settings()
    user_matches = hmac.compare_digest(username.encode(), expected_user.encode())
    password_matches = hmac.compare_digest(password.encode(), expected_password.encode())
    if not (user_matches and password_matches):
        raise HTTPException(401, "Incorrect username or password.")
    now = datetime.now(timezone.utc)
    expires = now + timedelta(days=SESSION_DAYS)
    token = jwt.encode({"sub": expected_user, "iat": now, "exp": expires, "aud": "waste-dashboard"}, key, algorithm="HS256")
    return {"token": token, "username": expected_user, "expiresAt": int(expires.timestamp() * 1000)}


def require_admin(credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer)):
    if credentials is None:
        raise unauthorized()
    username, _, key = settings()
    try:
        claims = jwt.decode(credentials.credentials, key, algorithms=["HS256"], audience="waste-dashboard",
                            options={"require": ["sub", "iat", "exp", "aud"]})
        if claims["sub"] != username:
            raise unauthorized()
        return {"username": username, "expiresAt": int(claims["exp"] * 1000)}
    except jwt.InvalidTokenError:
        raise unauthorized()
