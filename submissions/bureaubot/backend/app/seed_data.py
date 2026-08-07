from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models import EligibilityRule, Service, User

SERVICES_SEED_DATA = [
    {
        "code": "passport",
        "name": "Passport Seva",
        "category": "Identity & Citizenship",
        "description": "Fresh passport, re-issue, Tatkaal and police clearance guidance.",
        "official_portal_url": "https://www.passportindia.gov.in/psp/",
        "eligibility_rules": [
            "Must be an Indian citizen.",
            "Applicant must specify category (Normal/Tatkaal) and age group.",
            "Special documentation required for Tatkaal applications.",
        ],
        "required_documents": [
            "Proof of Present Address",
            "Proof of Date of Birth",
            "Existing Passport (for re-issue)",
            "Annexure E/F (for Tatkaal)",
        ],
        "workflow": [
            "Register or sign in on the Passport Seva portal.",
            "Fill in the application form online for Fresh Passport or Re-issue.",
            "Pay the applicable fee and schedule a PSK/POPSK appointment.",
            "Visit the Passport Seva Kendra with original documents for verification.",
            "Track application status and complete police verification.",
        ],
        "processing_time": "30 to 45 days (Normal), 3 to 7 days (Tatkaal)",
        "fees": "INR 1,500 (Normal 36 pages), INR 3,500 (Tatkaal 36 pages)",
        "state": "All India",
        "status": "active",
    },
    {
        "code": "pan",
        "name": "PAN (Permanent Account Number)",
        "category": "Tax & Financial Identity",
        "description": "Permanent Account Number application, correction and Aadhaar-linking guidance.",
        "official_portal_url": "https://www.incometax.gov.in/iec/foportal/",
        "eligibility_rules": [
            "Open to any Indian resident, NRI, or tax-paying entity.",
            "Aadhaar linkage mandatory for Indian individual residents.",
        ],
        "required_documents": [
            "Identity Proof (Aadhaar, Voter ID, Passport)",
            "Date of Birth Proof (Birth Certificate, Class 10 Certificate)",
            "Address Proof (Utility bill, Bank Statement, Aadhaar)",
            "Existing PAN Card (for correction/update)",
        ],
        "workflow": [
            "Open the official Income Tax or Protean/NSDL/UTIITSL PAN portal.",
            "Choose Form 49A (New PAN) or Form 49AA (Foreign citizen) or Correction form.",
            "Complete identity verification via e-KYC or physical document submission.",
            "Pay processing fee and submit request.",
            "Note the 15-digit acknowledgement number for tracking.",
        ],
        "processing_time": "15 to 20 working days for physical card; e-PAN within 24 hours",
        "fees": "INR 107 (Physical card within India), INR 1,017 (Dispatch outside India)",
        "state": "All India",
        "status": "active",
    },
    {
        "code": "aadhaar",
        "name": "Aadhaar",
        "category": "National Identity",
        "description": "UIDAI enrolment, address/demographic update, e-Aadhaar download and status guidance.",
        "official_portal_url": "https://myaadhaar.uidai.gov.in/",
        "eligibility_rules": [
            "Resident of India who has resided in India for 182 days or more in the past 12 months.",
            "Mandatory biometric update at age 5 and 15.",
        ],
        "required_documents": [
            "Proof of Identity (POI)",
            "Proof of Address (POA)",
            "Proof of Date of Birth (PDB)",
            "Proof of Relationship (POR)",
        ],
        "workflow": [
            "Access the myAadhaar portal or locate an authorised Aadhaar Enrolment Centre.",
            "Book an online appointment for biometric/demographic update or new enrolment.",
            "Submit valid supporting documents at the centre or via myAadhaar portal.",
            "Complete iris, fingerprint, and photo capture.",
            "Track Update Request Number (URN) or Enrolment ID (EID).",
        ],
        "processing_time": "Up to 90 days after enrolment/update request",
        "fees": "Free for first enrolment; INR 50 for demographic update, INR 100 for biometric update",
        "state": "All India",
        "status": "active",
    },
    {
        "code": "driving_licence",
        "name": "Driving Licence",
        "category": "Transport & Mobility",
        "description": "Learner licence, driving licence, DL renewal, duplicate licence and test slot booking.",
        "official_portal_url": "https://parivahan.gov.in/",
        "eligibility_rules": [
            "Minimum age 16 for non-geared motor cycle (with parental consent).",
            "Minimum age 18 for light motor vehicles.",
            "Minimum age 20 for commercial/transport vehicles.",
            "Must hold valid Learner's Licence for at least 30 days before applying for permanent DL.",
        ],
        "required_documents": [
            "Proof of Age (School Certificate, Passport, Birth Certificate)",
            "Proof of Address (Aadhaar, Passport, Utility Bill)",
            "Learner's Licence Number",
            "Form 1 (Self declaration of physical fitness) / Form 1A (Medical Certificate for >40 yrs)",
        ],
        "workflow": [
            "Visit Parivahan Sewa and select your State/UT.",
            "Apply for Learner's Licence online and pass the online/offline LL test.",
            "After 30 days, apply online for Driving Licence test slot.",
            "Appear at the designated RTO with vehicle for practical driving test.",
            "On clearing the test, receive DL via speed post or digital portal.",
        ],
        "processing_time": "7 to 15 working days after passing practical test",
        "fees": "INR 200 (LL fee), INR 200 (DL issuance fee), INR 300 (DL driving test fee)",
        "state": "All India",
        "status": "active",
    },
    {
        "code": "income_certificate",
        "name": "Income Certificate",
        "category": "State Certificates",
        "description": "State/UT revenue department income certificate for educational, scholarship and welfare schemes.",
        "official_portal_url": "https://services.india.gov.in/",
        "eligibility_rules": [
            "Must be a resident of the issuing State/UT.",
            "Annual family income evaluated as per state revenue guidelines.",
        ],
        "required_documents": [
            "Identity Proof (Aadhaar Card, Voter ID)",
            "Residence Proof (Ration Card, Electricity Bill, Domicile)",
            "Salary Slip / Form 16 / IT Return / Income Affidavit",
            "Self-Declaration Form",
        ],
        "workflow": [
            "Go to the respective State e-District portal or National Government Services Portal.",
            "Select 'Issue of Income Certificate' service.",
            "Upload income proofs, identity documents, and affidavit.",
            "Field inspection/verification by Revenue Inspector / Tehsildar.",
            "Download digitally signed certificate upon approval.",
        ],
        "processing_time": "7 to 15 working days depending on state",
        "fees": "INR 15 to INR 50 (nominal state service fee)",
        "state": "State Specific / All India",
        "status": "active",
    },
    {
        "code": "residence_certificate",
        "name": "Residence / Domicile Certificate",
        "category": "State Certificates",
        "description": "State/UT residence and domicile certificate proof for quota, jobs, and state schemes.",
        "official_portal_url": "https://services.india.gov.in/",
        "eligibility_rules": [
            "Continuous residence in the State/UT for a specified period (typically 3 to 10 years depending on state rules).",
        ],
        "required_documents": [
            "Proof of Residence (Electricity Bill, Rent Agreement, Land Record)",
            "Identity Proof (Aadhaar, Voter ID)",
            "School Leaving Certificate / Educational Certificates from State",
            "Affidavit declaring state domicile",
        ],
        "workflow": [
            "Log in to the State e-District citizen portal.",
            "Fill out the Domicile / Residence Certificate application form.",
            "Attach proof of continuous stay in the state.",
            "Tehsildar / Sub-Divisional Magistrate processes the application.",
            "Download digitally signed certificate from the portal.",
        ],
        "processing_time": "15 to 30 working days",
        "fees": "INR 20 to INR 60",
        "state": "State Specific / All India",
        "status": "active",
    },
    {
        "code": "caste_certificate",
        "name": "Caste Certificate",
        "category": "State Certificates",
        "description": "SC, ST, OBC, and EWS caste certificate application and verification guidance.",
        "official_portal_url": "https://services.india.gov.in/",
        "eligibility_rules": [
            "Applicant must belong to SC/ST/OBC/EWS category notified in the State/Central list.",
            "EWS eligibility requires family income below prescribed threshold (e.g. 8 Lakh/annum).",
        ],
        "required_documents": [
            "Applicant Identity Proof (Aadhaar, Voter ID)",
            "Father/Relative Caste Certificate or School Certificate showing caste",
            "Income Proof (for OBC Non-Creamy Layer / EWS)",
            "Affidavit / Local Revenue Officer Verification",
        ],
        "workflow": [
            "Access the State e-District portal.",
            "Select SC/ST/OBC/EWS Certificate service.",
            "Provide ancestral caste details and local revenue verification records.",
            "Application reviewed by District Revenue Authority / Social Welfare Department.",
            "Download verified caste certificate upon approval.",
        ],
        "processing_time": "21 to 30 working days",
        "fees": "INR 30 to INR 100",
        "state": "State Specific / All India",
        "status": "active",
    },
    {
        "code": "pm_kisan",
        "name": "PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)",
        "category": "Agriculture & Welfare",
        "description": "PM-KISAN registration, beneficiary status, e-KYC and landholding details verification.",
        "official_portal_url": "https://pmkisan.gov.in/",
        "eligibility_rules": [
            "Small and marginal landholder farmer families owning cultivable land.",
            "Excludes institutional landholders, high income taxpayers, and retired pensioners (>10k/month).",
            "Aadhaar-seeded bank account required.",
        ],
        "required_documents": [
            "Aadhaar Card",
            "Land Holding Documents (Khatauni / Khasra details)",
            "Bank Account Passbook (Aadhaar linked)",
            "Mobile Number registered with Aadhaar",
        ],
        "workflow": [
            "Visit pmkisan.gov.in and click on 'Farmers Corner'.",
            "Choose 'New Farmer Registration' or complete mandatory 'e-KYC'.",
            "Fill state, district, sub-district, block, village, and land details.",
            "Submit form for state agriculture department verification.",
            "Check installment status using Beneficiary Status tool.",
        ],
        "processing_time": "30 to 60 days for new registration approval",
        "fees": "Free of cost (No fee for registration)",
        "state": "All India",
        "status": "active",
    },
    {
        "code": "ayushman_bharat",
        "name": "Ayushman Bharat / PM-JAY",
        "category": "Healthcare & Insurance",
        "description": "National Health Authority Ayushman card issuance, hospital empanelment, and beneficiary eligibility search.",
        "official_portal_url": "https://beneficiary.nha.gov.in/",
        "eligibility_rules": [
            "Listed in SECC 2011 database or covered under state healthcare welfare scheme.",
            "Family income and vulnerability criteria per NHA standards.",
        ],
        "required_documents": [
            "Aadhaar Card",
            "Ration Card or Family Identification Document",
            "Mobile Number for e-KYC OTP",
        ],
        "workflow": [
            "Open beneficiary.nha.gov.in or Ayushman App.",
            "Search beneficiary eligibility using Mobile Number, Aadhaar, or Ration Card.",
            "Perform e-KYC (Aadhaar OTP or iris/fingerprint scan).",
            "Submit for approval to District Implementation Unit.",
            "Download Ayushman Card providing up to INR 5 Lakh coverage per family per year.",
        ],
        "processing_time": "Instant download after e-KYC approval (typically within 24-48 hours)",
        "fees": "Free (Zero charge for card generation and cashless hospital treatment)",
        "state": "All India",
        "status": "active",
    },
    {
        "code": "scholarship",
        "name": "National Scholarship Portal (NSP)",
        "category": "Education & Grants",
        "description": "Central and State scholarship schemes, pre-matric, post-matric, and merit-cum-means NSP guidance.",
        "official_portal_url": "https://scholarships.gov.in/",
        "eligibility_rules": [
            "Student enrolled in recognized school, college, or university.",
            "Scheme-specific income threshold (e.g. family income below 2.5 Lakh/year).",
            "Minimum academic marks percentage as per selected scheme.",
        ],
        "required_documents": [
            "Aadhaar / Aadhaar Enrolment ID (OTR)",
            "Student Bank Account details (Aadhaar linked)",
            "Income Certificate of parents",
            "Caste Certificate (if applying under SC/ST/OBC category)",
            "Previous Year Academic Marksheet",
            "Bonafide Student Certificate from Institute",
        ],
        "workflow": [
            "Generate One Time Registration (OTR) on NSP portal using Aadhaar.",
            "Log in and browse eligible Central Sector / State / UGC schemes.",
            "Fill in academic, income, and bank details.",
            "Upload requisite documents and submit application online.",
            "Application verified by Institute Nodal Officer, then District/State Nodal Officer.",
        ],
        "processing_time": "Disbursement aligned with academic year schedules",
        "fees": "Free of cost (Official NSP applications carry no charge)",
        "state": "All India",
        "status": "active",
    },
    {
        "code": "pension",
        "name": "Pension Schemes (NSAP & State Pensions)",
        "category": "Social Security",
        "description": "National Social Assistance Programme (IGNOAPS, IGNWPS, IGNDPS) and state senior citizen pensions.",
        "official_portal_url": "https://nsap.nic.in/",
        "eligibility_rules": [
            "Indigent senior citizens (60+ years), widows (40+ years), or severely disabled persons (80%+ disability).",
            "Must belong to Below Poverty Line (BPL) household as per state guidelines.",
        ],
        "required_documents": [
            "Aadhaar Card",
            "Age Proof (Birth Certificate, Voter ID, Medical Board Certificate)",
            "BPL Ration Card / Income Certificate",
            "Disability Certificate (for Disability Pension)",
            "Husband's Death Certificate (for Widow Pension)",
            "Bank / Post Office Account details",
        ],
        "workflow": [
            "Submit application online via NSAP portal or State Social Welfare e-district portal.",
            "Attach age proof, BPL proof, and Aadhaar bank details.",
            "Gram Panchayat / Block Development Officer conducts field verification.",
            "Sanction order issued by Sub-Divisional Officer.",
            "Direct Benefit Transfer (DBT) monthly pension credited to bank account.",
        ],
        "processing_time": "30 to 60 days for sanction",
        "fees": "Free of cost",
        "state": "All India",
        "status": "active",
    },
    {
        "code": "ration_card",
        "name": "Ration Card / NFSA",
        "category": "Food & Public Distribution",
        "description": "National Food Security Act ration card application, member addition, and One Nation One Ration Card (ONORC) guidance.",
        "official_portal_url": "https://nfsa.gov.in/",
        "eligibility_rules": [
            "Resident family classified under Priority Household (PHH) or Antyodaya Anna Yojana (AAY) as per state criteria.",
            "No family member should own heavy vehicle or pay income tax (varies by state).",
        ],
        "required_documents": [
            "Aadhaar Cards of all family members",
            "Head of Household Photo (preferably female head)",
            "Proof of Residence (Electricity bill, Rent agreement)",
            "Income Proof / Surrender Certificate of previous Ration Card",
        ],
        "workflow": [
            "Access the State Food & Civil Supplies portal via NFSA.",
            "Select 'Apply for New Ration Card' or 'Modify Family Members'.",
            "Enter details of family head, members, and income status.",
            "Submit form for verification by Inspector of Food & Supplies.",
            "Download e-Ration Card or collect physical card from FPS (Fair Price Shop).",
        ],
        "processing_time": "15 to 30 working days",
        "fees": "INR 5 to INR 50 (varies by state)",
        "state": "All India",
        "status": "active",
    },
]


def seed_admin_user(db: Session) -> None:
    admin_email = "admin@bureaubot.gov.in"
    existing = db.scalar(select(User).where(User.email == admin_email))
    if not existing:
        admin_user = User(
            email=admin_email,
            full_name="BureauBot System Admin",
            hashed_password=hash_password("Admin@12345"),
            role="ADMIN",
            is_active=True,
        )
        db.add(admin_user)
        db.commit()


def seed_services(db: Session) -> int:
    created_services_count = 0
    created_rules_count = 0

    for data in SERVICES_SEED_DATA:
        # Check if service already exists
        service = db.scalar(select(Service).where(Service.code == data["code"]))
        if not service:
            service = Service(
                code=data["code"],
                name=data["name"],
                category=data["category"],
                description=data["description"],
                eligibility_rules=data["eligibility_rules"],
                required_documents=data["required_documents"],
                official_portal_url=data["official_portal_url"],
                processing_time=data["processing_time"],
                fees=data["fees"],
                state=data["state"],
                status=data["status"],
                workflow=data["workflow"],
                is_active=True,
            )
            db.add(service)
            db.commit()
            db.refresh(service)
            created_services_count += 1
        else:
            # Update existing fields to ensure completeness
            service.category = data["category"]
            service.state = data["state"]
            service.status = data["status"]
            service.fees = data["fees"]
            service.processing_time = data["processing_time"]
            service.eligibility_rules = data["eligibility_rules"]
            service.required_documents = data["required_documents"]
            service.workflow = data["workflow"]
            db.commit()

        # Seed EligibilityRules table for this service
        for idx, rule_text in enumerate(data["eligibility_rules"], start=1):
            rule_name = f"{service.name} Rule #{idx}"
            existing_rule = db.scalar(
                select(EligibilityRule).where(
                    EligibilityRule.service_id == service.id,
                    EligibilityRule.rule_name == rule_name,
                )
            )
            if not existing_rule:
                rule = EligibilityRule(
                    service_id=service.id,
                    rule_name=rule_name,
                    rule_description=rule_text,
                    condition="Standard assessment criteria",
                    is_mandatory=True,
                )
                db.add(rule)
                created_rules_count += 1
        db.commit()

    seed_admin_user(db)
    return created_services_count


def seed_database(db: Session) -> None:
    seed_services(db)


if __name__ == "__main__":
    from app.database import Base, SessionLocal, engine

    Base.metadata.create_all(bind=engine)
    with SessionLocal() as session:
        count = seed_services(session)
        print(f"BureauBot database initialized. Seeded {count} new services and admin user.")
