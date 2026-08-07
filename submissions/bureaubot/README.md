# BureauBot — AI Government Service Assistant

BureauBot helps residents understand, prepare for, and track government-service requests. It answers in plain language, identifies the right service, produces a checklist of documents and steps, and escalates uncertain or high-impact cases to an official human channel.

## Submission map

| Path | Purpose |
| --- | --- |
| `agentspec.yaml` | Framework-neutral contract for the agent |
| `backend/` | API, orchestration, and service integrations |
| `frontend/` | Resident-facing web application |
| `agents/` | Specialized agent prompts and routing rules |
| `tools/` | Adapters for official service catalogues and case systems |
| `tests/` | Unit, integration, safety, and evaluation tests |
| `dataset/` | Evaluation cases (20 seeded placeholders) |
| `transcripts/` | Main and subagent Mutagent-session exports |
| `traces/` | Exported BureauBot execution traces |

## Intended flow

```text
Resident → frontend → backend/orchestrator
                       ├─ service-discovery agent → official catalogue tool
                       ├─ eligibility agent       → policy knowledge/tool
                       └─ case-support agent      → case-status tool
                                      ↓
                           cited answer or human escalation
```

## Status

This is a submission scaffold. Files labelled `TODO` are intentional placeholders for the team’s implementation, credentials, verified policy sources, exported transcripts, and run traces. Do not use mock guidance as real government advice.

## Local development (planned)

```bash
# TODO: install the backend and frontend dependencies after selecting the stack
# TODO: configure only non-secret local environment variables in .env.example
# TODO: run the test and evaluation commands documented by the implementation
```

## Evaluation target

The initial dataset contains 20 representative cases. A production submission should replace placeholders with jurisdiction-specific, source-cited cases and demonstrate passing safety, routing, completeness, and escalation criteria.
