"""
VISION Supervisor Agent — Specialized for Computer Science & Programming.
Focus areas: Data Structures, Algorithms, Programming Languages (C++, Java, Python, C, JS/TS, Go, Rust),
Web Frameworks (React, Angular, Vue, Node.js, Next.js, Django), Databases, and Systems.
Dynamically builds prerequisite graphs and conducts Prerequisite Readiness Checks.
"""

from __future__ import annotations
from typing import Dict, Any, List, Optional
from slice.state_manager import StudentState, CourseContext, StudySession
from slice.llm_client import LLMClient
import json
from pathlib import Path


class SupervisorAgent:
    """
    Session Coordinator & Prerequisite Architecture Agent for Computer Science.
    Capabilities:
    1. Generates CS prerequisite DAGs (Data Structures, Algorithms, Frameworks, Languages).
    2. Generates 2-3 question Prerequisite Readiness Quizzes for self-declared "partially" known topics.
    3. Evaluates quiz responses against a 70% mastery threshold.
    4. Orchestrates study pathways and dynamic topic switching.
    """

    SYSTEM_PROMPT_DAG = """You are a Principal Computer Science Curriculum Architect and Knowledge Graph Engineer.

Your domain is STRICTLY COMPUTER SCIENCE & SOFTWARE DEVELOPMENT:
- Data Structures & Algorithms (Stacks, Queues, Trees, Graphs, Hash Maps, Dynamic Programming, etc.)
- Programming Languages (C++, Python, Java, C, JavaScript, TypeScript, Go, Rust)
- Web & App Frameworks (React, Angular, Vue, Node.js, Next.js, Django, Spring Boot, etc.)
- Core Systems (Pointers, Memory Allocation, Operating Systems, Concurrency, Databases, System Design)

Given a CS subject/framework/language and a target concept, generate an exact prerequisite dependency graph.
Return ONLY a JSON object with this structure:
{
  "course_name": "<subject/framework/language name>",
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
- Strictly CS & Programming domain.
- Use clean snake_case for concept IDs (e.g., 'arrays', 'pointers_and_references', 'memory_allocation', 'virtual_dom').
- Include the target concept and its direct + indirect prerequisites (1 to 3 levels deep).
- Target concept MUST have its direct prerequisites listed under its key.
- Max 6-8 concepts total for optimal learning efficiency.
- All prerequisite IDs must also appear as keys in dependency_graph."""

    SYSTEM_PROMPT_PREREQ_QUIZ = """You are the VISION Prerequisite Diagnostic Examiner for Computer Science.
Generate a focused 2-3 question diagnostic quiz to verify if a student genuinely understands the prerequisite concept.
Questions must test fundamental conceptual understanding or code behavior in Computer Science.

Return JSON only in this exact structure:
{
  "concept": "<concept_id>",
  "questions": [
    {
      "id": 1,
      "question": "<Clear, concise CS question>",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_index": 0, // 0-based index of correct option
      "explanation": "<Brief explanation of why this answer is correct>"
    },
    {
      "id": 2,
      "question": "<Second CS question>",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_index": 1,
      "explanation": "<Brief explanation>"
    }
  ]
}"""

    def __init__(self):
        self.llm = LLMClient()

    def build_course_context(self, subject: str, target_concept: str, course_id: str) -> tuple[CourseContext, Dict[str, str]]:
        """Dynamically generates a CS prerequisite DAG for any programming topic using Gemini."""
        target_id = _to_id(target_concept)
        domain_graph = Path(__file__).resolve().parent.parent / "domain" / "prerequisite_graph.json"
        
        # Offline fixture fallback for quick smoke tests
        if not self.llm.is_live and (target_id == "binary_tree_inorder_traversal" or "data structure" in subject.lower()):
            if domain_graph.exists():
                payload = json.loads(domain_graph.read_text(encoding="utf-8"))
                nodes = payload.get("nodes", [])
                graph = {node["id"]: node.get("prerequisites", []) for node in nodes}
                titles = {node["id"]: node.get("title", node["id"]) for node in nodes}
                return CourseContext(
                    course_id=course_id,
                    course_name="Data Structures",
                    concepts=list(graph),
                    dependency_graph=graph,
                    source_ids=["data_structures_notes.md"],
                ), titles

        user_prompt = f"""Computer Science Subject/Area: {subject}
Target Programming Concept: {target_concept}

Generate the prerequisite dependency graph strictly for Computer Science / Software Engineering.
Return JSON only."""

        result = self.llm.escalate(self.SYSTEM_PROMPT_DAG, user_prompt, max_tokens=1024)
        if isinstance(result, str):
            from slice.llm_client import LLMClient as _LC
            result = _LC._parse_json(result)

        dep_graph: Dict[str, List[str]] = result.get("dependency_graph", {})
        concepts: List[str] = result.get("concepts", [])
        concept_titles: Dict[str, str] = result.get("concept_titles", {})
        course_name = result.get("course_name", subject)

        # Ensure target is in graph
        if target_id not in dep_graph:
            dep_graph[target_id] = []
        if target_id not in concepts:
            concepts.insert(0, target_id)
        if target_id not in concept_titles:
            concept_titles[target_id] = target_concept

        # Ensure all prereqs exist as keys
        for prereqs in list(dep_graph.values()):
            for p in prereqs:
                if p not in dep_graph:
                    dep_graph[p] = []
                if p not in concepts:
                    concepts.append(p)
                if p not in concept_titles:
                    concept_titles[p] = p.replace("_", " ").title()

        return CourseContext(
            course_id=course_id,
            course_name=course_name,
            concepts=concepts,
            dependency_graph=dep_graph,
            source_ids=["gemini-dynamic-dag", "corpus"]
        ), concept_titles

    def generate_prereq_quiz(self, prereq_concept: str, subject: str = "", count: int = 2) -> Dict[str, Any]:
        """Generates a 2-question diagnostic multiple choice quiz to test 'Partially' known prerequisites."""
        concept_clean = prereq_concept.replace("_", " ").title()

        if not self.llm.is_live:
            return {
                "concept": prereq_concept,
                "concept_title": concept_clean,
                "questions": [
                    {
                        "id": 1,
                        "question": f"In Computer Science, what is the core purpose or defining characteristic of {concept_clean}?",
                        "options": [
                            f"It manages structure, sequencing, or references for dependent operations.",
                            f"It completely bypasses memory management.",
                            f"It is only used for graphic rendering.",
                            f"It terminates program execution immediately."
                        ],
                        "correct_index": 0,
                        "explanation": f"{concept_clean} is a foundational building block for data handling and program flow."
                    },
                    {
                        "id": 2,
                        "question": f"Which of the following statements about {concept_clean} is TRUE?",
                        "options": [
                            f"It cannot be combined with other data structures.",
                            f"Understanding it is required to reason about more complex composite structures.",
                            f"It has zero runtime complexity.",
                            f"It is deprecated in modern programming languages."
                        ],
                        "correct_index": 1,
                        "explanation": f"{concept_clean} forms the prerequisite foundation for higher-level structures and algorithms."
                    }
                ]
            }

        user_prompt = f"""Subject/Language: {subject or 'Computer Science'}
Prerequisite Concept: {prereq_concept} ({concept_clean})
Number of diagnostic questions: {count}

Generate a high quality {count}-question CS diagnostic check."""

        raw = self.llm.chat_json(self.SYSTEM_PROMPT_PREREQ_QUIZ, user_prompt, max_tokens=768)
        questions = raw.get("questions", [])
        if not questions:
            # Fallback
            return self.generate_prereq_quiz(prereq_concept, subject, count=2)

        return {
            "concept": prereq_concept,
            "concept_title": concept_clean,
            "questions": questions
        }

    def evaluate_prereq_quiz(
        self,
        prereq_concept: str,
        quiz_data: Dict[str, Any],
        student_answers: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Evaluates student's responses to the prerequisite quiz.
        Returns score percentage, passed (>= 70%), and itemized breakdown.
        """
        questions = quiz_data.get("questions", [])
        if not questions:
            return {"score": 100.0, "passed": True, "details": []}

        correct_count = 0
        total_count = len(questions)
        details = []

        for q in questions:
            q_id = str(q.get("id"))
            selected = student_answers.get(q_id)
            correct_idx = q.get("correct_index", 0)
            
            # Match either index (int or str) or exact option text
            is_correct = False
            if selected is not None:
                if str(selected).isdigit() and int(selected) == correct_idx:
                    is_correct = True
                elif isinstance(selected, str) and q.get("options") and selected in q["options"]:
                    if q["options"].index(selected) == correct_idx:
                        is_correct = True

            if is_correct:
                correct_count += 1

            details.append({
                "question_id": q.get("id"),
                "question": q.get("question"),
                "selected": selected,
                "correct_option": q.get("options", [])[correct_idx] if q.get("options") and correct_idx < len(q.get("options")) else correct_idx,
                "is_correct": is_correct,
                "explanation": q.get("explanation", "")
            })

        score = (correct_count / total_count) * 100.0
        passed = score >= 70.0

        return {
            "concept": prereq_concept,
            "score": round(score, 1),
            "passed": passed,
            "correct_count": correct_count,
            "total_count": total_count,
            "details": details,
            "threshold": 70.0
        }

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

Plan the next step for this CS topic. Return JSON."""

        if not self.llm.is_live:
            return {
                "target_concept": session.target_concept,
                "next_agent": "Exercise",
                "action": "generate_initial_target_question",
                "reasoning": "Start with a low-stakes target check before deciding whether a prerequisite needs repair.",
            }

        result = self.llm.chat_json(
            "You are the VISION Supervisor Agent. Plan the next action. Return JSON: {\"target_concept\": \"...\", \"next_agent\": \"...\", \"action\": \"...\", \"reasoning\": \"...\"}",
            user_prompt,
            max_tokens=256
        )
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

