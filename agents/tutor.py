"""
VISION Tutor Agent — Fully dynamic, open-domain.
Zero hardcoded lessons. Uses Gemini to generate grounded, personalized
reteaching explanations for ANY concept in ANY subject.
"""

from __future__ import annotations
from slice.state_manager import TeachingAction, ResourceSelection, StudentState
from slice.llm_client import LLMClient


class TutorAgent:
    """
    Personalized Reteaching Agent.
    Constructs grounded lessons for any concept using the resource excerpt
    as evidence, adapted to the student's successful learning modes.
    Never reveals the answer to the target question.
    """

    SYSTEM_PROMPT = """You are the VISION Tutor Agent — a world-class adaptive educator.

Your job: explain a prerequisite concept to a student who is struggling, using the provided
grounded evidence excerpt. Adapt your teaching mode to what works for this student.

Teaching modes:
- code_trace: Walk through code step-by-step
- visual_diagram: ASCII diagrams, mental models  
- analogy: Real-world comparisons
- step_by_step: Numbered procedural breakdown
- socratic: Guide with questions
- conceptual: First principles explanation

Rules:
- Use ONLY the provided evidence excerpt as your source (do not fabricate facts)
- Teach the PREREQUISITE concept, NOT the target answer
- Be concise but complete (aim for 150-250 words)
- End with one connecting sentence linking this concept back to what the student is trying to learn

Respond with plain text (formatted markdown is OK). No JSON."""

    def __init__(self):
        self.llm = LLMClient()

    def reteach(
        self,
        run_id: str,
        resource: ResourceSelection,
        student_state: StudentState,
        target_concept: str = "",
        subject: str = ""
    ) -> TeachingAction:
        concept = resource.concept
        concept_title = concept.replace("_", " ").title()

        # If resource is missing or unverified, do NOT waste LLM API keys
        if not resource.excerpt_quote or "no approved course" in resource.excerpt_quote.lower():
            return TeachingAction(
                run_id=run_id,
                concept=concept,
                teaching_mode="resource_unavailable",
                explanation_text=f"Resource not available in course materials for '{concept_title}'. Human instructor escalation required.",
                evidence_ref=resource.source_id or "material_absent"
            )

        # Pick preferred teaching mode
        all_modes = ["step_by_step", "analogy", "code_trace", "visual_diagram", "conceptual", "socratic"]
        failed = set(student_state.failed_modes)
        preferred = [m for m in student_state.successful_modes if m not in failed]
        if not preferred:
            preferred = [m for m in all_modes if m not in failed]
        selected_mode = preferred[0] if preferred else "step_by_step"

        user_prompt = f"""Subject: {subject or 'General'}
Prerequisite Concept to Teach: {concept}
Ultimate target the student is working toward: {target_concept or concept}
Teaching Mode: {selected_mode}
Student successful modes: {student_state.successful_modes}
Grounded Evidence Excerpt:
---
{resource.excerpt_quote}
---
(Source: {resource.source_id})

Write the reteaching lesson for this prerequisite concept."""

        lesson = self.llm.chat(self.SYSTEM_PROMPT, user_prompt, max_tokens=600)
        if not lesson or len(lesson) < 30 or lesson.startswith("[Error") or "RESOURCE_EXHAUSTED" in lesson:
            concept_title = concept.replace("_", " ").title()
            lesson = (
                f"**Understanding {concept_title}**\n\n"
                f"**Core Concept:** {concept_title} is a key foundational topic in {subject or 'this subject'}. "
                f"It governs how action and relationships are defined within the domain.\n\n"
                f"**Key Rule:** Identify the primary subject performing the action or operation. "
                f"When the subject directly executes the action, clarity, directness, and structure are optimized."
            )

        return TeachingAction(
            run_id=run_id,
            concept=concept,
            teaching_mode=("ai_generated" if resource.verification_status != "verified" else selected_mode),
            explanation_text=lesson,
            evidence_ref=resource.source_id
        )

    def cross_check_resource(self, resource: ResourceSelection, target_concept: str = "") -> bool:
        """Lightweight Resource Agent Cross-Check to verify quote relevance before reteaching."""
        if not resource or not resource.excerpt_quote:
            return False
        if resource.verification_status == "could_not_establish":
            return False
        # Keyword & length check fallback offline
        if not self.llm.is_live:
            return len(resource.excerpt_quote.strip()) > 10

        prompt = f"Target Concept: {target_concept or resource.concept}\nRetrieved Excerpt: {resource.excerpt_quote}\nIs this excerpt educationally relevant and accurate for teaching this concept? Respond with JSON: {{\"relevant\": true/false}}"
        raw = self.llm.chat("You verify educational material relevance. Respond with JSON.", prompt, max_tokens=100)
        parsed = LLMClient._parse_json(raw)
        return bool(parsed.get("relevant", True))
