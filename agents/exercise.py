import os
from typing import Optional, Literal
from slice.state_manager import Exercise
from slice.llm_client import UnifiedLLMClient

class ExerciseAgent:
    """Targeted Exercise Generator Agent — Produces dynamic assessment questions using LLMs."""

    def __init__(self, provider: Optional[str] = None):
        self.llm = UnifiedLLMClient(provider=provider)

    def generate_exercise(self, run_id: str, concept: str, exercise_type: Literal["prereq_recheck", "target_retest", "tie_breaker", "initial_target"]) -> Exercise:
        """Generates a dynamic targeted assessment question."""
        
        system_prompt = (
            "You are the Exercise Agent of VISION. Generate a clear, concise assessment question testing a specific computer science concept.\n"
            "Return JSON with fields:\n"
            "- question_text: str (the question to present to the student)"
        )

        user_prompt = (
            f"Concept: {concept}\n"
            f"Exercise Type: {exercise_type}\n\n"
            "Formulate a precise question to test student understanding."
        )

        res_json = self.llm.generate_json(system_prompt, user_prompt)
        question = res_json.get("question_text")

        if not question:
            fallback_map = {
                "binary_tree_inorder_traversal": "For a binary tree with root A, left child B, and right child C, what is the sequence of nodes visited in an inorder traversal?",
                "pointers_references": "If a pointer `p` holds NULL, what happens when you evaluate `p->data`?",
                "recursion_stack": "What prevents a recursive function call from overflowing the system stack?",
                "struct_node_definition": "How many pointer fields are required inside a standard binary tree node struct?"
            }
            question = fallback_map.get(concept, f"Please explain your understanding of {concept} with a code example or concise explanation.")

        return Exercise(
            run_id=run_id,
            concept=concept,
            exercise_type=exercise_type,
            question_text=question,
            rubric_ref=f"domain/rubric.json#{concept}"
        )
