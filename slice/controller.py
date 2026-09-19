"""
VISION Workflow Controller — Fully open-domain, 20-state deterministic engine.
Accepts any subject, any concept. No hardcoded domain data.
Delegates all AI reasoning to the 6 specialist agents.
"""

from __future__ import annotations
import json
import os
import uuid
from datetime import datetime, timezone
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

    def __init__(self, db_path: str = "vision.db", domain_dir: str = "domain", state_manager=None):
        self.state_manager = state_manager or StateManager(db_path=db_path)
        self.handoff_recorder = HandoffRecorder(self.state_manager)
        self.validator = Validator()
        self.domain_dir = domain_dir

        # Agents
        self.supervisor = SupervisorAgent()
        self.diagnostic = DiagnosticAgent()
        corpus_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "corpus")
        self.resource_agent = ResourceAgent(corpus_dir=corpus_dir)
        self.tutor = TutorAgent()
        self.exercise_agent = ExerciseAgent()
        self.evaluation_agent = EvaluationAgent()

    # ──────────────────────────── Session Start ──────────────────────────────

    def start_session(
        self,
        student_id: str,
        subject: str,
        target_concept: str,
        course_id: Optional[str] = None,
        learner_level: str = "intermediate",
        learning_goal: str = "understand",
        user_notes: Optional[str] = None,
        defer_practice: bool = True,
    ) -> Dict[str, Any]:
        """
        Start a study session:
          1. Reads student state (separates general learner memory vs course-scoped memory).
          2. Dynamically builds prerequisite graph context.
          3. Resource Agent selects evidence.
          4. Tutor Agent delivers Job A: Initial Teaching for target concept.
          5. Deferred practice: Question is NOT generated until learner explicitly clicks 'Start Practice'.
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
            current_state="START_STUDY",
            learner_level=learner_level,
            learning_goal=learning_goal,
        )

        # State 2: READ_LEARNER_STATE
        session.current_state = "READ_LEARNER_STATE"
        student_state = self.state_manager.get_or_create_student_state(student_id, course_id)
        self.handoff_recorder.record(run_id, "Controller", "StateManager", "load_profile",
                                     "Loaded learner profile", [], [student_id])

        # State 3: LOAD_COURSE_CONTEXT
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

        # State 5: INITIAL_TEACHING — Teach the concept first before practice!
        session.current_state = "INITIAL_TEACHING"
        resource = self.resource_agent.select_resource(run_id, target_id, subject=subject, user_notes=user_notes)
        teaching = self.tutor.teach_target(
            run_id=run_id,
            resource=resource,
            student_state=student_state,
            target_concept=target_concept,
            subject=subject,
            learner_level=learner_level,
            learning_goal=learning_goal
        )
        session.call_count += 1
        self.handoff_recorder.record(
            run_id, "TutorAgent", "Controller", "initial_teaching",
            f"Delivered initial lesson for {target_concept}",
            [target_id], [teaching.explanation_text[:80]]
        )
        self._event(run_id, "INITIAL_TEACHING", "TutorAgent", "teach_target", "lesson_ready", f"Initial lesson delivered at {learner_level} level")

        # Initial teaching must NOT create an Attempt or generate question
        exercise = None
        if not defer_practice:
            session.current_state = "PRACTICE"
            exercise = self.exercise_agent.generate_exercise(
                run_id, target_id, "initial_target", subject=subject,
                context=f"Initial lesson completed. Level: {learner_level}; Goal: {learning_goal}.",
                learner_level=learner_level, learning_goal=learning_goal
            )
            session.call_count += 1

        session.agent_activities = {
            "SupervisorAgent": f"ADAPTIVE AGENT COORDINATION — VISION IS CHOOSING THE NEXT ACTION",
            "DiagnosticAgent": "Ready — monitoring learner attempts",
            "ResourceAgent": f"Retrieved course evidence for {target_concept} (Status: {resource.verification_status})",
            "TutorAgent": f"Delivered initial lesson mode '{teaching.teaching_mode}' for {target_concept}",
            "ExerciseAgent": (f"Generated {exercise.question_format.upper()} exercise" if exercise else "Ready — practice begins when learner chooses it"),
            "EvaluationAgent": ("Awaiting response" if exercise else "Ready — no attempts yet")
        }

        session_data = {
            "subject": subject,
            "target_concept": target_concept,
            "target_id": target_id,
            "prereq_chain": [target_id],
            "concept_titles": concept_titles,
            "teaching_action": teaching.model_dump(),
            "resource_selection": resource.model_dump(),
            "dag": course_context.dependency_graph,
            "history": [],
            "taught_concepts": [target_id]
        }
        if exercise:
            session_data["active_exercise"] = exercise.model_dump()

        self.state_manager.save_study_session(session, session_data)
        self._persist_context(run_id, course_context)

        return {
            "run_id": run_id,
            "current_state": ("PRACTICE" if exercise else "INITIAL_TEACHING"),
            "subject": subject,
            "target_concept": target_concept,
            "target_id": target_id,
            "dag": course_context.dependency_graph,
            "concept_titles": concept_titles,
            "teaching_action": teaching.model_dump(),
            "resource_selection": resource.model_dump(),
            "session": session.model_dump(),
            "call_count": session.call_count
        }

    # ──────────────────────────── Answer Submission & Practice ───────────────

    def begin_practice(self, run_id: str, skip_lesson: bool = False) -> Dict[str, Any]:
        """Move into assessment only after an explicit learner action."""
        raw = self.state_manager.get_study_session(run_id)
        if not raw:
            raise ValueError(f"Session {run_id} not found.")
        session = StudySession(**raw["session"])
        data = {k: v for k, v in raw.items() if k != "session"}
        if session.current_state not in {"INITIAL_TEACHING", "PRACTICE"}:
            raise ValueError(f"Cannot begin practice from {session.current_state}.")

        session.learning_phase_completed = True
        session.lesson_skipped = bool(skip_lesson)
        session.current_state = "GENERATE_EXERCISE"

        exercise = self.exercise_agent.generate_exercise(
            run_id, data["target_id"], "initial_target", subject=data.get("subject", ""),
            context=f"Learner level: {session.learner_level}; goal: {session.learning_goal}. Initial lesson completed.",
            learner_level=session.learner_level, learning_goal=session.learning_goal, attempt_count=session.attempt_count
        )
        session.call_count += 1
        data["active_exercise"] = exercise.model_dump()

        session.agent_activities["SupervisorAgent"] = "ADAPTIVE AGENT COORDINATION — VISION IS CHOOSING THE NEXT ACTION"
        session.agent_activities["ExerciseAgent"] = f"Generated {exercise.question_format.upper()} exercise for {data['target_concept']}"
        session.agent_activities["EvaluationAgent"] = "Ready — awaiting first attempt"
        session.current_state = "PRACTICE"

        self.handoff_recorder.record(run_id, "Controller", "ExerciseAgent", "begin_practice", "Learner explicitly started practice", [data["target_id"]], [exercise.question_text[:80]])
        self._event(run_id, "GENERATE_EXERCISE", "ExerciseAgent", "begin_practice", "question_ready", "Learner explicitly started practice")
        self.state_manager.save_study_session(session, data)

        cleaned_ex = self._sanitize_exercise_for_client(exercise.model_dump())
        return self._resp(run_id, "PRACTICE", session, exercise=cleaned_ex, teaching_action=data.get("teaching_action"), message="Practice started. Your first adaptive exercise is ready.")

    def submit_answer(
        self,
        run_id: str,
        student_answer: str,
        selected_option: Optional[str] = None,
        code_submission: Optional[str] = None,
        test_results: Optional[list] = None,
        user_notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """Core state machine step — evaluates student answer/code and drives transitions."""
        raw = self.state_manager.get_study_session(run_id)
        if not raw:
            raise ValueError(f"Session {run_id} not found.")

        session_info = raw["session"]
        session = StudySession(**session_info)
        data = {k: v for k, v in raw.items() if k != "session"}

        if not data.get("active_exercise"):
            raise ValueError("Practice has not started. Complete the lesson and begin practice first.")

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

        # Record attempt only upon answer submission
        attempt = Attempt(
            run_id=run_id,
            concept=current_concept,
            question=active_ex["question_text"],
            student_answer=student_answer or selected_option or (code_submission[:100] if code_submission else ""),
            selected_option=selected_option,
            code_submission=code_submission,
            test_results=test_results or []
        )
        data["history"].append(attempt.model_dump())
        session.attempt_count += 1

        # State: EVALUATE
        session.current_state = "EVALUATE"
        session.agent_activities["EvaluationAgent"] = f"Evaluating response ({active_ex.get('question_format', 'free_text')})"
        evaluation = self.evaluation_agent.evaluate_attempt(attempt)
        session.call_count += 1
        self._event(run_id, "EVALUATE", "EvaluationAgent", "evaluate_attempt", evaluation.status, evaluation.reasoning)
        self.handoff_recorder.record(run_id, "EvaluationAgent", "Controller", "evaluate",
                                     evaluation.reasoning, [student_answer[:60]], [evaluation.status])

        # ── demonstrated ──────────────────────────────────────────────────────
        if evaluation.status == "demonstrated":
            if active_ex.get("exercise_type") == "tie_breaker":
                session.current_state = "RE_EVALUATE"
                retest = self.exercise_agent.generate_exercise(
                    run_id, data["target_id"], "target_retest",
                    subject=subject, context="Tie-breaker passed; verify original target concept.",
                    learner_level=session.learner_level, learning_goal=session.learning_goal, attempt_count=session.attempt_count
                )
                session.call_count += 1
                data["active_exercise"] = retest.model_dump()
                self.state_manager.save_study_session(session, data)
                return self._resp(run_id, "PRACTICE", session,
                                  exercise=self._sanitize_exercise_for_client(retest.model_dump()),
                                  message="✓ Exit ticket passed. Let’s verify the original concept with a fresh exercise.",
                                  evaluation=evaluation.model_dump())

            # Update learner state
            if current_concept not in student_state.mastered:
                student_state.mastered.append(current_concept)
            if current_concept in student_state.weak:
                student_state.weak.remove(current_concept)
            self.state_manager.save_student_state(student_state)

            if len(data["prereq_chain"]) > 1:
                # Prereq repaired — return to target concept
                data["prereq_chain"].pop()
                orig_concept = data["prereq_chain"][-1]
                session.current_state = "RECHECK_ORIGINAL"
                retest = self.exercise_agent.generate_exercise(
                    run_id, orig_concept, "target_retest",
                    subject=subject, context=f"Prerequisite {current_concept} was repaired and mastered.",
                    learner_level=session.learner_level, learning_goal=session.learning_goal, attempt_count=session.attempt_count
                )
                session.call_count += 1
                data["active_exercise"] = retest.model_dump()
                self.state_manager.save_study_session(session, data)
                return self._resp(run_id, "PRACTICE", session,
                                  exercise=self._sanitize_exercise_for_client(retest.model_dump()),
                                  message=f"✅ '{self._title(current_concept, data)}' mastered! Retesting '{self._title(orig_concept, data)}'.",
                                  evaluation=evaluation.model_dump())
            else:
                # Target mastered!
                session.current_state = "TARGET_MASTERED"
                session.status = "completed"
                session.current_state = "SESSION_COMPLETE"
                self.state_manager.save_study_session(session, data)
                return self._resp(run_id, "SESSION_COMPLETE", session,
                                  message=f"🎉 Mastery demonstrated for '{data['target_concept']}'.",
                                  status="completed",
                                  evaluation=evaluation.model_dump())

        # ── uncertain ─────────────────────────────────────────────────────────
        elif evaluation.status == "uncertain":
            session.current_state = "TIE_BREAKER"
            tie_exit_ticket = self.diagnostic.generate_tie_breaker(current_concept, subject=subject)
            tie_q = self.exercise_agent.generate_exercise(
                run_id, current_concept, "tie_breaker",
                subject=subject,
                context=f"Exit Ticket: {tie_exit_ticket.get('question')} | Ambiguous response: '{student_answer[:80]}'",
                learner_level=session.learner_level, learning_goal=session.learning_goal
            )
            session.call_count += 1
            data["active_exercise"] = tie_q.model_dump()
            self.state_manager.save_study_session(session, data)
            return self._resp(run_id, "TIE_BREAKER", session,
                              exercise=self._sanitize_exercise_for_client(tie_q.model_dump()),
                              message="🤔 Response ambiguous — completing a 1-step Concept Exit Ticket.",
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
            gap.diagnostic_status = "HYPOTHESIS_PROPOSED"
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
                gap.diagnostic_status = "COULD_NOT_ESTABLISH"
                session.status = "waiting_human"
                session.current_state = "WAITING_FOR_HUMAN"
                hq = HumanQuestion(
                    run_id=run_id,
                    question=f"Diagnostic Agent proposed '{gap.candidate_prerequisite}' as prerequisite for '{current_concept}', but graph validation status is 'could_not_establish'. What action should be taken?",
                    options=["Add learning material", "Continue with supported path", "Switch explanation mode", "End session"]
                )
                data["human_question"] = hq.model_dump()
                self.state_manager.save_study_session(session, data)
                return self._resp(run_id, "WAITING_FOR_HUMAN", session,
                                  human_question=hq.model_dump(),
                                  evaluation=evaluation.model_dump(),
                                  gap_hypothesis=gap.model_dump())

            gap.diagnostic_status = "EDGE_VALIDATED"
            target_prereq = gap.candidate_prerequisite

            # State: SELECT_RESOURCE
            session.current_state = "SELECT_RESOURCE"
            resource = self.resource_agent.select_resource(run_id, target_prereq, subject=subject, user_notes=user_notes)
            session.call_count += 1

            is_unavail = (
                resource.verification_status in ("COULD_NOT_ESTABLISH", "off_target") or 
                not resource.excerpt_quote or 
                "no approved course" in resource.excerpt_quote.lower()
            )

            if is_unavail:
                session.status = "waiting_human"
                session.current_state = "WAITING_FOR_HUMAN"
                hq = HumanQuestion(
                    run_id=run_id,
                    question=f"No approved course evidence could be verified for '{target_prereq}'. Which action should be taken?",
                    options=["Add learning material", "Continue with supported path", "Switch explanation mode", "End session"],
                )
                data["human_question"] = hq.model_dump()
                self.state_manager.save_study_session(session, data)
                return self._resp(run_id, "WAITING_FOR_HUMAN", session,
                                  human_question=hq.model_dump(),
                                  evaluation=evaluation.model_dump(),
                                  gap_hypothesis=gap.model_dump())

            # State: RESOURCE_CROSS_CHECK
            session.current_state = "RESOURCE_CROSS_CHECK"
            is_relevant, cross_check_status = self.validator.verify_resource_cross_check(target_prereq, resource.excerpt_quote)
            if not is_relevant:
                self.handoff_recorder.record(run_id, "Validator", "ResourceAgent", "resource_rejected",
                                             f"Excerpt quote failed cross check for '{target_prereq}': {cross_check_status}",
                                             [target_prereq], [resource.source_id])
                resource = self.resource_agent.select_resource(run_id, target_prereq, subject=subject, user_notes=user_notes)
                session.call_count += 1

            # State: RETEACH_PREREQ
            session.current_state = "RETEACH_PREREQ"
            teaching = self.tutor.repair_prerequisite(
                run_id=run_id,
                resource=resource,
                student_state=student_state,
                prerequisite_concept=target_prereq,
                target_concept=data["target_concept"],
                subject=subject,
                learner_level=session.learner_level,
                learning_goal=session.learning_goal
            )
            session.call_count += 1
            gap.diagnostic_status = "REPAIR_RECOMMENDED"

            if teaching.teaching_mode not in student_state.successful_modes:
                student_state.successful_modes.append(teaching.teaching_mode)
                self.state_manager.save_student_state(student_state)

            # State: GENERATE_EXERCISE
            session.current_state = "GENERATE_EXERCISE"
            prereq_ex = self.exercise_agent.generate_exercise(
                run_id, target_prereq, "prereq_recheck",
                subject=subject,
                context=f"Student received prerequisite repair lesson on {target_prereq}.",
                learner_level=session.learner_level, learning_goal=session.learning_goal
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
                    question=f"Revision limit reached ({session.revision_count}/{REVISION_LIMIT} levels deep). Reteaching chain: {' → '.join(data['prereq_chain'])}.",
                    options=["Add learning material", "Continue with supported path", "Switch explanation mode", "End session"]
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
                              exercise=self._sanitize_exercise_for_client(prereq_ex.model_dump()),
                              teaching_action=teaching.model_dump(),
                              message=f"🔍 Gap diagnosed in '{self._title(target_prereq, data)}'. Grounded foundation lesson provided.",
                              evaluation=evaluation.model_dump(),
                              gap_hypothesis=gap.model_dump())

    # ──────────────────────────── Human Resume ───────────────────────────────

    def resume_human_decision(self, run_id: str, decision: str, notes: Optional[str] = None) -> Dict[str, Any]:
        raw = self.state_manager.get_study_session(run_id)
        if not raw:
            raise ValueError(f"Session {run_id} not found.")

        session = StudySession(**raw["session"])
        data = {k: v for k, v in raw.items() if k != "session"}

        session.status = "active"
        session.current_state = "RESUME"
        session.revision_count = max(0, session.revision_count - 1)

        decision_text = f"{decision} (Note: {notes})" if notes else decision
        self.handoff_recorder.record(run_id, "HumanInstructor", "Controller", "resume",
                                     f"Decision: {decision_text}", [], [decision])

        if any(term in decision.lower() for term in ("end", "give up", "manual")):
            session.status = "given_up"
            session.current_state = "SESSION_COMPLETE"
            self.state_manager.save_study_session(session, data)
            return self._resp(run_id, "SESSION_COMPLETE", session,
                               message=f"Session ended by instructor intervention. Note: {notes or 'None'}.",
                               status="given_up")

        session.current_state = "PRACTICE"
        self.state_manager.save_study_session(session, data)

        active_ex = data.get("active_exercise")
        sanitized_ex = self._sanitize_exercise_for_client(active_ex) if active_ex else None

        return self._resp(run_id, "PRACTICE", session,
                          exercise=sanitized_ex,
                          message=f"▶️ Session resumed. Decision applied: '{decision}'.")

    # ──────────────────────────── Helpers ────────────────────────────────────

    def _sanitize_exercise_for_client(self, exercise_dict: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Removes answer keys or hidden secrets before returning exercise payloads to the browser."""
        if not exercise_dict:
            return None
        clean = dict(exercise_dict)
        clean.pop("expected_answer_hint", None)
        return clean

    def _title(self, concept_id: str, data: dict) -> str:
        return data.get("concept_titles", {}).get(concept_id, concept_id.replace("_", " ").title())

    def _resp(self, run_id: str, state: str, session: StudySession, **kwargs) -> Dict[str, Any]:
        return {"run_id": run_id, "current_state": state, "session": session.model_dump(), **kwargs}

    def _event(self, run_id: str, phase: str, actor: str, action: str, result: str, reason: str):
        self.state_manager.record_event({
            "run_id": run_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "phase": phase,
            "current_state": phase,
            "actor": actor,
            "action": action,
            "result": result,
            "reason": reason,
        })

    def _persist_context(self, run_id: str, ctx: CourseContext):
        pass

    def _load_context(self, run_id: str, data: dict) -> CourseContext:
        dag = data.get("dag", {})
        concepts = list(dag.keys())
        return CourseContext(
            course_id=data.get("target_id", "dynamic"),
            course_name=data.get("subject", "Dynamic Subject"),
            concepts=concepts,
            dependency_graph=dag,
            source_ids=["gemini-dynamic"],
            readiness_status="CONTEXT_READY"
        )

    # ──────────────────────────── Context Readiness ──────────────────────────

    def check_context_readiness(self, subject: str, target_concept: str) -> Dict[str, Any]:
        """Distinguishes CONTEXT_READY, CONTEXT_INSUFFICIENT, CONTEXT_CONFLICT, CONTEXT_UNAVAILABLE."""
        from slice.llm_client import LLMClient
        llm = LLMClient()
        if not llm.is_live:
            return {"status": "CONTEXT_READY", "reason": "Mock mode — context assumed ready."}

        try:
            result = llm.chat_json(
                "You are a curriculum validator. Given a subject and concept, determine if you can construct a meaningful prerequisite dependency graph. Return JSON: {\"viable\": true/false, \"status\": \"CONTEXT_READY | CONTEXT_INSUFFICIENT | CONTEXT_UNAVAILABLE\", \"reason\": \"...\"}",
                f"Subject: {subject}\nConcept: {target_concept}",
                max_tokens=256
            )
            status = result.get("status") or ("CONTEXT_READY" if result.get("viable", True) else "CONTEXT_INSUFFICIENT")
            return {
                "status": status,
                "reason": result.get("reason", "Domain knowledge context evaluated.")
            }
        except Exception as e:
            return {"status": "CONTEXT_UNAVAILABLE", "reason": f"Context service unavailable: {e}"}

    # ──────────────────────────── Why Explanation ────────────────────────────

    def get_why_explanation(self, run_id: str) -> Dict[str, Any]:
        """Generates a truthful explanation of WHY VISION chose the current action based on session state."""
        raw = self.state_manager.get_study_session(run_id)
        if not raw:
            return {"why": "Session not found.", "state": "UNKNOWN"}

        session = raw.get("session", {})
        data = {k: v for k, v in raw.items() if k != "session"}
        state = session.get("current_state", "UNKNOWN")
        target = data.get("target_concept", session.get("target_concept", ""))
        subject = data.get("subject", "")
        prereq_chain = data.get("prereq_chain", [])

        if state == "INITIAL_TEACHING":
            why = f"VISION is presenting the initial grounded lesson for '{target}' in {subject} before starting practice assessment."
        elif state == "PRACTICE":
            why = f"VISION is posing an adaptive exercise to test active understanding of '{prereq_chain[-1]}'."
        elif state == "TIE_BREAKER":
            why = f"Your previous answer was ambiguous. VISION is issuing a 1-step Concept Exit Ticket before deciding whether a prerequisite repair is needed."
        elif state == "WAITING_FOR_HUMAN":
            why = f"Prerequisite gap or evidence limit reached. VISION paused for instructor guidance."
        else:
            why = f"VISION evaluated state '{state}' and is advancing through the prerequisite DAG for '{target}'."

        return {"why": why, "state": state, "prereq_chain": prereq_chain}
