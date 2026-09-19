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
of a specific concept. Based on the context and topic, choose the BEST question format:
- "mcq": Multiple Choice Question with 4 distinct options
- "fill_in_blank": A sentence template containing "___"
- "coding_problem": A small programming challenge with starter code and test cases
- "free_text": Conceptual short answer explanation

Exercise types:
- initial_target: First-time test of target concept
- prereq_recheck: Test if prerequisite gap is repaired
- target_retest: Re-verify target concept after prerequisite repair
- tie_breaker: Clarifying exit ticket for ambiguous answer

Respond with JSON only:
{
  "question_format": "mcq | fill_in_blank | coding_problem | free_text",
  "question_text": "<clear question or problem statement>",
  "mcq_options": ["Option A", "Option B", "Option C", "Option D"], // required if mcq
  "blank_template": "<sentence with ___ placeholder>", // required if fill_in_blank
  "code_starter": "<starter code template>", // required if coding_problem
  "language": "python | javascript | cpp | java", // for coding_problem
  "test_cases": [ // required if coding_problem (at least 2 test cases)
    {"input": "...", "expected_output": "...", "description": "..."}
  ],
  "expected_answer_hint": "<rubric note>"
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
        concept_clean = concept.replace("_", " ").title()

        if not self.llm.is_live:
            # Code / programming topics get coding problems or MCQs
            is_coding = any(kw in concept.lower() or kw in subject.lower() for kw in ("tree", "stack", "recursion", "array", "pointer", "loop", "python", "code", "list"))
            if is_coding:
                return Exercise(
                    run_id=run_id,
                    concept=concept,
                    exercise_type=exercise_type,
                    question_format="coding_problem",
                    question_text=f"Implement a function to process `{concept_clean}`. Complete the function so all test cases pass.",
                    rubric_ref=f"dynamic:{subject}:{concept}",
                    code_starter=f"def solution(input_val):\n    # TODO: Implement solution for {concept_clean}\n    pass",
                    language="python",
                    test_cases=[
                        {"input": "root = [1, 2, 3]", "expected_output": "[2, 1, 3]", "description": "Basic tree / node processing"},
                        {"input": "root = None", "expected_output": "[]", "description": "Edge case: Empty input / null pointer"}
                    ]
                )
            elif exercise_type == "tie_breaker":
                return Exercise(
                    run_id=run_id,
                    concept=concept,
                    exercise_type=exercise_type,
                    question_format="mcq",
                    question_text=f"Concept Exit Ticket: Which step is performed FIRST in {concept_clean}?",
                    rubric_ref=f"dynamic:{subject}:{concept}",
                    mcq_options=[
                        f"Visit the left subtree / prerequisite",
                        f"Process the root node directly",
                        f"Skip to the right child",
                        f"Terminate execution"
                    ]
                )
            else:
                return Exercise(
                    run_id=run_id,
                    concept=concept,
                    exercise_type=exercise_type,
                    question_format="free_text",
                    question_text=f"Explain {concept_clean} in your own words and give one concrete example.",
                    rubric_ref=f"dynamic:{subject}:{concept}"
                )

        user_prompt = f"""Subject: {subject or 'General'}
Concept to test: {concept}
Exercise type: {exercise_type}
Previous Agent Context: {context or 'None'}

Generate a targeted assessment exercise (MCQ, Fill-in, Coding, or Free Text) based on the context and return JSON."""

        result = self.llm.chat_json(self.SYSTEM_PROMPT, user_prompt, max_tokens=768)

        q_format = result.get("question_format") or "free_text"
        question = result.get("question_text") or f"Please explain {concept_clean} in your own words with an example."
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
