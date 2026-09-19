"""
VISION Diagnostic Agent — Fully dynamic, open-domain.
Zero hardcoded subjects. Asks Gemini to diagnose root-cause prerequisite gaps
from any student answer on any concept in any field.
"""

from __future__ import annotations
from typing import Optional
from slice.state_manager import GapHypothesis, Attempt, CourseContext
from slice.llm_client import LLMClient


class DiagnosticAgent:
    """
    Debugger for Learning.
    Receives a student's wrong/uncertain answer and predicts the
    most likely prerequisite gap using Gemini reasoning.
    Returns a GapHypothesis with candidate_prerequisite chosen
    exclusively from the validated course DAG.
    """

    SYSTEM_PROMPT = """You are the VISION Diagnostic Agent — a debugger for student learning.

Your job: analyze a student's incorrect or uncertain answer and identify the MOST LIKELY 
root-cause prerequisite concept they are missing.

Rules:
- You MUST choose `candidate_prerequisite` from the provided valid_prerequisites list.
- If no prerequisite fits, set candidate_prerequisite to the target concept itself (means careless error or ambiguity).
- confidence: 0.0–1.0 (how certain you are about the root cause).
- Be specific and educationally grounded.

Respond with JSON only:
{
  "candidate_prerequisite": "<exact id from valid_prerequisites or target_concept>",
  "confidence": 0.92,
  "error_type": "prerequisite_gap | careless | misconception | ambiguous",
  "reasoning": "<brief 1-2 sentence explanation of WHY this gap explains the wrong answer>"
}"""

    def __init__(self):
        self.llm = LLMClient()

    def diagnose_gap(self, attempt: Attempt, course_context: CourseContext) -> GapHypothesis:
        target = attempt.concept
        valid_prereqs = course_context.dependency_graph.get(target, [])

        user_prompt = f"""Subject/Course: {course_context.course_name}
Target Concept: {target}
Valid Prerequisite IDs in course DAG: {valid_prereqs}
Student Question: {attempt.question}
Student Answer: {attempt.student_answer}

Diagnose the root cause and return JSON."""

        # Use escalation model for root-cause analysis (complex reasoning)
        raw = self.llm.escalate(self.SYSTEM_PROMPT, user_prompt, max_tokens=512)
        result = LLMClient._parse_json(raw) if isinstance(raw, str) else raw

        candidate = result.get("candidate_prerequisite", "")
        # Safety: must be in valid_prereqs or the target itself
        if candidate not in valid_prereqs and candidate != target:
            candidate = valid_prereqs[0] if valid_prereqs else target

        confidence = float(result.get("confidence", 0.85))
        reasoning = result.get("reasoning", "Diagnostic agent identified a knowledge gap.")

        return GapHypothesis(
            run_id=attempt.run_id,
            target_concept=target,
            candidate_prerequisite=candidate,
            confidence=min(max(confidence, 0.0), 1.0),
            evidence_refs=[reasoning[:120]]
        )
