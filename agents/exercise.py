"""
VISION Exercise Agent — Fully dynamic, open-domain.
Zero hardcoded questions. Generates targeted assessment questions
via Gemini for ANY concept in ANY subject.
"""

from __future__ import annotations
from typing import Literal
from slice.state_manager import Exercise
from slice.llm_client import LLMClient


class ExerciseAgent:
    """
    Targeted Exercise Generator.
    Generates conceptual questions for any subject using Gemini.
    No hardcoded questions — ever.
    """

    SYSTEM_PROMPT = """You are the VISION Exercise Agent.

Your job: generate ONE clear, targeted question to assess a student's understanding 
of a specific concept. The question should be:
- Directly testing the target concept (not surrounding fluff)
- Answerable in 1-3 sentences or a short code/formula
- At the right difficulty level for the exercise type

Exercise types:
- initial_target: First-time test of the concept the student wants to learn
- prereq_recheck: Test if a prerequisite gap has been repaired after reteaching
- target_retest: Test the original target concept after prerequisite repair
- tie_breaker: Clarifying question to resolve an ambiguous student answer

Respond with JSON only:
{
  "question_text": "<the question to ask the student>",
  "expected_answer_hint": "<brief note on what a correct answer should contain>"
}"""

    def __init__(self):
        self.llm = LLMClient()

    def generate_exercise(
        self,
        run_id: str,
        concept: str,
        exercise_type: Literal["prereq_recheck", "target_retest", "tie_breaker", "initial_target"],
        subject: str = "",
        context: str = ""
    ) -> Exercise:
        user_prompt = f"""Subject: {subject or 'General'}
Concept to test: {concept}
Exercise type: {exercise_type}
Additional context: {context or 'None'}

Generate a targeted assessment question and return JSON."""

        result = self.llm.chat_json(self.SYSTEM_PROMPT, user_prompt, max_tokens=512)

        question = result.get("question_text") or f"Please explain {concept} in your own words with an example."

        return Exercise(
            run_id=run_id,
            concept=concept,
            exercise_type=exercise_type,
            question_text=question,
            rubric_ref=f"dynamic:{subject}:{concept}"
        )
