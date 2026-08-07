from app.tools.base import GovernmentTool
from app.tools.catalog import (
    AadhaarTool, AyushmanBharatTool, CasteCertificateTool, DocumentVerificationTool,
    DrivingLicenceTool, FAQTool, IncomeCertificateTool, OCRTool, PANTool, PMKisanTool,
    PassportTool, PensionTool, PortalFinderTool, RationCardTool, ReminderSchedulerTool,
    ResidenceCertificateTool, ScholarshipTool,
)


class ToolRegistry:
    """Owns all stateless domain tools and selects the strongest keyword match."""

    def __init__(self) -> None:
        tools: list[GovernmentTool] = [
            PassportTool(), PANTool(), AadhaarTool(), DrivingLicenceTool(),
            IncomeCertificateTool(), CasteCertificateTool(), ResidenceCertificateTool(),
            ScholarshipTool(), PMKisanTool(), AyushmanBharatTool(), PensionTool(),
            RationCardTool(), DocumentVerificationTool(), PortalFinderTool(),
            ReminderSchedulerTool(), FAQTool(), OCRTool(),
        ]
        self._tools = {tool.name: tool for tool in tools}

    def choose(self, query: str, forced_tool: str | None = None) -> GovernmentTool:
        if forced_tool:
            return self._tools[forced_tool]
        ranked = sorted(((tool.matches(query), tool) for tool in self._tools.values()), key=lambda item: item[0], reverse=True)
        return ranked[0][1] if ranked[0][0] else self._tools["faq"]

    def get(self, name: str) -> GovernmentTool:
        return self._tools[name]

    @property
    def names(self) -> list[str]:
        return sorted(self._tools)


registry = ToolRegistry()
