import os
import sys
import unittest

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient

from app.main import app


class BureauBotApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)

    def test_health(self) -> None:
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")

    def test_chat_routes_india_service_tools(self) -> None:
        cases = {
            "I need a passport renewal": "passport",
            "How do I apply for PAN?": "pan",
            "Update my Aadhaar address": "aadhaar",
            "Renew my driving licence": "driving_licence",
            "Apply for an income certificate": "income_certificate",
            "I need a caste certificate": "caste_certificate",
            "How can I get a domicile certificate?": "residence_certificate",
            "Find a scholarship for university": "scholarship",
            "Check PM Kisan beneficiary status": "pm_kisan",
            "How do I get an Ayushman card?": "ayushman_bharat",
            "Apply for old age pension": "pension",
            "Apply for a ration card": "ration_card",
            "Please remind me before the deadline": "reminder_scheduler",
            "What is BureauBot?": "faq",
            "Perform OCR scan to extract text": "ocr_tool",
        }
        for message, expected_tool in cases.items():
            with self.subTest(message=message):
                response = self.client.post("/chat", json={"message": message})
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json()["tool"], expected_tool)
                self.assertIn("data", response.json()["result"])

    def test_specialized_endpoints(self) -> None:
        eligibility = self.client.post("/eligibility", json={"message": "Can I qualify?", "service": "scholarship"})
        documents = self.client.post("/documents", json={"message": "Verify my application documents", "documents": [{"name": "Aadhaar address proof"}]})
        services = self.client.post("/services", json={"query": "passport service"})
        self.assertEqual(eligibility.status_code, 200)
        self.assertEqual(documents.json()["tool"], "document_verification")
        self.assertEqual(services.json()["tool"], "portal_finder")
        self.assertEqual(services.json()["result"]["sources"][0]["official"], True)


if __name__ == "__main__":
    unittest.main()
