import json
import os
import uuid
from typing import Dict, Any, Optional, List

from slice.state_manager import (
    StateManager, StudentState, CourseContext, StudySession,
    Attempt, GapHypothesis, ResourceSelection, TeachingAction,
    Exercise, Evaluation, LearningUpdate, HumanQuestion, HumanDecision
)
from slice.validator import Validator
from slice.handoff import HandoffRecorder

from agents.supervisor import SupervisorAgent
from agents.diagnostic import DiagnosticAgent
from agents.resource import ResourceAgent
from agents.tutor import TutorAgent
from agents.exercise import ExerciseAgent
from agents.evaluation import EvaluationAgent

class WorkflowController:
    """Deterministic Authority Engine for VISION 20-state Workflow."""

    def __init__(self, db_path: str = "vision.db", domain_dir: str = "domain"):
        self.state_manager = StateManager(db_path=db_path)
        self.handoff_recorder = HandoffRecorder(self.state_manager)
        self.validator = Validator()
        self.domain_dir = domain_dir

        # Initialize agents
        self.supervisor = SupervisorAgent()
        self.diagnostic = DiagnosticAgent()
        self.resource_agent = ResourceAgent()
        self.tutor = TutorAgent()
        self.exercise_agent = ExerciseAgent()
        self.evaluation_agent = EvaluationAgent()

        # Load domain DAG
        self.course_context = self._load_course_context("ds_101")

    def _load_course_context(self, course_id: str) -> CourseContext:
        graph_path = os.path.join(self.domain_dir, "prerequisite_graph.json")
        if os.path.exists(graph_path):
            with open(graph_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                
                # Build dependency graph mapping node_id -> prerequisites
                dep_graph = {}
                concepts = []
                if "nodes" in data:
                    for n in data["nodes"]:
                        nid = n["id"]
                        concepts.append(nid)
                        dep_graph[nid] = n.get("prerequisites", [])

                # Also add support for legacy keys if needed
                if "pointers_references" not in dep_graph:
                    dep_graph["binary_tree_inorder_traversal"].extend(["pointers_references", "recursion_stack", "struct_node_definition"])
                    dep_graph["pointers_references"] = []
                    dep_graph["recursion_stack"] = []
                    dep_graph["struct_node_definition"] = ["pointers_references"]

                return CourseContext(
                    course_id=course_id,
                    course_name=data.get("course_id", "Data Structures 101"),
                    concepts=concepts,
                    dependency_graph=dep_graph,
                    source_ids=["data_structures_notes.md"]
                )
        return CourseContext(
            course_id=course_id,
            course_name="Data Structures 101",
            concepts=["binary_tree_inorder_traversal", "pointers_references", "recursion_stack", "struct_node_definition", "array_traversal"],
            dependency_graph={
                "binary_tree_inorder_traversal": ["pointers_references", "recursion_stack", "struct_node_definition"],
                "pointers_references": [],
                "recursion_stack": [],
                "struct_node_definition": ["pointers_references"],
                "array_traversal": []
            },
            source_ids=["data_structures_notes.md"]
        )

    def start_session(self, student_id: str, course_id: str, target_concept: str) -> Dict[str, Any]:
        """State 1–4: START_STUDY -> READ_LEARNER_STATE -> LOAD_COURSE_CONTEXT -> PLAN_NEXT_ACTION -> PRACTICE"""
        run_id = f"run_{uuid.uuid4().hex[:8]}"
        session = StudySession(
            run_id=run_id,
            student_id=student_id,
            course_id=course_id,
            target_concept=target_concept,
            current_state="START_STUDY"
        )
        student_state = self.state_manager.get_or_create_student_state(student_id, course_id)
        
        # State 2: READ_LEARNER_STATE
        session.current_state = "READ_LEARNER_STATE"
        self.handoff_recorder.record(run_id, "Controller", "StateManager", "load_profile", "Loading persistent learner profile", [], [student_id])

        # State 3: LOAD_COURSE_CONTEXT
        session.current_state = "LOAD_COURSE_CONTEXT"
        self.handoff_recorder.record(run_id, "Controller", "CourseContext", "load_dag", "Loading course prerequisite graph", [], [course_id])

        # State 4: PLAN_NEXT_ACTION
        session.current_state = "PLAN_NEXT_ACTION"
        plan = self.supervisor.plan_next_step(student_state, self.course_context, session)
        session.call_count += 1
        self.handoff_recorder.record(run_id, "Supervisor", "ExerciseAgent", plan["action"], plan["reasoning"], [target_concept], ["exercise_req"])

        # State 5: PRACTICE
        exercise = self.exercise_agent.generate_exercise(run_id, target_concept, "initial_target")
        session.call_count += 1
        session.current_state = "PRACTICE"

        session_data = {
            "target_concept": target_concept,
            "prereq_chain": [target_concept],
            "active_exercise": exercise.model_dump(),
            "history": []
        }
        self.state_manager.save_study_session(session, session_data)

        return {
            "run_id": run_id,
            "current_state": "PRACTICE",
            "exercise": exercise.model_dump(),
            "session": session.model_dump()
        }

    def submit_answer(self, run_id: str, student_answer: str) -> Dict[str, Any]:
        """Executes the state machine transition based on student's answer submission."""
        data = self.state_manager.get_study_session(run_id)
        if not data:
            raise ValueError(f"Study session {run_id} not found.")

        session_info = data["session"]
        session = StudySession(**session_info)
        student_state = self.state_manager.get_or_create_student_state(session.student_id, session.course_id)

        # Spend budget check (max 20 call steps)
        if session.call_count >= 20:
            session.status = "given_up"
            session.current_state = "SESSION_COMPLETE"
            self.state_manager.save_study_session(session, data)
            return {"run_id": run_id, "current_state": "SESSION_COMPLETE", "status": "given_up", "message": "Call spend budget limit reached (20 steps)."}

        current_concept = data["prereq_chain"][-1]
        active_ex = data["active_exercise"]

        attempt = Attempt(
            run_id=run_id,
            concept=current_concept,
            question=active_ex["question_text"],
            student_answer=student_answer
        )
        session.call_count += 1
        data["history"].append(attempt.model_dump())

        # State: EVALUATE
        session.current_state = "EVALUATE"
        evaluation = self.evaluation_agent.evaluate_attempt(attempt)
        session.call_count += 1
        self.handoff_recorder.record(run_id, "EvaluationAgent", "Controller", "evaluate_attempt", evaluation.reasoning, [student_answer], [evaluation.status])

        if evaluation.status == "demonstrated":
            if len(data["prereq_chain"]) > 1:
                # Repaired a prerequisite!
                repaired_prereq = data["prereq_chain"].pop()
                if repaired_prereq not in student_state.mastered:
                    student_state.mastered.append(repaired_prereq)
                self.state_manager.save_student_state(student_state)

                # State: RECHECK_ORIGINAL
                session.current_state = "RECHECK_ORIGINAL"
                orig_concept = data["prereq_chain"][0]
                retest_ex = self.exercise_agent.generate_exercise(run_id, orig_concept, "target_retest")
                session.call_count += 1
                data["active_exercise"] = retest_ex.model_dump()
                self.state_manager.save_study_session(session, data)
                return {"run_id": run_id, "current_state": "PRACTICE", "exercise": retest_ex.model_dump(), "message": f"Prerequisite {repaired_prereq} demonstrated! Now rechecking original target {orig_concept}."}
            else:
                # Mastered target concept!
                session.current_state = "TARGET_MASTERED"
                if current_concept not in student_state.mastered:
                    student_state.mastered.append(current_concept)
                self.state_manager.save_student_state(student_state)
                session.status = "completed"
                session.current_state = "SESSION_COMPLETE"
                self.state_manager.save_study_session(session, data)
                return {"run_id": run_id, "current_state": "SESSION_COMPLETE", "status": "completed", "message": f"Congratulations! You have mastered {current_concept}."}

        elif evaluation.status == "uncertain":
            # State: TIE_BREAKER -> RE_EVALUATE
            session.current_state = "TIE_BREAKER"
            tie_breaker_ex = self.exercise_agent.generate_exercise(run_id, current_concept, "tie_breaker")
            session.call_count += 1
            data["active_exercise"] = tie_breaker_ex.model_dump()
            self.state_manager.save_study_session(session, data)
            return {"run_id": run_id, "current_state": "PRACTICE", "exercise": tie_breaker_ex.model_dump(), "message": "Answer ambiguous. Issuing tie-breaker diagnostic question."}

        else: # unresolved
            # State: DIAGNOSE_GAP
            session.current_state = "DIAGNOSE_GAP"
            gap_hypo = self.diagnostic.diagnose_gap(attempt, self.course_context)
            session.call_count += 1
            self.handoff_recorder.record(run_id, "DiagnosticAgent", "Validator", "propose_gap_hypothesis", f"Candidate gap proposed: {gap_hypo.candidate_prerequisite}", [current_concept], [gap_hypo.candidate_prerequisite])

            # State: VALIDATE_HYPOTHESIS
            session.current_state = "VALIDATE_HYPOTHESIS"
            is_valid_edge = self.validator.validate_prerequisite_edge(
                self.course_context.dependency_graph,
                current_concept,
                gap_hypo.candidate_prerequisite
            )

            if not is_valid_edge and gap_hypo.candidate_prerequisite != current_concept:
                # Invalid edge -> WAITING_FOR_HUMAN
                session.status = "waiting_human"
                session.current_state = "WAITING_FOR_HUMAN"
                human_q = HumanQuestion(
                    run_id=run_id,
                    question=f"Diagnostic Agent proposed '{gap_hypo.candidate_prerequisite}' as prerequisite for '{current_concept}', but it is not in the course DAG.",
                    options=["Approve custom edge", "Select alternative prerequisite", "Override mastery"]
                )
                data["human_question"] = human_q.model_dump()
                self.state_manager.save_study_session(session, data)
                return {"run_id": run_id, "current_state": "WAITING_FOR_HUMAN", "human_question": human_q.model_dump()}

            target_prereq = gap_hypo.candidate_prerequisite

            # State: SELECT_RESOURCE
            session.current_state = "SELECT_RESOURCE"
            resource = self.resource_agent.select_resource(run_id, target_prereq)
            session.call_count += 1

            # State: RESOURCE_CROSS_CHECK
            session.current_state = "RESOURCE_CROSS_CHECK"
            is_relevant, cross_status = self.validator.verify_resource_cross_check(target_prereq, resource.excerpt_quote)
            if not is_relevant:
                resource.verification_status = "off_target"
                # Retry select resource
                session.current_state = "SELECT_RESOURCE"
                resource = self.resource_agent.select_resource(run_id, target_prereq)

            # State: RETEACH_PREREQ
            session.current_state = "RETEACH_PREREQ"
            teaching_action = self.tutor.reteach(run_id, resource, student_state)
            session.call_count += 1
            if teaching_action.teaching_mode not in student_state.successful_modes:
                student_state.successful_modes.append(teaching_action.teaching_mode)
                self.state_manager.save_student_state(student_state)

            # State: GENERATE_EXERCISE
            session.current_state = "GENERATE_EXERCISE"
            prereq_ex = self.exercise_agent.generate_exercise(run_id, target_prereq, "prereq_recheck")
            session.call_count += 1

            # State: RECHECK_GAP / GO_DEEPER tracking
            if target_prereq not in data["prereq_chain"]:
                data["prereq_chain"].append(target_prereq)
                session.revision_count += 1

            # Revision limit guard (max 3 revisions)
            if session.revision_count >= 3:
                session.status = "waiting_human"
                session.current_state = "WAITING_FOR_HUMAN"
                human_q = HumanQuestion(
                    run_id=run_id,
                    question=f"Revision limit reached ({session.revision_count}/3 revisions deep). Student requires human instructor guidance.",
                    options=["Provide human hint", "Override prerequisite mastery", "End session"]
                )
                data["human_question"] = human_q.model_dump()
                self.state_manager.save_study_session(session, data)
                return {"run_id": run_id, "current_state": "WAITING_FOR_HUMAN", "human_question": human_q.model_dump()}

            data["active_exercise"] = prereq_ex.model_dump()
            data["teaching_action"] = teaching_action.model_dump()
            session.current_state = "PRACTICE"
            self.state_manager.save_study_session(session, data)

            return {
                "run_id": run_id,
                "current_state": "PRACTICE",
                "teaching_action": teaching_action.model_dump(),
                "exercise": prereq_ex.model_dump(),
                "message": f"Diagnosed gap in prerequisite '{target_prereq}'. Reteaching lesson provided."
            }

    def resume_human_decision(self, run_id: str, decision: str) -> Dict[str, Any]:
        """State: RESUME -> DIAGNOSE_GAP / PRACTICE after human intervention."""
        data = self.state_manager.get_study_session(run_id)
        if not data:
            raise ValueError(f"Study session {run_id} not found.")

        session_info = data["session"]
        session = StudySession(**session_info)
        session.status = "active"
        session.current_state = "RESUME"

        human_dec = HumanDecision(run_id=run_id, decision=decision)
        self.handoff_recorder.record(run_id, "HumanInstructor", "Controller", "resume_execution", f"Human instructor decision: {decision}", [], [decision])

        # Reset revision count slightly to allow progression
        session.revision_count = max(0, session.revision_count - 1)
        session.current_state = "PRACTICE"
        self.state_manager.save_study_session(session, data)

        return {
            "run_id": run_id,
            "current_state": "PRACTICE",
            "exercise": data["active_exercise"],
            "message": f"Session resumed with human decision: '{decision}'."
        }
