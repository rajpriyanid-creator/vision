"""
VISION Evaluation Agent — Fully dynamic, open-domain.
Zero hardcoded rubrics. Uses Gemini to grade any student answer on any subject.
"""

from __future__ import annotations
from slice.state_manager import Evaluation, Attempt
from slice.llm_client import LLMClient


class EvaluationAgent:
    """
    Rubric-Based Evaluation Agent.
    Grades any student answer on any concept into:
    - demonstrated: student clearly understands
    - unresolved: student reveals a gap or misconception
    - uncertain: ambiguous/vague — needs tie-breaker
    """

    SYSTEM_PROMPT = """You are the VISION Evaluation Agent.

Grade the student's answer to a conceptual question. Be fair but rigorous.
Use exactly one of these statuses:
- "demonstrated": the answer is correct or shows solid understanding
- "unresolved": the answer is wrong, incomplete, or reveals a misconception  
- "uncertain": the answer is ambiguous, too vague to classify, or needs clarification

Respond with JSON only:
{
  "status": "demonstrated | unresolved | uncertain",
  "reasoning": "<why you chose this status — what specifically was right or wrong>",
  "next_recommendation": "<what should happen next educationally>"
}"""

    def __init__(self):
        self.llm = LLMClient()

    def evaluate_attempt(self, attempt: Attempt) -> Evaluation:
        user_prompt = f"""Concept being tested: {attempt.concept}
Question asked: {attempt.question}
Student's answer: {attempt.student_answer}

Grade this response and return JSON."""

        result = self.llm.chat_json(self.SYSTEM_PROMPT, user_prompt, max_tokens=512)

        status = result.get("status", "unresolved")
        if status not in ("demonstrated", "unresolved", "uncertain"):
            status = "unresolved"

        return Evaluation(
            run_id=attempt.run_id,
            concept=attempt.concept,
            status=status,
            reasoning=result.get("reasoning", "Evaluation completed."),
            next_recommendation=result.get("next_recommendation", "Proceed to next state.")
        )
