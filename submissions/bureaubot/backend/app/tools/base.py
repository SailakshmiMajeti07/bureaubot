from abc import ABC, abstractmethod
from typing import Any

from app.models import ToolResult


class GovernmentTool(ABC):
    name: str
    keywords: tuple[str, ...] = ()

    @abstractmethod
    def execute(self, query: str, jurisdiction: str, context: dict[str, Any] | None = None) -> ToolResult:
        """Return a JSON-serializable, validated result."""

    def matches(self, query: str) -> int:
        normalized = query.lower()
        return sum(keyword in normalized for keyword in self.keywords)
