import os
from typing import Optional
from slice.state_manager import TeachingAction, ResourceSelection, StudentState
from slice.llm_client import UnifiedLLMClient

class TutorAgent:
    """Personalized Reteaching Agent — Formulates grounded explanations using LLM adapted to student learning preferences."""

    def __init__(self, provider: Optional[str] = None):
        self.llm = UnifiedLLMClient(provider=provider)

    def reteach(self, run_id: str, resource: ResourceSelection, student_state: StudentState) -> TeachingAction:
        """Constructs a personalized lesson for the prerequisite concept."""
        concept = resource.concept
        
        # Pick preferred mode
        available_modes = ["code_trace", "visual_diagram", "analogy", "step_by_step"]
        preferred_modes = [m for m in student_state.successful_modes if m not in student_state.failed_modes]
        selected_mode = preferred_modes[0] if preferred_modes else available_modes[0]

        system_prompt = (
            "You are the Tutor Agent of VISION. Create a clear, engaging, grounded lesson for a student struggling with a prerequisite concept.\n"
            f"Teaching Mode: {selected_mode}.\n"
            "Format with markdown headings, clear explanations, and an ASCII diagram or code trace if applicable.\n"
            "Do NOT reveal direct test answers."
        )

        user_prompt = (
            f"Prerequisite Concept: {concept}\n"
            f"Grounded Excerpt Quote: {resource.excerpt_quote}\n\n"
            f"Write a 2-paragraph lesson in '{selected_mode}' mode."
        )

        explanation = self.llm.generate(system_prompt, user_prompt)
        if not explanation or len(explanation) < 30:
            explanation = (
                f"### Focus Lesson: {concept.replace('_', ' ').title()}\n\n"
                f"**Teaching Mode:** `{selected_mode}`\n\n"
                f"**Core Concept Overview:**\n{resource.excerpt_quote}\n\n"
                f"*Key Takeaway:* To master binary trees, understand how {concept.replace('_', ' ')} functions under the hood."
            )

        return TeachingAction(
            run_id=run_id,
            concept=concept,
            teaching_mode=selected_mode,
            explanation_text=explanation,
            evidence_ref=resource.source_id
        )
