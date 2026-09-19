"""
VISION Supervisor Agent — Fully dynamic, open-domain.
Uses Gemini to dynamically build prerequisite graphs for ANY subject/concept
and plan adaptive study strategies.
"""

from __future__ import annotations
from typing import Dict, Any, List
from slice.state_manager import StudentState, CourseContext, StudySession
from slice.llm_client import LLMClient
import json
from pathlib import Path


class SupervisorAgent:
    """
    Session Coordinator Agent.
    Key capability: dynamically generates prerequisite DAGs for any subject/concept
    using Gemini — no domain data needed at startup.
    """

    SYSTEM_PROMPT_DAG = """You are an expert curriculum designer and knowledge graph engineer.

Given a subject and a target concept, generate a prerequisite dependency graph.
Return ONLY a JSON object with this structure:
{
  "course_name": "<subject name>",
  "concepts": ["concept_id_1", "concept_id_2", ...],
  "dependency_graph": {
    "concept_id_1": ["prereq_a", "prereq_b"],
    "concept_id_2": [],
    ...
  },
  "concept_titles": {
    "concept_id_1": "Human-readable concept name",
    ...
  }
}

Rules:
- Use snake_case for concept IDs
- Include the target concept and all its prerequisites (2-4 levels deep max)
- Include one unrelated/invalid concept to test edge rejection (label it: "unrelated_concept")
- Max 8 concepts total
- The target concept should be the hardest concept (has the most prerequisites)
- All prerequisite IDs must also appear as keys in dependency_graph"""

    SYSTEM_PROMPT_PLAN = """You are the VISION Supervisor Agent.
Plan the next step in the student's adaptive study session.
Return JSON:
{
  "target_concept": "<concept id>",
  "next_agent": "Exercise | Diagnostic | Tutor",
  "action": "<action name>",
  "reasoning": "<brief reasoning>"
}"""

    def __init__(self):
        self.llm = LLMClient()

    def build_course_context(self, subject: str, target_concept: str, course_id: str) -> CourseContext:
        """Dynamically generates a prerequisite DAG for any subject/concept using Gemini."""
        # The curated demo context is the source of truth for the hackathon
        # walkthrough. Loading it locally also makes the app usable without a
        # network call or an API key.
        target_id = _to_id(target_concept)
        domain_graph = Path(__file__).resolve().parent.parent / "domain" / "prerequisite_graph.json"
        if not self.llm.is_live and (target_id == "binary_tree_inorder_traversal" or "data structure" in subject.lower()):
            payload = json.loads(domain_graph.read_text(encoding="utf-8"))
            nodes = payload["nodes"]
            graph = {node["id"]: node.get("prerequisites", []) for node in nodes}
            titles = {node["id"]: node.get("title", node["id"]) for node in nodes}
            return CourseContext(
                course_id=course_id,
                course_name="Data Structures",
                concepts=list(graph),
                dependency_graph=graph,
                source_ids=["data_structures_notes.md"],
            ), titles

        user_prompt = f"""Subject: {subject}
Target concept to master: {target_concept}

Generate the prerequisite dependency graph. Concept IDs should be derived from concept names
(snake_case, descriptive). Return JSON."""

        # Use escalation model for DAG generation (most complex task)
        result = self.llm.escalate(self.SYSTEM_PROMPT_DAG, user_prompt, max_tokens=1024)
        if isinstance(result, str):
            from slice.llm_client import LLMClient as _LC
            result = _LC._parse_json(result)

        dep_graph: Dict[str, List[str]] = result.get("dependency_graph", {})
        concepts: List[str] = result.get("concepts", [])
        concept_titles: Dict[str, str] = result.get("concept_titles", {})
        course_name = result.get("course_name", subject)

        # Ensure target is in graph
        target_id = _to_id(target_concept)
        if target_id not in dep_graph:
            dep_graph[target_id] = []
        if target_id not in concepts:
            concepts.insert(0, target_id)

        # Ensure all prereqs exist as keys
        for prereqs in list(dep_graph.values()):
            for p in prereqs:
                if p not in dep_graph:
                    dep_graph[p] = []
                if p not in concepts:
                    concepts.append(p)

        return CourseContext(
            course_id=course_id,
            course_name=course_name,
            concepts=concepts,
            dependency_graph=dep_graph,
            source_ids=["gemini-dynamic-dag", "corpus"]
        ), concept_titles

    def plan_next_step(
        self,
        student_state: StudentState,
        course_context: CourseContext,
        session: StudySession
    ) -> Dict[str, Any]:
        user_prompt = f"""Target concept: {session.target_concept}
Mastered: {student_state.mastered}
Weak: {student_state.weak}
Call count so far: {session.call_count}

Plan the next step. Return JSON."""

        if not self.llm.is_live:
            return {
                "target_concept": session.target_concept,
                "next_agent": "Exercise",
                "action": "generate_initial_target_question",
                "reasoning": "Start with a low-stakes target check before deciding whether a prerequisite needs repair.",
            }

        result = self.llm.chat_json(self.SYSTEM_PROMPT_PLAN, user_prompt, max_tokens=256)
        return {
            "target_concept": result.get("target_concept", session.target_concept),
            "next_agent": result.get("next_agent", "Exercise"),
            "action": result.get("action", "generate_initial_target_question"),
            "reasoning": result.get("reasoning", "Initiating study session.")
        }


def _to_id(text: str) -> str:
    """Convert concept name to snake_case id."""
    import re
    return re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_")
