import os
from typing import Dict, Any, Optional
from slice.state_manager import StudentState, CourseContext, StudySession

class SupervisorAgent:
    """Coordinator Agent responsible for session strategy, target concept selection, and handoff routing."""

    def __init__(self, api_key: Optional[str] = None, model: str = "openai/gpt-4o-mini"):
        self.api_key = api_key or os.getenv("OPENROUTER_API_KEY")
        self.model = model

    def plan_next_step(self, student_state: StudentState, course_context: CourseContext, session: StudySession) -> Dict[str, Any]:
        """Plans the initial or next study target and hands off to Exercise or Diagnostic Agent."""
        target = session.target_concept or course_context.concepts[0]

        return {
            "target_concept": target,
            "next_agent": "Exercise",
            "action": "generate_initial_target_question",
            "reasoning": f"Initiating practice session for target concept '{target}'."
        }
