"""
VISION Exercise Agent — Fully dynamic, open-domain adaptive assessment engine.
Zero hardcoded questions. Adapts exercise format (MCQ, Fill-in, Free Text, Coding)
to the concept, subject, learner level, learning goal, and state machine phase.
"""

from __future__ import annotations
from typing import Literal, Optional
from slice.state_manager import Exercise
from slice.llm_client import LLMClient


class ExerciseAgent:
    """
    Adaptive Assessment Engine.
    Generates targeted assessment exercises for ANY concept in ANY subject.
    Adapts exercise format based on workflow state:
      - initial_target: MCQ / Reasoning
      - prereq_recheck: Targeted fill-in or MCQ
      - target_retest: Applied problem or Coding exercise
      - tie_breaker: Single-step Exit Ticket
    """

    SYSTEM_PROMPT = """You are the VISION Exercise Agent — an expert assessment author.

Your job: generate ONE clear, targeted exercise to evaluate student understanding of a specific concept.

Question Formats:
- "mcq": 4 distinct options with exactly 1 correct answer.
- "fill_in_blank": Template string containing "___".
- "coding_problem": Programming problem with starter code, language, and 2+ test cases.
- "free_text": Short-answer conceptual reasoning question.

Rules:
- Adapt the format to the concept, subject, level, and learning goal.
- Make questions rigorous yet fair.
- Do NOT output answer keys or hidden secrets in question_text.

Respond with JSON only:
{
  "question_format": "mcq | fill_in_blank | coding_problem | free_text",
  "question_text": "<problem statement>",
  "mcq_options": ["Option A", "Option B", "Option C", "Option D"],
  "blank_template": "<sentence with ___ placeholder>",
  "code_starter": "<starter code template>",
  "language": "python | javascript | cpp | java",
  "test_cases": [
    {"input": "...", "expected_output": "...", "description": "..."}
  ],
  "expected_answer_hint": "<internal grading criteria note>"
}"""

    def __init__(self):
        self.llm = LLMClient()

    def generate_exercise(
        self,
        run_id: str,
        concept: str,
        exercise_type: Literal["prereq_recheck", "target_retest", "tie_breaker", "initial_target"],
        subject: str = "",
        context: str = "",
        learner_level: str = "intermediate",
        learning_goal: str = "understand",
        attempt_count: int = 0
    ) -> Exercise:
        concept_clean = concept.replace("_", " ").title()

        if not self.llm.is_live:
            # Deterministic fallback adapting format to exercise type
            if exercise_type == "tie_breaker":
                return Exercise(
                    run_id=run_id,
                    concept=concept,
                    exercise_type=exercise_type,
                    question_format="mcq",
                    question_text=f"Exit Ticket: Which foundational property best defines {concept_clean}?",
                    rubric_ref=f"dynamic:{subject}:{concept}",
                    mcq_options=[
                        f"First-in, first-evaluated structural invariant",
                        f"Direct element placement without ordering",
                        f"Unconditional termination of execution",
                        f"Arbitrary secondary reference assignment"
                    ]
                )
            elif exercise_type == "prereq_recheck":
                return Exercise(
                    run_id=run_id,
                    concept=concept,
                    exercise_type=exercise_type,
                    question_format="fill_in_blank",
                    question_text=f"Complete the core rule for {concept_clean}: Before processing higher-level operations, the system must first evaluate the ___ state.",
                    blank_template=f"Before processing higher-level operations, the system must first evaluate the ___ state.",
                    rubric_ref=f"dynamic:{subject}:{concept}"
                )
            elif attempt_count > 1 or exercise_type == "target_retest":
                return Exercise(
                    run_id=run_id,
                    concept=concept,
                    exercise_type=exercise_type,
                    question_format="free_text",
                    question_text=f"Apply your understanding of {concept_clean} to solve a practical scenario in {subject or 'this domain'}. Describe your step-by-step approach.",
                    rubric_ref=f"dynamic:{subject}:{concept}"
                )
            else:
                return Exercise(
                    run_id=run_id,
                    concept=concept,
                    exercise_type=exercise_type,
                    question_format="mcq",
                    question_text=f"What is the primary function of {concept_clean} in {subject or 'this topic'}?",
                    rubric_ref=f"dynamic:{subject}:{concept}",
                    mcq_options=[
                        f"Establishes structural correctness and initial conditions",
                        f"Forces immediate program termination",
                        f"Bypasses prerequisite verification",
                        f"Disables state persistence across sessions"
                    ]
                )

        user_prompt = f"""Subject: {subject or 'General'}
Concept: {concept_clean}
Exercise Type: {exercise_type}
Learner Level: {learner_level}
Learning Goal: {learning_goal}
Attempt Count: {attempt_count}
Workflow Context: {context or 'None'}

Generate a targeted assessment exercise (MCQ, Fill-in, Coding, or Free Text) and return JSON."""

        result = self.llm.chat_json(self.SYSTEM_PROMPT, user_prompt, max_tokens=768)

        q_format = result.get("question_format") or "mcq"
        question = result.get("question_text") or f"What is the key mechanism behind {concept_clean}?"
        mcq_opts = result.get("mcq_options") or []
        blank_tmpl = result.get("blank_template")
        starter = result.get("code_starter")
        lang = result.get("language") or "python"
        tests = result.get("test_cases") or []

        return Exercise(
            run_id=run_id,
            concept=concept,
            exercise_type=exercise_type,
            question_text=question,
            rubric_ref=f"dynamic:{subject}:{concept}",
            question_format=q_format,
            mcq_options=mcq_opts,
            blank_template=blank_tmpl,
            code_starter=starter,
            language=lang,
            test_cases=tests
        )
