import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from endpoints import dashboard
from fastapi.testclient import TestClient
from main import app
from utils.auth import require_admin


class FakeQuery:
    def __init__(self, rows, cap):
        self.rows, self.cap = rows, cap

    def select(self, _):
        return self

    def order(self, column):
        self.rows = sorted(self.rows, key=lambda row: row[column])
        return self

    def range(self, start, end):
        self.start, self.end = start, min(end + 1, start + self.cap)
        return self

    def execute(self):
        return SimpleNamespace(data=self.rows[self.start:self.end])


class FakeDatabase:
    def __init__(self, tables, cap=1000):
        self.tables, self.cap = tables, cap

    def table(self, name):
        return FakeQuery(self.tables[name], self.cap)


class DashboardTests(unittest.TestCase):
    def setUp(self):
        app.dependency_overrides[require_admin] = lambda: {"username": "test-admin"}
        self.addCleanup(app.dependency_overrides.pop, require_admin, None)

    def test_pagination_does_not_truncate_at_server_limit(self):
        rows = [{"id": i} for i in range(1734)]
        for cap in (1000, 300):
            with self.subTest(cap=cap), patch.object(dashboard, "supabase", FakeDatabase({"rows": rows}, cap)):
                self.assertEqual(dashboard.fetch_all_rows("rows", "id"), rows)

    def test_http_contract_joins_categories_costs_and_services(self):
        tables = {
            "dumpsters": [{"id": "LIB_RECYCLE", "building_group": "Library", "waste_type": "RECYCLE", "bin_size": "4 yd"}],
            "fulfilled_pickups": [
                {"form_id": "a", "dumpster_id": "LIB_RECYCLE", "fulfilled_at": 1791028800000, "percent_full": 0, "is_contamination": True, "contamination_category_id": "film", "is_overflow": True},
                {"form_id": "b", "fulfilled_at": 1791028800, "percent_full": None, "is_contamination": True},
            ],
            "pickup_schedule_entries": [
                {"id": 1, "form_id": "a", "dumpster_id": "LIB_RECYCLE", "scheduled_at": 1791028800},
                {"id": 2, "form_id": None, "scheduled_at": 1791028800},
                {"id": 3, "form_id": None, "scheduled_at": 1791028800},
            ],
            "contamination_categories": [{"id": "film", "label": "Plastic film"}],
            "collection_costs": [{"id": "cost", "building_group": "Library", "cost_month": "2026-10-01", "amount_cents": 12345, "currency": "USD"}],
        }
        with patch.object(dashboard, "supabase", FakeDatabase(tables, cap=1)):
            response = TestClient(app).get("/dashboard/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        pickup, legacy = data["pickups"]
        self.assertEqual(pickup["stream"], "Recycling")
        self.assertEqual(pickup["fullness"], 0)
        self.assertTrue(pickup["overflow"])
        self.assertEqual(pickup["contaminationCategory"], "Plastic film")
        self.assertIsNone(legacy["contaminationCategory"])
        self.assertIsNone(legacy["fullness"])
        self.assertEqual(pickup["collectedAt"], legacy["collectedAt"])
        self.assertEqual(data["schedule"][0]["pickupId"], "a")
        self.assertTrue(data["schedule"][0]["fulfilled"])
        self.assertFalse(data["schedule"][1]["fulfilled"])
        self.assertEqual(len({row["id"] for row in data["schedule"]}), 3)
        self.assertEqual(data["costs"][0]["amountCents"], 12345)

    def test_database_failure_returns_error_instead_of_partial_data(self):
        with patch.object(dashboard, "fetch_all_rows", side_effect=RuntimeError("unavailable")):
            with self.assertLogs(dashboard.logger, level="ERROR"):
                response = TestClient(app).get("/dashboard/")
        self.assertEqual(response.status_code, 502)


if __name__ == "__main__":
    unittest.main()
