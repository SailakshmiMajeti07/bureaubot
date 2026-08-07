import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.database import Base, SessionLocal, engine
from app.models import (
    Application,
    ChatHistory,
    Document,
    EligibilityRule,
    Reminder,
    Service,
    User,
)
from app.seed_data import seed_services
from app.crud import get_service_by_code, list_services, search_services, get_eligibility_rules_by_service
from app.main import app


class BackendTestSuite(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        with SessionLocal() as db:
            seed_services(db)

    def setUp(self):
        self.client = TestClient(app)

    def test_database_models_exist(self):
        with SessionLocal() as db:
            # 1. Users count check
            users = list(db.scalars(select(User)))
            self.assertIsInstance(users, list)

            # 2. Services count check
            services = list_services(db)
            self.assertEqual(len(services), 12)

            # 3. Verify specific services exist
            expected_codes = [
                "passport", "pan", "aadhaar", "driving_licence",
                "income_certificate", "residence_certificate", "caste_certificate",
                "pm_kisan", "ayushman_bharat", "scholarship", "pension", "ration_card"
            ]
            found_codes = [s.code for s in services]
            for code in expected_codes:
                self.assertIn(code, found_codes)

            # 4. Check Service fields: Name, Category, Description, Eligibility Rules, Required Documents, Official Portal URL, Processing Time, Fees, State, Status
            passport = get_service_by_code(db, "passport")
            self.assertIsNotNone(passport)
            self.assertEqual(passport.name, "Passport Seva")
            self.assertEqual(passport.category, "Identity & Citizenship")
            self.assertIsNotNone(passport.description)
            self.assertIsInstance(passport.eligibility_rules, list)
            self.assertIsInstance(passport.required_documents, list)
            self.assertIsNotNone(passport.official_portal_url)
            self.assertIsNotNone(passport.processing_time)
            self.assertIsNotNone(passport.fees)
            self.assertEqual(passport.state, "All India")
            self.assertEqual(passport.status, "active")

            # 5. Check EligibilityRules table model
            rules = get_eligibility_rules_by_service(db, passport.id)
            self.assertGreater(len(rules), 0)
            self.assertIsInstance(rules[0], EligibilityRule)

    def test_api_chat_routing(self):
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
        }
        for message, expected_tool in cases.items():
            with self.subTest(message=message):
                response = self.client.post("/chat", json={"message": message})
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json()["tool"], expected_tool)
                self.assertIn("data", response.json()["result"])

    def test_specialized_endpoints(self):
        eligibility = self.client.post("/eligibility", json={"message": "Can I qualify?", "service": "scholarship"})
        documents = self.client.post("/documents", json={"message": "Verify my application documents", "documents": [{"name": "Aadhaar address proof"}]})
        services = self.client.post("/services", json={"query": "passport service"})
        self.assertEqual(eligibility.status_code, 200)
        self.assertEqual(documents.json()["tool"], "document_verification")
        self.assertEqual(services.json()["tool"], "portal_finder")
        self.assertEqual(services.json()["result"]["sources"][0]["official"], True)


if __name__ == "__main__":
    unittest.main()
