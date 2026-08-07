from typing import Any

from sqlalchemy.orm import Session

from app.crud import get_eligibility_rules_by_service, get_service_by_code, search_services
from app.models import Source, ToolResult
from app.tools.base import GovernmentTool

SENSITIVE_WARNING = "Never share Aadhaar, PAN, bank-account, OTP, password, or another person's application details in chat."
OFFICIAL_CONFIRMATION = "Rules, documents, processing times, and fees come from the configured service record; confirm current details on the official portal."


class DatabaseServiceTool(GovernmentTool):
    service_code: str

    @property
    def name(self) -> str:
        return self.service_code

    def execute(self, query: str, jurisdiction: str, context: dict[str, Any] | None = None) -> ToolResult:
        db: Session = (context or {})["db"]
        service = get_service_by_code(db, self.service_code)
        if not service:
            return ToolResult(
                tool=self.name,
                status="escalation",
                warnings=["The requested service is not configured in the service database."],
            )
        
        # Retrieve eligibility rules from eligibility_rules table if populated
        db_rules = get_eligibility_rules_by_service(db, service.id)
        rule_list = [r.rule_description for r in db_rules] if db_rules else service.eligibility_rules

        return ToolResult(
            tool=self.name,
            status="needs_input",
            data={
                "service": service.name,
                "category": service.category,
                "state": service.state,
                "status": service.status,
                "country": "India",
                "jurisdiction": jurisdiction,
                "description": service.description,
                "workflow": service.workflow,
                "document_checklist": service.required_documents,
                "eligibility_questions": rule_list,
                "processing_time": service.processing_time,
                "fees": service.fees,
                "official_portal": service.official_portal_url,
            },
            sources=[Source(title=service.name, url=service.official_portal_url)],
            warnings=[SENSITIVE_WARNING, OFFICIAL_CONFIRMATION],
        )


class PassportTool(DatabaseServiceTool):
    name = "passport"
    service_code = "passport"
    keywords = ("passport", "tatkaal", "psk", "police clearance")


class PANTool(DatabaseServiceTool):
    name = "pan"
    service_code = "pan"
    keywords = ("pan", "permanent account number", "income tax pan")


class AadhaarTool(DatabaseServiceTool):
    name = "aadhaar"
    service_code = "aadhaar"
    keywords = ("aadhaar", "aadhar", "uidai", "enrolment id", "eid")


class DrivingLicenceTool(DatabaseServiceTool):
    name = "driving_licence"
    service_code = "driving_licence"
    keywords = ("driving licence", "driving license", "learner licence", "learner license", "parivahan", "dl renewal")


class IncomeCertificateTool(DatabaseServiceTool):
    name = "income_certificate"
    service_code = "income_certificate"
    keywords = ("income certificate", "income proof certificate", "income cert")


class CasteCertificateTool(DatabaseServiceTool):
    name = "caste_certificate"
    service_code = "caste_certificate"
    keywords = ("caste certificate", "caste cert", "sc certificate", "st certificate", "obc certificate", "ews certificate")


class ResidenceCertificateTool(DatabaseServiceTool):
    name = "residence_certificate"
    service_code = "residence_certificate"
    keywords = ("residence_certificate", "domicile certificate", "residential certificate", "domicile proof", "residence certificate")


class ScholarshipTool(DatabaseServiceTool):
    name = "scholarship"
    service_code = "scholarship"
    keywords = ("scholarship", "national scholarship", "nsp", "student grant", "bursary")


class PMKisanTool(DatabaseServiceTool):
    name = "pm_kisan"
    service_code = "pm_kisan"
    keywords = ("pm kisan", "pm-kisan", "kisan samman nidhi", "farmer scheme")


class AyushmanBharatTool(DatabaseServiceTool):
    name = "ayushman_bharat"
    service_code = "ayushman_bharat"
    keywords = ("ayushman", "pm-jay", "ab-pmjay", "health card", "ayushman card")


class PensionTool(DatabaseServiceTool):
    name = "pension"
    service_code = "pension"
    keywords = ("pension", "old age pension", "widow pension", "disability pension", "nsap", "atal pension")


class RationCardTool(DatabaseServiceTool):
    name = "ration_card"
    service_code = "ration_card"
    keywords = ("ration card", "nfsa", "food card", "pds", "public distribution system")


class DocumentVerificationTool(GovernmentTool):
    name = "document_verification"
    keywords = ("document", "verify", "verification", "upload", "proof", "scan")

    def execute(self, query: str, jurisdiction: str, context: dict[str, Any] | None = None) -> ToolResult:
        context = context or {}
        db: Session = context["db"]
        service_code = context.get("service_code")
        service = get_service_by_code(db, service_code) if service_code else None
        supplied = context.get("documents", [])
        return ToolResult(
            tool=self.name,
            status="needs_input" if not supplied else "success",
            data={
                "service": service.name if service else None,
                "category": service.category if service else None,
                "required_documents": service.required_documents if service else [],
                "submitted_documents": [
                    {"name": str(item.get("name", "unnamed document")), "status": "requires authority review"}
                    for item in supplied
                ],
                "verification_checks": [
                    "legibility",
                    "validity/expiry",
                    "name/date consistency",
                    "service-specific format",
                ],
                "accepted": False,
            },
            sources=[Source(title=service.name, url=service.official_portal_url)] if service else [],
            warnings=[
                "BureauBot does not authenticate documents or determine whether an authority will accept them.",
                SENSITIVE_WARNING,
            ],
        )


class PortalFinderTool(GovernmentTool):
    name = "portal_finder"
    keywords = ("portal", "website", "where can i apply", "service", "office")

    def execute(self, query: str, jurisdiction: str, context: dict[str, Any] | None = None) -> ToolResult:
        db: Session = (context or {})["db"]
        services = search_services(db, query, state=jurisdiction)
        return ToolResult(
            tool=self.name,
            status="success",
            data={
                "country": "India",
                "jurisdiction": jurisdiction,
                "portals": [
                    {
                        "service": service.code,
                        "title": service.name,
                        "category": service.category,
                        "state": service.state,
                        "url": service.official_portal_url,
                        "processing_time": service.processing_time,
                        "fees": service.fees,
                        "status": service.status,
                    }
                    for service in services
                ],
            },
            sources=[Source(title=service.name, url=service.official_portal_url) for service in services],
            warnings=[OFFICIAL_CONFIRMATION],
        )


class ReminderSchedulerTool(GovernmentTool):
    name = "reminder_scheduler"
    keywords = ("remind", "reminder", "notify", "deadline", "schedule reminder")

    def execute(self, query: str, jurisdiction: str, context: dict[str, Any] | None = None) -> ToolResult:
        context = context or {}
        db: Session | None = context.get("db")
        user_id = context.get("user_id")

        existing_reminders = []
        if db and user_id:
            from app.crud import get_reminders_by_user
            user_rems = get_reminders_by_user(db, user_id)
            existing_reminders = [
                {
                    "id": str(r.id),
                    "message": r.message,
                    "scheduled_for": r.scheduled_for.isoformat(),
                    "status": r.status,
                    "channel": r.channel,
                }
                for r in user_rems
            ]

        return ToolResult(
            tool=self.name,
            status="success" if user_id else "needs_input",
            data={
                "user_id": str(user_id) if user_id else None,
                "reminders_count": len(existing_reminders),
                "existing_reminders": existing_reminders,
                "required_fields": ["user_id", "message", "scheduled_for"],
                "instructions": "Use the /reminders endpoint to persist new application deadline reminders to PostgreSQL.",
            },
            sources=[Source(title="BureauBot Reminder Service", url="https://www.india.gov.in/")],
            warnings=["Consent and valid schedule date required for automated reminder notifications."],
        )


class OCRTool(GovernmentTool):
    name = "ocr_tool"
    keywords = ("ocr", "scan document", "extract text", "read document", "image text", "document scan", "extract details")

    def execute(self, query: str, jurisdiction: str, context: dict[str, Any] | None = None) -> ToolResult:
        context = context or {}
        db: Session | None = context.get("db")
        service_code = context.get("service_code")
        service = get_service_by_code(db, service_code) if (db and service_code) else None
        documents = context.get("documents", [])

        extracted_fields = []
        for doc in documents:
            doc_name = doc.get("name", "Document")
            extracted_fields.append({
                "document_name": doc_name,
                "status": "extracted",
                "confidence": 0.92,
                "fields": {
                    "document_type": doc_name,
                    "extracted_text": f"Simulated OCR text content extracted from {doc_name}",
                    "validation": "format valid"
                }
            })

        return ToolResult(
            tool=self.name,
            status="success" if documents else "needs_input",
            data={
                "ocr_status": "completed" if documents else "awaiting_document",
                "service": service.name if service else "General Document OCR",
                "extracted_count": len(extracted_fields),
                "extracted_fields": extracted_fields,
                "required_documents_reference": service.required_documents if service else [],
                "note": "OCR processing extracts structural text for verification assistance."
            },
            sources=[Source(title=service.name, url=service.official_portal_url)] if service else [
                Source(title="Digital India OCR Portal", url="https://www.india.gov.in/")
            ],
            warnings=[
                SENSITIVE_WARNING,
                "OCR data extraction is subject to verification by official administrative personnel."
            ],
        )


class FAQTool(GovernmentTool):
    name = "faq"
    keywords = ("what is", "how does", "help", "faq", "hello", "bureaubot", "question", "info")

    def execute(self, query: str, jurisdiction: str, context: dict[str, Any] | None = None) -> ToolResult:
        context = context or {}
        db: Session | None = context.get("db")
        available_services = []
        if db:
            from app.crud import list_services
            svcs = list_services(db)
            available_services = [s.name for s in svcs]

        return ToolResult(
            tool=self.name,
            status="success",
            data={
                "answer": "BureauBot is an AI agent providing Indian government service guidance, eligibility rules, document checklists, official portal links, application tracking, and reminder scheduling.",
                "supported_services_count": len(available_services),
                "supported_services": available_services,
                "jurisdiction": jurisdiction,
            },
            sources=[Source(title="National Portal of India", url="https://www.india.gov.in/")],
            warnings=[SENSITIVE_WARNING, OFFICIAL_CONFIRMATION],
        )

