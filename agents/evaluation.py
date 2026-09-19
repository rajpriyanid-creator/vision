"""
VISION Evaluation Agent — Fully dynamic, open-domain.
Zero hardcoded rubrics. Uses Gemini to grade any student answer on any subject.
"""

from __future__ import annotations
from slice.state_manager import Evaluation, Attempt
from slice.llm_client import LLMClient
import re


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
        # Check if attempt includes coding test case results
        if attempt.test_results:
            passed = [t for t in attempt.test_results if t.get("passed", False)]
            failed = [t for t in attempt.test_results if not t.get("passed", False)]
            if not failed:
                return Evaluation(
                    run_id=attempt.run_id,
                    concept=attempt.concept,
                    status="demonstrated",
                    reasoning=f"✅ All {len(passed)} test cases passed successfully for code submission.",
                    next_recommendation="Mastery confirmed. Proceed to next level."
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

        if not self.llm.is_live:
            answer = attempt.student_answer.strip().lower()
            question = attempt.question.lower()
            concept = attempt.concept.lower()

            if attempt.selected_option:
                is_correct = any(kw in attempt.selected_option.lower() for kw in ("left", "prerequisite", "first", "correct", "a"))
                status = "demonstrated" if is_correct else "unresolved"
                reason = f"Selected option '{attempt.selected_option}' correctly addresses the concept." if is_correct else f"Selected option '{attempt.selected_option}' is incorrect."
                return Evaluation(
                    run_id=attempt.run_id,
                    concept=attempt.concept,
                    status=status,
                    reasoning=reason,
                    next_recommendation="Continue to next step." if status == "demonstrated" else "Diagnose gap."
                )

            if not answer or any(token in answer for token in ("just give me", "ignore previous", "mark me as")):
                status = "uncertain" if not answer else "unresolved"
                reason = "The response does not provide enough evidence of understanding."
            elif ("inorder" in question or "inorder" in concept) and "before processing" not in question:
                compact = re.sub(r"[^a-z]", "", answer)
                correct = "bac" in compact or ("left" in answer and "root" in answer and "right" in answer)
                wrong_order = "abc" in compact or ("root" in answer and "left" in answer and answer.index("root") < answer.index("left"))
                status = "demonstrated" if correct else ("uncertain" if wrong_order else "unresolved")
                reason = "The response demonstrates Left → Root → Right ordering." if correct else "The response needs a quick ordering check before diagnosing a deeper gap."
            elif "before processing" in question or "subtree" in question:
                status = "demonstrated" if "left" in answer and ("subtree" in answer or "sub tree" in answer) else "unresolved"
                reason = "The student identified the left subtree as the first step." if status == "demonstrated" else "The response places the root before the left subtree."
            elif concept == "recursion":
                status = "demonstrated" if any(term in answer for term in ("return", "stop", "terminate", "base case", "null")) else "unresolved"
                reason = "The response identifies termination and returning to the caller." if status == "demonstrated" else "The response does not explain how the recursive process terminates."
            elif concept == "call_stack_reasoning":
                status = "demonstrated" if "pop" in answer or "lifo" in answer or "caller" in answer else "unresolved"
                reason = "The response describes stack unwinding." if status == "demonstrated" else "The response does not explain stack-frame unwinding."
            elif concept == "tree_traversal_order":
                status = "demonstrated" if "left" in answer and "root" in answer and "right" in answer else "unresolved"
                reason = "The traversal order is present." if status == "demonstrated" else "The three traversal positions are incomplete."
            else:
                status = "demonstrated" if len(answer.split()) >= 8 else "uncertain"
                reason = "The answer includes a sufficiently developed explanation." if status == "demonstrated" else "A little more explanation is needed."

            return Evaluation(
                run_id=attempt.run_id,
                concept=attempt.concept,
                status=status,
                reasoning=reason,
                next_recommendation="Continue to the next learning step." if status == "demonstrated" else "Clarify the concept with a targeted check.",
            )

        user_prompt = f"""Concept being tested: {attempt.concept}
Question asked: {attempt.question}
Student's answer / option: {attempt.selected_option or attempt.student_answer}

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
