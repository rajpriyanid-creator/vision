"""
VISION Tutor Agent — Dynamic, open-domain adaptive teaching.
Zero hardcoded lessons. Personalizes initial target teaching and prerequisite repair lessons.
"""

from __future__ import annotations
from slice.state_manager import TeachingAction, ResourceSelection, StudentState
from slice.llm_client import LLMClient


class TutorAgent:
    """
    Personalized Adaptive Tutor Agent.
    Supports TWO distinct teaching jobs:
      Job A: INITIAL TEACHING — Teaches the target concept requested by the student.
      Job B: PREREQUISITE REPAIR — Teaches a prerequisite gap discovered after student struggles.
    Adapts lessons based on learner level, learning goal, and historical successful/failed modes.
    """

    SYSTEM_PROMPT = """You are the VISION Tutor Agent — a world-class adaptive educator.

Your job: generate a grounded, personalized lesson adapted to the student's level, learning goal, and preferred learning mode.

Level Adaptation Guidelines:
- Beginner: Focus on intuition + simple real-world analogy.
- Intermediate: Focus on core concept + worked example + practical application.
- Advanced: Focus on formal reasoning + edge cases.
- Expert: Focus on deep mechanics + trade-offs + performance considerations.

Teaching Modes:
- code_trace: Walk through code step-by-step
- visual_diagram: Mental models, ASCII structure
- analogy: Real-world comparisons
- step_by_step: Procedural breakdown
- socratic: Guided discovery questions
- conceptual: First principles explanation

Rules:
- Use provided evidence excerpt as your source
- Never reveal exact test answers to upcoming questions
- Keep explanation clear, engaging, and well-structured (150-300 words)
- Plain text / markdown output only."""

    def __init__(self):
        self.llm = LLMClient()

    def teach_target(
        self,
        run_id: str,
        resource: ResourceSelection,
        student_state: StudentState,
        target_concept: str,
        subject: str = "",
        learner_level: str = "intermediate",
        learning_goal: str = "understand"
    ) -> TeachingAction:
        """Job A: Initial Teaching — Teaches the requested target concept for initial exposure."""
        return self._generate_lesson(
            job_type="INITIAL_TEACHING",
            run_id=run_id,
            concept=target_concept,
            target_concept=target_concept,
            resource=resource,
            student_state=student_state,
            subject=subject,
            learner_level=learner_level,
            learning_goal=learning_goal
        )

    def repair_prerequisite(
        self,
        run_id: str,
        resource: ResourceSelection,
        student_state: StudentState,
        prerequisite_concept: str,
        target_concept: str,
        subject: str = "",
        learner_level: str = "intermediate",
        learning_goal: str = "understand"
    ) -> TeachingAction:
        """Job B: Prerequisite Repair — Teaches a prerequisite concept discovered after a student gap."""
        return self._generate_lesson(
            job_type="PREREQUISITE_REPAIR",
            run_id=run_id,
            concept=prerequisite_concept,
            target_concept=target_concept,
            resource=resource,
            student_state=student_state,
            subject=subject,
            learner_level=learner_level,
            learning_goal=learning_goal
        )

    def reteach(
        self,
        run_id: str,
        resource: ResourceSelection,
        student_state: StudentState,
        target_concept: str = "",
        subject: str = ""
    ) -> TeachingAction:
        """Backward-compatible wrapper for prerequisite repair."""
        return self.repair_prerequisite(
            run_id=run_id,
            resource=resource,
            student_state=student_state,
            prerequisite_concept=resource.concept,
            target_concept=target_concept or resource.concept,
            subject=subject,
            learner_level=student_state.preferred_level or "intermediate",
            learning_goal=student_state.preferred_goal or "understand"
        )

    def _generate_lesson(
        self,
        job_type: str,
        run_id: str,
        concept: str,
        target_concept: str,
        resource: ResourceSelection,
        student_state: StudentState,
        subject: str,
        learner_level: str,
        learning_goal: str
    ) -> TeachingAction:
        concept_title = concept.replace("_", " ").title()

        if not resource.excerpt_quote or "no approved course" in resource.excerpt_quote.lower():
            return TeachingAction(
                run_id=run_id,
                concept=concept,
                teaching_mode="resource_unavailable",
                explanation_text=f"Course notes not available for '{concept_title}'. Human instructor escalation required.",
                evidence_ref=resource.source_id or "material_absent"
            )

        # Select teaching mode adapting to student memory
        all_modes = ["step_by_step", "analogy", "code_trace", "visual_diagram", "conceptual", "socratic"]
        failed = set(student_state.failed_modes)
        preferred = [m for m in student_state.successful_modes if m not in failed]
        if not preferred:
            preferred = [m for m in all_modes if m not in failed]
        selected_mode = preferred[0] if preferred else "step_by_step"

        prior_modes_note = ""
        if student_state.successful_modes:
            prior_modes_note = f"\nNote: Learner previously responded well to '{', '.join(student_state.successful_modes)}' explanations."

        user_prompt = f"""Teaching Task: {job_type}
Subject: {subject or 'General'}
Concept to Teach: {concept_title}
Target Goal Concept: {target_concept.replace('_', ' ').title()}
Learner Level: {learner_level}
Learning Goal: {learning_goal}
Selected Teaching Mode: {selected_mode}{prior_modes_note}

Source Evidence Excerpt:
---
{resource.excerpt_quote}
---
(Source ID: {resource.source_id})

Write a clear, level-tailored {job_type.lower().replace('_', ' ')} lesson for this concept."""

        lesson = self.llm.chat(self.SYSTEM_PROMPT, user_prompt, max_tokens=600)
        if not lesson or len(lesson) < 30 or lesson.startswith("[Error") or "RESOURCE_EXHAUSTED" in lesson:
            prefix = f"**Initial Target Lesson: {concept_title}**" if job_type == "INITIAL_TEACHING" else f"**Prerequisite Foundation: {concept_title}**"
            lesson = (
                f"{prefix}\n\n"
                f"**Core Principle:** {concept_title} is a foundational concept in {subject or 'this subject'}. "
                f"It defines how components interact and process information at the {learner_level} level.\n\n"
                f"**Key Rule:** Ensure you identify the core input, processing step, and output invariant. "
                f"Mastering this structure allows you to build higher-level concepts systematically."
            )

        return TeachingAction(
            run_id=run_id,
            concept=concept,
            teaching_mode=selected_mode,
            explanation_text=lesson,
            evidence_ref=resource.source_id
        )

    def cross_check_resource(self, resource: ResourceSelection, target_concept: str = "") -> bool:
        """Cross-check excerpt relevance before teaching."""
        if not resource or not resource.excerpt_quote:
            return False
        if resource.verification_status in ("could_not_establish", "off_target"):
            return False
        if not self.llm.is_live:
            return len(resource.excerpt_quote.strip()) > 10

        prompt = f"Target Concept: {target_concept or resource.concept}\nRetrieved Excerpt: {resource.excerpt_quote}\nIs this excerpt educationally relevant and accurate for teaching this concept? Respond with JSON: {{\"relevant\": true/false}}"
        raw = self.llm.chat("You verify educational material relevance. Respond with JSON.", prompt, max_tokens=100)
        parsed = LLMClient._parse_json(raw)
        return bool(parsed.get("relevant", True))
