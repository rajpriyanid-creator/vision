import os
from typing import Optional
from slice.state_manager import Evaluation, Attempt
from slice.llm_client import UnifiedLLMClient

class EvaluationAgent:
    """Rubric-Based Evaluation Agent — Grades student answers using LLM against rubrics into demonstrated, unresolved, or uncertain."""

    def __init__(self, provider: Optional[str] = None):
        self.llm = UnifiedLLMClient(provider=provider)

    def evaluate_attempt(self, attempt: Attempt) -> Evaluation:
        """Evaluates student attempt against concept expectations using LLM reasoning."""
        
        system_prompt = (
            "You are the Evaluation Agent of VISION. Grade the student's answer to a computer science question.\n"
            "Classify status as exactly one of:\n"
            "- 'demonstrated': student demonstrates correct understanding\n"
            "- 'unresolved': student answer reveals a gap or misconception\n"
            "- 'uncertain': student answer is ambiguous, vague, or incomplete needing tie-breaker\n\n"
            "Return JSON with fields:\n"
            "- status: 'demonstrated' | 'unresolved' | 'uncertain'\n"
            "- reasoning: str\n"
            "- next_recommendation: str"
        )

        user_prompt = (
            f"Concept: {attempt.concept}\n"
            f"Question: {attempt.question}\n"
            f"Student Answer: {attempt.student_answer}\n\n"
            "Grade this response. Return JSON."
        )

        res_json = self.llm.generate_json(system_prompt, user_prompt)
        status = res_json.get("status")
        concept = attempt.concept

        if status not in ["demonstrated", "unresolved", "uncertain"]:
            answer = attempt.student_answer.strip().lower()
            if concept == "binary_tree_inorder_traversal" and ("b, a, c" in answer or "b a c" in answer or "left, root, right" in answer):
                status = "demonstrated"
            elif concept == "pointers_references" and ("segmentation fault" in answer or "null" in answer or "memory address" in answer):
                status = "demonstrated"
            elif concept == "recursion_stack" and ("base case" in answer or "call stack" in answer):
                status = "demonstrated"
            elif concept == "struct_node_definition" and ("two" in answer or "2" in answer or "struct" in answer):
                status = "demonstrated"
            elif "maybe" in answer or "not sure" in answer or "unsure" in answer or len(answer) < 5:
                status = "uncertain"
            else:
                status = "unresolved"

        reasoning = res_json.get("reasoning", f"Graded student response as {status}.")
        recommendation = res_json.get("next_recommendation", "Proceed to next state.")

        return Evaluation(
            run_id=attempt.run_id,
            concept=attempt.concept,
            status=status,
            reasoning=reasoning,
            next_recommendation=recommendation
        )
