# BureauBot backend

BureauBot is an India-focused FastAPI and LangGraph service. It routes a resident's request to an appropriate government-service tool, returns a structured JSON workflow, lists typical documents, surfaces questions that affect official assessment, and links to an official portal.

## Supported services

- Passport Seva
- PAN
- Aadhaar
- Driving Licence
- Income, Caste, and Residence/Domicile Certificates
- National Scholarship Portal
- PM-KISAN
- Ayushman Bharat / PM-JAY
- Pension schemes (with NSAP as an official reference)
- Ration Card / NFSA
- Document verification guidance, portal finding, reminders, and FAQs

Certificate and many welfare/pension workflows are administered by states/UTs. BureauBot therefore asks for a state/UT and directs users to the National Government Services Portal or the administering authority; it does not invent a state-specific rule.

## Architecture

```text
REST API -> LangGraph intent detection -> tool registry -> India service tool -> guidance -> JSON response
```

- `app/api/routes.py` - REST endpoints
- `app/graph.py` - LangGraph orchestration
- `app/services/registry.py` - keyword-based tool selection
- `app/tools/catalog.py` - service workflows and structured JSON tools
- `app/core/constants.py` - official India portal catalogue
- `app/models.py` - validated request and response schema

## REST API

| Endpoint | Purpose |
| --- | --- |
| `GET /health` | Service health and version |
| `POST /chat` | Route any free-text India service request |
| `POST /eligibility` | Produce scheme-appropriate official eligibility questions; never an eligibility decision |
| `POST /documents` | Produce document-verification guidance |
| `POST /services` | Return matching official India portals |

## Run

```bash
cd backend
python main.py
```
or:
```bash
uvicorn app.main:app --reload
```

Open `http://127.0.0.1:8000/docs` for interactive API documentation.

## Safety and production boundary

All workflows are guidance, not government decisions. BureauBot deliberately does not authenticate documents, retrieve application records, determine eligibility, calculate pensions, confirm benefit coverage, or process Aadhaar/PAN/OTP/bank details. Before public deployment, add authenticated official API integrations, user consent and durable reminder delivery, source monitoring, state/UT service adapters, audit logs, rate limits, and security review.

## Test

Run all backend tests and 50 evaluation test cases:
```bash
python run_all_tests.py
```
