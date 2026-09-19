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
        defer_practice: bool = False,
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
            current_state="START_STUDY",
            learner_level=learner_level,
            learning_goal=learning_goal,
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

        # State 4: PLAN_NEXT_ACTION & PREREQUISITE READINESS CHECK
        session.current_state = "PLAN_NEXT_ACTION"
        plan = self.supervisor.plan_next_step(student_state, course_context, session)
        session.call_count += 1

        direct_prereqs = course_context.dependency_graph.get(target_id, [])

        session_data = {
            "subject": subject,
            "target_concept": target_concept,
            "target_id": target_id,
            "prereq_chain": [target_id],
            "concept_titles": concept_titles,
            "dag": course_context.dependency_graph,
            "history": [],
            "taught_concepts": [],
            "user_notes": user_notes
        }

        # If direct prerequisites exist, initiate the interactive Prerequisite Readiness Survey!
        if direct_prereqs:
            session.current_state = "PREREQ_SURVEY"
            prereq_survey_data = {
                "direct_prerequisites": [
                    {"id": p, "title": concept_titles.get(p, p.replace("_", " ").title())}
                    for p in direct_prereqs
                ],
                "target_concept": target_concept,
                "target_id": target_id
            }
            session_data["prereq_survey_data"] = prereq_survey_data

            session.agent_activities = {
                "SupervisorAgent": f"Generated CS prerequisite graph. Surveying learner readiness on {len(direct_prereqs)} prerequisites.",
                "DiagnosticAgent": "Idle — awaiting self-declaration / diagnostic check",
                "ResourceAgent": "Idle — ready to retrieve materials",
                "TutorAgent": "Ready — will teach prerequisite if gap is declared",
                "ExerciseAgent": "Ready — will generate quiz if partially known",
                "EvaluationAgent": "Ready"
            }

            self.handoff_recorder.record(
                run_id, "SupervisorAgent", "Controller", "prereq_readiness_survey",
                f"Initiated prerequisite readiness check for {target_concept} ({len(direct_prereqs)} prerequisites)",
                [], direct_prereqs
            )

            self.state_manager.save_study_session(session, session_data)
            self._persist_context(run_id, course_context)

            return {
                "run_id": run_id,
                "current_state": "PREREQ_SURVEY",
                "subject": subject,
                "target_concept": target_concept,
                "target_id": target_id,
                "dag": course_context.dependency_graph,
                "concept_titles": concept_titles,
                "prereq_survey_data": prereq_survey_data,
                "session": session.model_dump(),
                "call_count": session.call_count
            }

        # If no prerequisites exist (foundational concept), teach target directly
        session.current_state = "INITIAL_TEACHING"
        resource = self.resource_agent.select_resource(run_id, target_id, subject=subject, user_notes=user_notes)
        teaching = self.tutor.reteach(
            run_id=run_id,
            resource=resource,
            student_state=student_state,
            target_concept=target_concept,
            subject=subject
        )
        session.call_count += 1
        self.handoff_recorder.record(
            run_id, "TutorAgent", "Controller", "initial_teaching",
            f"Delivered initial lesson for {target_concept}",
            [target_id], [teaching.explanation_text[:80]]
        )
        self._event(run_id, "INITIAL_TEACHING", "TutorAgent", "teach_target", "lesson_ready", "Initial lesson delivered before practice")

        session.agent_activities = {
            "SupervisorAgent": f"Generated prerequisite DAG for {subject} / {target_concept}",
            "DiagnosticAgent": "Idle — monitoring learner attempts",
            "ResourceAgent": f"Retrieved resources for {target_concept} ({len(resource.web_resources)} web sources)",
            "TutorAgent": f"Delivered initial lesson mode '{teaching.teaching_mode}' for {target_concept}",
            "ExerciseAgent": "Ready - practice begins when learner chooses it",
            "EvaluationAgent": "Ready - no response yet"
        }

        session_data["teaching_action"] = teaching.model_dump()
        session_data["resource_selection"] = resource.model_dump()

        self.state_manager.save_study_session(session, session_data)
        self._persist_context(run_id, course_context)

        return {
            "run_id": run_id,
            "current_state": "INITIAL_TEACHING",
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

    # ──────────────────────────── Prerequisite Survey & Quiz ─────────────────

    def submit_prereq_survey(self, run_id: str, survey_responses: Dict[str, str]) -> Dict[str, Any]:
        """Process student self-declaration for prerequisites: 'yes', 'partially', 'no'."""
        raw = self.state_manager.get_study_session(run_id)
        if not raw:
            raise ValueError(f"Session {run_id} not found.")

        session = StudySession(**raw["session"])
        data = {k: v for k, v in raw.items() if k != "session"}
        student_state = self.state_manager.get_or_create_student_state(session.student_id, session.course_id)

        data["survey_responses"] = survey_responses
        subject = data.get("subject", "")
        concept_titles = data.get("concept_titles", {})
        dag = data.get("dag", {})

        no_prereqs = [p for p, ans in survey_responses.items() if ans.lower() == "no"]
        partial_prereqs = [p for p, ans in survey_responses.items() if ans.lower() == "partially"]
        yes_prereqs = [p for p, ans in survey_responses.items() if ans.lower() == "yes"]

        # Track mastered prerequisites
        for y in yes_prereqs:
            if y not in student_state.mastered:
                student_state.mastered.append(y)
        self.state_manager.save_student_state(student_state)

        # ── Branch 1: "No" self-declaration -> Pivot to teach prerequisite immediately ──
        if no_prereqs:
            chosen_prereq = no_prereqs[0]
            chosen_title = concept_titles.get(chosen_prereq, chosen_prereq.replace("_", " ").title())

            data["prereq_chain"] = [data["target_id"], chosen_prereq]
            data["active_concept"] = chosen_prereq
            session.current_state = "INITIAL_TEACHING"

            resource = self.resource_agent.select_resource(run_id, chosen_prereq, subject=subject, user_notes=data.get("user_notes"))
            teaching = self.tutor.reteach(
                run_id=run_id,
                resource=resource,
                student_state=student_state,
                target_concept=data["target_concept"],
                subject=subject
            )
            session.call_count += 1
            data["teaching_action"] = teaching.model_dump()
            data["resource_selection"] = resource.model_dump()

            session.agent_activities["SupervisorAgent"] = f"Pivoted topic to missing prerequisite '{chosen_title}' based on self-declaration."
            session.agent_activities["TutorAgent"] = f"Delivering lesson for prerequisite '{chosen_title}'."

            self.handoff_recorder.record(
                run_id, "SupervisorAgent", "TutorAgent", "pivot_to_prereq",
                f"Learner self-declared 'No' for {chosen_title}. Switching topic to teach prerequisite.",
                [data["target_id"]], [chosen_prereq]
            )

            self.state_manager.save_study_session(session, data)
            return self._resp(
                run_id, "INITIAL_TEACHING", session,
                message=f"📚 Prerequisite gap acknowledged: '{chosen_title}'. Let's master this foundation first!",
                teaching_action=teaching.model_dump(),
                resource_selection=resource.model_dump(),
                dag=dag,
                concept_titles=concept_titles,
                target_concept=data["target_concept"],
                active_concept=chosen_prereq,
                survey_responses=survey_responses
            )

        # ── Branch 2: "Partially" self-declaration -> Serve 2-question Diagnostic Quiz ──
        elif partial_prereqs:
            chosen_prereq = partial_prereqs[0]
            chosen_title = concept_titles.get(chosen_prereq, chosen_prereq.replace("_", " ").title())

            quiz_data = self.supervisor.generate_prereq_quiz(chosen_prereq, subject=subject, count=2)
            session.call_count += 1

            data["active_prereq_quiz"] = quiz_data
            data["pending_partial_prereqs"] = partial_prereqs[1:]
            session.current_state = "PREREQ_QUIZ"

            session.agent_activities["SupervisorAgent"] = f"Prepared diagnostic quiz for partially known '{chosen_title}'."
            session.agent_activities["ExerciseAgent"] = f"2-question diagnostic readiness check ready for '{chosen_title}'."

            self.handoff_recorder.record(
                run_id, "SupervisorAgent", "ExerciseAgent", "prereq_quiz",
                f"Learner self-declared 'Partially' for {chosen_title}. Serving diagnostic quiz.",
                [chosen_prereq], [f"quiz_{len(quiz_data.get('questions', []))}_questions"]
            )

            self.state_manager.save_study_session(session, data)
            return self._resp(
                run_id, "PREREQ_QUIZ", session,
                message=f"⚡ Prerequisite Check: 2 quick questions on '{chosen_title}' to confirm readiness (70% pass mark).",
                prereq_quiz=quiz_data,
                dag=dag,
                concept_titles=concept_titles,
                target_concept=data["target_concept"],
                survey_responses=survey_responses
            )

        # ── Branch 3: All "Yes" -> Proceed to Target Concept Lesson ──
        else:
            session.current_state = "INITIAL_TEACHING"
            resource = self.resource_agent.select_resource(run_id, data["target_id"], subject=subject, user_notes=data.get("user_notes"))
            teaching = self.tutor.reteach(
                run_id=run_id,
                resource=resource,
                student_state=student_state,
                target_concept=data["target_concept"],
                subject=subject
            )
            session.call_count += 1
            data["teaching_action"] = teaching.model_dump()
            data["resource_selection"] = resource.model_dump()

            session.agent_activities["SupervisorAgent"] = "All prerequisites confirmed known. Unlocking target concept."
            session.agent_activities["TutorAgent"] = f"Teaching target concept '{data['target_concept']}'."

            self.handoff_recorder.record(
                run_id, "SupervisorAgent", "TutorAgent", "prereqs_confirmed",
                "All prerequisites confirmed known by learner. Proceeding to target concept.",
                list(survey_responses.keys()), [data["target_id"]]
            )

            self.state_manager.save_study_session(session, data)
            return self._resp(
                run_id, "INITIAL_TEACHING", session,
                message=f"🚀 Prerequisites verified! Ready to learn '{data['target_concept']}'.",
                teaching_action=teaching.model_dump(),
                resource_selection=resource.model_dump(),
                dag=dag,
                concept_titles=concept_titles,
                target_concept=data["target_concept"],
                survey_responses=survey_responses
            )

    def submit_prereq_quiz(self, run_id: str, answers: Dict[str, Any]) -> Dict[str, Any]:
        """Evaluate answers to the prerequisite diagnostic quiz and branch based on the 70% threshold."""
        raw = self.state_manager.get_study_session(run_id)
        if not raw:
            raise ValueError(f"Session {run_id} not found.")

        session = StudySession(**raw["session"])
        data = {k: v for k, v in raw.items() if k != "session"}
        student_state = self.state_manager.get_or_create_student_state(session.student_id, session.course_id)

        quiz_data = data.get("active_prereq_quiz", {})
        concept = quiz_data.get("concept", data.get("target_id"))
        concept_title = data.get("concept_titles", {}).get(concept, concept.replace("_", " ").title())
        subject = data.get("subject", "")
        dag = data.get("dag", {})
        concept_titles = data.get("concept_titles", {})

        eval_result = self.supervisor.evaluate_prereq_quiz(concept, quiz_data, answers)
        score = eval_result.get("score", 0.0)
        passed = eval_result.get("passed", False)
        data["last_quiz_eval"] = eval_result

        if passed:
            # Score >= 70%: Prerequisite verified!
            if concept not in student_state.mastered:
                student_state.mastered.append(concept)
            if concept in student_state.weak:
                student_state.weak.remove(concept)
            self.state_manager.save_student_state(student_state)

            pending = data.get("pending_partial_prereqs", [])
            if pending:
                next_prereq = pending[0]
                next_title = concept_titles.get(next_prereq, next_prereq.replace("_", " ").title())
                next_quiz = self.supervisor.generate_prereq_quiz(next_prereq, subject=subject, count=2)
                session.call_count += 1
                data["active_prereq_quiz"] = next_quiz
                data["pending_partial_prereqs"] = pending[1:]
                session.current_state = "PREREQ_QUIZ"

                self.state_manager.save_study_session(session, data)
                return self._resp(
                    run_id, "PREREQ_QUIZ", session,
                    message=f"✅ '{concept_title}' passed ({score}% >= 70%)! Now testing next prerequisite: '{next_title}'.",
                    prereq_quiz=next_quiz,
                    quiz_eval=eval_result,
                    dag=dag,
                    concept_titles=concept_titles
                )
            else:
                # All prerequisite checks passed -> Unlock Target Concept
                session.current_state = "INITIAL_TEACHING"
                resource = self.resource_agent.select_resource(run_id, data["target_id"], subject=subject, user_notes=data.get("user_notes"))
                teaching = self.tutor.reteach(
                    run_id=run_id,
                    resource=resource,
                    student_state=student_state,
                    target_concept=data["target_concept"],
                    subject=subject
                )
                session.call_count += 1
                data["teaching_action"] = teaching.model_dump()
                data["resource_selection"] = resource.model_dump()

                self.handoff_recorder.record(
                    run_id, "SupervisorAgent", "TutorAgent", "prereq_quiz_passed",
                    f"Learner passed prerequisite quiz on {concept_title} ({score}% >= 70%). Proceeding to target concept.",
                    [concept], [data["target_id"]]
                )

                self.state_manager.save_study_session(session, data)
                return self._resp(
                    run_id, "INITIAL_TEACHING", session,
                    message=f"🎉 Prerequisite verified ({score}% >= 70%)! Ready to learn '{data['target_concept']}'.",
                    teaching_action=teaching.model_dump(),
                    resource_selection=resource.model_dump(),
                    quiz_eval=eval_result,
                    dag=dag,
                    concept_titles=concept_titles
                )
        else:
            # Score < 70%: Gap confirmed -> Pivot to teach this prerequisite thoroughly
            if concept not in student_state.weak:
                student_state.weak.append(concept)
            self.state_manager.save_student_state(student_state)

            data["prereq_chain"] = [data["target_id"], concept]
            data["active_concept"] = concept
            session.current_state = "INITIAL_TEACHING"

            resource = self.resource_agent.select_resource(run_id, concept, subject=subject, user_notes=data.get("user_notes"))
            teaching = self.tutor.reteach(
                run_id=run_id,
                resource=resource,
                student_state=student_state,
                target_concept=data["target_concept"],
                subject=subject
            )
            session.call_count += 1
            data["teaching_action"] = teaching.model_dump()
            data["resource_selection"] = resource.model_dump()

            self.handoff_recorder.record(
                run_id, "SupervisorAgent", "TutorAgent", "prereq_quiz_failed",
                f"Learner scored {score}% on {concept_title} (< 70% threshold). Switching topic to thoroughly teach prerequisite.",
                [concept], [teaching.explanation_text[:80]]
            )

            self.state_manager.save_study_session(session, data)
            return self._resp(
                run_id, "INITIAL_TEACHING", session,
                message=f"⚠️ Scored {score}% on '{concept_title}' (below 70% threshold). Let's thoroughly master '{concept_title}' first!",
                teaching_action=teaching.model_dump(),
                resource_selection=resource.model_dump(),
                quiz_eval=eval_result,
                dag=dag,
                concept_titles=concept_titles,
                active_concept=concept
            )

    # ──────────────────────────── Answer Submission ──────────────────────────

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
            context=f"Learner level: {session.learner_level}; goal: {session.learning_goal}. Initial lesson completed."
        )
        session.call_count += 1
        data["active_exercise"] = exercise.model_dump()
        session.agent_activities["ExerciseAgent"] = f"Generated {exercise.question_format.upper()} exercise for {data['target_concept']}"
        session.agent_activities["EvaluationAgent"] = "Ready - awaiting first attempt"
        session.current_state = "PRACTICE"
        self.handoff_recorder.record(run_id, "Controller", "ExerciseAgent", "begin_practice", "Learner explicitly started practice", [data["target_id"]], [exercise.question_text[:80]])
        self._event(run_id, "GENERATE_EXERCISE", "ExerciseAgent", "begin_practice", "question_ready", "Learner explicitly started practice")
        self.state_manager.save_study_session(session, data)
        return self._resp(run_id, "PRACTICE", session, exercise=exercise.model_dump(), teaching_action=data.get("teaching_action"), message="Practice started. Your first question is ready.")

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

        # Record attempt with multi-format responses & test case results
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
            # A tie-breaker only establishes the diagnosis; it does not prove
            # mastery of the original target. Send the student back to a
            # fresh target check, as required by the learning contract.
            if active_ex.get("exercise_type") == "tie_breaker":
                session.current_state = "RE_EVALUATE"
                retest = self.exercise_agent.generate_exercise(
                    run_id, data["target_id"], "target_retest",
                    subject=subject, context="Tie-breaker passed; verify the original target with a new example."
                )
                session.call_count += 1
                data["active_exercise"] = retest.model_dump()
                self.state_manager.save_study_session(session, data)
                return self._resp(run_id, "PRACTICE", session,
                                  exercise=retest.model_dump(),
                                  message="✓ Tie-breaker passed. Let’s verify the original concept with a fresh example.",
                                  evaluation=evaluation.model_dump())

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
            tie_exit_ticket = self.diagnostic.generate_tie_breaker(current_concept, subject=subject)
            tie_q = self.exercise_agent.generate_exercise(
                run_id, current_concept, "tie_breaker",
                subject=subject,
                context=f"Exit Ticket: {tie_exit_ticket.get('question')} | Ambiguous student answer: '{student_answer[:80]}'"
            )
            session.call_count += 1
            data["active_exercise"] = tie_q.model_dump()
            self.state_manager.save_study_session(session, data)
            return self._resp(run_id, "TIE_BREAKER", session,
                              exercise=tie_q.model_dump(),
                              message="🤔 Answer was ambiguous — here's a Concept-Gap Exit Ticket to clarify.",
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
                    question=f"Diagnostic Agent proposed '{gap.candidate_prerequisite}' as prerequisite for '{current_concept}', but edge validation status is 'could_not_establish'. What should we do?",
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

            is_unavail = (
                resource.verification_status != "verified" or 
                not resource.excerpt_quote or 
                "no specific explanatory text" in resource.excerpt_quote.lower() or 
                "no approved course" in resource.excerpt_quote.lower()
            )

            if is_unavail:
                session.status = "waiting_human"
                session.current_state = "WAITING_FOR_HUMAN"
                hq = HumanQuestion(
                    run_id=run_id,
                    question=f"Resource not available: No approved course evidence could be verified for '{target_prereq}'. Which instructor-provided resource should be used?",
                    options=["Add approved notes", "Skip this prerequisite", "End session and provide manual help"],
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
                              message=f"Session ended by human instructor intervention. Note: {notes or 'None'}.",
                              status="given_up")

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

    # ──────────────────────────── Context Readiness ──────────────────────────

    def check_context_readiness(self, subject: str, target_concept: str) -> Dict[str, Any]:
        """Check whether VISION can build sufficient context for a subject/concept."""
        from slice.llm_client import LLMClient
        llm = LLMClient()
        if not llm.is_live:
            return {"status": "CONTEXT_READY", "reason": "Mock mode — context assumed ready."}

        try:
            result = llm.chat_json(
                "You are a curriculum validator. Given a subject and concept, determine if you can construct a meaningful prerequisite dependency graph (at least 3 concepts deep). Return JSON: {\"viable\": true/false, \"reason\": \"...\", \"concept_count_estimate\": N}",
                f"Subject: {subject}\nConcept: {target_concept}\n\nCan you build a prerequisite DAG?",
                max_tokens=256
            )
            if result.get("viable", True):
                return {
                    "status": "CONTEXT_READY",
                    "reason": result.get("reason", "Sufficient domain knowledge available."),
                    "concept_count_estimate": result.get("concept_count_estimate", 5)
                }
            else:
                return {
                    "status": "CONTEXT_INSUFFICIENT",
                    "reason": result.get("reason", "Not enough structure for adaptive learning."),
                    "concept_count_estimate": result.get("concept_count_estimate", 0)
                }
        except Exception as e:
            return {"status": "CONTEXT_READY", "reason": f"Check skipped: {e}"}

    # ──────────────────────────── Why Explanation ────────────────────────────

    def get_why_explanation(self, run_id: str) -> Dict[str, Any]:
        """Generate a human-readable explanation of the current session state."""
        raw = self.state_manager.get_study_session(run_id)
        if not raw:
            return {"why": "Session not found.", "state": "UNKNOWN"}

        session = raw.get("session", {})
        data = {k: v for k, v in raw.items() if k != "session"}
        state = session.get("current_state", "UNKNOWN")
        target = data.get("target_concept", session.get("target_concept", ""))
        subject = data.get("subject", "")
        prereq_chain = data.get("prereq_chain", [])
        history = data.get("history", [])
        taught = data.get("taught_concepts", [])

        # Build context for Gemini
        from slice.llm_client import LLMClient
        llm = LLMClient()

        last_attempt = history[-1] if history else None
        last_eval = data.get("teaching_action", {})

        context_parts = [
            f"Subject: {subject}",
            f"Target concept: {target}",
            f"Current state: {state}",
            f"Prerequisite chain: {' → '.join(prereq_chain)}",
            f"Concepts taught so far: {taught}",
            f"Revision depth: {session.get('revision_count', 0)}/3",
            f"Call count: {session.get('call_count', 0)}/20",
        ]
        if last_attempt:
            context_parts.append(f"Last question: {last_attempt.get('question', '')[:100]}")
            context_parts.append(f"Last answer: {last_attempt.get('student_answer', '')[:100]}")

        if not llm.is_live:
            return {"why": f"Currently in state {state} for '{target}'.", "state": state}

        why_text = llm.chat(
            "You are the VISION explainer. Given the current learning session state, write a brief 2-3 sentence explanation in second person telling the student WHY VISION chose this current action. Be specific about their learning progress. No JSON — plain text only.",
            "\n".join(context_parts),
            max_tokens=200
        ).strip()

        if not why_text or why_text.startswith("[Error") or "RESOURCE_EXHAUSTED" in why_text:
            why_text = f"VISION delivered a targeted lesson on '{target}' in {subject} and generated an exercise question to assess your active understanding step by step."

        return {"why": why_text, "state": state, "prereq_chain": prereq_chain}
