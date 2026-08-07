import os
import sys
import unittest
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.database import Base, SessionLocal, engine
from app.main import app
from app.models import Service, User
from app.seed_data import seed_services


class AuthAndRbacTestSuite(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        with SessionLocal() as db:
            seed_services(db)

    def setUp(self):
        self.client = TestClient(app)
        self.user_email = f"testuser_{datetime.now().timestamp()}@example.com"
        self.user_password = "UserPassword@123"

    def test_complete_auth_and_rbac_flow(self):
        # 1. Register User
        reg_res = self.client.post(
            "/auth/register",
            json={
                "email": self.user_email,
                "password": self.user_password,
                "full_name": "Test Resident",
            },
        )
        self.assertEqual(reg_res.status_code, 201)
        data = reg_res.json()
        self.assertIn("access_token", data)
        self.assertIn("refresh_token", data)
        self.assertEqual(data["user"]["role"], "USER")
        user_token = data["access_token"]
        user_refresh = data["refresh_token"]

        # 2. GET /auth/me
        me_res = self.client.get("/auth/me", headers={"Authorization": f"Bearer {user_token}"})
        self.assertEqual(me_res.status_code, 200)
        self.assertEqual(me_res.json()["email"], self.user_email.lower())

        # 3. User Login
        login_res = self.client.post(
            "/auth/login",
            json={"email": self.user_email, "password": self.user_password},
        )
        self.assertEqual(login_res.status_code, 200)
        user_refresh = login_res.json()["refresh_token"]

        # 4. Token Refresh
        ref_res = self.client.post("/auth/refresh", json={"refresh_token": user_refresh})
        self.assertEqual(ref_res.status_code, 200)
        new_token = ref_res.json()["access_token"]

        # 5. RBAC Check: Regular USER accessing Admin endpoints should be Forbidden (403)
        admin_users_fail = self.client.get("/admin/users", headers={"Authorization": f"Bearer {new_token}"})
        self.assertEqual(admin_users_fail.status_code, 403)

        admin_dash_fail = self.client.get("/admin/dashboard", headers={"Authorization": f"Bearer {new_token}"})
        self.assertEqual(admin_dash_fail.status_code, 403)

        # 6. Admin Login
        admin_login_res = self.client.post(
            "/admin/login",
            json={"email": "admin@bureaubot.gov.in", "password": "Admin@12345"},
        )
        self.assertEqual(admin_login_res.status_code, 200)
        admin_token = admin_login_res.json()["access_token"]

        # 7. Admin Endpoints Success
        admin_users_ok = self.client.get("/admin/users", headers={"Authorization": f"Bearer {admin_token}"})
        self.assertEqual(admin_users_ok.status_code, 200)
        self.assertGreater(len(admin_users_ok.json()), 0)

        admin_dash_ok = self.client.get("/admin/dashboard", headers={"Authorization": f"Bearer {admin_token}"})
        self.assertEqual(admin_dash_ok.status_code, 200)
        self.assertIn("total_users", admin_dash_ok.json())
        self.assertIn("total_services", admin_dash_ok.json())

        # Admin Service Management CRUD
        # Create service
        create_svc = self.client.post(
            "/admin/services",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "code": f"test_svc_{int(datetime.now().timestamp())}",
                "name": "Custom Admin Welfare Scheme",
                "category": "Welfare",
                "description": "Test welfare service added by Admin.",
                "official_portal_url": "https://example.gov.in/",
                "eligibility_rules": ["Resident rule 1"],
                "required_documents": ["Aadhaar"],
                "fees": "Free",
            },
        )
        self.assertEqual(create_svc.status_code, 201)
        svc_id = create_svc.json()["id"]

        # Update service
        update_svc = self.client.put(
            f"/admin/services/{svc_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"name": "Updated Custom Welfare Scheme", "processing_time": "5 days"},
        )
        self.assertEqual(update_svc.status_code, 200)
        self.assertEqual(update_svc.json()["name"], "Updated Custom Welfare Scheme")

        # Delete (Deactivate) service
        del_svc = self.client.delete(f"/admin/services/{svc_id}", headers={"Authorization": f"Bearer {admin_token}"})
        self.assertEqual(del_svc.status_code, 200)

        # 8. User Profile & Data Storage APIs
        # Update user profile
        up_profile = self.client.put(
            "/users/me",
            headers={"Authorization": f"Bearer {new_token}"},
            json={"full_name": "Updated Resident Name"},
        )
        self.assertEqual(up_profile.status_code, 200)
        self.assertEqual(up_profile.json()["full_name"], "Updated Resident Name")

        # Create user document
        doc_res = self.client.post(
            "/users/me/documents",
            headers={"Authorization": f"Bearer {new_token}"},
            json={"document_type": "Address Proof", "file_name": "my_aadhaar.pdf"},
        )
        self.assertEqual(doc_res.status_code, 201)

        # Get user documents
        get_docs = self.client.get("/users/me/documents", headers={"Authorization": f"Bearer {new_token}"})
        self.assertEqual(get_docs.status_code, 200)
        self.assertGreater(len(get_docs.json()), 0)

        # Create user reminder
        rem_res = self.client.post(
            "/users/me/reminders",
            headers={"Authorization": f"Bearer {new_token}"},
            json={
                "message": "Renew passport before expiration date",
                "scheduled_for": (datetime.now(timezone.utc) + timedelta(days=10)).isoformat(),
            },
        )
        self.assertEqual(rem_res.status_code, 201)

        # Get user reminders
        get_rems = self.client.get("/users/me/reminders", headers={"Authorization": f"Bearer {new_token}"})
        self.assertEqual(get_rems.status_code, 200)
        self.assertGreater(len(get_rems.json()), 0)

        # Chat with token -> should link chat history to user
        chat_res = self.client.post(
            "/chat",
            headers={"Authorization": f"Bearer {new_token}"},
            json={"message": "How do I apply for PAN card?"},
        )
        self.assertEqual(chat_res.status_code, 200)

        # Get user chat history
        chat_hist = self.client.get("/users/me/chat-history", headers={"Authorization": f"Bearer {new_token}"})
        self.assertEqual(chat_hist.status_code, 200)
        self.assertGreater(len(chat_hist.json()), 0)

        # 9. Logout
        logout_res = self.client.post("/auth/logout", headers={"Authorization": f"Bearer {new_token}"})
        self.assertEqual(logout_res.status_code, 200)


if __name__ == "__main__":
    unittest.main()
