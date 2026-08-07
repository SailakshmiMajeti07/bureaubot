import json
import os
import sys
import unittest

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient

from app.main import app

EVAL_DATASET_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "dataset", "eval-cases.json")
)


class BureauBot50EvalTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.client = TestClient(app)
        with open(EVAL_DATASET_PATH, "r", encoding="utf-8") as f:
            cls.eval_cases = json.load(f)

    def test_total_50_cases_count(self) -> None:
        self.assertEqual(len(self.eval_cases), 50, "Evaluation dataset must contain exactly 50 test cases.")

    def test_run_all_50_eval_cases(self) -> None:
        passed = 0
        for case in self.eval_cases:
            case_id = case["id"]
            request_text = case["request"]
            expected = case["expected"]
            category = case["category"]

            with self.subTest(case_id=case_id, category=category):
                response = self.client.post("/chat", json={"message": request_text})
                self.assertEqual(response.status_code, 200, f"Case {case_id} failed with status {response.status_code}")
                data = response.json()

                # Verify structured JSON keys
                for field in ("intent", "tool", "response", "next_steps", "confidence", "escalation_required", "result"):
                    self.assertIn(field, data, f"Missing {field} in response for case {case_id}")

                # Verify result structure & citations
                result = data["result"]
                self.assertIn("sources", result)
                self.assertIsInstance(result["sources"], list)
                if result["sources"]:
                    self.assertTrue(result["sources"][0]["official"])

                # Verify confidence score bounds
                self.assertGreaterEqual(data["confidence"], 0.0)
                self.assertLessEqual(data["confidence"], 1.0)

                # Escalation checks for high-impact/emergency/low-confidence requests
                if category in ("emergency", "high_impact") or expected == "escalation":
                    self.assertTrue(data["escalation_required"], f"Case {case_id} should require escalation.")
                    self.assertLessEqual(data["confidence"], 0.70)

                passed += 1

        print(f"\nCompleted evaluation of {passed}/50 test cases successfully.")


if __name__ == "__main__":
    unittest.main()
