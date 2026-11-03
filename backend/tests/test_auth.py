import os
import sys
import time
import unittest
from pathlib import Path
from unittest.mock import patch

import jwt
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from main import app
from utils import auth


class AuthTests(unittest.TestCase):
    def setUp(self):
        env = patch.dict(os.environ, {
            "ADMIN_USERNAME": "test-admin", "ADMIN_PASSWORD": "test-password",
            "AUTH_SECRET": "test-only-signing-secret-at-least-32-characters",
        })
        env.start()
        self.addCleanup(env.stop)
        self.client = TestClient(app)

    def login(self):
        return self.client.post("/auth/login", json={"username": "test-admin", "password": "test-password"})

    def test_every_data_endpoint_requires_auth_before_querying(self):
        with patch("endpoints.dashboard.fetch_all_rows") as query, patch("utils.registry.supabase.table") as table:
            for path in ("/dashboard", "/dashboard/", "/get_entries/fulfilled_pickups",
                         "/get_entries/collection_costs", "/count_entries/dumpsters", "/auth/session"):
                with self.subTest(path=path):
                    response = self.client.get(path)
                    self.assertEqual(response.status_code, 401)
                    self.assertEqual(response.headers["cache-control"], "no-store")
            query.assert_not_called()
            table.assert_not_called()

    def test_bad_credentials_do_not_issue_session(self):
        for username, password in (("test-admin", "wrong"), ("wrong", "test-password"), ("管理员", "密码")):
            response = self.client.post("/auth/login", json={"username": username, "password": password})
            self.assertEqual(response.status_code, 401)
            self.assertNotIn("token", response.json())

    def test_valid_session_survives_new_client_and_opens_dashboard(self):
        response = self.login()
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertAlmostEqual(data["expiresAt"] / 1000 - time.time(), 30 * 86400, delta=5)
        headers = {"Authorization": f"Bearer {data['token']}"}
        other_client = TestClient(app)
        self.assertEqual(other_client.get("/auth/session", headers=headers).json()["username"], "test-admin")
        with patch("endpoints.dashboard.get_dashboard_data", return_value={"pickups": [], "schedule": [], "costs": []}):
            self.assertEqual(other_client.get("/dashboard/", headers=headers).status_code, 200)

    def test_expired_forged_and_malformed_tokens_are_rejected(self):
        _, _, key = auth.settings()
        now = int(time.time())
        claims = {"sub": "test-admin", "iat": now - 100, "exp": now - 1, "aud": "waste-dashboard"}
        expired = jwt.encode(claims, key, algorithm="HS256")
        forged = jwt.encode({**claims, "exp": now + 100}, b"a-different-signing-key-for-testing", algorithm="HS256")
        for token in (expired, forged, "not-a-session"):
            response = self.client.get("/auth/session", headers={"Authorization": f"Bearer {token}"})
            self.assertEqual(response.status_code, 401)

    def test_changing_password_invalidates_previous_session(self):
        token = self.login().json()["token"]
        with patch.dict(os.environ, {"ADMIN_PASSWORD": "changed-password"}):
            response = self.client.get("/auth/session", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(response.status_code, 401)

    def test_missing_configuration_fails_closed(self):
        with patch.dict(os.environ, {"AUTH_SECRET": ""}):
            self.assertEqual(self.login().status_code, 503)

    def test_browser_authorization_preflight_is_allowed(self):
        response = self.client.options("/dashboard/", headers={
            "Origin": "http://localhost:3000", "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization",
        })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["access-control-allow-origin"], "http://localhost:3000")


if __name__ == "__main__":
    unittest.main()
