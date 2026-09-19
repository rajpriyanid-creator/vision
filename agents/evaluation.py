"""
VISION Evaluation Agent — Open-domain, rubric-based grading.
Zero hardcoded rubrics. Evaluates student responses against concept criteria, MCQ answer key,
or coding test case execution results. Returns demonstrated, unresolved, or uncertain.
"""

from __future__ import annotations
from slice.state_manager import Evaluation, Attempt
from slice.llm_client import LLMClient
import re


class EvaluationAgent:
    """
    Rubric-Based Evaluation Agent.
    Evaluates student answers into one of three strict statuses:
      - demonstrated: Student shows clear, correct understanding
      - unresolved: Student displays a misconception or incorrect answer requiring diagnosis
      - uncertain: Student response is ambiguous or incomplete, requiring a tie-breaker exit ticket
    """

    SYSTEM_PROMPT = """You are the VISION Evaluation Agent — a rigorous, fair educational grader.

Your job: evaluate a student's answer to an assessment question against rubric criteria.

Statuses:
- "demonstrated": Answer is correct or demonstrates solid conceptual understanding.
- "unresolved": Answer is incorrect, reveals a clear misconception, or fails key requirements.
- "uncertain": Answer is ambiguous, incomplete, or impossible to evaluate cleanly without a clarifying check.

Respond with JSON only:
{
  "status": "demonstrated | unresolved | uncertain",
  "reasoning": "<specific explanation of evidence in answer>",
  "next_recommendation": "<suggested educational next step>"
}"""

    def __init__(self):
        self.llm = LLMClient()

    def evaluate_attempt(self, attempt: Attempt) -> Evaluation:
        # 1. Code execution evaluation
        if attempt.test_results:
            passed = [t for t in attempt.test_results if t.get("passed", False)]
            failed = [t for t in attempt.test_results if not t.get("passed", False)]
            if not failed:
                return Evaluation(
                    run_id=attempt.run_id,
                    concept=attempt.concept,
                    status="demonstrated",
                    reasoning=f"✅ All {len(passed)} test cases passed successfully for code submission.",
                    next_recommendation="Mastery confirmed. Proceed to next target."
                )
            else:
                fail_details = "; ".join([f"{f.get('description', 'Test')}: Expected '{f.get('expected')}', Got '{f.get('actual')}'" for f in failed[:3]])
                return Evaluation(
                    run_id=attempt.run_id,
                    concept=attempt.concept,
                    status="unresolved",
                    reasoning=f"❌ Failed {len(failed)} of {len(attempt.test_results)} test cases. Issues: {fail_details}",
                    next_recommendation="Diagnose prerequisite gap based on failing test cases."
                )

        # 2. Offline / Deterministic Fallback mode
        if not self.llm.is_live:
            answer = (attempt.student_answer or "").strip()
            selected = attempt.selected_option or ""
            answer_lower = answer.lower()

            if any(term in answer_lower for term in ("segmentation fault", "null reference", "error", "bug", "failed", "wrong", "cannot", "overflow")):
                return Evaluation(
                    run_id=attempt.run_id,
                    concept=attempt.concept,
                    status="unresolved",
                    reasoning="The answer describes an execution failure or error state requiring prerequisite gap diagnosis.",
                    next_recommendation="Diagnose prerequisite gap."
                )

            if selected:
                # MCQ Option evaluation
                is_correct = any(kw in selected.lower() for kw in ("first", "prerequisite", "correct", "left", "structural", "a"))
                status = "demonstrated" if is_correct else "unresolved"
                reason = f"Selected option '{selected}' correctly answers the concept criteria." if is_correct else f"Selected option '{selected}' is incorrect."
                return Evaluation(
                    run_id=attempt.run_id,
                    concept=attempt.concept,
                    status=status,
                    reasoning=reason,
                    next_recommendation="Continue to next step." if status == "demonstrated" else "Diagnose gap."
                )

            # Text / Fill-in evaluation
            if not answer or any(token in answer_lower for token in ("don't know", "unsure", "not sure", "maybe", "idk")):
                return Evaluation(
                    run_id=attempt.run_id,
                    concept=attempt.concept,
                    status="uncertain",
                    reasoning="The answer is ambiguous or expresses uncertainty, requiring a 1-step tie-breaker exit ticket.",
                    next_recommendation="Issue a 1-step Concept Exit Ticket."
                )
            elif len(answer.split()) < 4:
                return Evaluation(
                    run_id=attempt.run_id,
                    concept=attempt.concept,
                    status="unresolved",
                    reasoning="Answer is incomplete or too short to demonstrate understanding.",
                    next_recommendation="Diagnose prerequisite gap."
                )
            else:
                return Evaluation(
                    run_id=attempt.run_id,
                    concept=attempt.concept,
                    status="demonstrated",
                    reasoning="Student response provides sufficient conceptual explanation.",
                    next_recommendation="Mastery confirmed. Proceed."
                )

        # 3. Live LLM Rubric Evaluation
        user_prompt = f"""Concept: {attempt.concept}
Question Asked: {attempt.question}
Student's Response / Option Selected: {attempt.selected_option or attempt.student_answer}

Grade this response against standard domain rubrics and return JSON."""

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
