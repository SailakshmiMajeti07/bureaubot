import logging
from typing import Any, TypedDict
from uuid import UUID

from langgraph.graph import END, START, StateGraph
from sqlalchemy.orm import Session

from app.crud import get_eligibility_rules_by_service, get_service_by_code
from app.models import ToolResult
from app.services.registry import registry

logger = logging.getLogger("bureaubot.graph")
logging.basicConfig(level=logging.INFO)


class BureauBotState(TypedDict, total=False):
    db: Session
    message: str
    jurisdiction: str
    user_id: UUID | None
    case_reference: str | None
    documents: list[dict[str, Any]]
    service_code: str | None
    forced_tool: str | None
    intent: str
    selected_tool: str
    eligibility_info: dict[str, Any]
    document_info: dict[str, Any]
    portal_info: dict[str, Any]
    citations: list[dict[str, Any]]
    tool_result: dict[str, Any]
    response: str
    next_steps: list[str]
    confidence: float
    escalation_required: bool
    escalation_reason: str | None


def intent_detection(state: BureauBotState) -> dict:
    logger.info("Entering node: intent_detection with message: %s", state.get("message"))
    tool = registry.choose(state["message"], state.get("forced_tool"))
    logger.info("Intent detected: %s (Selected tool: %s)", tool.name, tool.name)
    return {"intent": tool.name, "selected_tool": tool.name}


def eligibility_check(state: BureauBotState) -> dict:
    logger.info("Entering node: eligibility_check for tool: %s", state.get("selected_tool"))
    db: Session | None = state.get("db")
    tool_name = state.get("selected_tool", "faq")
    eligibility_rules = []

    if db:
        service = get_service_by_code(db, tool_name)
        if service:
            db_rules = get_eligibility_rules_by_service(db, service.id)
            eligibility_rules = [r.rule_description for r in db_rules] if db_rules else service.eligibility_rules

    return {
        "eligibility_info": {
            "tool": tool_name,
            "rules": eligibility_rules,
            "rule_count": len(eligibility_rules),
        }
    }


def document_check(state: BureauBotState) -> dict:
    logger.info("Entering node: document_check for tool: %s", state.get("selected_tool"))
    db: Session | None = state.get("db")
    tool_name = state.get("selected_tool", "faq")
    required_docs = []

    if db:
        service = get_service_by_code(db, tool_name)
        if service:
            required_docs = service.required_documents

    submitted_docs = state.get("documents", [])
    verified_docs = [d.get("name", "Document") for d in submitted_docs]

    return {
        "document_info": {
            "required_documents": required_docs,
            "submitted_documents": verified_docs,
            "is_complete": len(submitted_docs) >= len(required_docs) if required_docs else True,
        }
    }


def portal_finder(state: BureauBotState) -> dict:
    logger.info("Entering node: portal_finder for tool: %s", state.get("selected_tool"))
    db: Session | None = state.get("db")
    tool_name = state.get("selected_tool", "faq")
    portal_url = "https://www.india.gov.in/"
    service_name = tool_name.replace("_", " ").title()

    if db:
        service = get_service_by_code(db, tool_name)
        if service:
            portal_url = service.official_portal_url
            service_name = service.name

    citations = [{"title": service_name, "url": portal_url, "official": True}]
    return {
        "portal_info": {"official_portal_url": portal_url, "service_name": service_name},
        "citations": citations,
    }


def tool_execution(state: BureauBotState) -> dict:
    logger.info("Entering node: tool_execution for tool: %s", state.get("selected_tool"))
    tool_obj = registry.get(state["selected_tool"])
    result = tool_obj.execute(
        state["message"],
        state["jurisdiction"],
        {
            "db": state.get("db"),
            "user_id": state.get("user_id"),
            "case_reference": state.get("case_reference"),
            "documents": state.get("documents", []),
            "service_code": state.get("service_code"),
        },
    )
    logger.info("Tool execution complete. Status: %s", result.status)
    return {"tool_result": result.model_dump(mode="json")}


def step_by_step_guidance(state: BureauBotState) -> dict:
    logger.info("Entering node: step_by_step_guidance")
    result = ToolResult.model_validate(state["tool_result"])
    steps = (
        result.data.get("workflow")
        or result.data.get("verification_checks")
        or result.data.get("required")
        or ["Review requirements and confirm current details on the official government portal."]
    )
    return {"next_steps": [str(step) for step in steps]}


def reminder_check(state: BureauBotState) -> dict:
    logger.info("Entering node: reminder_check")
    msg_lower = state.get("message", "").lower()
    is_reminder_intent = "remind" in msg_lower or "deadline" in msg_lower or state.get("selected_tool") == "reminder_scheduler"
    return {"reminder_active": is_reminder_intent}


def final_response(state: BureauBotState) -> dict:
    logger.info("Entering node: final_response")
    result = ToolResult.model_validate(state["tool_result"])
    tool_name = state.get("selected_tool", "faq")

    db: Session | None = state.get("db")
    service_exists = False
    if db:
        service_exists = get_service_by_code(db, tool_name) is not None

    if result.status == "escalation":
        confidence = 0.45
        escalated = True
    elif not service_exists and tool_name not in ("faq", "portal_finder", "reminder_scheduler", "document_verification", "ocr_tool"):
        confidence = 0.55
        escalated = True
    elif result.status == "needs_input":
        confidence = 0.75
        escalated = False
    else:
        confidence = 0.90 if service_exists else 0.85
        escalated = False

    msg_lower = state.get("message", "").lower()
    high_impact_keywords = (
        "emergency shelter", "tax notice", "wrong tax notice", "appeal a benefit decision",
        "disability benefit", "housing support", "delayed visa", "visa application is delayed",
        "emergency", "wrong tax"
    )
    if any(k in msg_lower for k in high_impact_keywords):
        confidence = min(confidence, 0.65)
        escalated = True

    if confidence < 0.70:
        escalated = True

    portal_info = state.get("portal_info", {})
    portal_url = portal_info.get("official_portal_url", "https://www.india.gov.in/")
    service_label = tool_name.replace("_", " ").title()

    if escalated:
        resp_text = (
            f"BureauBot analyzed your request regarding {service_label}. "
            f"Due to specific regulatory conditions or low verification confidence ({confidence:.2f}), "
            f"this query requires official administrative assessment or human escalation. "
            f"Please visit the official portal at {portal_url} or consult an authorized helpdesk."
        )
    else:
        resp_text = (
            f"BureauBot retrieved official {service_label} guidance from the government service database."
        )

    logger.info("Final response calculated. Confidence: %.2f, Escalation: %s", confidence, escalated)
    return {
        "response": resp_text,
        "confidence": confidence,
        "escalation_required": escalated,
    }


def build_graph():
    graph = StateGraph(BureauBotState)
    graph.add_node("intent_detection", intent_detection)
    graph.add_node("eligibility_check", eligibility_check)
    graph.add_node("document_check", document_check)
    graph.add_node("portal_finder", portal_finder)
    graph.add_node("tool_execution", tool_execution)
    graph.add_node("step_by_step_guidance", step_by_step_guidance)
    graph.add_node("reminder_check", reminder_check)
    graph.add_node("final_response", final_response)

    graph.add_edge(START, "intent_detection")
    graph.add_edge("intent_detection", "eligibility_check")
    graph.add_edge("eligibility_check", "document_check")
    graph.add_edge("document_check", "portal_finder")
    graph.add_edge("portal_finder", "tool_execution")
    graph.add_edge("tool_execution", "step_by_step_guidance")
    graph.add_edge("step_by_step_guidance", "reminder_check")
    graph.add_edge("reminder_check", "final_response")
    graph.add_edge("final_response", END)

    return graph.compile()

