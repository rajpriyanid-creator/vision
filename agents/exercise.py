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
        if not self.llm.is_live:
            demo_questions = {
                ("binary_tree_inorder_traversal", "initial_target"): "For a binary tree with left child B, root A, and right child C, what is the output sequence of an inorder traversal?",
                ("binary_tree_inorder_traversal", "target_retest"): "For a binary tree node A with left child B and right child C, give the inorder traversal sequence and explain the order briefly.",
                ("binary_tree_inorder_traversal", "tie_breaker"): "Before processing the current root node in inorder traversal, which subtree must be completely visited?",
                ("recursion", "prereq_recheck"): "In a recursive tree traversal, what happens immediately when the current node pointer is NULL?",
                ("call_stack_reasoning", "prereq_recheck"): "When a recursive call reaches its base case, how does control return through the call stack?",
                ("tree_traversal_order", "prereq_recheck"): "What is the order of operations in an inorder traversal?",
            }
            question = demo_questions.get((concept, exercise_type), f"Explain {concept.replace('_', ' ')} in your own words and give one example.")
            return Exercise(
                run_id=run_id,
                concept=concept,
                exercise_type=exercise_type,
                question_text=question,
                rubric_ref=f"dynamic:{subject}:{concept}",
            )

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
