import os
from typing import Dict, Any, Optional
from slice.state_manager import GapHypothesis, Attempt, CourseContext
from slice.llm_client import UnifiedLLMClient

class DiagnosticAgent:
    """Diagnostic Agent — Debugger for Learning. Uses LLM reasoning + DAG matching to predict root cause gap."""

    def __init__(self, provider: Optional[str] = None):
        self.llm = UnifiedLLMClient(provider=provider)

    def diagnose_gap(self, attempt: Attempt, course_context: CourseContext) -> GapHypothesis:
        """Analyzes an unresolved attempt and predicts candidate prerequisite gap from the course DAG."""
        target = attempt.concept
        valid_prereqs = course_context.dependency_graph.get(target, [])

        system_prompt = (
            "You are the Diagnostic Agent (Debugger for Learning).\n"
            "Analyze the student's attempt on a concept and determine if there is a fundamental prerequisite gap.\n"
            "Output JSON with fields:\n"
            "- candidate_prerequisite: str (MUST be chosen from candidate list if a gap exists, or target concept if carelessness/ambiguity)\n"
            "- confidence: float (0.0 to 1.0)\n"
            "- reasoning: str"
        )

        user_prompt = (
            f"Target Concept: {target}\n"
            f"Valid Prerequisite Candidates in DAG: {valid_prereqs}\n"
            f"Question: {attempt.question}\n"
            f"Student Answer: {attempt.student_answer}\n\n"
            "Analyze the root cause misconception. Return JSON."
        )

        res_json = self.llm.generate_json(system_prompt, user_prompt)
        candidate = res_json.get("candidate_prerequisite")

        # Fallback heuristic if LLM output candidate isn't formatted properly
        if not candidate:
            answer_lower = attempt.student_answer.lower()
            if "array" in answer_lower or "traverse array" in answer_lower or "index 0" in answer_lower:
                candidate = "array_traversal"
            elif "struct" in answer_lower or "declared" in answer_lower or "member" in answer_lower:
                candidate = "struct_node_definition"
            elif "pointer" in answer_lower or "null" in answer_lower or "segmentation fault" in answer_lower or "reference" in answer_lower:
                candidate = "pointers_references"
            elif "recursion" in answer_lower or "base case" in answer_lower or "stack overflow" in answer_lower or "stack" in answer_lower:
                candidate = "recursion_stack"
            elif "b, a, c" in answer_lower or "maybe" in answer_lower or "unsure" in answer_lower or "sequence" in answer_lower:
                candidate = target
            else:
                candidate = valid_prereqs[0] if valid_prereqs else target

        confidence = float(res_json.get("confidence", 0.90))

        return GapHypothesis(
            run_id=attempt.run_id,
            target_concept=target,
            candidate_prerequisite=candidate,
            confidence=confidence,
            evidence_refs=[attempt.student_answer[:80]]
        )
