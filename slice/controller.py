"""
VISION Workflow Controller — Fully open-domain, 20-state deterministic engine.
Accepts any subject, any concept. No hardcoded domain data.
Delegates all AI reasoning to the 6 specialist agents.
"""

from __future__ import annotations
import json
import os
import uuid
from typing import Any, Dict, Optional

from slice.state_manager import (
    StateManager, StudentState, CourseContext, StudySession,
    Attempt, HumanQuestion, HumanDecision
)
from slice.validator import Validator
from slice.handoff import HandoffRecorder

from agents.supervisor import SupervisorAgent, _to_id
from agents.diagnostic import DiagnosticAgent
from agents.resource import ResourceAgent
from agents.tutor import TutorAgent
from agents.exercise import ExerciseAgent
from agents.evaluation import EvaluationAgent

CALL_BUDGET = 20
REVISION_LIMIT = 3


class WorkflowController:
    """
    Deterministic Authority Engine for VISION.
    Manages all 20 states, all guard conditions.
    Fully open-domain — subject and concept provided at runtime.
    """

    def __init__(self, db_path: str = "vision.db", domain_dir: str = "domain"):
        self.state_manager = StateManager(db_path=db_path)
        self.handoff_recorder = HandoffRecorder(self.state_manager)
        self.validator = Validator()
        self.domain_dir = domain_dir

        # Agents
        self.supervisor = SupervisorAgent()
        self.diagnostic = DiagnosticAgent()
        self.resource_agent = ResourceAgent()
        self.tutor = TutorAgent()
        self.exercise_agent = ExerciseAgent()
        self.evaluation_agent = EvaluationAgent()

    # ──────────────────────────── Session Start ──────────────────────────────

    def start_session(
        self,
        student_id: str,
        subject: str,
        target_concept: str,
        course_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Start a fully dynamic study session for ANY subject and concept.
        Dynamically builds prerequisite graph using Gemini.
        """
        run_id = f"run_{uuid.uuid4().hex[:10]}"
        course_id = course_id or _to_id(subject)
        target_id = _to_id(target_concept)

        # State 1: START_STUDY
        session = StudySession(
            run_id=run_id,
            student_id=student_id,
            course_id=course_id,
            target_concept=target_id,
            current_state="START_STUDY"
        )

        # State 2: READ_LEARNER_STATE
        session.current_state = "READ_LEARNER_STATE"
        student_state = self.state_manager.get_or_create_student_state(student_id, course_id)
        self.handoff_recorder.record(run_id, "Controller", "StateManager", "load_profile",
                                     "Loaded learner profile", [], [student_id])

        # State 3: LOAD_COURSE_CONTEXT — dynamic DAG generation via Gemini
        session.current_state = "LOAD_COURSE_CONTEXT"
        course_context, concept_titles = self.supervisor.build_course_context(subject, target_concept, course_id)
        session.call_count += 1
        self.handoff_recorder.record(run_id, "Supervisor", "Controller", "build_dag",
                                     f"Generated DAG for {subject}/{target_concept}",
                                     [], list(course_context.concepts))

        # State 4: PLAN_NEXT_ACTION
        session.current_state = "PLAN_NEXT_ACTION"
        plan = self.supervisor.plan_next_step(student_state, course_context, session)
        session.call_count += 1

        # State 5: PRACTICE — generate first question
        session.current_state = "PRACTICE"
        exercise = self.exercise_agent.generate_exercise(
            run_id, target_id, "initial_target",
            subject=subject, context=f"This is the first question to test the student."
        )
        session.call_count += 1
        self.handoff_recorder.record(run_id, "ExerciseAgent", "Controller", "initial_question",
                                     plan["reasoning"], [target_id], [exercise.question_text[:80]])

        session_data = {
            "subject": subject,
            "target_concept": target_concept,
            "target_id": target_id,
            "prereq_chain": [target_id],
            "concept_titles": concept_titles,
            "active_exercise": exercise.model_dump(),
            "dag": course_context.dependency_graph,
            "history": [],
            "taught_concepts": []
        }

        self.state_manager.save_study_session(session, session_data)
        self._persist_context(run_id, course_context)

        return {
            "run_id": run_id,
            "current_state": "PRACTICE",
            "subject": subject,
            "target_concept": target_concept,
            "target_id": target_id,
            "dag": course_context.dependency_graph,
            "concept_titles": concept_titles,
            "exercise": exercise.model_dump(),
            "session": session.model_dump(),
            "call_count": session.call_count
        }

    # ──────────────────────────── Answer Submission ──────────────────────────

    def submit_answer(self, run_id: str, student_answer: str) -> Dict[str, Any]:
        """Core state machine step — evaluates student answer and drives transitions."""
        raw = self.state_manager.get_study_session(run_id)
        if not raw:
            raise ValueError(f"Session {run_id} not found.")

        session_info = raw["session"]
        session = StudySession(**session_info)
        data = {k: v for k, v in raw.items() if k != "session"}

        student_state = self.state_manager.get_or_create_student_state(
            session.student_id, session.course_id
        )
        course_context = self._load_context(run_id, data)

        # Budget guard
        if session.call_count >= CALL_BUDGET:
            session.status = "given_up"
            session.current_state = "SESSION_COMPLETE"
            self.state_manager.save_study_session(session, data)
            return self._resp(run_id, "SESSION_COMPLETE", session,
                              message=f"Call budget limit reached ({CALL_BUDGET} steps). Session ended.",
                              status="given_up")

        current_concept = data["prereq_chain"][-1]
        active_ex = data["active_exercise"]
        subject = data.get("subject", "")

        # Record attempt
        attempt = Attempt(
            run_id=run_id,
            concept=current_concept,
            question=active_ex["question_text"],
            student_answer=student_answer
        )
        data["history"].append(attempt.model_dump())

        # State: EVALUATE
        session.current_state = "EVALUATE"
        evaluation = self.evaluation_agent.evaluate_attempt(attempt)
        session.call_count += 1
        self.handoff_recorder.record(run_id, "EvaluationAgent", "Controller", "evaluate",
                                     evaluation.reasoning, [student_answer[:60]], [evaluation.status])

        # ── demonstrated ──────────────────────────────────────────────────────
        if evaluation.status == "demonstrated":
            # Update learner state
            if current_concept not in student_state.mastered:
                student_state.mastered.append(current_concept)
            if current_concept in student_state.weak:
                student_state.weak.remove(current_concept)
            self.state_manager.save_student_state(student_state)

            if len(data["prereq_chain"]) > 1:
                # Prereq repaired — go back up
                data["prereq_chain"].pop()
                orig_concept = data["prereq_chain"][-1]
                session.current_state = "RECHECK_ORIGINAL"
                retest = self.exercise_agent.generate_exercise(
                    run_id, orig_concept, "target_retest",
                    subject=subject, context=f"Prereq {current_concept} was just mastered."
                )
                session.call_count += 1
                data["active_exercise"] = retest.model_dump()
                self.state_manager.save_study_session(session, data)
                return self._resp(run_id, "PRACTICE", session,
                                  exercise=retest.model_dump(),
                                  message=f"✅ '{self._title(current_concept, data)}' mastered! Now re-testing '{self._title(orig_concept, data)}'.",
                                  evaluation=evaluation.model_dump())

            else:
                # Target mastered!
                session.current_state = "TARGET_MASTERED"
                session.status = "completed"
                session.current_state = "SESSION_COMPLETE"
                self.state_manager.save_study_session(session, data)
                return self._resp(run_id, "SESSION_COMPLETE", session,
                                  message=f"🎉 Congratulations! You have mastered '{data['target_concept']}'.",
                                  status="completed",
                                  evaluation=evaluation.model_dump())

        # ── uncertain ─────────────────────────────────────────────────────────
        elif evaluation.status == "uncertain":
            session.current_state = "TIE_BREAKER"
            tie_q = self.exercise_agent.generate_exercise(
                run_id, current_concept, "tie_breaker",
                subject=subject,
                context=f"Student gave ambiguous answer: '{student_answer[:80]}'"
            )
            session.call_count += 1
            data["active_exercise"] = tie_q.model_dump()
            self.state_manager.save_study_session(session, data)
            return self._resp(run_id, "PRACTICE", session,
                              exercise=tie_q.model_dump(),
                              message="🤔 Answer was ambiguous — here's a clarifying question.",
                              evaluation=evaluation.model_dump())

        # ── unresolved ────────────────────────────────────────────────────────
        else:
            if current_concept not in student_state.weak:
                student_state.weak.append(current_concept)
            self.state_manager.save_student_state(student_state)

            # State: DIAGNOSE_GAP
            session.current_state = "DIAGNOSE_GAP"
            gap = self.diagnostic.diagnose_gap(attempt, course_context)
            session.call_count += 1
            self.handoff_recorder.record(run_id, "DiagnosticAgent", "Validator", "propose_gap",
                                         gap.evidence_refs[0] if gap.evidence_refs else "",
                                         [current_concept], [gap.candidate_prerequisite])

            # State: VALIDATE_HYPOTHESIS
            session.current_state = "VALIDATE_HYPOTHESIS"
            is_valid = self.validator.validate_prerequisite_edge(
                course_context.dependency_graph,
                current_concept,
                gap.candidate_prerequisite
            )

            if not is_valid and gap.candidate_prerequisite != current_concept:
                # Invalid edge → WAITING_FOR_HUMAN
                session.status = "waiting_human"
                session.current_state = "WAITING_FOR_HUMAN"
                hq = HumanQuestion(
                    run_id=run_id,
                    question=f"Diagnostic Agent proposed '{gap.candidate_prerequisite}' as prerequisite for '{current_concept}', but this edge is not in the course DAG. What should we do?",
                    options=["Force the prerequisite (add edge)", "Skip prerequisite — go to a known one", "Mark concept as given up"]
                )
                data["human_question"] = hq.model_dump()
                self.state_manager.save_study_session(session, data)
                return self._resp(run_id, "WAITING_FOR_HUMAN", session,
                                  human_question=hq.model_dump(),
                                  evaluation=evaluation.model_dump())

            target_prereq = gap.candidate_prerequisite

            # State: SELECT_RESOURCE
            session.current_state = "SELECT_RESOURCE"
            resource = self.resource_agent.select_resource(run_id, target_prereq, subject=subject)
            session.call_count += 1

            # State: RESOURCE_CROSS_CHECK
            session.current_state = "RESOURCE_CROSS_CHECK"
            is_relevant, _ = self.validator.verify_resource_cross_check(target_prereq, resource.excerpt_quote)
            if not is_relevant:
                resource = self.resource_agent.select_resource(run_id, target_prereq, subject=subject)
                session.call_count += 1

            # State: RETEACH_PREREQ
            session.current_state = "RETEACH_PREREQ"
            teaching = self.tutor.reteach(
                run_id, resource, student_state,
                target_concept=data["target_concept"],
                subject=subject
            )
            session.call_count += 1

            # Track successful mode
            if teaching.teaching_mode not in student_state.successful_modes:
                student_state.successful_modes.append(teaching.teaching_mode)
                self.state_manager.save_student_state(student_state)

            # State: GENERATE_EXERCISE
            session.current_state = "GENERATE_EXERCISE"
            prereq_ex = self.exercise_agent.generate_exercise(
                run_id, target_prereq, "prereq_recheck",
                subject=subject,
                context=f"Student just received a lesson on {target_prereq}."
            )
            session.call_count += 1

            # Revision depth tracking
            if target_prereq not in data["prereq_chain"]:
                data["prereq_chain"].append(target_prereq)
                session.revision_count += 1
            data["taught_concepts"].append(target_prereq)

            # Revision limit guard
            if session.revision_count >= REVISION_LIMIT:
                session.status = "waiting_human"
                session.current_state = "WAITING_FOR_HUMAN"
                hq = HumanQuestion(
                    run_id=run_id,
                    question=f"Revision limit reached ({session.revision_count}/{REVISION_LIMIT} levels deep). The student has been reteaching through: {' → '.join(data['prereq_chain'])}. Human instructor intervention needed.",
                    options=["Continue with a hint", "Override — mark current prereq as mastered", "End session and provide manual help"]
                )
                data["human_question"] = hq.model_dump()
                data["active_exercise"] = prereq_ex.model_dump()
                data["teaching_action"] = teaching.model_dump()
                self.state_manager.save_study_session(session, data)
                return self._resp(run_id, "WAITING_FOR_HUMAN", session,
                                  human_question=hq.model_dump(),
                                  teaching_action=teaching.model_dump(),
                                  evaluation=evaluation.model_dump())

            data["active_exercise"] = prereq_ex.model_dump()
            data["teaching_action"] = teaching.model_dump()
            session.current_state = "PRACTICE"
            self.state_manager.save_study_session(session, data)

            return self._resp(run_id, "PRACTICE", session,
                              exercise=prereq_ex.model_dump(),
                              teaching_action=teaching.model_dump(),
                              message=f"🔍 Gap found in '{self._title(target_prereq, data)}'. Lesson provided — now test yourself!",
                              evaluation=evaluation.model_dump(),
                              gap_hypothesis=gap.model_dump())

    # ──────────────────────────── Human Resume ───────────────────────────────

    def resume_human_decision(self, run_id: str, decision: str) -> Dict[str, Any]:
        raw = self.state_manager.get_study_session(run_id)
        if not raw:
            raise ValueError(f"Session {run_id} not found.")

        session = StudySession(**raw["session"])
        data = {k: v for k, v in raw.items() if k != "session"}

        session.status = "active"
        session.current_state = "RESUME"
        session.revision_count = max(0, session.revision_count - 1)

        self.handoff_recorder.record(run_id, "HumanInstructor", "Controller", "resume",
                                     f"Decision: {decision}", [], [decision])

        session.current_state = "PRACTICE"
        self.state_manager.save_study_session(session, data)

        return self._resp(run_id, "PRACTICE", session,
                          exercise=data.get("active_exercise"),
                          message=f"▶️ Session resumed. Human decision: '{decision}'.")

    # ──────────────────────────── Helpers ────────────────────────────────────

    def _title(self, concept_id: str, data: dict) -> str:
        return data.get("concept_titles", {}).get(concept_id, concept_id.replace("_", " ").title())

    def _resp(self, run_id: str, state: str, session: StudySession, **kwargs) -> Dict[str, Any]:
        return {"run_id": run_id, "current_state": state, "session": session.model_dump(), **kwargs}

    def _persist_context(self, run_id: str, ctx: CourseContext):
        pass  # Context stored in session_data["dag"]

    def _load_context(self, run_id: str, data: dict) -> CourseContext:
        dag = data.get("dag", {})
        concepts = list(dag.keys())
        return CourseContext(
            course_id=data.get("target_id", "dynamic"),
            course_name=data.get("subject", "Dynamic Subject"),
            concepts=concepts,
            dependency_graph=dag,
            source_ids=["gemini-dynamic"]
        )
